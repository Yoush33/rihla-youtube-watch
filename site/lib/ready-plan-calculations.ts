import type {ReadyPlan,ReadyPrice} from './ready-plan-schema';
import {calculateTripCost,cardNumber,isUnnamedPackageHotelRate,unpricedHotelSource} from './trip-card';

export type ReadyPlanChoice = {plan:ReadyPlan;nights:number[];month:number;budget:number};
export type ReadyCostLine = {label:string;price:ReadyPrice;units:number;total:number|null};

export function eligibleReadyHotelPrice(planId:string,price:ReadyPrice):ReadyPrice {
  return isUnnamedPackageHotelRate(planId,{value:price.amount,checkedOn:price.checked_date,source:price.source,estimated:price.estimated}) ?
    {amount:null,checked_date:null,source:unpricedHotelSource,estimated:false,...(price.label ? {label:price.label} : {})} : price;
}

export function estimateReadyPlan(plan:ReadyPlan, nights=plan.stops.map(stop=>stop.nights), budget?:number) {
  const resolvedNights = plan.stops.map((stop,index)=>nights[index] ?? stop.nights);
  const totalNights = resolvedNights.reduce((total,value)=>total+value,0);
  const days = totalNights+1;
  const line = (label:string,price:ReadyPrice,units=1) => ({label,price,units,amount:price.amount});
  const {rows,total,partial,remaining} = calculateTripCost([
    line('الطيران من الرياض',plan.cost_estimate.flight),
    ...plan.stops.map((stop,index)=>line('السكن في '+stop.city,eligibleReadyHotelPrice(plan.id,stop.hotel.night_price),resolvedNights[index])),
    ...plan.transfers.map(transfer=>line(transfer.from+' إلى '+transfer.to,transfer.price)),
    line('المصروف اليومي',plan.cost_estimate.daily,days),
    ...(plan.cost_estimate.extras??[]).map(price=>line(price.label??'بند إضافي',price)),
  ],budget);
  const lines:ReadyCostLine[] = rows.map(({label,price,units,subtotal})=>({label,price,units,total:subtotal}));
  return {days,nights:totalNights,total,partial,remaining,lines};
}

export function readyPlanRoute(plan:ReadyPlan,nights=plan.stops.map(stop=>stop.nights)) {
  return plan.stops.map((stop,index)=>stop.city+' '+cardNumber(nights[index]??stop.nights)).join(' ← ');
}

