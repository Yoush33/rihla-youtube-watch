import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});

const {initialTripCards,tripCardsWithDefaults}=await import('../lib/trip-card-data.ts');
const {tripCardsSchema}=await import('../lib/trip-card-schema.ts');
const {normalizeData,planSchemaVersion}=await import('../lib/planning.ts');
const {cardCosts,cardDays,cardMoney,cardSummary,costForTripDays,costNeedsReview,copyCardGroup,todayInRiyadh}=await import('../lib/trip-card.ts');
const [near,india]=initialTripCards.groups;
const [antalya,istanbul]=near.trips;

test('historical group totals match the inputs in their original order',()=>{
  assert.equal(tripCardsSchema.safeParse(initialTripCards).success,true);
  assert.equal(initialTripCards.budget,5000);
  assert.deepEqual(near.trips.map(trip=>cardCosts(near,trip).total),[3694,3842,3583]);
  assert.deepEqual(india.trips.map(trip=>cardCosts(india,trip).total),[4094,4392,3336]);
  assert.equal(cardCosts(near,antalya).partial,true);
  assert.equal(cardCosts(india,india.trips[0]).partial,false);
});

test('miles count stays outside the SAR total and blank fees are distinguished from zero',()=>{
  const trip=structuredClone(istanbul);
  trip.mode='miles';
  assert.equal(cardCosts(near,trip).total,3424);
  assert.equal(cardCosts(near,trip).milesPending,true);
  trip.costs.milesCount.value=25000;
  assert.equal(cardCosts(near,trip).total,3424);
  assert.equal(cardCosts(near,trip).milesPending,false);
  trip.costs.milesCash.value=null;
  assert.equal(cardCosts(near,trip).milesPending,true);
  assert.equal(cardCosts(near,trip).total,2924);
  trip.costs.milesCash.value=0;
  assert.equal(cardCosts(near,trip).milesPending,false);
  assert.equal(cardCosts(near,{...trip,milesRoute:'unavailable'}).total,3842);
});

test('cost freshness uses Riyadh dates and flips after the seventh day',()=>{
  const cost=antalya.costs.flight;
  assert.equal(todayInRiyadh(new Date('2026-11-30T22:00:00Z')),'2026-12-01');
  assert.equal(costNeedsReview('flight',cost,'2026-12-01'),false);
  assert.equal(costNeedsReview('flight',cost,'2026-12-02'),true);
  assert.equal(costNeedsReview('spa',antalya.costs.spa,'2026-11-24'),true);
  assert.equal(costNeedsReview('daily',antalya.costs.daily,'2026-12-02'),false);
});

test('a dated copy retains preferences, resets checks and recalculates shared dates',()=>{
  const group=structuredClone(near);
  const first=group.trips[0];
  first.neighborhood='حي اختباري';
  first.hotel='سكن اختباري';
  first.walk[0].rating='yes';
  first.checklist[0].done=true;
  first.post={actual:4000,estimate:3694,returnAgain:'yes'};
  const copy=copyCardGroup(group,'another-date','2027-01-03','2027-01-05');
  const trip=copy.trips[0];
  assert.equal(cardDays(copy),3);
  assert.deepEqual(copy.trips.map(x=>x.id),group.trips.map(x=>x.id));
  assert.equal(trip.neighborhood,first.neighborhood);
  assert.equal(trip.hotel,first.hotel);
  assert.deepEqual(trip.walk,first.walk);
  assert.equal(trip.costs.daily.value,170);
  assert.equal(cardCosts(copy,trip).total,2702);
  assert.ok(['flight','milesCash','milesCount','hotel','spa'].every(key=>costNeedsReview(key,trip.costs[key],'2026-11-24')));
  assert.equal(trip.milesRoute,'unknown');
  assert.ok(trip.checklist.every(task=>!task.done));
  assert.deepEqual(trip.post,{});
  assert.equal(trip.events,'');
  assert.equal(first.costs.hotel.review,undefined);
  assert.equal(first.checklist[0].done,true);
});

test('saved plan normalization round-trips the card state and a booking summary',()=>{
  const trip=structuredClone(istanbul);
  trip.checklist[0].done=true;
  trip.mode='miles';
  const summary=cardSummary(near,trip,5000,'2026-11-24');
  assert.match(summary,/التوفر غير متحقق/);
  assert.match(summary,/مجموع البنود المدخلة/);
  assert.match(summary,/https:\/\/www\.google\.com\/maps/);
  assert.doesNotMatch(summary,/مقعد مكافأة على السعودية بنفس الرحلة/);
  const saved={id:'saved',name:'إسطنبول',origin:'الرياض',date:near.start,month:'',mode:'dates',
    days:'5',travelers:'1',budget:'5000',currency:'SAR',nationality:'SA',level:'متوسط',pace:'متوازن',
    interests:[],selected:'country-TR',compare:[],costs:{},plans:{},tripCardSummary:summary};
  const stored=normalizeData(JSON.parse(JSON.stringify({schemaVersion:11,activeId:'saved',trips:[saved],tripCards:initialTripCards})));
  assert.equal(stored.schemaVersion,planSchemaVersion);
  assert.equal(stored.trips[0].tripCardSummary,summary);
  assert.deepEqual(stored.tripCards,initialTripCards);
});

test('a handed-off quote keeps its chosen duration and flight mode in the summary',()=>{
  const before = structuredClone(istanbul);
  const summary = cardSummary(near,istanbul,4500,'2026-11-24',undefined,{days:4,mode:'miles'});
  const total = costForTripDays(istanbul,4,'miles').total;
  assert.ok(summary.includes('التقدير لـ٤ أيام · شخص واحد · أساس الأسعار'));
  assert.ok(summary.includes('الطيران بالأميال'));
  assert.ok(summary.includes('مجموع البنود المدخلة · ' + cardMoney(total)));
  assert.ok(summary.includes('سقف الميزانية ' + cardMoney(4500)));
  assert.ok(summary.includes('الميزانية تحتاج تحقق بعد استكمال البنود'));
  assert.doesNotMatch(summary,/المتبقي/);
  assert.deepEqual(istanbul,before);
});

test('the new destination cards extend legacy account data and keep saved edits',()=>{
  const saved=structuredClone({...initialTripCards,groups:[near,india]});
  saved.groups[0].trips[0].walk[0].rating='yes';
  saved.groups[1].trips[0].costs.daily.value=175;
  const merged=tripCardsWithDefaults(saved);
  assert.equal(merged.groups[0],saved.groups[0]);
  assert.equal(merged.groups[1],saved.groups[1]);
  const newCards=merged.groups.slice(2).flatMap(group=>{
    assert.equal(group.start,'2026-12-09');
    assert.equal(group.end,'2026-12-13');
    return group.trips;
  });
  assert.deepEqual(newCards.map(trip=>trip.id),['uzn','kzb','bus','kbv','cnx','lgk','gbl','ela']);
  const krabi=newCards.find(trip=>trip.id==='kbv');
  assert.equal(krabi.costs.flight.value,1671);
  assert.equal(krabi.costs.flight.checkedOn,'2026-11-25');
  assert.equal(krabi.costs.milesCash.value,null);
  assert.equal(krabi.milesRoute,'unknown');
  assert.ok(krabi.walk.some(place=>place.kind==='عشاء' && place.needsLocation && !place.minutes));
  assert.equal(costNeedsReview('flight',krabi.costs.flight,'2026-12-02'),false);
  assert.equal(costNeedsReview('flight',krabi.costs.flight,'2026-12-03'),true);
  assert.ok(tripCardsSchema.safeParse(merged).success);
  assert.equal(tripCardsWithDefaults(merged),merged);
});
