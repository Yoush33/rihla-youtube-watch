import {findPlace,type PlannerPlace} from './place-catalog';
import {distanceKm} from './geo';
import {calendarDate,type Trip} from './planning';
import type {PlanDraft} from './plan-draft';

export type ScheduleOptions={dayMinutes:number;breakMinutes:number;transferBufferMinutes:number;visitMinutes:Record<string,number>};
export const defaultScheduleOptions:ScheduleOptions={dayMinutes:480,breakMinutes:30,transferBufferMinutes:30,visitMinutes:{}};
export function placeAvailability(p:PlannerPlace,date:string){
 const v=p.operations;
 let validDate=false;try{validDate=!!date&&calendarDate(date,0)===date;}catch{/* An invalid date never establishes opening hours. */}
 if(validDate&&(p.closedDates?.includes(date)||!v&&p.closedDays?.includes(new Date(date+'T12:00:00Z').getUTCDay())))return {blocked:true,known:false,reason:'إغلاق مسجل لهذا اليوم؛ راجع تقويم المشغّل لأي تغيير أو استثناء.',hours:''};
 if(!validDate||!v||v.scheduleVerified===false||v.validFrom&&date<v.validFrom||v.validUntil&&date>v.validUntil)return {blocked:false,known:false,reason:!validDate?'الموعد غير محدد أو غير صالح؛ لم نفحص إغلاق يوم بعينه.':'لا نافذة تشغيل معتمدة لهذا الموعد؛ يحتاج تأكيدًا.',hours:''};
 const weekday=new Date(date+'T12:00:00Z').getUTCDay(),month=Number(date.slice(5,7));
 const s=v.hoursSeasons?.find(s=>s.fromMonth<=s.toMonth?month>=s.fromMonth&&month<=s.toMonth:month>=s.fromMonth||month<=s.toMonth)||v;
 const blocked=v.closedDays.includes(weekday),hours=s.open&&s.close?s.open+'–'+s.close+(s.lastEntry?' · آخر دخول '+s.lastEntry:''):'';
 return {blocked,known:!!hours,reason:blocked?'يوم إغلاق أسبوعي مسجل؛ نستبعده احتياطيًا، وقد تستثنى العطلات وفق إعلان المشغّل.':hours?'داخل نطاق الجدول المحفوظ؛ لا يثبت تشغيل اليوم أو توفر الحجز.':'ساعات الزيارة غير معروفة.',hours};
}
export function dateForSchedule(start:string,day:number){return start?calendarDate(start,day-1):'';}
export function schedulingContext(t:Trip,ids:string[],options:ScheduleOptions=defaultScheduleOptions):NonNullable<PlanDraft['scheduling']>{
 const optionsValid=Number.isInteger(options.dayMinutes)&&options.dayMinutes>=60&&options.dayMinutes<=900&&[options.breakMinutes,options.transferBufferMinutes].every(n=>Number.isInteger(n)&&n>=0&&n<=180);
 if(!optionsValid)throw Error('راجع سعة اليوم والراحة واحتياطي الانتقال.');
 let startDate='';if(t.mode==='dates'&&t.date){try{startDate=calendarDate(t.date,0);}catch{throw Error('تاريخ البداية غير صالح؛ صححه قبل توزيع الإغلاق.');}}
 const visitMinutes=Object.fromEntries(ids.map(id=>{const p=findPlace(id),minutes=options.visitMinutes[id]??p?.visit?.maxMinutes;if(!Number.isInteger(minutes)||!minutes||minutes<15||minutes>720)throw Error('حدد مدة تخطيط بين ١٥ و٧٢٠ دقيقة لكل مكان.');return [id,minutes];}));
 const city=ids.length?findPlace(ids[0])?.city:undefined;
 const occupied=Array.from({length:Number(t.days)},(_,i)=>{const activities=t.plans[t.selected]?.[i]?.activities||[];return {count:activities.length,minutes:activities.reduce((n,a)=>n+(Number(a.duration)>0?Number(a.duration):0),0),unknown:activities.some(a=>!a.duration||!Number.isFinite(Number(a.duration))||Number(a.duration)<=0),otherCity:activities.some(a=>{const venue=a.venueId?findPlace(a.venueId):undefined;return !!(city&&venue&&venue.city!==city);})};});
 return {version:1,startDate,dayMinutes:options.dayMinutes,breakMinutes:options.breakMinutes,transferBufferMinutes:options.transferBufferMinutes,visitMinutes,occupied};
}
export function scheduleDayLoad(entries:PlanDraft['entries'],day:number,s:NonNullable<PlanDraft['scheduling']>){
 const selected=entries.filter(e=>e.day===day),old=s.occupied[day-1]||{count:0,minutes:0,unknown:false},gaps=Math.max(0,old.count+selected.length-1);
 return {count:old.count+selected.length,minutes:old.minutes+selected.reduce((n,e)=>n+(s.visitMinutes[e.placeId]||0),0)+gaps*(s.breakMinutes+s.transferBufferMinutes),unknown:old.unknown,otherCity:old.otherCity||false};
}
export function allowedPlaceDays(draft:PlanDraft,id:string){const p=findPlace(id),s=draft.scheduling;return Array.from({length:draft.dayCount},(_,i)=>i+1).filter(day=>!draft.constraints?.freeDays.includes(day)&&(!draft.constraints?.lockedDays[id]||draft.constraints.lockedDays[id]===day)&&(!s||!p||!placeAvailability(p,dateForSchedule(s.startDate,day)).blocked));}
const limit=(pace:string)=>pace==='هادئ'?1:pace==='مكثف'?3:2;
export function validateScheduledDraft(draft:PlanDraft,pace:string){
 const s=draft.scheduling;if(!s)return;
 for(const e of draft.entries){if(!s.visitMinutes[e.placeId])throw Error('مدة أحد الأماكن غير محفوظة؛ أعد توزيع المسودة.');if(!allowedPlaceDays(draft,e.placeId).includes(e.day))throw Error('اليوم المختار يخالف إغلاقًا مسجلًا أو يوم راحة أو تثبيتًا؛ اختر يومًا آخر.');}
 for(let day=1;day<=draft.dayCount;day++){if(!draft.entries.some(e=>e.day===day))continue;const load=scheduleDayLoad(draft.entries,day,s);if(load.otherCity)throw Error('هذا اليوم فيه مكان من مدينة أخرى؛ خصص لها يومًا منفصلًا وراجع انتقالك بين المدن.');if(load.unknown)throw Error('هذا اليوم فيه نشاط محفوظ بمدة غير محددة؛ أكمل مدته أو اختر يومًا آخر.');if(load.count>limit(pace)||load.minutes>s.dayMinutes)throw Error('اليوم '+day+' يتجاوز الوتيرة أو سعة الوقت مع الراحة واحتياطي الانتقال.');}
}
export function allocateScheduledDraft(draft:PlanDraft,pace:string):PlanDraft{
 if(!draft.scheduling)return draft;const s:NonNullable<PlanDraft['scheduling']>=draft.scheduling;
 const entries=draft.entries.filter(e=>!draft.constraints?.excludedIds.includes(e.placeId));
 const choices=new Map(entries.map(e=>[e.placeId,allowedPlaceDays(draft,e.placeId)]));
 const assigned:PlanDraft['entries']=[];let attempts=0;
 function search(remaining:PlanDraft['entries']):boolean{
  if(!remaining.length)return true;if(++attempts>10000)return false;
  const proximity=(id:string)=>{const point=findPlace(id)?.location,known=assigned.map(e=>findPlace(e.placeId)?.location).filter(Boolean);return point&&known.length?Math.min(...known.map(q=>distanceKm(point,q!))):0;};
  // Visit a nearby remaining point before filling a day with a longer, more distant stop.
  // Single-day constraints still take priority; backtracking keeps capacity and closures binding.
  const ranked=[...remaining].sort((a,b)=>Number(choices.get(b.placeId)!.length===1)-Number(choices.get(a.placeId)!.length===1)||proximity(a.placeId)-proximity(b.placeId)||choices.get(a.placeId)!.length-choices.get(b.placeId)!.length||s.visitMinutes[b.placeId]-s.visitMinutes[a.placeId]||a.placeId.localeCompare(b.placeId));
  const entry=ranked[0],p=findPlace(entry.placeId)!;
  const candidateDays=choices.get(entry.placeId)!.filter(day=>{const load=scheduleDayLoad([...assigned,{...entry,day}],day,s);return !load.otherCity&&!load.unknown&&load.count<=limit(pace)&&load.minutes<=s.dayMinutes;});
  const score=(day:number)=>{const group=assigned.filter(e=>e.day===day),points=group.map(e=>findPlace(e.placeId)?.location).filter(Boolean);return !group.length?4:p.location&&points.length?Math.min(...points.map(q=>distanceKm(p.location!,q!))):3;};
  candidateDays.sort((a,b)=>score(a)-score(b)||a-b);
  for(const day of candidateDays){assigned.push({...entry,day});if(search(ranked.slice(1)))return true;assigned.pop();}return false;
 }
 if(!search(entries))throw Error('لم نجد توزيعًا يحقق المدة والراحة والإغلاق والتثبيت. قلّل الأماكن أو زد الأيام وسعتها، وأكمل مدد الأنشطة المحفوظة وخصص يومًا منفصلًا لكل مدينة؛ اختياراتك باقية.');
 const ordered:PlanDraft['entries']=[];
 for(let day=1;day<=draft.dayCount;day++){const pending=assigned.filter(e=>e.day===day);if(!pending.length)continue;ordered.push(pending.shift()!);while(pending.length){const last=findPlace(ordered[ordered.length-1].placeId)?.location;pending.sort((a,b)=>last&&findPlace(a.placeId)?.location&&findPlace(b.placeId)?.location?distanceKm(last,findPlace(a.placeId)!.location!)-distanceKm(last,findPlace(b.placeId)!.location!):0);ordered.push(pending.shift()!);}}
 const result={...draft,entries:ordered};validateScheduledDraft(result,pace);return result;
}
export function scheduleReasons(draft:PlanDraft,id:string){
 const entry=draft.entries.find(e=>e.placeId===id),s=draft.scheduling,p=findPlace(id);if(!entry||!s||!p)return [];
 const others=draft.entries.filter(e=>e.day===entry.day&&e.placeId!==id),reasons=[draft.constraints?.lockedDays[id]?'اليوم مثبت باختيارك.':'اختير يوم يتسع للزيارة والراحة واحتياطي الانتقال.'];
 const nearby=others.map(e=>findPlace(e.placeId)?.location).filter(Boolean);
 if(p.location&&nearby.length)reasons.push('أقرب نشاط في اليوم يبعد نحو '+Math.min(...nearby.map(point=>distanceKm(p.location!,point!))).toFixed(1)+' كم بالخط المستقيم بين نقاط مرجعية؛ ليست مسافة الطريق. التوزيع يراعي القيود ولا يضمن أقصر مسار.');
 reasons.push(placeAvailability(p,dateForSchedule(s.startDate,entry.day)).reason,'زمن الطريق الفعلي غير معروف؛ '+s.transferBufferMinutes+' دقيقة احتياطي لكل انتقال افتراض تخطيط قابل للتعديل.');return reasons;
}
