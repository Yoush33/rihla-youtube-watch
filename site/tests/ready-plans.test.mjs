import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({
  resolve(specifier,context,next){return next(specifier.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(specifier)?specifier+'.ts':specifier,context);},
  load(url,context,next){return url.endsWith('.json')?{format:'module',source:'export default '+readFileSync(new URL(url),'utf8'),shortCircuit:true}:next(url,context);},
});
const {readyPlans,estimateReadyPlan,filterReadyPlans,resolveReadyPlanTripCard,readyPlanRoute,readyCityMap,readyCityMapParts} = await import('../lib/ready-plans.ts');
const {readyHotelMap,readyPlaceMap,verifiedReadyPlaces} = await import('../lib/ready-plan-maps.ts');
const {formatArabicHours,formatArabicDuration} = await import('../lib/arabic-duration.ts');
const {copyReadyPlanSnapshot,saveReadyPlanSnapshot} = await import('../lib/ready-plan-saved.ts');
const {boredResults,defaultBoredSettings} = await import('../lib/bored.ts');
const {cardMoney,costForTripDays,copyCardGroup} = await import('../lib/trip-card.ts');
const {initialTripCards} = await import('../lib/trip-card-data.ts');
const {normalizeData,planSchemaVersion} = await import('../lib/planning.ts');
const {parseBackup} = await import('../lib/backup.ts');
const basic = JSON.parse(readFileSync(new URL('../lib/travel-combos.json',import.meta.url),'utf8'));
const countries = JSON.parse(readFileSync(new URL('../lib/country-catalog.json',import.meta.url),'utf8'));
const find = id=>readyPlans.find(plan=>plan.id===id);

function choice(id) {
  const plan=find(id);
  return {plan,nights:plan.stops.map(stop=>stop.nights),month:12,budget:5000};
}

test('ready plans contain fourteen priced-card destinations, ten existing combinations, and seventy country itineraries',()=>{
  assert.equal(readyPlans.length,94);
  assert.equal(new Set(readyPlans.map(plan=>plan.id)).size,94);
  assert.deepEqual(readyPlans.slice(0,14).map(plan=>plan.id).sort(),['ayt','bus','cnx','cok','ela','gbl','goa','ist','kbv','kzb','lgk','tbs','uzn','vkl']);
  assert.deepEqual(readyPlans.slice(14,24).map(plan=>plan.id),basic.map(plan=>plan.id));
  assert.deepEqual(readyPlans.slice(24).map(plan=>plan.country).sort(),countries.map(country=>country.iso2).sort());
  for(const plan of readyPlans){
    assert.ok(plan.months_best.length+plan.months_ok.length>0,plan.id);
    if(plan.type.includes('relax'))assert.ok(plan.stops.some(stop=>stop.day_plan.some(day=>day.rest)),plan.id);
    for(const {price} of estimateReadyPlan(plan).lines){
      assert.ok(price.source,plan.id);
      if(price.amount!==null&&!price.estimated)assert.ok(price.checked_date,plan.id);
    }
  }
});

test('nights and daily spend recalculate separately from fixed travel prices',()=>{
  const {plan,nights,budget}=choice('vkl');
  const initial=estimateReadyPlan(plan,nights,budget);
  const extended=estimateReadyPlan(plan,[nights[0]+1],budget);
  assert.equal(initial.days,4);
  assert.equal(initial.total,3750.75);
  assert.equal(extended.days,5);
  assert.equal(extended.total,4094);
  assert.equal(extended.total,Math.round((initial.total+plan.stops[0].hotel.night_price.amount+plan.cost_estimate.daily.amount)*100)/100);
  assert.equal(Math.round((budget-extended.total)*100)/100,extended.remaining);
  assert.equal(estimateReadyPlan(find('ayt'),undefined,budget).remaining,null);
  assert.match(readyPlanRoute(plan,[5]),/فاركالا، الهند ٥/);
});

test('Varkala matches Bored and My Trip with the same days and saved quote',()=>{
  const today='2026-11-25';
  const cards=structuredClone(initialTripCards);
  const selected=choice('vkl');
  const dated=copyCardGroup(cards.groups[1],'dec-varkala-four','2026-12-15','2026-12-18');
  dated.trips[0].costs.flight={value:2100,source:'إدخال يدوي',checkedOn:today,estimated:false};

  for(const [days,expected,currency] of [[4,3750.75,'٣٬٧٥١ ر.س'],[5,4094,'٤٬٠٩٤ ر.س']]) {
    const nights=[days-1];
    const plan=resolveReadyPlanTripCard(selected.plan,cards,nights,12,today);
    const saved=saveReadyPlanSnapshot({...selected,plan,nights},today);
    const estimate=estimateReadyPlan(saved.plan,saved.nights,saved.budget);
    const candidate=boredResults(cards,{...defaultBoredSettings,days},today).candidates.find(item=>item.trip.id==='vkl');
    const trip=costForTripDays(candidate.trip,days);
    assert.equal(estimate.total,expected);
    assert.equal(cardMoney(estimate.total),currency);
    assert.equal(candidate.estimate.total,expected);
    assert.equal(trip.total,expected);
    assert.deepEqual(estimate.lines.map(line=>line.total).sort(),trip.rows.map(row=>row.subtotal).sort());
  }

  cards.groups.push(dated);
  const plan=resolveReadyPlanTripCard(selected.plan,cards,selected.nights,12,today);
  const estimate=estimateReadyPlan(plan);
  const candidate=boredResults(cards,defaultBoredSettings,today).candidates.find(item=>item.trip.id==='vkl');
  assert.equal(candidate.group.id,dated.id);
  assert.equal(estimate.total,candidate.estimate.total);
  assert.equal(plan.cost_estimate.flight.amount,2100);
  assert.equal(plan.cost_estimate.flight.url,undefined);
  const saved=saveReadyPlanSnapshot({...selected,plan},today);
  dated.trips[0].costs.flight.value=2200;
  assert.equal(estimateReadyPlan(saved.plan,saved.nights).total,estimate.total);
});

test('anonymous hotel rates are missing everywhere and exact manual amounts remain priced',()=>{
  const today='2026-11-25';
  for(const [id,oldAmount] of [['kbv',170],['cnx',172]]) {
    const cards=structuredClone(initialTripCards);
    const card=cards.groups.flatMap(group=>group.trips).find(trip=>trip.id===id);
    const plan=find(id);
    const nights=[3];
    const oldRate=card.costs.hotel;
    assert.equal(oldRate.value,oldAmount);
    assert.equal(costForTripDays(card,4).rows.find(row=>row.key==='hotel').subtotal,null);
    assert.equal(plan.stops[0].hotel.night_price.amount,null);

    const archivedReady=structuredClone(plan);
    archivedReady.stops[0].hotel.night_price={amount:oldAmount,checked_date:oldRate.checkedOn,source:oldRate.source,estimated:oldRate.estimated};
    const archived=saveReadyPlanSnapshot({plan:archivedReady,nights,month:12,budget:5000},today);
    assert.equal(estimateReadyPlan(archived.plan,archived.nights).partial,true);
    assert.equal(archived.plan.stops[0].hotel.night_price.amount,oldAmount);

    const bored=boredResults(cards,defaultBoredSettings,today).candidates.find(item=>item.trip.id===id);
    assert.equal(bored.estimate.partial,true);
    assert.equal(estimateReadyPlan(resolveReadyPlanTripCard(plan,cards,nights,12,today),nights).total,bored.estimate.total);

    card.hotel='فندق حسابي في '+card.city;
    card.costs.hotel={...oldRate,source:'إدخال يدوي',checkedOn:today};
    const updated=resolveReadyPlanTripCard(plan,cards,nights,12,today);
    assert.equal(updated.stops[0].hotel.name,card.hotel);
    assert.equal(updated.stops[0].hotel.night_price.amount,oldAmount);
    assert.equal(updated.stops[0].hotel.latitude,undefined);
    assert.deepEqual(updated.stops[0].places,[]);
    assert.equal(estimateReadyPlan(updated,nights).total,costForTripDays(card,4).total);
  }
});

test('filters honor the travel month and duration without mislabeling partial price totals',()=>{
  const filters={type:'relax',duration:'3-5',month:12,budget:5000};
  const result=filterReadyPlans(filters);
  assert.ok(result.length&&result.some(plan=>plan.id==='vkl'));
  for(const plan of result){
    assert.ok(plan.type.includes(filters.type));
    assert.ok([...plan.months_best,...plan.months_ok].includes(filters.month));
    const estimate=estimateReadyPlan(plan);
    assert.ok(estimate.days>=3&&estimate.days<=5&&(estimate.partial||estimate.total<=filters.budget));
  }
  assert.deepEqual(result.map(plan=>Number(estimateReadyPlan(plan).partial)),result.map(plan=>Number(estimateReadyPlan(plan).partial)).sort());
  const unpriced=filterReadyPlans({...filters,budget:100}).find(plan=>plan.id==='ayt');
  assert.ok(unpriced);
  const partial=estimateReadyPlan(unpriced,undefined,100);
  assert.equal(partial.partial,true);
  assert.equal(partial.remaining,null);
  assert.ok(partial.total>100);
});

test('maps use verified coordinates, split mobile waypoints, and omit generic legacy links',()=>{
  const stop = structuredClone(find('vkl').stops[0]);
  const legacy = {name:'مكان قديم',category:'breakfast',walk_minutes:null,
    price_note:'السعر يحتاج تحقق',maps:'https://www.google.com/maps/search/?query=مطاعم'};
  stop.hotel = {...stop.hotel,latitude:undefined,longitude:undefined,name_en:undefined,name:'Gypsy Walker'};
  stop.places = [legacy];
  assert.equal(readyCityMap(stop),undefined);
  assert.equal(new URL(readyHotelMap(stop)).searchParams.get('query'),'Gypsy Walker, فاركالا');
  assert.equal(readyHotelMap({...stop,hotel:{...stop.hotel,name:'فنادق الجرف'}}),undefined);
  stop.hotel.latitude = 8.73965;
  stop.hotel.longitude = 76.70412;
  stop.places.push(...Array.from({length:7},(_,index)=>({
    ...legacy,
    name:'مكان موثّق ' + index,
    latitude:8.74 + index * .001,
    longitude:76.704,
    osm_url:'https://www.openstreetmap.org/node/' + (10 + index),
    distance_meters:index * 200 + 50,
  })));
  const known = verifiedReadyPlaces(stop);
  assert.equal(known.length,7);
  assert.equal(new URL(readyPlaceMap(known[0])).searchParams.get('query'),'8.74,76.704');
  assert.equal(new URL(readyHotelMap(stop)).searchParams.get('query'),'8.73965,76.70412');
  const map=new URL(readyCityMap(stop));
  assert.equal(map.host,'www.google.com');
  assert.equal(map.searchParams.get('origin'),'8.73965,76.70412');
  const maps=readyCityMapParts(stop).map(url=>new URL(url));
  assert.ok(maps.length>1);
  assert.ok(maps.every(url=>url.searchParams.get('waypoints').split('|').filter(Boolean).length<=3));
  assert.equal(maps[0].searchParams.get('destination'),maps[1].searchParams.get('origin'));
});

test('catalog places retain their original OSM identifiers and walking and ride limits',()=>{
  for(const plan of readyPlans) for(const stop of plan.stops) {
    const places=verifiedReadyPlaces(stop);
    assert.equal(places.length,stop.places.length,`${plan.id} · ${stop.city}`);
    const categories=new Map();
    for(const place of places) {
      assert.match(place.osm_url,/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/);
      assert.equal(new URL(place.maps).searchParams.get('query'),`${place.latitude},${place.longitude}`);
      assert.ok(place.distance_meters<=5000);
      if(place.walk_minutes!==null) {
        assert.ok(place.distance_meters<=1500);
        assert.ok(Math.abs(place.walk_minutes-Math.ceil(place.distance_meters/80))<=1);
      } else {
        assert.ok(place.distance_meters>=1500);
      }
      const distances=categories.get(place.category)??[];
      distances.push(place.distance_meters);
      categories.set(place.category,distances);
    }
    for(const distances of categories.values()) {
      assert.ok(distances.length<=5);
      assert.deepEqual(distances,[...distances].sort((a,b)=>a-b));
    }
  }
  assert.ok(verifiedReadyPlaces(find('vkl').stops[0]).filter(place=>place.category==='breakfast').length>=3);
});

test('Arabic durations use the dual and plural forms before singular at eleven',()=>{
  assert.equal(formatArabicDuration(185),'٣ ساعات و٥ دقائق');
  assert.equal(formatArabicDuration(2),'دقيقتان');
  assert.equal(formatArabicDuration(10),'١٠ دقائق');
  assert.equal(formatArabicDuration(11),'١١ دقيقة');
  assert.equal(formatArabicHours(4.5),'٤ ساعات و٣٠ دقيقة');
  assert.equal(formatArabicHours(11),'١١ ساعة');
});

test('saving and duplicating retain source pricing and reset only the new checklist',()=>{
  const selected=choice('vkl');
  const saved=saveReadyPlanSnapshot(selected,'2026-11-25');
  assert.equal(saved.plan.stops[0].places.length,0);
  assert.equal(saved.plan.stops[0].hotel.latitude,selected.plan.stops[0].hotel.latitude);
  saved.checked=['IN:التأشيرة'];
  const duplicate=copyReadyPlanSnapshot(saved,'2027-02-04','2026-11-25');
  assert.deepEqual(duplicate.plan,saved.plan);
  assert.deepEqual(duplicate.nights,saved.nights);
  assert.deepEqual(duplicate.checked,[]);
  assert.deepEqual(saved.checked,['IN:التأشيرة']);
  assert.equal(saved.start_date,undefined);
  assert.equal(duplicate.month,2);
  assert.throws(()=>copyReadyPlanSnapshot(saved,'2027-02-30','2026-11-25'));
  const trip={id:'ready-trip',name:saved.plan.title,origin:'الرياض',date:'',month:'2026-12',mode:'flexible',days:'4',travelers:'1',budget:'5000',currency:'SAR',nationality:'SA',level:'متوسط',pace:'متوازن',interests:[],selected:'country-IN',compare:[],costs:{},plans:{},readyPlan:saved};
  const state={schemaVersion:planSchemaVersion,activeId:trip.id,trips:[trip]};
  assert.deepEqual(parseBackup(JSON.stringify(state)).trips[0].readyPlan,saved);
  const previousVersion={...state,schemaVersion:11,trips:[{...trip,readyPlan:undefined}]};
  assert.equal(normalizeData(previousVersion).schemaVersion,planSchemaVersion);
});
