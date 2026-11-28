import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});

const {fresh,validDate,safeSource,proofState,nationalityCode,entryBasis,budgetBasis,travelDates,entryChecks,routeBasis,venueBasis,routeKey,itineraryChecks,budgetReview,patchCharge,reviewTrip,chargeLabels}=await import('../lib/reliability.ts');
const {blankProfile,blankProof,blankCharge,blankVenue,blankTransfer,travelProfileSchema}=await import('../lib/reliability-schema.ts');
const {entryPolicies,venueFacts}=await import('../lib/reliability-catalog.ts');
const {newActivity,dataSchema,normalizeData,planSchemaVersion}=await import('../lib/planning.ts');
const now='2026-09-25',source='https://example.org/review-fixture',clone=structuredClone;
const day=(activities=[])=>({title:'يوم اختبار',notes:'ملاحظة محفوظة',activities});
function trip(){return {id:'reliability-test',name:'رحلة اختبار',origin:'الرياض',date:'2026-10-05',month:'',mode:'dates',days:'2',travelers:'2',budget:'5000',currency:'SAR',nationality:'سعودي',level:'متوسط',pace:'متوازن',interests:['الثقافة'],selected:'country-CN',compare:[],costs:{'country-CN':{rooms:'1'}},plans:{'country-CN':[day(),day()]},extras:{'country-CN':[]},travelProfile:{...blankProfile,purpose:'tourism',passportType:'ordinary',passportExpiry:'2027-12-31',transitMode:'none'},reliability:{'country-CN':{dayStart:'08:00',dayEnd:'20:00'}}};}
const activity=(id,patch={})=>({...newActivity(),id,title:id,place:'حي الاختبار',time:'09:00',duration:'60',location:{lat:39.9,lng:116.4,source:'user',updatedAt:now+'T00:00:00.000Z'},...patch});
const getReview=t=>t.reliability[t.selected];
const byId=(checks,id)=>checks.find(c=>c.id===id);
function withCatalog(array,rows,fn){const saved=array.slice();array.splice(0,array.length,...rows);try{return fn();}finally{array.splice(0,array.length,...saved);}}
const fact={title:'قاعدة اختبار اصطناعية',text:'وصف اختبار فقط',source,checked:now,published:'2026-01-01',scope:'نطاق fixture'};
const policy={country:'CN',nationality:'SA',passportType:'ordinary',purpose:'tourism',maxDays:30,countFromNextDay:false,validFrom:'2026-01-01',validUntil:'2026-12-31',minPassportMonths:6,headline:'قاعدة اختبار',requirements:[fact],caveat:'ليست موافقة دخول'};
const venue={id:'fixture-venue',open:'09:00',close:'17:00',lastEntry:'16:00',closedDays:[1],booking:'required',facts:[fact],validFrom:'2026-01-01',validUntil:'2026-12-31',scope:'معلم اختبار'};
function acknowledgeQuotes(t){getReview(t).proofs={...getReview(t).proofs,...Object.fromEntries(['stay','food','transport','activities','flight'].map(key=>['quote-'+key,{...blankProof,source,checked:now,basis:budgetBasis(t)}]))};return t;}
function pricedTrip(){const t=trip(),c=t.costs[t.selected];for(const [key,amount] of Object.entries({stay:'100',food:'10',transport:'5',activities:'20',flight:'200'}))Object.assign(c,{[key+'Low']:amount,[key+'High']:amount,[key+'Source']:source,[key+'Checked']:now});return acknowledgeQuotes(t);}
function acknowledgeCharges(t){getReview(t).charges=Object.fromEntries(Object.keys(chargeLabels).map(key=>[key,{...blankCharge,mode:'na',note:'لا ينطبق بحسب fixture المستخدم',basis:budgetBasis(t)}]));return acknowledgeQuotes(t);}

test('freshness uses calendar-valid dates, inclusive boundaries and rejects future checks or unsafe sources',()=>{
  assert.equal(fresh('2026-08-26',30,now),true);assert.equal(fresh('2026-08-25',30,now),false);
  for(const checked of ['', '2026-02-30','2026-09-26','not-a-date'])assert.equal(fresh(checked,30,now),false);
  assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2026-02-29'),false);
  assert.equal(safeSource(source),true);for(const s of ['http://example.org','https://user:pass@example.org','javascript:alert(1)',''])assert.equal(safeSource(s),false);
});

test('proofs remain user estimates and become stale after age or relevant basis changes',()=>{
  const t=trip(),basis=entryBasis(t),proof={...blankProof,source,checked:now,basis};
  assert.equal(proofState(undefined,basis,30,now),'missing');assert.equal(proofState(proof,basis,30,now),'estimate');
  assert.equal(proofState({...proof,source:''},basis,30,now),'missing');assert.equal(proofState({...proof,checked:'2026-08-25'},basis,30,now),'stale');
  for(const changed of [{...t,date:'2026-10-06'},{...t,nationality:'غير سعودي'},{...t,days:'3'},{...t,travelProfile:{...t.travelProfile,purpose:'study'}},{...t,travelProfile:{...t.travelProfile,transitMode:'countries',transits:['GB']}}])assert.equal(proofState(proof,entryBasis(changed),30,now),'stale');
});

test('Saudi applicability is exact and never inferred from residence or a negated nationality',()=>{
  for(const nationality of ['سعودي','السعودية','المملكة العربية السعودية','SA','saudi arabia',' سعودي '])assert.equal(nationalityCode({...trip(),nationality}),'SA');
  for(const nationality of ['غير سعودي','لست سعوديًا','مقيم بالسعودية','سعودي سابقًا','non Saudi','Saudi resident','مصري',''])assert.equal(nationalityCode({...trip(),nationality}),'');
  withCatalog(entryPolicies,[policy],()=>{
    assert.equal(byId(entryChecks(trip(),now),'entry-policy').state,'estimate');
    for(const t of [{...trip(),nationality:'غير سعودي'},{...trip(),travelProfile:{...trip().travelProfile,purpose:'study'}},{...trip(),travelProfile:{...trip().travelProfile,passportType:'other'}}])assert.equal(byId(entryChecks(t,now),'entry-policy').state,'missing');
  });
});

test('travel dates and entry validity never extend an expired rule or silently repair an impossible date',()=>{
  assert.deepEqual(travelDates({...trip(),date:'2026-12-31'}),{start:'2026-12-31',end:'2027-01-01',days:2});
  for(const patch of [{date:'2026-02-30'},{days:'0'},{days:'31'},{days:'1.5'},{mode:'flexible',month:'2026-10'}])assert.equal(travelDates({...trip(),...patch}),null);
  withCatalog(entryPolicies,[policy],()=>{
    assert.equal(byId(entryChecks({...trip(),date:'2026-12-30'},now),'entry-window').state,'checked');
    assert.equal(byId(entryChecks({...trip(),date:'2026-12-31'},now),'entry-window').state,'conflict');
    assert.equal(byId(entryChecks({...trip(),date:'2026-09-01'},now),'entry-past').state,'conflict');
    const short=trip();short.travelProfile.passportExpiry='2027-04-04';assert.equal(byId(entryChecks(short,now),'passport-expiry').state,'conflict');
  });
});

test('unknown transit needs review and an attested transit never becomes official clearance',()=>{
  const t=trip();t.travelProfile.transitMode='countries';t.travelProfile.transits=['GB'];
  assert.equal(byId(entryChecks(t,now),'transit-GB').state,'missing');
  getReview(t).proofs={'transit-GB':{...blankProof,source,checked:now,basis:entryBasis(t)}};
  assert.equal(byId(entryChecks(t,now),'transit-GB').state,'estimate');
  t.travelProfile.transits=[];assert.equal(byId(entryChecks(t,now),'transit').state,'missing');
});

test('itinerary detects missing duration, day-count mismatch, overlapping times and midnight overflow',()=>{
  const t=trip();t.plans[t.selected]=[day([activity('a',{duration:'120'}),activity('b',{time:'10:00'}),activity('c',{time:'23:30',duration:'60'}),activity('d',{time:'',duration:''})])];
  const before=clone(t),checks=itineraryChecks(t,now);
  for(const [id,state] of [['length','conflict'],['overlap-a>b','conflict'],['midnight-c','conflict'],['time-d','missing'],['window-c','conflict']])assert.equal(byId(checks,id)?.state,state,id);
  assert.deepEqual(t,before);
});

test('known venue closure, admission deadline and matching reservation are checked by visit date',()=>{
  withCatalog(venueFacts,[venue],()=>{
    const t=trip(),a=activity('a',{venueId:venue.id,time:'16:30',duration:'30'});t.plans[t.selected][0].activities=[a];
    let checks=itineraryChecks(t,now);assert.equal(byId(checks,'closed-a').state,'conflict');assert.equal(byId(checks,'hours-a').state,'conflict');assert.equal(byId(checks,'booking-a').state,'missing');
    t.date='2026-10-06';a.time='10:00';a.bookingId='booking';t.bookings=[{id:'booking',type:'activity',title:'حجز اختبار',provider:'اختبار',date:t.date,endDate:'',time:'10:00',location:'',url:source,note:'',status:'confirmed'}];
    checks=itineraryChecks(t,now);assert.equal(byId(checks,'hours-a').state,'checked');assert.equal(byId(checks,'closed-a'),undefined);assert.equal(byId(checks,'booking-a').state,'estimate');
    t.bookings[0].status='cancelled';assert.equal(byId(itineraryChecks(t,now),'booking-link-a').state,'conflict');
    t.bookings[0].status='confirmed';t.bookings[0].date='2026-10-07';assert.equal(byId(itineraryChecks(t,now),'booking-date-a').state,'conflict');
  });
});

test('venue facts whose review is stale cannot show a green booking requirement result',()=>{
  withCatalog(venueFacts,[{...venue,booking:'not_required',facts:[{...fact,checked:'2026-08-01'}]}],()=>{
    const t=trip();t.date='2026-10-06';t.plans[t.selected][0].activities=[activity('a',{venueId:venue.id})];
    const checks=itineraryChecks(t,now);assert.equal(byId(checks,'hours-a').state,'stale');
    assert.notEqual(byId(checks,'booking-a').state,'checked','An expired review cannot certify no booking is needed');
  });
});

test('transfer gaps include rest and become stale when date or locations change',()=>{
  const t=trip(),a=activity('a'),b=activity('b',{time:'10:20'});t.plans[t.selected][0].activities=[a,b];
  const key=routeKey(a,b);assert.equal(byId(itineraryChecks(t,now),'route-'+key).state,'missing');
  getReview(t).transfers={[key]:{...blankTransfer,minutes:'20',rest:'10',mode:'transit',source,checked:now,basis:routeBasis(t,0,a,b)}};
  let checks=itineraryChecks(t,now);assert.equal(byId(checks,'gap-'+key).state,'conflict');assert.equal(byId(checks,'route-'+key).state,'estimate');
  t.date='2026-10-06';checks=itineraryChecks(t,now);assert.equal(byId(checks,'route-'+key).state,'stale');
  assert.notEqual(routeBasis(t,0,a,b),routeBasis(t,0,a,{...b,location:{...b.location,lat:40}}));
});

test('manual venue evidence is bound to the activity name, venue, place, location and visit day',()=>{
  const t=trip(),a=activity('manual-place');t.plans[t.selected][0].activities=[a];
  getReview(t).venues={[a.id]:{...blankVenue,source,checked:now,visitDate:t.date,open:'08:00',close:'18:00',booking:'not_required',basis:venueBasis(t,0,a)}};
  const checks=itineraryChecks(t,now);assert.equal(byId(checks,'manual-'+a.id),undefined);assert.equal(byId(checks,'hours-'+a.id).state,'checked');
  const before=clone(t);
  for(const patch of [{title:'اسم مكان آخر'},{place:'حي آخر'},{venueId:'another-venue'},{location:{...a.location,lat:40}}]){
    const changed=clone(t);Object.assign(changed.plans[changed.selected][0].activities[0],patch);
    assert.equal(byId(itineraryChecks(changed,now),'manual-'+a.id).state,'stale');
    assert.notEqual(byId(itineraryChecks(changed,now),'hours-'+a.id).state,'checked');
  }
  const moved=clone(t);moved.plans[moved.selected][1].activities=moved.plans[moved.selected][0].activities;moved.plans[moved.selected][0].activities=[];
  assert.equal(byId(itineraryChecks(moved,now),'manual-'+a.id).state,'stale');
  const later={...t,date:'2026-10-06'};assert.equal(byId(itineraryChecks(later,now),'manual-'+a.id).state,'stale');
  assert.deepEqual(t,before);
});

test('transfer evidence becomes stale when either appointment time or preceding duration changes',()=>{
  const t=trip(),a=activity('a'),b=activity('b',{time:'11:00'});t.plans[t.selected][0].activities=[a,b];
  const key=routeKey(a,b);getReview(t).transfers={[key]:{...blankTransfer,minutes:'20',rest:'10',mode:'transit',source,checked:now,basis:routeBasis(t,0,a,b)}};
  assert.equal(byId(itineraryChecks(t,now),'route-'+key).state,'estimate');
  for(const [index,patch] of [[0,{time:'09:30'}],[0,{duration:'90'}],[1,{time:'11:30'}]]){
    const changed=clone(t);Object.assign(changed.plans[changed.selected][0].activities[index],patch);
    assert.equal(byId(itineraryChecks(changed,now),'route-'+key).state,'stale');
  }
});

test('travel profile permits explicitly unknown routing but rejects unknown or repeated transit countries',()=>{
  assert.ok(travelProfileSchema.safeParse(blankProfile).success);
  assert.ok(travelProfileSchema.safeParse({...blankProfile,transitMode:'countries',transits:['GB','JP']}).success);
  for(const transits of [['ZZ'],['unknown'],['gb'],['GB','GB'],['GB','JP','CN','MY','GE']])assert.equal(travelProfileSchema.safeParse({...blankProfile,transitMode:'countries',transits}).success,false,JSON.stringify(transits));
});

test('budget keeps unknown separate from zero and counts each existing extra once without adding actual expenses again',()=>{
  const t=pricedTrip();t.extras[t.selected]=[{id:'shared-fee',title:'رسم شامل',category:'fees',planned:'50'}];t.expenses={[t.selected]:[{id:'paid',title:'دفعة سابقة',category:'flight',amount:'200',date:now,note:''}]};
  acknowledgeCharges(t);const basis=budgetBasis(t);
  for(const key of ['taxes','baggage'])getReview(t).charges[key]={...blankCharge,mode:'extra',extraId:'shared-fee',source,checked:now,basis};
  getReview(t).charges.airport={...blankCharge,mode:'included',includedIn:'transport',source,checked:now,basis};
  const before=clone(t),result=budgetReview(t,now);assert.equal(result.low,690);assert.equal(result.high,690);assert.equal(result.complete,true);assert.deepEqual(t,before);
  getReview(t).charges.baggage={...blankCharge};assert.equal(budgetReview(t,now).complete,false);assert.equal(byId(budgetReview(t,now).checks,'charge-baggage').state,'missing');
  t.costs[t.selected].foodLow='';assert.equal(byId(budgetReview(t,now).checks,'base-food').state,'missing');
  t.costs[t.selected].foodLow='0';t.costs[t.selected].foodHigh='0';assert.notEqual(byId(budgetReview(t,now).checks,'base-food').state,'missing');
});

test('budget precision supports KWD, rejects historical fractional JPY in calculations and flags reversed ranges',()=>{
  const kwd=pricedTrip();kwd.currency='KWD';for(const key of ['stay','food','transport','activities','flight'])kwd.costs[kwd.selected][key+'Low']=kwd.costs[kwd.selected][key+'High']='0.001';
  acknowledgeCharges(kwd);assert.equal(budgetReview(kwd,now).low,0.015);
  const jpy=pricedTrip();jpy.currency='JPY';jpy.costs[jpy.selected].foodLow=jpy.costs[jpy.selected].foodHigh='1.5';assert.equal(byId(budgetReview(jpy,now).checks,'base-food').state,'missing');
  const reversed=pricedTrip();reversed.costs[reversed.selected].stayHigh='99';assert.equal(byId(budgetReview(reversed,now).checks,'base-stay').state,'conflict');
});

test('budget evidence becomes stale when traveler count, units, currency or an extra amount changes',()=>{
  const t=pricedTrip();t.extras[t.selected]=[{id:'fee',title:'رسم',category:'fees',planned:'20'}];
  acknowledgeQuotes(t);assert.ok(budgetReview(t,now).checks.filter(c=>c.id.startsWith('base-')).every(c=>c.state==='estimate'));
  const newDate={...t,date:'2026-10-06'};assert.ok(budgetReview(newDate,now).checks.filter(c=>c.id.startsWith('base-')).every(c=>c.state==='stale'),'Changing the travel date must invalidate all five saved quote reviews');
  const basis=budgetBasis(t),proof={...blankProof,source,checked:now,basis};
  for(const transform of [x=>x.travelers='3',x=>x.currency='KWD',x=>x.days='3',x=>x.costs[x.selected].rooms='2',x=>x.costs[x.selected].stayLow='101',x=>x.extras[x.selected][0].planned='21']){const next=clone(t);transform(next);assert.equal(proofState(proof,budgetBasis(next),7,now),'stale');}
});

test('patchCharge creates one extra, edits it without duplication and does not mutate the original trip',()=>{
  const t=trip(),before=clone(t),patch=patchCharge(t,'taxes',{mode:'extra'},'25');assert.deepEqual(t,before);
  const next={...t,...patch},id=getReview(next).charges.taxes.extraId;assert.ok(id);assert.equal(next.extras[next.selected].length,1);assert.equal(next.extras[next.selected][0].planned,'25');
  const edit=patchCharge(next,'taxes',{},'30');assert.equal(edit.extras[next.selected].length,1);assert.equal(edit.extras[next.selected][0].id,id);assert.equal(edit.extras[next.selected][0].planned,'30');
  assert.throws(()=>patchCharge(t,'not-a-charge',{mode:'extra'},'5'));assert.deepEqual(t,before);
});

test('switching one shared charge to included must preserve the extra still referenced by another charge',()=>{
  const t=pricedTrip();t.extras[t.selected]=[{id:'shared-fee',title:'رسوم مشتركة',category:'fees',planned:'50'}];
  getReview(t).charges={taxes:{...blankCharge,mode:'extra',extraId:'shared-fee'},baggage:{...blankCharge,mode:'extra',extraId:'shared-fee'}};
  const before=clone(t),patch=patchCharge(t,'taxes',{mode:'included',includedIn:'flight'});
  assert.ok(patch.extras[t.selected].some(e=>e.id==='shared-fee'),'A charge mode change must not delete another charge\'s referenced amount');assert.deepEqual(t,before);
});

test('missing input and unknown coverage cannot yield an all-green or ready-to-book report',()=>{
  const t=trip();t.nationality='';t.travelProfile={...blankProfile};t.plans[t.selected]=[];t.costs[t.selected]={};
  const before=clone(t),report=reviewTrip(t,now);
  assert.ok(report.counts.missing>0);assert.ok(report.checks.some(c=>c.group==='entry'&&c.state==='missing'));assert.ok(report.checks.some(c=>c.group==='days'&&c.state==='missing'));assert.ok(report.checks.some(c=>c.group==='budget'&&c.state==='missing'));
  for(const key of ['ready','readyToBook','approved','safeToTravel'])assert.equal(Object.hasOwn(report,key),false);
  assert.equal(budgetReview(t,now).complete,false);assert.deepEqual(t,before);
});

test('v9 trips remain compatible and v10 review fields survive schema normalization without altering old notes',()=>{
  const legacy=trip();delete legacy.travelProfile;delete legacy.reliability;legacy.plans[legacy.selected][0].notes='ن'.repeat(2000);
  const normalized=normalizeData({schemaVersion:9,activeId:legacy.id,trips:[legacy]});assert.equal(normalized.schemaVersion,planSchemaVersion);assert.deepEqual(normalized.trips[0],legacy);
  const current=trip();getReview(current).proofs={entry:{...blankProof,source,checked:now,basis:entryBasis(current)}};
  const parsed=dataSchema.parse({schemaVersion:planSchemaVersion,activeId:current.id,trips:[current]});assert.deepEqual(parsed.trips[0],current);
});
