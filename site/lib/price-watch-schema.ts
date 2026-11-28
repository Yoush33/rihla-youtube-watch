import {z} from 'zod';
import {validMoneyInput} from './money';
export const validPriceDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function safePriceUrl(v:string){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&![...u.searchParams.keys()].some(k=>/^(?:access_token|token|api_key|key|password|secret|session|auth|email)$/i.test(k));}catch{return false;}}
const date=z.string().refine(validPriceDate),amount=z.string().min(1).max(20),text=z.string().trim().min(1).max(200);
export const priceObservationSchema=z.object({id:z.string().uuid(),amount,unit:z.enum(['personRoundTrip','groupRoundTrip','roomNight','wholeStay']),observedOn:date,recordedAt:z.string().datetime(),source:z.string().max(1500).refine(safePriceUrl),taxes:z.enum(['included','excluded','unknown']),conditions:z.string().max(600)});
export const priceWatchSchema=z.object({id:z.string().uuid(),kind:z.enum(['flight','stay']),title:text,destinationId:text,origin:z.string().max(200),destination:text,start:date,end:date,travelers:z.number().int().min(1).max(30),rooms:z.number().int().min(1).max(30),currency:z.enum(['SAR','USD','EUR','GBP','AED','KWD','JPY','CNY']),target:z.string().max(20),nextReview:z.string().refine(v=>!v||validPriceDate(v)),reviewEveryDays:z.union([z.literal(1),z.literal(3),z.literal(7),z.literal(14)]),active:z.boolean(),createdAt:z.string().datetime(),tripBasis:z.string().max(3000),observations:z.array(priceObservationSchema).max(40)}).superRefine((w,c)=>{
 if(w.end<w.start||w.kind==='stay'&&w.end===w.start)c.addIssue({code:'custom',message:'تاريخ النهاية لا يناسب فترة البحث.'});
 if(w.kind==='flight'&&!w.origin.trim())c.addIssue({code:'custom',message:'حدد مدينة أو مطار المغادرة.'});
 if(!validMoneyInput(w.target,w.currency))c.addIssue({code:'custom',message:'الهدف غير صالح بدقة العملة.'});
 for(const o of w.observations){if(!validMoneyInput(o.amount,w.currency))c.addIssue({code:'custom',message:'السعر غير صالح بدقة العملة.'});if(w.kind==='flight'?!['personRoundTrip','groupRoundTrip'].includes(o.unit):!['roomNight','wholeStay'].includes(o.unit))c.addIssue({code:'custom',message:'وحدة السعر لا تطابق نوع البحث.'});}
 if(new Set(w.observations.map(o=>o.id)).size!==w.observations.length)c.addIssue({code:'custom',message:'رصد سعر مكرر.'});
});
export type PriceWatch=z.infer<typeof priceWatchSchema>;
export type PriceObservation=z.infer<typeof priceObservationSchema>;
