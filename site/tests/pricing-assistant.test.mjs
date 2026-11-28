import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {newActivity,normalizeData,dataSchema,planSchemaVersion}=await import('../lib/planning.ts');
const {parsePlanCommand,proposePlanEdit,applyPlanEdit}=await import('../lib/itinerary-assistant.ts');
const {priceWatchSchema,safePriceUrl,validPriceDate}=await import('../lib/price-watch-schema.ts');
const {priceTripBasis,quoteTotal,watchSummary,addPriceObservation,priceReviewCalendar,comparableSearches,priceBudgetPatch}=await import('../lib/price-watch.ts');
const {saveRouteReview}=await import('../lib/route-review.ts');
const {routeBasis,routeKey,budgetBasis}=await import('../lib/reliability.ts');
const {parseBackup}=await import('../lib/backup.ts');
const {findPlace}=await import('../lib/place-catalog.ts');
const {placeAvailability}=await import('../lib/place-scheduling.ts');
const {placeReferences}=await import('../lib/place-references.ts');
const now=new Date('2026-09-27T09:00:00Z');
const day=(activities=[])=>({title:'يوم محفوظ',notes:'ملاحظات لا تضيع',activities});
const act=(title,patch={})=>({...newActivity(),title,notes:'تفاصيل أصلية',...patch});
function trip(p={}){return {id:'pricing-test',name:'اختبار فقط',origin:'الرياض',date:'2026-10-13',month:'',mode:'dates',days:'3',travelers:'2',budget:'5000',currency:'SAR',nationality:'',level:'',pace:'متوازن',interests:[],selected:'country-CN',compare:[],costs:{'country-CN':{foodLow:'50',rooms:'1'}},plans:{'country-CN':[day([act('أ'),act('ب')]),day(),day()]},ideas:{},...p};}
function watch(t=trip(),p={}){return priceWatchSchema.parse({id:crypto.randomUUID(),kind:'flight',title:'اختبار تسعير',destinationId:t.selected,origin:t.origin,destination:'بكين',start:t.date,end:'2026-10-15',travelers:Number(t.travelers),rooms:1,currency:t.currency,target:'',nextReview:'2026-09-27',reviewEveryDays:3,active:true,createdAt:now.toISOString(),tripBasis:priceTripBasis(t),observations:[],...p});}
const quote=(p={})=>({amount:'1200',unit:'personRoundTrip',observedOn:'2026-09-27',source:'https://www.google.com/travel/flights',taxes:'included',conditions:'اختبار فقط: أمتعة وشروط متماثلة',...p});
test('Arabic bounded commands reject ambiguous names and unsupported requests',()=>{
 const ds=[day([act('متحف')]),day()];
 assert.deepEqual(parsePlanCommand('خَفّف اليوم الثاني',ds),{kind:'lighten',day:2});
 assert.deepEqual(parsePlanCommand('رتب اليوم ٢ حسب القرب',ds),{kind:'nearby',day:2});
 assert.equal(parsePlanCommand('خل المتاحف بيوم واحد',ds).kind,'museums');
 assert.equal(parsePlanCommand('انقل متحف إلى اليوم ٢',ds).activityId,ds[0].activities[0].id);
 for(const q of ['احجز لي','خفف اليوم صفر','خفف اليوم ٥'])assert.throws(()=>parsePlanCommand(q,ds));
 assert.throws(()=>parsePlanCommand('انقل متحف لليوم ٢',[ds[0],day([act('متحف')])]));
});
test('preview is nonmutating; apply moves one optional activity and preserves every note',async()=>{
 const t=trip(),before=structuredClone(t),draft=await proposePlanEdit(t,'خفف اليوم الأول');
 assert.deepEqual(t,before);assert.equal(draft.changes.length,1);assert.ok(draft.warnings.some(s=>s.includes('مدد')));
 const patch=await applyPlanEdit({...t,planEdit:draft},draft),days=patch.plans[t.selected];
 assert.equal(days[0].activities.length,1);assert.equal(days[1].activities.length,1);
 assert.deepEqual(days.flatMap(d=>d.activities).sort((a,b)=>a.id.localeCompare(b.id)),before.plans[t.selected].flatMap(d=>d.activities).sort((a,b)=>a.id.localeCompare(b.id)));
 assert.deepEqual(days.map(d=>d.notes),before.plans[t.selected].map(d=>d.notes));assert.equal(patch.planEdit,undefined);assert.equal(patch.costs,undefined);
 await assert.rejects(applyPlanEdit({...t,...patch},draft));
});
test('assistant rejects stale/tampered previews and protects timed booked completed or essential activities',async()=>{
 const t=trip(),d=await proposePlanEdit(t,'خفف اليوم الأول'),active={...t,planEdit:d};
 await assert.rejects(applyPlanEdit({...active,date:'2026-10-14'},d));
 await assert.rejects(applyPlanEdit(active,{...d,request:'تلاعب'}));
 for(const patch of [{time:'09:00'},{bookingId:'booking'},{done:true},{priority:'essential'}]){
  const a=act('أ',patch),b=act('ب',patch),x=trip({plans:{'country-CN':[day([a,b]),day(),day()]}});
  await assert.rejects(proposePlanEdit(x,'خفف اليوم الأول'));
  if(!patch.priority)await assert.rejects(proposePlanEdit(x,'انقل أ إلى اليوم الثاني'));
 }
});
test('museum grouping respects capacity, city and source closure restrictions',async()=>{
 const a=act('متحف أ'),b=act('متحف ب'),t=trip({plans:{'country-CN':[day([a]),day([b]),day()]}});
 const d=await proposePlanEdit(t,'اجمع المتاحف في يوم واحد');assert.equal(d.changes.length,1);
 await assert.rejects(proposePlanEdit({...t,pace:'هادئ'},'اجمع المتاحف في يوم واحد'));
 const c=trip({plans:{'country-CN':[day([act('متحف القصر',{venueId:'cn-beijing-palace-museum'})]),day([act('متحف شنغهاي',{venueId:'cn-shanghai-museum-peoples-square'})]),day()]}});
 await assert.rejects(proposePlanEdit(c,'اجمع المتاحف في يوم واحد'));
 const monday=trip({date:'2026-10-12',plans:{'country-CN':[day(),day([act('متحف القصر',{venueId:'cn-beijing-palace-museum'})]),day()]}});
 await assert.rejects(proposePlanEdit(monday,'انقل متحف القصر إلى اليوم الأول'));
});
test('price totals normalize people and rooms/nights without assuming unknown prices',()=>{
 const w=watch(),o=quote();assert.equal(quoteTotal(w,o),2400);
 assert.equal(quoteTotal(w,{...o,unit:'groupRoundTrip'}),1200);
 const stay=watch(trip(),{kind:'stay',rooms:2});assert.equal(quoteTotal(stay,quote({amount:'100.50',unit:'roomNight'})),402);
 assert.equal(quoteTotal(stay,quote({amount:'402',unit:'wholeStay'})),402);
 assert.equal(quoteTotal(w,quote({amount:''})),null);
 assert.equal(quoteTotal(watch(trip({currency:'KWD'})),quote({amount:'1.001'})),2.002);
});
test('price schema rejects mismatched units, impossible dates, duplicate observations and bad precision',()=>{
 const w=addPriceObservation(watch(),quote(),now);
 for(const patch of [{start:'2026-02-30'},{end:'2026-10-01'},{origin:''},{currency:'JPY',observations:[{...w.observations[0],amount:'1.1'}]},{observations:[{...w.observations[0],unit:'wholeStay'}]},{observations:[...w.observations,...w.observations]}])assert.equal(priceWatchSchema.safeParse({...w,...patch}).success,false);
 assert.equal(validPriceDate('2026-02-29'),false);assert.equal(validPriceDate('2028-02-29'),true);
 for(const url of ['javascript:alert(1)','http://example.com','https://a:b@example.com','https://example.com?token=secret'])assert.equal(safePriceUrl(url),false);
 assert.throws(()=>addPriceObservation(w,quote({observedOn:'2026-09-28'}),now));
});
test('price history sorts by observation date and only compares identical documented terms',()=>{
 let w=addPriceObservation(watch(),quote({observedOn:'2026-09-26'}),now);
 w=addPriceObservation(w,quote({amount:'1100'}),now);let s=watchSummary(w,'2026-09-27');assert.equal(s.current,2200);assert.equal(s.delta,-200);assert.equal(w.nextReview,'2026-09-30');
 for(const q of [{conditions:''},{conditions:'شروط مختلفة'},{taxes:'unknown'}]){const x=addPriceObservation(w,quote(q),new Date('2026-09-27T10:00:00Z'));assert.equal(watchSummary(x,'2026-09-27').delta,null);}
 const past=addPriceObservation(w,quote({amount:'800',observedOn:'2026-09-20'}),now);assert.equal(watchSummary(past,'2026-09-27').current,2200);
 const future={...w,observations:[...w.observations,{...w.observations[0],id:crypto.randomUUID(),observedOn:'2026-10-01',amount:'1'}]};assert.equal(watchSummary(future,'2026-09-27').current,2200);assert.equal(watchSummary(future,'2026-09-27').future,true);
 assert.equal(watchSummary({...w,nextReview:'2026-09-27'},'2026-09-27').due,true);assert.equal(watchSummary({...w,active:false},'2026-10-01').due,false);
});
test('date alternatives require the same party, currency and hotel stay length',()=>{
 const w=watch();assert.ok(comparableSearches(w,{...w,start:'2026-11-13',end:'2026-11-15'}));
 for(const p of [{travelers:1},{currency:'USD'},{destination:'شنغهاي'},{kind:'stay'}])assert.equal(comparableSearches(w,{...w,...p}),false);
 const s=watch(trip(),{kind:'stay'});assert.equal(comparableSearches(s,{...s,end:'2026-10-16'}),false);assert.equal(comparableSearches(s,{...s,rooms:2}),false);
});
test('calendar export is one escaped reminder with UTF-8 folding and no background tracking',()=>{
 const w=watch(trip(),{title:'سعر؛,\nاختبار '+ 'سفر '.repeat(25)}),ics=priceReviewCalendar(w,now);
 assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,1);assert.match(ics,/DTSTART;VALUE=DATE:20260927/);assert.match(ics,/DTEND;VALUE=DATE:20260928/);assert.ok(!ics.includes('RRULE'));assert.ok(ics.includes('\\n'));
 for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
 assert.throws(()=>priceReviewCalendar({...w,active:false}));
});
test('budget use requires fresh matching inclusive quotes and preserves other spending data',()=>{
 const t=trip(),w=addPriceObservation(watch(t),quote(),now),before=structuredClone(t),p=priceBudgetPatch(t,w,'2026-09-27');
 assert.deepEqual(t,before);assert.equal(p.costs[t.selected].flightLow,'1200.00');assert.equal(p.costs[t.selected].foodLow,'50');assert.equal(p.reliability[t.selected].proofs['quote-flight'].basis,budgetBasis({...t,costs:p.costs}));
 for(const patch of [{travelers:'3'},{currency:'USD'},{date:'2026-10-14'},{days:'4'}])assert.throws(()=>priceBudgetPatch({...t,...patch},w,'2026-09-27'));
 for(const q of [{taxes:'excluded'},{conditions:''},{unit:'groupRoundTrip',amount:'100.01'},{observedOn:'2026-09-01'}])assert.throws(()=>priceBudgetPatch(t,addPriceObservation(watch(t),quote(q),now),'2026-09-27'));
 const stay=addPriceObservation(watch(t,{kind:'stay',rooms:2}),quote({unit:'roomNight',amount:'300'}),now),p2=priceBudgetPatch(t,stay,'2026-09-27');assert.equal(p2.costs[t.selected].stayLow,'300.00');assert.equal(p2.costs[t.selected].rooms,'2');
});
test('schema migration preserves new records and old trip notes; future versions are refused',async()=>{
 const t=trip(),d=await proposePlanEdit(t,'خفف اليوم الأول'),w=addPriceObservation(watch(t),quote(),now),raw={schemaVersion:10,activeId:t.id,trips:[{...t,planEdit:d,priceWatches:[w]}]};
 const current=normalizeData(raw);assert.equal(current.schemaVersion,planSchemaVersion);assert.deepEqual(current.trips[0].planEdit,d);assert.deepEqual(current.trips[0].priceWatches,[w]);assert.deepEqual(parseBackup(JSON.stringify(current)),current);
 assert.equal(dataSchema.safeParse(raw).success,false);assert.throws(()=>normalizeData({...raw,schemaVersion:planSchemaVersion+1}));assert.throws(()=>parseBackup(JSON.stringify({...raw,schemaVersion:planSchemaVersion+1})));
});
test('route review binds exact adjacent places and rejects blank time, invalid source and future review',()=>{
 const a=act('أ',{location:{lat:39,lng:116,source:'user',updatedAt:now.toISOString()}}),b=act('ب',{location:{lat:39.1,lng:116.1,source:'user',updatedAt:now.toISOString()}}),t=trip({plans:{'country-CN':[day([a,b]),day(),day()]}}),v={minutes:'25',rest:'0',mode:'transit',source:'https://www.google.com/maps/',checked:'2026-09-27',basis:''};
 const p=saveRouteReview(t,0,a.id,b.id,v,'2026-09-27'),saved=p.reliability[t.selected].transfers[routeKey(a,b)];assert.equal(saved.basis,routeBasis(t,0,a,b));assert.equal(saved.rest,'0');assert.notEqual(saved.basis,routeBasis(t,1,a,b));assert.notEqual(saved.basis,routeBasis(t,0,{...a,time:'10:00'},b));
 for(const x of [{minutes:''},{rest:''},{mode:''},{source:'javascript:x'},{checked:'2026-09-28'},{minutes:'1441'}])assert.throws(()=>saveRouteReview(t,0,a.id,b.id,{...v,...x},'2026-09-27'));
 assert.throws(()=>saveRouteReview(t,0,b.id,a.id,v,'2026-09-27'));
});
test('official closure records survive the shared place catalog and block that date',()=>{
 assert.equal(placeAvailability(findPlace('sg-cloud'),'2026-10-26').blocked,true);
 assert.ok(placeReferences('sg-cloud').some(r=>r.card.id==='place-review-update-sg-cloud'&&r.relation==='place'));
});
