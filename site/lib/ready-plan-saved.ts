import {z} from 'zod';
import {readyBudgetSchema,readyDateSchema,readyMonthSchema,readyNightSchema,readyPlanSchema} from './ready-plan-schema';
import type {ReadyPlanChoice} from './ready-plan-calculations';

export const savedReadyPlanSchema = z.object({
  plan:readyPlanSchema,
  nights:z.array(readyNightSchema).min(1).max(12),
  month:readyMonthSchema,
  budget:readyBudgetSchema,
  created_on:readyDateSchema,
  start_date:readyDateSchema.optional(),
  checked:z.array(z.string().min(1).max(240)).max(80),
}).refine(value=>value.nights.length===value.plan.stops.length&&value.nights.reduce((sum,nights)=>sum+nights,0)<=29,
  {path:['nights'],message:'عدد الليالي غير صالح'});
export type SavedReadyPlan = z.infer<typeof savedReadyPlanSchema>;

export function saveReadyPlanSnapshot(choice:ReadyPlanChoice,today:string):SavedReadyPlan {
  // Place records stay in the shared catalog. Saving copies of them would multiply the account payload.
  const plan = {...choice.plan,stops:choice.plan.stops.map(stop=>({...stop,places:[]}))};
  return savedReadyPlanSchema.parse({...choice,plan,created_on:today,checked:[]});
}

export function copyReadyPlanSnapshot(saved:SavedReadyPlan,date:string,today:string):SavedReadyPlan {
  if (date===saved.start_date) throw Error('اختر تاريخًا مختلفًا عن موعد الرحلة الحالية.');
  const start_date=readyDateSchema.parse(date);
  return savedReadyPlanSchema.parse({...saved,start_date,month:Number(start_date.slice(5,7)),created_on:today,checked:[]});
}

export function readyTravelMonth(month:number,today:string) {
  const year=Number(today.slice(0,4))+Number(month<Number(today.slice(5,7)));
  return year+'-'+String(month).padStart(2,'0');
}
