import rawPlans from './plans.json';
import {readyPlanSchema, type ReadyCategory, type ReadyPlan, type ReadyPlanType, type ReadyPrice} from './ready-plan-schema';
import {selectTripCardQuote,todayInRiyadh,tripCardHotelQuote} from './trip-card';
import {tripCardsWithDefaults} from './trip-card-data';
import {tripCardIdSchema,type TripCardCost,type TripCards} from './trip-card-schema';
import {eligibleReadyHotelPrice,estimateReadyPlan} from './ready-plan-calculations';
import {readyTravelMonth} from './ready-plan-saved';
import {isRouteExcluded,type DestinationExclusions} from './destination-exclusions';
export {estimateReadyPlan,readyPlanRoute} from './ready-plan-calculations';
export type {ReadyPlanChoice} from './ready-plan-calculations';
export {readyCityMap,readyCityMapParts} from './ready-plan-maps';

export type {ReadyPlan, ReadyPlanType, ReadyPrice} from './ready-plan-schema';
export const readyPlanTypeLabels:Record<ReadyPlanType,string> = {
  relax:'استجمام',nature:'طبيعة',city:'مدينة',sea:'بحر',multi:'مركّبة لأكثر من دولة',
};
export const readyCategoryLabels:Record<ReadyCategory,string> = {
  breakfast:'فطور',lunch:'غداء',coffee:'قهوة وحلا',dinner:'عشاء',spa:'مساج وسبا',
  nature:'طبيعة',landmarks:'معالم',shopping:'تسوق',
};
const dayBands = {'3-5':[3,5],'6-8':[6,8],'9-12':[9,12],'13+':[13,30]} as const;
export type ReadyDuration = keyof typeof dayBands;
export const readyDurationLabels:Record<ReadyDuration,string> = {
  '3-5':'٣–٥ أيام','6-8':'٦–٨ أيام','9-12':'٩–١٢ يوم','13+':'١٣ يوم فأكثر',
};

export const readyPlans:ReadyPlan[] = readyPlanSchema.array().parse(rawPlans).map(plan=>({
  ...plan,stops:plan.stops.map(stop=>({...stop,hotel:{...stop.hotel,night_price:eligibleReadyHotelPrice(plan.id,stop.hotel.night_price)}})),
}));

const cardPlanIds = new Set<string>(tripCardIdSchema.options);

function cardQuotePrice(cost:TripCardCost,reference:ReadyPrice):ReadyPrice {
  const {value,source,checkedOn,estimated} = cost;
  const {label,url} = reference;
  return {amount:value,source:source.trim() || 'مصدر السعر غير مدخل',checked_date:checkedOn,estimated,
    ...(label ? {label} : {}), ...(url && reference.source === source ? {url} : {})};
}

export function resolveReadyPlanTripCard(plan:ReadyPlan,cards:TripCards|undefined,nights:readonly number[]|undefined,month:number,today:string):ReadyPlan {
  if (!cards || !cardPlanIds.has(plan.id) || plan.stops.length !== 1) return plan;
  const stop = plan.stops[0];
  const days = (nights?.[0] ?? stop.nights) + 1;
  const quote = selectTripCardQuote(tripCardsWithDefaults(cards).groups,plan.id,days,readyTravelMonth(month,today));
  if (!quote) return plan;

  const reference = readyPlans.find(item=>item.id===plan.id) ?? plan;
  const {trip} = quote;
  const {costs} = trip;
  const originalStop = reference.stops[0];
  const originalHotel = originalStop.hotel;
  const rate = tripCardHotelQuote(trip);
  const enteredHotel = trip.hotel.trim();
  const separateHotel = originalHotel.night_price.amount === null && !enteredHotel && rate.value === null;
  const hotelName = enteredHotel || 'اسم الفندق يحتاج تحديد';
  const changedHotel = !separateHotel && hotelName !== originalHotel.name;
  const night_price = cardQuotePrice(rate,changedHotel ? {...originalHotel.night_price,url:undefined} : originalHotel.night_price);
  const hotel = separateHotel ? originalHotel : changedHotel ? {
    name:hotelName,night_price,
  } : {...originalHotel,night_price};
  // Verified walks belong to the original hotel and cannot be reused for a different origin.
  const places = changedHotel ? [] : originalStop.places;
  const flight = cardQuotePrice(costs.flight,reference.cost_estimate.flight);
  const daily = cardQuotePrice(costs.daily,reference.cost_estimate.daily);
  const extras = reference.cost_estimate.extras?.map(price=>{
    if (price.label === 'المساج') return cardQuotePrice(costs.spa,price);
    if (price.label === 'التأشيرة') return cardQuotePrice(costs.visa,price);
    return price;
  });
  const transfers = plan.transfers.map((transfer,index)=>index === 0 ? {
    ...transfer, price:cardQuotePrice(costs.taxi,reference.transfers[0]?.price ?? transfer.price),
  } : transfer);
  const checkedDates = [flight,daily,hotel.night_price,...(extras??[]),...transfers.map(transfer=>transfer.price)]
    .flatMap(price=>price.checked_date ? [price.checked_date] : []).sort();
  return {...plan,stops:[{...stop,hotel,places}],transfers,cost_estimate:{flight,daily,extras},checked_date:checkedDates.at(-1) ?? null};
}

export function filterReadyPlans(filters:{type:'all'|ReadyPlanType;month:number;duration:'all'|ReadyDuration;budget:number;exclusions?:DestinationExclusions},
  cards?:TripCards,today=todayInRiyadh()) {
  const [min,max] = filters.duration==='all' ? [3,30] : dayBands[filters.duration];
  return readyPlans.flatMap(reference=>{
    const best=reference.months_best.includes(filters.month);
    if ((!best && !reference.months_ok.includes(filters.month)) || (filters.type!=='all'&&!reference.type.includes(filters.type)) ||
      isRouteExcluded(reference,filters.exclusions)) return [];
    const plan=resolveReadyPlanTripCard(reference,cards,undefined,filters.month,today);
    const estimate=estimateReadyPlan(plan);
    return estimate.days>=min && estimate.days<=max && (estimate.partial || estimate.total<=filters.budget) ? [{plan,best,estimate}] : [];
  }).sort((first,second)=>Number(first.estimate.partial)-Number(second.estimate.partial) || Number(second.best)-Number(first.best))
    .map(({plan})=>plan);
}
