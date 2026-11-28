import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {createPlanDraft,reschedulePlanDraft,arrangePlanDraft,arrangementSchema,validateDraft,applyPlanDraft,emptyDraftConstraints}=await import('../lib/plan-draft.ts');
const {findPlace,unifiedPlaceKnowledge}=await import('../lib/place-catalog.ts');
const {placeReferences}=await import('../lib/place-references.ts');
const {placeAvailability,scheduleDayLoad,defaultScheduleOptions,scheduleReasons}=await import('../lib/place-scheduling.ts');
const {retrieveLocalCards}=await import('../lib/browser-advisor.ts');
const {reliabilityKnowledge}=await import('../lib/reliability-knowledge.ts');
const {dataSchema,newActivity,draftSchedulingSchema,planSchemaVersion}=await import('../lib/planning.ts');
const palace='cn-beijing-palace-museum',jing='cn-beijing-jingshan',temple='cn-beijing-temple-heaven',bund='cn-shanghai-bund',yu='cn-shanghai-yuyuan',museum='cn-shanghai-museum-peoples-square';
const ids=[palace,jing,temple];
function trip(patch={}){return {id:'scheduling-test',name:'اختبار مراجع الأماكن',origin:'',date:'2026-10-13',month:'',mode:'dates',days:'3',travelers:'',budget:'',currency:'',nationality:'',level:'',pace:'متوازن',interests:[],selected:'country-CN',compare:[],costs:{},plans:{},ideas:{},extras:{},expenses:{},...patch};}
test('nearby Beijing visits share a day within a bounded time budget and preserve every selection',async()=>{
 const t=trip(),before=structuredClone(t),d=await createPlanDraft(t,'بكين',ids);
 assert.deepEqual(t,before);assert.equal(d.entries.find(e=>e.placeId===palace).day,d.entries.find(e=>e.placeId===jing).day);assert.notEqual(d.entries.find(e=>e.placeId===temple).day,d.entries.find(e=>e.placeId===jing).day);
 assert.deepEqual(d.entries.map(e=>e.placeId).sort(),ids.slice().sort());assert.equal(scheduleDayLoad(d.entries,1,d.scheduling).minutes,420);
 assert.ok(scheduleReasons(d,palace).some(s=>s.includes('ليست مسافة الطريق')));
});
test('Monday exclusions affect initial allocation, model grammar, manual moves and model output',async()=>{
 const t=trip({date:'2026-10-12'}),d=await createPlanDraft(t,'بكين',ids),before=structuredClone(d);
 for(const id of [palace,temple]){assert.notEqual(d.entries.find(e=>e.placeId===id).day,1);assert.ok(!JSON.parse(arrangementSchema(d,t.pace)).properties[id].enum.includes(1));}
 const invalid={...d,entries:d.entries.map(e=>e.placeId===palace?{...e,day:1}:e)};
 assert.throws(()=>validateDraft(t,invalid),/إغلاق/);
 assert.throws(()=>arrangePlanDraft(d,JSON.stringify(Object.fromEntries(invalid.entries.map(e=>[e.placeId,e.day]))),t.pace),/إغلاق/);assert.deepEqual(d,before);
 await assert.rejects(createPlanDraft(trip({date:'2026-10-12',days:'1'}),'بكين',[palace]),/توزيع/);
});
test('calm pace, rest days and locks constrain every allocated day without discarding places',async()=>{
 const t=trip({days:'4',pace:'هادئ'}),c={...emptyDraftConstraints(),freeDays:[2],lockedDays:{[palace]:3}},d=await createPlanDraft(t,'بكين',ids,'',c);
 assert.equal(d.entries.find(e=>e.placeId===palace).day,3);assert.equal(new Set(d.entries.map(e=>e.day)).size,3);assert.ok(d.entries.every(e=>e.day!==2));
 await assert.rejects(createPlanDraft({...t,days:'3'},'بكين',ids,'',{...c,lockedDays:{}}));
});
test('time estimates and rest buffers enforce capacity and failed reallocation keeps input intact',async()=>{
 const t=trip({days:'1'}),d=await createPlanDraft(t,'بكين',[palace,jing]),before=structuredClone(d);
 await assert.rejects(reschedulePlanDraft(t,d,{...defaultScheduleOptions,dayMinutes:419}));assert.deepEqual(d,before);
 const changed=await reschedulePlanDraft(t,d,{...defaultScheduleOptions,dayMinutes:300,visitMinutes:{[palace]:120,[jing]:60}});assert.equal(scheduleDayLoad(changed.entries,1,changed.scheduling).minutes,240);
 const invalid={...defaultScheduleOptions,visitMinutes:{[palace]:0}};await assert.rejects(createPlanDraft(t,'بكين',[palace],'',undefined,false,invalid));
});
test('existing activities retain data, consume capacity and unknown duration prevents blind additions',async()=>{
 const saved={...newActivity(),title:'حجز سابق',duration:'300',notes:'محفوظ'},t=trip({days:'2',plans:{'country-CN':[{title:'أول',notes:'ملاحظة',activities:[saved]}]}}),d=await createPlanDraft(t,'بكين',[palace]);assert.equal(d.entries[0].day,2);
 const patch=await applyPlanDraft({...t,planDraft:d},d);assert.deepEqual(patch.plans['country-CN'][0],t.plans['country-CN'][0]);
 const unknown=structuredClone(t);unknown.plans['country-CN'][0].activities[0].duration='';assert.equal((await createPlanDraft(unknown,'بكين',[jing])).entries[0].day,2);
 await assert.rejects(createPlanDraft({...unknown,days:'1'},'بكين',[jing]));
});
test('known places in different cities cannot share a day through a local transfer buffer',async()=>{
 const t=trip({days:'2',plans:{'country-CN':[{title:'شنغهاي',notes:'',activities:[{...newActivity(),venueId:bund,duration:'30'}]}]}});
 const d=await createPlanDraft(t,'بكين',[jing]);assert.equal(d.entries[0].day,2);assert.equal(d.scheduling.occupied[0].otherCity,true);
 assert.throws(()=>validateDraft(t,{...d,entries:d.entries.map(e=>({...e,day:1}))}),/مدينة أخرى/);
});
test('reallocation preserves IDs, notes, exclusions and locks and survives a saved-trip round trip',async()=>{
 const t=trip(),d=await createPlanDraft(t,'بكين',[palace,jing],'',{...emptyDraftConstraints(),lockedDays:{[palace]:2},excludedIds:[temple]});d.notes[1]='استراحة مع العائلة';
 const revised=await reschedulePlanDraft({...t,date:'2026-10-14'},d,{...defaultScheduleOptions,dayMinutes:360});
 assert.equal(revised.id,d.id);assert.deepEqual(revised.notes,d.notes);assert.deepEqual(revised.constraints,d.constraints);for(const e of revised.entries)assert.equal(e.activityId,d.entries.find(p=>p.placeId===e.placeId).activityId);
 const stored=dataSchema.parse({schemaVersion:planSchemaVersion,activeId:t.id,trips:[{...t,date:'2026-10-14',planDraft:revised}]}).trips[0];assert.deepEqual(stored.planDraft.scheduling,revised.scheduling);const patch=await applyPlanDraft(stored,stored.planDraft);assert.ok(patch.plans[t.selected][1].notes.includes('استراحة'));
});
test('operating windows remain scoped, unknown and expired hours cannot establish availability',async()=>{
 assert.equal(placeAvailability(findPlace(palace),'2026-11-01').hours,'08:30–16:30 · آخر دخول 15:30');
 assert.equal(placeAvailability(findPlace(museum),'2027-11-15').known,false);assert.equal(placeAvailability(findPlace(museum),'2026-10-12').blocked,true);
 assert.equal(placeAvailability(findPlace(bund),'2026-10-12').known,false);assert.equal(placeAvailability(findPlace(jing),'2026-10-12').known,false);
 assert.equal(placeAvailability(findPlace(palace),'2026-02-30').known,false);assert.equal(placeAvailability(findPlace(palace),'').known,false);
 assert.equal(draftSchedulingSchema.safeParse({...defaultScheduleOptions,version:1,startDate:'2026-02-30',occupied:[]}).success,false);
 const d=await createPlanDraft(trip({date:'2026-10-12'}),'شنغهاي',[bund,yu,museum]);assert.ok(d.entries.some(e=>e.placeId===bund));assert.ok(d.entries.filter(e=>e.placeId!==bund).every(e=>e.day!==1));
});
test('place records retain coordinate provenance and distinguish city experience from venue evidence',()=>{
 for(const id of [...ids,bund,yu,museum]){const p=findPlace(id);assert.equal(p.coordinateSource.license,'CC0');assert.equal(p.coordinateSource.checked,'2026-09-26');assert.ok(p.visit.minMinutes>0);assert.equal(p.cost.status,'unknown');const refs=placeReferences(id);assert.ok(refs.some(r=>r.relation==='place'));assert.ok(refs.some(r=>r.relation==='city'));assert.ok(refs.filter(r=>r.card.communityKind).every(r=>r.relation!=='place'));}
 const cards=retrieveLocalCards([...reliabilityKnowledge,...unifiedPlaceKnowledge],'CN','كم مدة زيارة متحف القصر وموقعه؟');assert.ok(cards.slice(0,3).some(c=>c.id==='catalog-planning-'+palace));assert.ok(cards.every(c=>c.venueId===palace));
});
