import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {createPlanDraft,validateDraft,arrangePlanDraft,arrangementSchema,arrangementPrompt,applyPlanDraft,emptyDraftConstraints,interpretDraftRequest,reviseDraftRequest}=await import('../lib/plan-draft.ts');
const {plannerPlaces}=await import('../lib/city-depth.ts');
const {planDraftSchema,newActivity}=await import('../lib/planning.ts');
const beijing=plannerPlaces.filter(p=>p.country==='CN'&&p.city==='بكين');
const palace='cn-beijing-palace-museum',jingshan='cn-beijing-jingshan',temple='cn-beijing-temple-heaven',ids=[palace,jingshan,temple];
const trip=()=>({id:'constraints-test',name:'اختبار قيود',origin:'',date:'',month:'',mode:'dates',days:'4',travelers:'',budget:'',currency:'SAR',nationality:'',level:'متوسط',pace:'متوازن',interests:[],selected:'country-CN',countryCities:['بكين'],compare:[],costs:{},plans:{},ideas:{},extras:{},expenses:{}});
const constraints=(patch={})=>({...emptyDraftConstraints(),...patch});
const mapping=d=>Object.fromEntries(d.entries.map(e=>[e.placeId,e.day]));

test('limited Arabic commands pin exact selected places and numbered rest days',()=>{
 const r=interpretDraftRequest('متحف القصر اليوم الثاني، جينغشان اليوم الثالث\nاليوم ٤ راحة',beijing,4);
 assert.deepEqual(r.clarifications,[]);assert.deepEqual(r.constraints.lockedDays,{[palace]:2,[jingshan]:3});assert.deepEqual(r.constraints.freeDays,[4]);
 const joined=interpretDraftRequest('خلي متحف القصر في اليوم الثاني وجينغشان اليوم الثالث',beijing,4);
 assert.deepEqual(joined.clarifications,[]);assert.deepEqual(joined.constraints.lockedDays,r.constraints.lockedDays);
});

test('ambiguous, unsupported, unselected and out-of-range requests ask for explicit UI selection',async()=>{
 for(const text of ['المتحف اليوم الثاني','اترك يوم فاضي','جينغشان اليوم الخامس','قرب الأماكن من الفندق','متحف القصر اليوم الثاني، متحف القصر اليوم الثالث']){
  assert.ok(interpretDraftRequest(text,beijing,4).clarifications.length,text);
  await assert.rejects(createPlanDraft(trip(),'بكين',ids,text));
 }
 assert.ok(interpretDraftRequest('متحف القصر اليوم الثاني',beijing.filter(p=>p.id!==palace),4).clarifications.length);
 assert.ok(interpretDraftRequest('جينغشان اليوم ٣١',beijing,30).clarifications.length);
});

test('explicit manual-only choice preserves uninterpreted prose and keeps it out of the model request',async()=>{
 const d=await createPlanDraft(trip(),'بكين',ids,'قرب الأماكن من الفندق',constraints({lockedDays:{[palace]:2}}),true);
 assert.equal(d.request,'قرب الأماكن من الفندق');assert.equal(d.entries.find(e=>e.placeId===palace).day,2);
 assert.ok(d.constraints.notes.some(n=>n.includes('لم يُفسَّر')));
 assert.equal(JSON.parse(arrangementPrompt(d,'متوازن')[1].content).request,'');
});

test('creation obeys text and explicit locks, rest days and exclusions without mutating the inputs',async()=>{
 const t=trip(),c=constraints({freeDays:[1],lockedDays:{[temple]:4}}),before=structuredClone([t,c]);
 const d=await createPlanDraft(t,'بكين',ids,'متحف القصر اليوم الثاني، جينغشان اليوم الثالث',c);
 assert.deepEqual(d.entries.map(e=>[e.placeId,e.day]).sort(),[[palace,2],[jingshan,3],[temple,4]].sort());
 assert.deepEqual([t,c],before);assert.ok(planDraftSchema.safeParse(d).success);
 assert.deepEqual(d.constraints.freeDays,[1]);assert.equal(d.constraints.lockedDays[temple],4);
});

test('without museums excludes only catalog names containing museum and records the limited classification',async()=>{
 const d=await createPlanDraft(trip(),'بكين',ids,'بدون متاحف');
 assert.deepEqual(d.constraints.excludedIds,[palace]);assert.ok(!d.entries.some(e=>e.placeId===palace));
 assert.equal(d.entries.length,2);assert.ok(d.constraints.notes.some(n=>n.includes('اسمها')));
 await assert.rejects(createPlanDraft(trip(),'بكين',[palace],'بدون متاحف'));
});

test('conflicting locks, exclusions, rest days, foreign IDs and impossible pace are rejected',async()=>{
 for(const c of [constraints({lockedDays:{[palace]:2},freeDays:[2]}),constraints({lockedDays:{[palace]:2},excludedIds:[palace]}),constraints({lockedDays:{missing:2}}),constraints({freeDays:[5]}),constraints({freeDays:[1,1]}),constraints({excludedIds:['foreign']}),constraints({freeDays:[1,2,3]}),constraints({lockedDays:{[palace]:2,[jingshan]:2,[temple]:2}})])await assert.rejects(createPlanDraft(trip(),'بكين',ids,'',c));
 await assert.rejects(createPlanDraft(trip(),'بكين',ids,'متحف القصر اليوم الثاني',constraints({lockedDays:{[palace]:3}})));
});

test('a rest day never silently hides or deletes an existing saved activity',async()=>{
 const t=trip();t.plans['country-CN']=[{title:'نشاط محفوظ',notes:'',activities:[newActivity()]}];
 await assert.rejects(createPlanDraft(t,'بكين',ids,'',constraints({freeDays:[1]})));
 const d=await createPlanDraft(t,'بكين',ids);const modified={...d,constraints:constraints({freeDays:[1]}),entries:d.entries.map(e=>({...e,day:e.day===1?4:e.day}))};
 assert.throws(()=>validateDraft(t,modified));assert.equal(t.plans['country-CN'][0].activities.length,1);
});

test('JSON schema restricts locked days and excludes all rest-day values',async()=>{
 const d=await createPlanDraft(trip(),'بكين',ids,'',constraints({lockedDays:{[palace]:2},freeDays:[4]}));
 const s=JSON.parse(arrangementSchema(d,'متوازن'));
 assert.deepEqual(s.properties[palace].enum,[2]);assert.deepEqual(s.properties[jingshan].enum,[1,2,3]);
 assert.deepEqual(s.required.sort(),ids.slice().sort());assert.equal(s.additionalProperties,false);
});

test('valid JSON that violates locks or rest days is rejected in both model response shapes',async()=>{
 const d=await createPlanDraft(trip(),'بكين',ids,'',constraints({lockedDays:{[palace]:2},freeDays:[4]})),before=structuredClone(d);
 for(const change of [{[palace]:1},{[jingshan]:4}]){
  const bad={...mapping(d),...change};assert.throws(()=>arrangePlanDraft(d,JSON.stringify(bad),'متوازن'));
  const days=[1,2,3,4].map(day=>({day,placeIds:Object.keys(bad).filter(id=>bad[id]===day)})).filter(x=>x.placeIds.length);
  assert.throws(()=>arrangePlanDraft(d,JSON.stringify({days}),'متوازن'));
 }
 assert.deepEqual(d,before);
 const arranged=arrangePlanDraft(d,JSON.stringify(mapping(d)),'متوازن');assert.deepEqual(arranged.constraints,d.constraints);
});

test('exclusions survive request revision and prevent a removed venue from being resurrected',async()=>{
 const d=await createPlanDraft(trip(),'بكين',ids,'بدون متاحف');
 const revised=reviseDraftRequest(d,'جينغشان اليوم الثالث','متوازن');
 assert.deepEqual(revised.constraints.excludedIds,[palace]);assert.equal(revised.entries.find(e=>e.placeId===jingshan).day,3);
 assert.throws(()=>arrangePlanDraft(revised,JSON.stringify({...mapping(revised),[palace]:2}),'متوازن'));
 assert.deepEqual(revised.entries.map(e=>e.activityId).sort(),d.entries.map(e=>e.activityId).sort());
});

test('manual moves cannot violate a lock, a rest day or a saved exclusion at adoption',async()=>{
 const d=await createPlanDraft(trip(),'بكين',ids,'',constraints({lockedDays:{[palace]:2},freeDays:[4]}));
 for(const bad of [{...d,entries:d.entries.map(e=>e.placeId===palace?{...e,day:1}:e)},{...d,entries:d.entries.map(e=>e.placeId===jingshan?{...e,day:4}:e)},{...d,constraints:{...d.constraints,excludedIds:[jingshan]}}])await assert.rejects(applyPlanDraft({...trip(),planDraft:bad},bad));
});

test('saved constraint round trips retain IDs and constraints until successful adoption',async()=>{
 const d=await createPlanDraft(trip(),'بكين',ids,'متحف القصر اليوم الثاني، جينغشان اليوم الثالث',constraints({freeDays:[4]}));
 const stored=planDraftSchema.parse(JSON.parse(JSON.stringify(d))),t={...trip(),planDraft:stored},before=structuredClone(t);
 const patch=await applyPlanDraft(t,stored);assert.deepEqual(t,before);assert.deepEqual(t.planDraft.constraints,d.constraints);
 assert.equal(patch.plans['country-CN'][1].activities.find(a=>a.venueId===palace).id,d.entries.find(e=>e.placeId===palace).activityId);
 assert.equal(patch.plans['country-CN'][3].activities.length,0);assert.equal(patch.planDraft,undefined);
});

test('same-ID stale entry, constraint, note or request snapshots cannot be adopted',async()=>{
 const d=await createPlanDraft(trip(),'بكين',ids),t={...trip(),planDraft:d};
 for(const changed of [{...d,request:'طلب أحدث'},{...d,notes:['ملاحظة أحدث','','','']},{...d,constraints:constraints({lockedDays:{[palace]:d.entries.find(e=>e.placeId===palace).day}})},{...d,entries:d.entries.map((e,i)=>i?e:{...e,day:4})}]){
  assert.equal(changed.id,d.id);await assert.rejects(applyPlanDraft({...t,planDraft:changed},d),/نسخة قديمة/);
 }
});
