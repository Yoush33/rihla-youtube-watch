import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {venueForDate,factState,usedSources,itineraryChecks,validDate,safeSource}=await import('../lib/reliability.ts');
const {entryPolicies,venueFacts,practicalFacts}=await import('../lib/reliability-catalog.ts');
const {plannerPlaces}=await import('../lib/city-depth.ts');
const {newActivity}=await import('../lib/planning.ts');
const checked='2026-09-25',palace='cn-beijing-palace-museum',museum='cn-shanghai-museum-peoples-square';
const key=f=>f.source+'|'+f.title;
const catalogFacts=()=>[...entryPolicies.flatMap(p=>p.requirements),...venueFacts.flatMap(v=>[...v.facts,...(v.exceptions||[])]),...practicalFacts];
function trip(country='CN',ids=[],cities=[],date='2026-10-06'){
 const selected='country-'+country;
 return {id:'catalog-test',name:'اختبار المراجع',origin:'',date,month:'',mode:'dates',days:'1',travelers:'1',budget:'',currency:'SAR',nationality:'',level:'متوسط',pace:'متوازن',interests:[],selected,countryCities:cities,compare:[],costs:{},plans:{[selected]:[{title:'زيارة',notes:'',activities:ids.map(venueId=>({...newActivity(),id:'activity-'+venueId,venueId,title:venueId,time:'10:00',duration:'30'}))}]},reliability:{[selected]:{dayStart:'06:00',dayEnd:'22:00'}}};
}

test('Palace Museum switches in April and November and preserves winter across the year boundary',()=>{
 const before=structuredClone(venueFacts.find(v=>v.id===palace));
 for(const date of ['2026-04-01','2026-10-31','2027-04-01']){
  const v=venueForDate(palace,date);assert.deepEqual([v.open,v.close,v.lastEntry],['08:30','17:00','16:00'],date);
 }
 for(const date of ['2026-03-31','2026-11-01','2026-12-31','2027-01-01','2027-03-31']){
  const v=venueForDate(palace,date);assert.deepEqual([v.open,v.close,v.lastEntry],['08:30','16:30','15:30'],date);
 }
 assert.deepEqual(venueFacts.find(v=>v.id===palace),before,'Resolving a season must not overwrite the reusable catalog');
 for(const date of ['', '2026-02-30','2026-13-01'])assert.equal(venueForDate(palace,date),undefined);
 assert.equal(venueForDate('unknown-venue','2026-10-06'),undefined);
});

test('Temple of Heaven uses the documented inner-attraction season rather than park gate hours',()=>{
 for(const [date,end,last] of [['2026-04-01','18:00','17:30'],['2026-10-31','18:00','17:30'],['2026-11-01','17:00','16:30'],['2027-01-01','17:00','16:30']]){
  const v=venueForDate('cn-beijing-temple-heaven',date);assert.equal(v.open,'08:00');assert.equal(v.close,end);assert.equal(v.lastEntry,last);assert.match(v.scope,/قاعة الدعاء/);
 }
});

test('Shanghai Museum exhibition hours are valid only inside the inclusive recorded window',()=>{
 for(const date of ['2026-07-09','2026-09-25','2027-11-14']){
  const v=venueForDate(museum,date);assert.deepEqual([v.open,v.close,v.lastEntry],['09:00','17:00','15:00'],date);
 }
 for(const date of ['2026-07-08','2027-11-15','2028-07-09']){
  assert.equal(venueForDate(museum,date),undefined,date);
  const checks=itineraryChecks(trip('CN',[museum],[],date),checked);
  assert.equal(checks.find(c=>c.id==='expired-hours-activity-'+museum)?.state,'stale');
  assert.notEqual(checks.find(c=>c.id==='hours-activity-'+museum)?.state,'checked');
 }
});

test('unverified schedules cannot become checked hours even when numeric hours and fresh sources exist',()=>{
 const unverified=venueFacts.filter(v=>v.scheduleVerified===false);
 assert.ok(unverified.some(v=>v.id==='kl-islamic-arts-museum'&&v.open==='09:30'),'Includes the Ramadan-exception case with otherwise plausible hours');
 for(const v of unverified){
  const place=plannerPlaces.find(p=>p.id===v.id);assert.ok(place,v.id);
  const checks=itineraryChecks(trip(place.country,[v.id]),checked),hours=checks.find(c=>c.id==='hours-activity-'+v.id);
  assert.equal(hours?.state,'missing',v.id);
 }
});

test('indexed, unresolved and confirmation-only facts retain their uncertainty despite a fresh check date',()=>{
 const facts=catalogFacts(),indexed=facts.filter(f=>f.verification==='indexed'),unresolved=facts.filter(f=>['unresolved','needs_confirmation'].includes(f.verification));
 assert.ok(indexed.length>0&&unresolved.length>0);
 for(const f of indexed)assert.equal(factState(f,90,checked),'stale',f.title);
 for(const f of unresolved)assert.equal(factState(f,90,checked),'missing',f.title);
 const direct=facts.find(f=>f.verification==='direct');assert.equal(factState(direct,90,checked),'checked');
 assert.equal(factState({...direct,verification:'editorial'},90,checked),'estimate');
 assert.equal(factState({...direct,checked:'2026-09-26'},90,checked),'stale');
});

test('used sources include every selected venue fact, closure exception and country-policy requirement',()=>{
 for(const country of ['CN','MY','GE']){
  const ids=plannerPlaces.filter(p=>p.country===country&&venueFacts.some(v=>v.id===p.id)).map(p=>p.id),sources=usedSources(trip(country,ids)),byKey=new Map(sources.map(s=>[key(s),s]));
  const expected=[...entryPolicies.filter(p=>p.country===country).flatMap(p=>p.requirements),...venueFacts.filter(v=>ids.includes(v.id)).flatMap(v=>[...v.facts,...(v.exceptions||[])])];
  for(const f of expected){assert.ok(byKey.has(key(f)),f.title);assert.deepEqual(byKey.get(key(f)),f);}
  assert.equal(byKey.size,sources.length,'The same URL and title must not be counted twice');
 }
});

test('supporting sources from both places and facts retain dates and indexed-access status',()=>{
 const shanghai=plannerPlaces.find(p=>p.id===museum),shanghaiSources=usedSources(trip('CN',[museum]));assert.ok(shanghai.additionalSources.length);
 for(const extra of shanghai.additionalSources){const found=shanghaiSources.find(s=>s.source===extra.url&&s.title===shanghai.name+' · '+extra.name);assert.ok(found,extra.name);assert.equal(found.checked,extra.checked);assert.equal(found.published,extra.published);}
 for(const country of ['CN','MY','GE']){
  const ids=plannerPlaces.filter(p=>p.country===country&&venueFacts.some(v=>v.id===p.id)).map(p=>p.id),sources=usedSources(trip(country,ids));
  const supporting=[...entryPolicies.filter(p=>p.country===country).flatMap(p=>p.requirements),...venueFacts.filter(v=>ids.includes(v.id)).flatMap(v=>[...v.facts,...(v.exceptions||[])])].flatMap(f=>f.additionalSources||[]);
  for(const extra of supporting){const found=sources.find(s=>s.source===extra.url&&s.title===extra.name);assert.ok(found,extra.name);assert.equal(found.checked,extra.checked);assert.equal(found.published,extra.published);if(extra.access.includes('index'))assert.equal(factState(found,90,checked),'stale',extra.name);}
 }
});

test('practical English city keys match the chosen Arabic city without leaking to a different city or country',()=>{
 for(const [country,city,english] of [['CN','بكين','beijing'],['CN','شنغهاي','shanghai'],['MY','كوالالمبور','kuala-lumpur'],['GE','تبليسي','tbilisi']]){
  const expected=practicalFacts.filter(f=>f.country===country&&f.city===english),sources=usedSources(trip(country,[],[city]));assert.ok(expected.length);
  for(const f of expected)assert.ok(sources.some(s=>key(s)===key(f)),f.title);
  const other=practicalFacts.filter(f=>f.country!==country||f.city!==english);for(const f of other)assert.ok(!sources.some(s=>key(s)===key(f)),f.title);
  const venue=plannerPlaces.find(p=>p.country===country&&p.city===city);assert.ok(venue);
  const inferred=usedSources(trip(country,[venue.id]));for(const f of expected)assert.ok(inferred.some(s=>key(s)===key(f)),f.title);
 }
 const tioman=usedSources(trip('MY',[],['تيومان']));for(const f of practicalFacts)assert.ok(!tioman.some(s=>key(s)===key(f)));
});

test('the twelve venues and three policies carry explicit source dates, review dates and uncertainty metadata',()=>{
 assert.equal(venueFacts.length,12);assert.equal(new Set(venueFacts.map(v=>v.id)).size,12);
 assert.equal(entryPolicies.length,3);assert.deepEqual(entryPolicies.map(p=>p.country).sort(),['CN','GE','MY']);
 for(const p of entryPolicies){assert.equal(p.nationality,'SA');assert.equal(p.passportType,'ordinary');assert.equal(p.purpose,'tourism');assert.ok(p.requirements.length);}
 for(const v of venueFacts){assert.ok(v.facts.length);assert.equal(typeof v.scheduleVerified,'boolean');for(const d of [v.validFrom,v.validUntil])assert.ok(d===null||validDate(d),v.id);}
 for(const f of catalogFacts()){
  assert.ok(safeSource(f.source),f.title);assert.equal(f.checked,checked,f.title);assert.ok(f.scope&&f.sourceName&&f.verification,f.title);
  assert.ok(['published','updated','initial_publication','unknown'].includes(f.sourceDateType),f.title);
  if(f.sourceDateType==='unknown')assert.equal(f.published,'غير مذكور',f.title);else assert.ok(validDate(f.published)&&f.published<=f.checked,f.title);
  for(const extra of f.additionalSources||[]){assert.ok(safeSource(extra.url),extra.name);assert.equal(extra.checked,checked,extra.name);if(extra.dateType==='unknown')assert.equal(extra.published,'غير مذكور',extra.name);else assert.ok(validDate(extra.published)&&extra.published<=extra.checked,extra.name);}
 }
});

test('known publication dates remain distinct from URL dates, check dates and unsupported numeric rules',()=>{
 const facts=catalogFacts(),find=url=>facts.find(f=>f.source===url);
 assert.equal(find('https://sa.china-embassy.gov.cn/eng/gdxw/202511/t20251104_11746345.htm').published,'2025-11-04');
 assert.equal(find('https://cs.mfa.gov.cn/gyls/lsgz/fwxx/202511/t20251110_11749824.shtml').published,'غير مذكور','Do not manufacture a publication date from the URL');
 const bund=find('https://english.shanghai.gov.cn/en-ScenicSpots/20231205/584672cc6d044eabb5f7f6fc9049a19f.html');assert.equal(bund.published,'2025-08-13');assert.equal(bund.sourceDateType,'updated');
 const law=find('https://www.matsne.gov.ge/en/document/view/2278806');assert.equal(law.published,'2014-03-17');assert.equal(law.sourceDateType,'initial_publication');
 assert.equal(entryPolicies.find(p=>p.country==='CN').minPassportMonths,null);assert.equal(entryPolicies.find(p=>p.country==='MY').maxDays,null);assert.equal(entryPolicies.find(p=>p.country==='GE').maxDays,null);assert.equal(entryPolicies.find(p=>p.country==='GE').maxYears,1);
});
