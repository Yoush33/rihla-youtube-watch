import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});

const {createPlanDraft,validateDraft,arrangePlanDraft,arrangementPrompt,applyPlanDraft,draftHashes,draftWarnings,selectedDraftPlaces,digest}=await import('../lib/plan-draft.ts');
const {plannerPlaces,cityOptions,cityDepthKnowledge}=await import('../lib/city-depth.ts');
const {newActivity,dataSchema,planDraftSchema,planSchemaVersion}=await import('../lib/planning.ts');
const {parseBackup,restoreTripCopies}=await import('../lib/backup.ts');
const {retrieveLocalCards}=await import('../lib/browser-advisor.ts');
const {updateTripData}=await import('../lib/trip-update.ts');
const beijing=plannerPlaces.filter(p=>p.country==='CN'&&p.city==='بكين');
const shanghai=plannerPlaces.filter(p=>p.country==='CN'&&p.city==='شنغهاي');
const bIds=beijing.map(p=>p.id).slice(0,3);
const clone=structuredClone;
const day=(activities=[])=>({title:'يوم محفوظ',notes:'ملاحظة أصلية',activities});
function trip(id='draft-test') {return {id,name:'رحلة اختبار',origin:'الرياض',date:'2026-10-06',month:'',mode:'dates',days:'3',travelers:'2',budget:'5000',currency:'SAR',nationality:'سعودي',level:'متوسط',pace:'متوازن',interests:['الثقافة'],selected:'country-CN',countryCities:['بكين'],compare:[],costs:{'country-CN':{rooms:'1',stayLow:'120',stayHigh:'180'}},plans:{'country-CN':[day()]},ideas:{'country-CN':[]},extras:{'country-CN':[{id:'fee',title:'رسوم',category:'fees',planned:'5'}]},expenses:{'country-CN':[{id:'paid',title:'مدفوع',category:'food',amount:'25',date:'2026-10-06',note:'محفوظ'}]}};}
async function active(t=trip(),ids=bIds){const d=await createPlanDraft(t,'بكين',ids,'وزع الأماكن المختارة');return {...t,planDraft:d};}
const rawOrder=(d,entries=d.entries)=>JSON.stringify({days:entries.map((e,i)=>({day:i+1,placeIds:[e.placeId]}))});

test('draft places stay in the explicit city/country and reject duplicate or unknown IDs',()=>{
  assert.ok(beijing.length>=2&&shanghai.length>=1);
  assert.ok(cityOptions('country-CN').includes('بكين'));
  assert.deepEqual(cityOptions('kyoto'),['كيوتو']);
  assert.equal(selectedDraftPlaces(trip(),'بكين',bIds).length,bIds.length);
  for(const [city,ids] of [['شنغهاي',bIds],['بكين',[shanghai[0].id]],['بكين',['missing-place']],['بكين',[bIds[0],bIds[0]]],['بكين',[]]])assert.throws(()=>selectedDraftPlaces(trip(),city,ids));
  assert.throws(()=>selectedDraftPlaces({...trip(),selected:'kyoto'},'طوكيو',['jp-kiyomizu']));
  assert.throws(()=>selectedDraftPlaces({...trip(),selected:'country-JP'},'بكين',bIds));
});

test('draft rejects absent/invalid duration, excessive pace, long request and already planned venues',async()=>{
  for(const days of ['', ' ', '0','31','2.5','not a duration'])await assert.rejects(createPlanDraft({...trip(),days},'بكين',[bIds[0]]));
  await assert.rejects(createPlanDraft({...trip(),days:'1',pace:'هادئ'},'بكين',bIds.slice(0,2)));
  await assert.rejects(createPlanDraft(trip(),'بكين',[bIds[0]],'ع'.repeat(601)));
  const t=trip();t.plans['country-CN'][0].activities=[{...newActivity(),venueId:bIds[0]}];
  await assert.rejects(createPlanDraft(t,'بكين',[bIds[0]]));
});

test('creating a draft is nonmutating and keeps unfilled days rather than duplicating venues',async()=>{
  const t={...trip(),days:'5'},before=clone(t),d=await createPlanDraft(t,'بكين',bIds.slice(0,2));
  assert.deepEqual(t,before);assert.equal(d.dayCount,5);assert.equal(d.entries.length,2);assert.equal(d.notes.length,5);
  assert.equal(new Set(d.entries.map(e=>e.placeId)).size,2);assert.equal(new Set(d.entries.map(e=>e.activityId)).size,2);
  assert.equal(d.tripId,t.id);assert.equal(d.destinationId,t.selected);assert.ok(planDraftSchema.safeParse(d).success);
});

test('local model permutation changes only arrangement and preserves activity IDs, notes and hashes',async()=>{
  const t=await active(),d={...t.planDraft,notes:['ملاحظة أولى','','']},before=clone(d);
  const order=[...d.entries].reverse();const arranged=arrangePlanDraft(d,rawOrder(d,order),t.pace);
  assert.deepEqual(d,before);assert.equal(arranged.kind,'local-model');assert.deepEqual(arranged.notes,d.notes);
  assert.deepEqual(arranged.entries.map(e=>e.placeId),order.map(e=>e.placeId));
  for(const e of arranged.entries)assert.equal(e.activityId,d.entries.find(x=>x.placeId===e.placeId).activityId);
  assert.equal(arranged.basePlanHash,d.basePlanHash);assert.equal(arranged.baseContextHash,d.baseContextHash);
});

test('local model ID-to-day mapping preserves all chosen places and saved draft metadata',async()=>{
  const t=await active(),d={...t.planDraft,notes:['ملاحظة محفوظة','','']},before=clone(d);
  const mapping=Object.fromEntries(d.entries.map((e,i)=>[e.placeId,i===1?1:2]));
  const arranged=arrangePlanDraft(d,JSON.stringify(mapping),t.pace);
  assert.deepEqual(d,before);assert.equal(arranged.kind,'local-model');assert.equal(arranged.entries.length,d.entries.length);
  assert.deepEqual(arranged.entries.map(e=>e.placeId).sort(),d.entries.map(e=>e.placeId).sort());
  for(const e of arranged.entries){assert.equal(e.day,mapping[e.placeId]);assert.equal(e.activityId,d.entries.find(x=>x.placeId===e.placeId).activityId);}
  assert.deepEqual({...arranged,entries:d.entries,kind:d.kind},d,'Only ordering and generation kind may change');
});

test('local model mapping rejects missing or foreign IDs, invalid days and excess daily pace',async()=>{
  const t=await active(),d=t.planDraft,before=clone(d),mapping=Object.fromEntries(d.entries.map((e,i)=>[e.placeId,i+1]));
  const missing={...mapping};delete missing[d.entries[0].placeId];
  const invalid=[missing,{...mapping,'foreign-place':1},...([0,4,1.5,'1',null].map(value=>({...mapping,[d.entries[0].placeId]:value}))),Object.fromEntries(d.entries.map(e=>[e.placeId,1]))];
  for(const candidate of invalid)assert.throws(()=>arrangePlanDraft(d,JSON.stringify(candidate),t.pace));
  assert.deepEqual(d,before,'Rejected mappings must leave the previous draft untouched');
});

test('local model rejects extra fields, unknown/duplicate/omitted IDs and illegal day allocation',async()=>{
  const t=await active(),d=t.planDraft,ids=d.entries.map(e=>e.placeId),valid={days:ids.map((id,i)=>({day:i+1,placeIds:[id]}))};
  const invalid=[{...valid,reason:'invented facts'}, {days:[{...valid.days[0],price:100},...valid.days.slice(1)]}, {days:[{day:1,placeIds:[ids[0],ids[0]]},{day:2,placeIds:[ids[2]]}]}, {days:valid.days.slice(1)}, {days:[{day:1,placeIds:['other-country']},...valid.days.slice(1)]}, {days:[{day:1,placeIds:[ids[0]]},{day:1,placeIds:[ids[1]]},{day:3,placeIds:[ids[2]]}]}, {days:[{day:0,placeIds:[ids[0]]},...valid.days.slice(1)]}, {days:[{day:4,placeIds:[ids[0]]},...valid.days.slice(1)]}, {days:[{day:1,placeIds:ids}]}];
  const before=clone(d);for(const candidate of invalid)assert.throws(()=>arrangePlanDraft(d,JSON.stringify(candidate),t.pace));
  for(const raw of ['','{"days":','Here is your answer: '+JSON.stringify(valid)])assert.throws(()=>arrangePlanDraft(d,raw,t.pace));
  assert.deepEqual(d,before);
});

test('deleted place cannot be resurrected by a later model response',async()=>{
  const t=await active(),original=t.planDraft,edited={...original,entries:original.entries.slice(1)};
  assert.throws(()=>arrangePlanDraft(edited,rawOrder(original),t.pace));
  assert.equal(arrangePlanDraft(edited,rawOrder(edited),t.pace).entries.length,edited.entries.length);
});

test('ordering prompt is bounded to catalog fields and excludes bookings, costs and private details',async()=>{
  const t=await active(),text=JSON.stringify(arrangementPrompt(t.planDraft,t.pace));
  for(const e of t.planDraft.entries)assert.ok(text.includes(e.placeId));
  assert.ok(!text.includes('5000'));assert.ok(!text.includes('الرياض'));assert.ok(!text.includes('سعودي'));
  assert.ok(!text.includes('https://'));assert.ok(text.length<9000);
});

test('stale details, existing plan changes, another trip or another destination cannot adopt',async()=>{
  const t=await active();
  for(const patch of [{days:'4'},{date:'2026-10-07'},{budget:'9000'},{currency:'KWD'},{interests:['الطبيعة']},{id:'another-trip'},{selected:'country-MY'}])await assert.rejects(applyPlanDraft({...t,...patch},t.planDraft));
  const changed=clone(t);changed.plans['country-CN'][0].notes+=' أحدث';await assert.rejects(applyPlanDraft(changed,t.planDraft));
  const moved=clone(t);moved.plans['country-CN'].push(day());await assert.rejects(applyPlanDraft(moved,t.planDraft));
});

test('adoption preserves booking activity, user notes, costs and other destination plans',async()=>{
  const t=trip(),kept={...newActivity(),bookingId:'booking-original',title:'حجز محفوظ',notes:'ن'.repeat(2000),cost:'12.34',time:'15:00'};
  t.plans['country-CN']=[day([kept])];t.plans.kyoto=[{title:'رحلة أخرى',notes:'لا تلمس',activities:[]}];
  const ready=await active(t);ready.planDraft.notes[0]='إضافة جديدة';const before=clone(ready),patch=await applyPlanDraft(ready,ready.planDraft);
  assert.deepEqual(ready,before);assert.deepEqual(patch.plans['country-CN'][0].activities[0],kept);
  assert.equal(patch.plans['country-CN'][0].notes,'ملاحظة أصلية\nإضافة جديدة');assert.deepEqual(patch.plans.kyoto,t.plans.kyoto);
  assert.equal(patch.planDraft,undefined);assert.equal(patch.days,'3');
  const merged={...ready,...patch};assert.deepEqual(merged.costs,t.costs);assert.deepEqual(merged.expenses,t.expenses);assert.deepEqual(merged.extras,t.extras);
  for(const e of ready.planDraft.entries){const a=patch.plans['country-CN'].flatMap(d=>d.activities).find(a=>a.id===e.activityId),p=plannerPlaces.find(p=>p.id===e.placeId);assert.equal(a.venueId,p.id);assert.equal(a.title,p.name);assert.equal(a.url,p.source);assert.equal(a.cost,'');assert.equal(a.duration,'');assert.equal(a.time,'');}
  assert.ok(dataSchema.safeParse({schemaVersion:planSchemaVersion,activeId:merged.id,trips:[merged]}).success);
});

test('adoption cannot be applied again and IDs remain unique after a manual move',async()=>{
  const t=await active();t.planDraft.entries[0].day=3;
  const patch=await applyPlanDraft(t,t.planDraft),merged={...t,...patch};
  await assert.rejects(applyPlanDraft(merged,t.planDraft));
  const acts=patch.plans['country-CN'].flatMap(d=>d.activities);assert.equal(new Set(acts.map(a=>a.id)).size,acts.length);
  assert.ok(patch.plans['country-CN'][2].activities.some(a=>a.id===t.planDraft.entries[0].activityId));
});

test('draft rejects duplicate activity IDs, invalid day notes/day indices and capacity overflow',async()=>{
  const ready=await active(),d=ready.planDraft;
  for(const bad of [{...d,entries:d.entries.map(e=>({...e,activityId:d.entries[0].activityId}))},{...d,notes:['x']},{...d,notes:['ع'.repeat(1001),'','']},{...d,entries:[{...d.entries[0],day:4},...d.entries.slice(1)]}])assert.throws(()=>validateDraft(ready,bad));
  const full=trip();full.plans['country-CN'][0].activities=Array.from({length:30},()=>newActivity());const fullReady=await active(full,[bIds[0]]);assert.notEqual(fullReady.planDraft.entries[0].day,1);const fullPatch=await applyPlanDraft(fullReady,fullReady.planDraft);assert.deepEqual(fullPatch.plans['country-CN'][0].activities,full.plans['country-CN'][0].activities);fullReady.planDraft.entries[0].day=1;await assert.rejects(applyPlanDraft(fullReady,fullReady.planDraft));
  const long=trip();long.plans['country-CN'][0].notes='ن'.repeat(1500);const longReady=await active(long,[bIds[0]]);longReady.planDraft.notes[0]='م'.repeat(500);await assert.rejects(applyPlanDraft(longReady,longReady.planDraft),/ملاحظات/);
});

test('maximum 30-day plan is retained and a crowded day is preserved without another addition',async()=>{
  const t={...trip(),days:'30'};t.plans['country-CN']=Array.from({length:30},()=>day());t.plans['country-CN'][0].activities=Array.from({length:29},()=>newActivity());
  const ready=await active(t,[bIds[0]]),patch=await applyPlanDraft(ready,ready.planDraft);
  assert.equal(patch.plans['country-CN'].length,30);assert.equal(patch.plans['country-CN'][0].activities.length,29);assert.equal(patch.plans['country-CN'].flatMap(d=>d.activities).length,30);
  assert.ok(dataSchema.safeParse({schemaVersion:planSchemaVersion,activeId:t.id,trips:[{...ready,...patch}]}).success);
});

test('restored draft is bound to its copied trip and can adopt without changing the original',async()=>{
  const sourceTrip=await active(),source={schemaVersion:planSchemaVersion,activeId:sourceTrip.id,trips:[sourceTrip]};
  const parsed=parseBackup(JSON.stringify(source));const existing=trip('existing');
  const restored=restoreTripCopies({schemaVersion:planSchemaVersion,activeId:existing.id,trips:[existing]},parsed,[sourceTrip.id],false,0,()=> 'copied-trip');
  const copy=restored.trips[1];assert.equal(copy.planDraft.tripId,copy.id);assert.equal(copy.planDraft.destinationId,copy.selected);
  assert.deepEqual(copy.planDraft.entries,sourceTrip.planDraft.entries);assert.deepEqual(restored.trips[0],existing);
  const patch=await applyPlanDraft(copy,copy.planDraft);assert.ok(patch.plans[copy.selected].some(d=>d.activities.length));
  assert.equal(sourceTrip.planDraft.tripId,sourceTrip.id);
});

test('saved draft hashes survive a schema/database round trip with equivalent activity key order',async()=>{
  const t=trip();t.plans['country-CN'][0].activities=[{...newActivity(),bookingId:'existing-booking',venueId:'manual-venue',title:'نشاط سابق'}];
  const ready=await active(t),stored=dataSchema.parse(JSON.parse(JSON.stringify({schemaVersion:planSchemaVersion,activeId:ready.id,trips:[ready]}))).trips[0];
  assert.deepEqual(stored.plans,ready.plans,'The save did not change the plan semantically');
  assert.deepEqual(await draftHashes(stored),await draftHashes(ready),'Property order must not make a saved draft stale');
  const patch=await applyPlanDraft(stored,stored.planDraft);assert.equal(patch.planDraft,undefined);
});

test('draft digest ignores nested object key order and undefined but keeps array order',async()=>{
  const original={days:[{notes:'محفوظ',activity:{title:'زيارة',location:{lng:116.4,lat:39.9}},unused:undefined}],extra:{b:2,a:1}};
  const reordered={extra:{a:1,b:2,missing:undefined},days:[{activity:{location:{lat:39.9,lng:116.4},title:'زيارة'},notes:'محفوظ'}]};
  assert.equal(await digest(original),await digest(reordered));
  assert.notEqual(await digest(['first','second']),await digest(['second','first']));
  assert.notEqual(await digest(original),await digest({...reordered,days:[{...reordered.days[0],notes:'تغير حقيقي'}]}));
});

test('draft activity IDs cannot collide with activities already in the target plan',async()=>{
  const t=trip();t.plans['country-CN'][0].activities=[newActivity()];const ready=await active(t,[bIds[0]]);
  ready.planDraft.entries[0].activityId=t.plans['country-CN'][0].activities[0].id;
  await assert.rejects(applyPlanDraft(ready,ready.planDraft),'An accepted draft must not introduce duplicate DnD/activity IDs');
});

test('city-depth knowledge is scoped to requested cities for China, Malaysia and Georgia',()=>{
  for(const [country,query,expected] of [['CN','أنشطة شنغهاي','shanghai'],['CN','أنشطة بكين','beijing'],['MY','مواصلات كوالالمبور','kuala-lumpur'],['GE','مواصلات تبليسي','tbilisi']]){
    const cards=retrieveLocalCards(cityDepthKnowledge,country,query);assert.ok(cards.length,country+' '+query);assert.ok(cards.every(c=>c.code===country&&c.city===expected),JSON.stringify(cards.map(c=>({city:c.city,title:c.title}))));
  }
  assert.equal(retrieveLocalCards(cityDepthKnowledge,'MY','المواصلات').length,0);
  assert.equal(retrieveLocalCards(cityDepthKnowledge,'GE','المواصلات').length,0);
});

test('recorded closure is avoided and referenced map points do not invent visit times',async()=>{
  const t={...trip(),date:'2026-10-05'},ready=await active(t,['cn-beijing-palace-museum']);
  const warnings=draftWarnings(ready,ready.planDraft);assert.ok(warnings.some(w=>w.includes('زمن الطريق')));assert.equal(ready.planDraft.entries[0].day,2);
  const patch=await applyPlanDraft(ready,ready.planDraft),a=patch.plans['country-CN'][1].activities[0];assert.equal(a.location.lat,39.915833);assert.match(a.notes,/wikidata.org/);assert.equal(a.time,'');assert.equal(a.duration,'');
});

test('trip update preserves unrelated data and identity without mutation and rejects a stale active trip',async()=>{
  const first=await active(),second=trip('another-trip');
  const current={schemaVersion:planSchemaVersion,activeId:first.id,trips:[first,second],world:{CN:{visited:true,planned:false,month:'',notes:'ذكرى محفوظة'}}};
  const before=clone(current),patch={name:'اسم جديد',id:'must-not-replace-id'},patchBefore=clone(patch);
  const next=updateTripData(current,first.id,patch,7);
  assert.deepEqual(current,before);assert.deepEqual(patch,patchBefore);assert.notEqual(next,current);
  assert.equal(next.trips[0].name,patch.name);assert.equal(next.trips[0].id,first.id);
  assert.deepEqual({...next.trips[0],name:first.name},first);
  assert.deepEqual(next.trips[1],second);assert.deepEqual(next.world,current.world);assert.equal(next.activeId,current.activeId);
  assert.ok(dataSchema.safeParse(next).success);
  assert.throws(()=>updateTripData(current,second.id,{name:'خطأ'},7),/الرحلة/);
  assert.throws(()=>updateTripData(current,'missing-trip',{name:'خطأ'},7),/الرحلة/);
  assert.deepEqual(current,before);
});

test('trip update enforces the 3 MB serialized UTF-8 boundary including Arabic text and revision',()=>{
  const t=trip(),revision=12;t.origin='';
  t.plans[t.selected]=Array.from({length:30},()=>({...day(),notes:'',activities:Array.from({length:30},()=>newActivity())}));
  const current={schemaVersion:planSchemaVersion,activeId:t.id,trips:[t]};
  const size=data=>new TextEncoder().encode(JSON.stringify({data,revision})).length;
  const target=3_000_000-2;let remaining=target-size(current);
  assert.ok(remaining>0);
  for(const d of t.plans[t.selected])for(const activity of d.activities){const n=Math.min(2000,Math.floor(remaining/2));activity.notes='ع'.repeat(n);remaining-=2*n;}
  if(remaining===1){t.plans[t.selected][0].notes='x';remaining--;}
  assert.equal(remaining,0);assert.equal(size(current),target);
  assert.ok(dataSchema.safeParse(current).success);
  assert.ok(JSON.stringify({data:current,revision}).length<3_000_000,'Character count alone must not be used as the byte limit');
  const before=JSON.stringify(current),atLimit=updateTripData(current,t.id,{origin:'ع'},revision);
  assert.equal(size(atLimit),3_000_000);
  assert.throws(()=>updateTripData(current,t.id,{origin:'عع'},revision),/سعة الحفظ/);
  assert.equal(JSON.stringify(current),before,'A rejected oversize edit must leave all prior data untouched');
});
