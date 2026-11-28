import type {Activity,Day,Trip} from './planning';
import {distanceKm,nearestOrder} from './geo';
import {moneyDigits,minorAmount} from './money';
export {moneyDigits,minorAmount} from './money';
export const bookingTypes={flight:'طيران',stay:'سكن',transport:'تنقل',activity:'نشاط',other:'أخرى'};
export function safeExternalUrl(value:string){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol);}catch{return false;}}
export function splitLedger(t:Trip){
 const members=t.members||[],balances=new Map(members.map(p=>[p.id,0])),included:{destination:string;id:string}[]=[],missing:{destination:string;id:string;reason:string}[]=[];
 for(const [destination,expenses] of Object.entries(t.expenses||{}))for(const x of expenses){const amount=minorAmount(x.amount,t.currency),shared=x.shared,people=members.filter(p=>shared?.people.includes(p.id));let reason='';
  if(amount===null)reason='المبلغ أو العملة غير مكتملين، أو الدقة لا تناسب العملة.';
  else if(!shared||!balances.has(shared.payer)||!people.length||people.length!==shared.people.length||new Set(shared.people).size!==shared.people.length)reason='حدد من دفع والمشاركين في المصروف.';
  if(reason){missing.push({destination,id:x.id,reason});continue;}
  const units=amount!,base=Math.floor(units/people.length),remainder=units%people.length;
  balances.set(shared!.payer,balances.get(shared!.payer)!+units);people.forEach((p,i)=>balances.set(p.id,balances.get(p.id)!-base-(i<remainder?1:0)));included.push({destination,id:x.id});
 }
 const receive=[...balances].filter(([,v])=>v>0).map(([id,amount])=>({id,amount})),owe=[...balances].filter(([,v])=>v<0).map(([id,amount])=>({id,amount:-amount})),transfers:{from:string;to:string;amount:number}[]=[];
 let a=0,b=0;while(a<owe.length&&b<receive.length){const amount=Math.min(owe[a].amount,receive[b].amount);transfers.push({from:owe[a].id,to:receive[b].id,amount});owe[a].amount-=amount;receive[b].amount-=amount;if(!owe[a].amount)a++;if(!receive[b].amount)b++;}
 return {balances:[...balances].map(([id,amount])=>({id,amount})),transfers,included,missing,scale:10**moneyDigits(t.currency)};
}
const packingTemplates:Record<string,string[]>={basic:['وثائق السفر والتذاكر','الهاتف والشاحن','الملابس المناسبة للمدة','أدوات العناية الشخصية','الأغراض الصحية الشخصية اللازمة'],beach:['ملابس السباحة','منشفة خفيفة','حماية مناسبة من الشمس'],hike:['حذاء مناسب للمشي','قنينة ماء قابلة لإعادة الاستخدام','حقيبة يومية'],cold:['طبقات ملابس دافئة','سترة مناسبة للبرد','قفازات عند الحاجة'],family:['احتياجات الأطفال إن كانوا ضمن المسافرين','وسائل تسلية أثناء الطريق']};
export const packingLabels={basic:'الأساسيات',beach:'البحر',hike:'المشي والطبيعة',cold:'الأجواء الباردة',family:'العائلة'};
export function addPacking(existing:NonNullable<Trip['packing']>,template:string){const names=new Set(existing.map(x=>x.title.trim()));return [...existing,...(packingTemplates[template]||[]).filter(title=>!names.has(title)).map(title=>({id:crypto.randomUUID(),title,quantity:1,packed:false,note:''}))].slice(0,150);}
export function distributeIdeas(days:Day[],ideas:Activity[],selectedIds:string[],dayIds:number[]){
 if(!dayIds.length||new Set(dayIds).size!==dayIds.length||dayIds.some(i=>!days[i]))throw Error('اختر أيامًا صالحة للتوزيع.');
 const selected=ideas.filter(a=>selectedIds.includes(a.id));if(selected.length!==selectedIds.length||!selected.length)throw Error('اختر أفكارًا محفوظة أولًا.');
 if(selected.some(a=>!a.location||a.time||a.done))throw Error('التوزيع يحتاج مواقع محددة وأفكارًا دون وقت ثابت أو حالة إنجاز.');
 if(new Set([...days.flatMap(d=>d.activities||[]),...ideas].map(a=>a.id)).size!==days.flatMap(d=>d.activities||[]).length+ideas.length)throw Error('توجد معرفات أنشطة مكررة. راجع الأفكار قبل التوزيع.');
 const order=nearestOrder(selected),slots=[...dayIds].sort((a,b)=>a-b),result=days.map(d=>({...d,activities:[...(d.activities||[])]}));
 // Keep existing days and timed activities intact; allocate nearby ideas in contiguous groups.
 const capacity=slots.reduce((s,i)=>s+30-result[i].activities.length,0);if(capacity<order.length)throw Error('الأيام المختارة لا تتسع للأفكار؛ حد الأنشطة ٣٠ لكل يوم.');
 let cursor=0;slots.forEach((day,index)=>{const remaining=order.length-cursor,available=30-result[day].activities.length,target=Math.min(available,Math.ceil(remaining/(slots.length-index)));result[day].activities.push(...order.slice(cursor,cursor+target));cursor+=target;});
 // Earlier full days can leave a remainder; place it in available slots without dropping any item.
 for(const day of slots){const count=Math.min(order.length-cursor,30-result[day].activities.length);result[day].activities.push(...order.slice(cursor,cursor+count));cursor+=count;}
 return {days:result,ideas:ideas.filter(a=>!selectedIds.includes(a.id)),added:slots.map(day=>({day,activities:result[day].activities.filter(a=>selectedIds.includes(a.id))})),spanKm:order.slice(1).reduce((sum,a,i)=>sum+distanceKm(order[i].location!,a.location!),0)};
}
export function bookingToActivity(booking:NonNullable<Trip['bookings']>[number]):Activity{return {id:crypto.randomUUID(),bookingId:booking.id,title:booking.title||bookingTypes[booking.type],place:booking.location,time:booking.time,duration:'',cost:'',url:booking.url,notes:booking.note,priority:'essential',done:false};}
