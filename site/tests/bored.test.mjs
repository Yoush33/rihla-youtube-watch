import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});

const {boredResults,compareBoredRanks,defaultBoredSettings,boredTravelMonth} = await import('../lib/bored.ts');
const {boredSchema} = await import('../lib/bored-schema.ts');
const {initialTripCards} = await import('../lib/trip-card-data.ts');
const {cardMoney,cardNumber,cardYear,copyCardGroup} = await import('../lib/trip-card.ts');
const {normalizeData,planSchemaVersion} = await import('../lib/planning.ts');
const today = '2026-11-25';
const rank = (settings={},cards=initialTripCards,date=today) => boredResults(cards,{...defaultBoredSettings,...settings},date);
const find = (result,id) => result.candidates.find(option => option.trip.id === id);

test('uses destination seasons and lets shorter journeys move up in the ranking',()=>{
  const cards = structuredClone(initialTripCards);
  // Complete Antalya's estimate in this scenario so all four cities compete on route and season.
  cards.groups[0].trips[0].costs.visa.value = 0;
  const result = rank({},cards);
  const ordered = result.candidates.map(option => option.trip.id);
  assert.ok(ordered.slice(0,3).includes('ayt'));
  for (const farther of ['goa','kbv']) {
    assert.ok(ordered.includes(farther));
    assert.ok(ordered.indexOf('ayt') < ordered.indexOf(farther));
    assert.ok(ordered.indexOf('vkl') < ordered.indexOf(farther));
  }
  assert.equal(find(result,'ayt').season,1);
  assert.equal(find(result,'vkl').season,2);
  assert.ok(result.excluded.some(item=>item.city==='تبليسي'&&item.season));
  assert.deepEqual(rank({month:7,types:['sea']}).candidates.map(x=>x.trip.id).sort(),['bus','ist']);
  assert.equal(rank({types:[]}).candidates.length,0);
  const constrained = rank({budget:3200}).candidates.filter(option=>!option.estimate.partial);
  assert.ok(constrained.some(option=>option.over));
  assert.deepEqual(constrained.map(option=>option.over), constrained.map(option=>option.over).sort());
  assert.deepEqual(initialTripCards.groups[0].trips.map(x=>x.id),['ayt','ist','tbs']);
});

test('partial prices rank below complete totals and do not score by amount or budget',()=>{
  const result = rank();
  const antalya = find(result,'ayt');
  assert.equal(antalya.estimate.partial,true);
  assert.equal(antalya.estimate.total,3198);
  const complete = result.candidates.filter(option=>!option.estimate.partial);
  assert.ok(complete.some(option=>option.over));
  assert.deepEqual(result.candidates.slice(0,complete.length),complete);
  assert.ok(complete.every(option=>compareBoredRanks(option,antalya) < 0));

  const cards = structuredClone(initialTripCards);
  cards.groups[0].trips[0].costs.flight.value = 5000;
  const changed = find(rank({},cards),'ayt');
  assert.equal(changed.over,true);
  assert.notEqual(changed.estimate.total,antalya.estimate.total);
  assert.equal(compareBoredRanks(changed,antalya),0);
});

test('subtracts points per hour past eight with a stronger penalty through four days',()=>{
  const short = rank();
  const long = rank({days:5});
  assert.equal(find(short,'ayt').routeScore,find(long,'ayt').routeScore);
  for (const id of ['vkl','goa','kbv']) {
    const option = find(short,id);
    const walkingBonus = option.walk ? 40 : 0;
    assert.equal(option.routeScore,walkingBonus - (option.profile.hours - 8) * 25);
    assert.equal(find(long,id).routeScore,walkingBonus - (option.profile.hours - 8) * 12);
    const budgetPoints = option.estimate.partial ? 0 : 1000;
    const costPenalty = option.estimate.partial ? 0 : option.estimate.total / 100;
    assert.equal(option.score,budgetPoints + 100 + 2 * 60 + option.routeScore - costPenalty);
  }
});

test('estimates use per-night and per-day rates and saved amount edits',()=>{
  const original = find(rank(),'vkl').estimate.total;
  assert.equal(original,3750.75);
  assert.equal(find(rank({days:5}),'vkl').estimate.total,4094);
  const cards = structuredClone(initialTripCards);
  cards.groups[1].trips[0].costs.daily.value = 200;
  assert.equal(find(rank({},cards),'vkl').estimate.total,original + 80*4);
  const durationShort = find(rank(),'goa');
  const durationLong = find(rank({days:7}),'goa');
  assert.ok(durationShort.routeScore < durationLong.routeScore);
});

test('shows date mismatch separately from aged prices and selects the matching saved group',()=>{
  assert.equal(boredTravelMonth(1,today),'2027-01');
  const original = find(rank({month:1}),'vkl');
  assert.equal(original.offMonth,true);
  assert.equal(original.outsideQuotePeriod,true);
  assert.equal(original.quotesNeedReview,false);
  const cards = structuredClone(initialTripCards);
  const copy = copyCardGroup(cards.groups[1],'jan-test','2027-01-05','2027-01-08');
  copy.trips[0].costs.flight.value = 1500;
  cards.groups.push(copy);
  const saved = find(rank({month:1},cards),'vkl');
  assert.equal(saved.group.id,'jan-test');
  assert.equal(saved.offMonth,false);
  assert.equal(saved.outsideQuotePeriod,true);
  assert.equal(saved.quotesNeedReview,true);
  assert.equal(find(rank({},initialTripCards,'2026-12-02'),'vkl').quotesNeedReview,true);
});

test('the December quote period accepts four or five days and warns at seven',()=>{
  for (const days of [4,5,7]) {
    const {candidates} = rank({days});
    assert.ok(candidates.length > 0);
    assert.ok(candidates.every(option => option.outsideQuotePeriod === (days === 7)));
  }
});

test('displays prices in whole riyals and preserves decimal travel time and ungrouped years',()=>{
  assert.equal(cardMoney(3750.75),'٣٬٧٥١ ر.س');
  assert.equal(cardNumber(6.5),'٦٫٥');
  assert.equal(cardYear(2026),'٢٠٢٦');
});

test('miles use only the saved cash fee and fall back when unavailable',()=>{
  const opts = {types:['sea'],miles:true,month:5};
  const cash = find(rank({...opts,miles:false}),'ist');
  const miles = find(rank(opts),'ist');
  assert.equal(miles.useMiles,true);
  assert.equal(miles.estimate.total,cash.estimate.total-918+500);
  assert.equal(miles.estimate.milesPending,true);
  assert.equal(find(rank(opts),'ayt').useMiles,false);
  const cards = structuredClone(initialTripCards);
  cards.groups[0].trips[1].costs.milesCash.value = null;
  assert.equal(find(rank(opts,cards),'ist').estimate.total,cash.estimate.total);
  assert.equal(find(rank(opts,cards),'ist').useMiles,false);
});

test('saved preferences and HTTP links round-trip without changing old plan records',()=>{
  const oldTrip={id:'test',name:'اختبار',origin:'',date:'',month:'',mode:'dates',days:'',travelers:'',budget:'',currency:'',nationality:'',level:'',pace:'',interests:[],selected:'',compare:[],costs:{},plans:{}};
  const old = {schemaVersion:11,activeId:'test',trips:[oldTrip]};
  const bored = {settings:defaultBoredSettings, links:{goa:['https://example.com/thread']}};
  assert.deepEqual(normalizeData(old),{...old,schemaVersion:planSchemaVersion});
  assert.deepEqual(normalizeData({...old,bored}).bored,bored);
  assert.equal(boredSchema.safeParse({...bored,links:{ist:['javascript:alert(1)']}}).success,false);
  assert.equal(boredSchema.safeParse({...bored,links:{ist:['https://name:password@example.com']}}).success,false);
});
