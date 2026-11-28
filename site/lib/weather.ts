import {z} from 'zod';
const temp=z.coerce.number().min(-70).max(65);
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ipma=z.object({globalIdLocal:z.literal(1110600),dataUpdate:z.string(),data:z.array(z.object({forecastDate:day,tMin:z.string().min(1).pipe(temp),tMax:z.string().min(1).pipe(temp),precipitaProb:z.string().min(1).pipe(z.coerce.number().min(0).max(100))})).min(1).max(7)});
const singapore=z.object({code:z.literal(0),data:z.object({records:z.array(z.object({updatedTimestamp:z.string(),forecasts:z.array(z.object({timestamp:z.string(),temperature:z.object({low:z.number().min(-70).max(65),high:z.number().min(-70).max(65)}),forecast:z.object({summary:z.string().max(300)})})).min(1).max(5)})).min(1)})});
export const weatherSources:Record<string,{api:string;name:string;url:string;horizon:number}>={lisbon:{api:'https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/1110600.json',name:'IPMA — الأرصاد البرتغالية',url:'https://api.ipma.pt/',horizon:5},singapore:{api:'https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook',name:'NEA / MSS عبر data.gov.sg',url:'https://data.gov.sg/datasets/d_f131f6e343bf8168e4057a04c4326a0a/view',horizon:4}};
export type ForecastDay={date:string;low:number;high:number;rain?:number;description?:string};
export type Forecast={status:'live';updated:string;checkedAt:string;days:ForecastDay[];source:string;name:string}|{status:'unavailable';reason:string};
export function parseForecast(id:string,input:unknown,now=new Date()):Forecast{
 let updated:string,days:ForecastDay[];
 if(id==='lisbon'){const p=ipma.parse(input);updated=p.dataUpdate;days=p.data.map(x=>({date:x.forecastDate,low:x.tMin,high:x.tMax,rain:x.precipitaProb}));}
 else if(id==='singapore'){const p=singapore.parse(input);const record=[...p.data.records].sort((a,b)=>b.updatedTimestamp.localeCompare(a.updatedTimestamp))[0];updated=record.updatedTimestamp;days=record.forecasts.map(x=>({date:x.timestamp.slice(0,10),low:x.temperature.low,high:x.temperature.high,description:x.forecast.summary}));}
 else return {status:'unavailable',reason:'لم تُربط تغذية رسمية لهذه الوجهة بعد.'};
 // IPMA's timestamp has no offset. Check its calendar day conservatively rather than inventing a timezone.
 const updateDay=updated.slice(0,10);const age=(now.valueOf()-Date.parse(updateDay+'T00:00:00Z'))/86400000;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(updateDay)||!Number.isFinite(age)||age>2||age< -1||days.some(d=>d.low>d.high||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)))return {status:'unavailable',reason:'البيانات المستلمة قديمة أو غير صالحة؛ لن نعرضها كتوقع حديث.'};
 days=days.filter(d=>d.date>=now.toISOString().slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date));if(!days.length)return {status:'unavailable',reason:'لا توجد أيام توقع قادمة في آخر استجابة.'};return {status:'live',updated,checkedAt:now.toISOString(),days,source:weatherSources[id].url,name:weatherSources[id].name};
}
