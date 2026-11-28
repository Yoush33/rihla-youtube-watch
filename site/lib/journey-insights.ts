import type {Trip} from './planning';
import {calendarDate} from './planning';
import {events} from './travel';
import {profiles} from './world';
import {minorAmount,moneyDigits} from './money';
export const coreCountries:Record<string,string>={kyoto:'JP',istanbul:'TR',lisbon:'PT',singapore:'SG',dubai:'AE',marrakech:'MA'};
export const countryFor=(id:string)=>id.startsWith('country-')?id.slice(8):coreCountries[id]||'';
export function holidayMatches(code:string,start:string,end:string){return events.filter(e=>countryFor(e.destination)===code&&e.kind==='عطلة رسمية'&&e.start<=end&&e.end>=start);}
export function flexibleWindows(code:string,month:string,duration:number){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Number.isInteger(duration)||duration<1||duration>30)return [];
 const count=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 // Start and end stay in the selected month. Partial calendars never imply no holidays.
 return Array.from({length:Math.max(0,count-duration+1)},(_,i)=>{const start=month+'-'+String(i+1).padStart(2,'0'),end=calendarDate(start,duration-1),holidays=holidayMatches(code,start,end);return {start,end,holidays};}).sort((a,b)=>a.holidays.length-b.holidays.length||a.start.localeCompare(b.start));
}
export function decisionCoverage(code:string){const p=profiles[code];return {season:!!p?.months.length,prices:false,forecast:['SG','PT'].includes(code),basic:p?.coverage==='basic'};}
export const budgetKeys=['stay','food','transport','activities','flight'] as const;
export const budgetLabels={stay:'السكن',food:'الطعام',transport:'التنقل',activities:'الأنشطة',flight:'الطيران'};
export function budgetScenario(t:Trip,id:string,days=Number(t.days),stayLow?:string,stayHigh?:string){
 const c:Record<string,string>={...t.costs[id],...(stayLow!==undefined?{stayLow,stayHigh:stayHigh??''}:{})},travelers=Number(t.travelers),rooms=Number(c.rooms)||0;
 const factors=[Math.max(0,(days||0)-1)*rooms,(days||0)*(travelers||0),(days||0)*(travelers||0),(days||0)*(travelers||0),travelers||0];
 const scale=10**moneyDigits(t.currency);
 const rows=budgetKeys.map((key,i)=>{const lo=c[key+'Low'],hi=c[key+'High'],known=lo!==undefined&&lo!==''&&hi!==undefined&&hi!=='',low=minorAmount(lo||'',t.currency),high=minorAmount(hi||'',t.currency),valid=low!==null&&high!==null&&high>=low;const confirmed=valid&&low===high&&c[key+'Status']==='confirmed'&&!!c[key+'Source']&&/^\d{4}-\d{2}-\d{2}$/.test(c[key+'Checked']||'');return {key,known,valid,lowMinor:valid?low!*factors[i]:0,highMinor:valid?high!*factors[i]:0,low:valid?low!*factors[i]/scale:0,high:valid?high!*factors[i]/scale:0,confirmed};});
 const extras=(t.extras?.[id]||[]).map(e=>minorAmount(e.planned,t.currency)),extraSum=extras.reduce<number>((n,e)=>n+(e??0),0);
 const validInputs=Number.isInteger(days)&&days>=1&&days<=30&&Number.isInteger(travelers)&&travelers>0&&travelers<=30&&Number.isInteger(rooms)&&rooms>0&&!!t.currency;
 return {rows,low:(rows.reduce((n,r)=>n+r.lowMinor,0)+extraSum)/scale,high:(rows.reduce((n,r)=>n+r.highMinor,0)+extraSum)/scale,confirmed:rows.filter(r=>r.confirmed).reduce((n,r)=>n+r.lowMinor,0)/scale,complete:validInputs&&rows.every(r=>r.valid)&&extras.every(e=>e!==null),validInputs,missing:rows.filter(r=>!r.valid).map(r=>budgetLabels[r.key]),extraUnknown:extras.some(e=>e===null)};
}
