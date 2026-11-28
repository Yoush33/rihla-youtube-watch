import {calendarDate,type Trip,type Activity} from './planning';
import {countryFor} from './journey-insights';
import {countryName} from './country-planning';
import {visas} from './world';
import {events} from './travel';
import {places,toMinutes,placesChecked} from './places';
import {plannerPlaces,cityGuides} from './city-depth';
import {entryPolicies,venueFacts,practicalFacts,type SourceFact} from './reliability-catalog';
import {blankProfile,blankCharge,type Charge,type ReliabilityReview,type ReviewProof} from './reliability-schema';
import {minorAmount,moneyDigits} from './money';
import {distanceKm} from './geo';
export type ReviewState='conflict'|'missing'|'stale'|'estimate'|'checked';
export type ReviewGroup='entry'|'days'|'budget'|'sources';
export type Check={id:string;group:ReviewGroup;state:ReviewState;title:string;detail:string;day?:number;source?:string;checked?:string};
export const stateLabels:Record<ReviewState,string>={conflict:'تعارض',missing:'ناقص',stale:'يحتاج إعادة مراجعة',estimate:'تقديري / بإقرارك',checked:'مكتمل ضمن الفحص'};
export const groupLabels:Record<ReviewGroup,string>={entry:'شروط السفر',days:'واقعية الأيام',budget:'اكتمال التكلفة',sources:'المراجع ومواعيد مراجعتها'};
export const chargeLabels:Record<string,string>={taxes:'الضرائب ورسوم الخدمة',baggage:'الأمتعة واختيار المقعد',airport:'التنقل من المطار وإليه',visa:'التأشيرة والتسجيل',insurance:'تأمين السفر',internet:'الإنترنت والاتصال',localFees:'الرسوم المحلية',reserve:'احتياطي تختاره'};
export const baseLabels:Record<string,string>={stay:'السكن',food:'الطعام',transport:'التنقل',activities:'الأنشطة',flight:'الطيران'};
export const today=()=>new Date().toISOString().slice(0,10);
export function validDate(s:string){try{return !!s&&calendarDate(s,0)===s;}catch{return false;}}
export function safeSource(s:string){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function fresh(checked:string,days:number,now=today()){if(!validDate(checked)||!validDate(now)||checked>now)return false;return (Date.parse(now)-Date.parse(checked))/86400000<=days;}
export const reviewFor=(t:Trip):ReliabilityReview=>t.reliability?.[t.selected]||{};
export const nationalityCode=(t:Trip)=>/^(sa|saudi|saudi arabia|سعودي|سعودية|السعودية|المملكة العربية السعودية)$/i.test(t.nationality.trim())?'SA':'';
export function entryBasis(t:Trip){return JSON.stringify([t.selected,t.origin,t.date,t.mode,t.days,t.nationality,t.travelProfile||blankProfile]);}
export function budgetBasis(t:Trip){const c=t.costs[t.selected]||{};return JSON.stringify([t.selected,t.date,t.month,t.mode,t.days,t.travelers,t.currency,...['rooms',...Object.keys(baseLabels).flatMap(k=>[k+'Low',k+'High',k+'Source',k+'Checked'])].map(k=>c[k]||''),(t.extras?.[t.selected]||[]).map(e=>[e.id,e.planned])]);}
export function proofState(p:ReviewProof|undefined,basis:string,days:number,now=today()):ReviewState{if(!p||!safeSource(p.source)||!validDate(p.checked)||!p.basis)return 'missing';return p.basis!==basis||!fresh(p.checked,days,now)?'stale':'estimate';}
export function travelDates(t:Trip){try{const n=Number(t.days);if(t.mode!=='dates'||!Number.isInteger(n)||n<1||n>30)return null;return {start:calendarDate(t.date,0),end:calendarDate(t.date,n-1),days:n};}catch{return null;}}
function addMonths(date:string,n:number){const d=new Date(date+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
export function factState(f:SourceFact,days:number,now=today()):ReviewState{if(f.verification==='unresolved'||f.verification==='needs_confirmation')return 'missing';if(f.verification==='indexed')return 'stale';if(!safeSource(f.source)||!fresh(f.checked,days,now))return 'stale';return f.verification==='editorial'?'estimate':'checked';}
export const verificationLabels={direct:'قُرئ المصدر مباشرة',indexed:'مرجع رسمي مفهرس؛ يحتاج فتحًا مباشرًا',needs_confirmation:'التطبيق يحتاج تأكيدًا',unresolved:'لم يثبت من المصادر',editorial:'اقتراح تحريري'};
export function venueForDate(id:string|undefined,date:string){const raw=venueFacts.find(v=>v.id===id);if(!raw||!validDate(date)||raw.validFrom&&date<raw.validFrom||raw.validUntil&&date>raw.validUntil)return undefined;const month=Number(date.slice(5,7)),season=raw.hoursSeasons?.find(s=>s.fromMonth<=s.toMonth?month>=s.fromMonth&&month<=s.toMonth:month>=s.fromMonth||month<=s.toMonth);return season?{...raw,...season}:raw;}
export function entryChecks(t:Trip,now=today()):Check[]{
 const result:Check[]=[],p=t.travelProfile||blankProfile,dates=travelDates(t),code=countryFor(t.selected),policy=entryPolicies.find(x=>x.country===code&&x.nationality===nationalityCode(t)&&x.passportType===p.passportType&&x.purpose===p.purpose),review=reviewFor(t),basis=entryBasis(t);
 const add=(id:string,state:ReviewState,title:string,detail:string,source?:string,checked?:string)=>result.push({id,group:'entry',state,title,detail,source,checked});
 const missing=[!t.selected&&'الوجهة',!t.origin&&'المغادرة',!t.nationality&&'جنسية الجواز',!dates&&'تواريخ محددة ومدة صحيحة',!p.purpose&&'غرض الزيارة',!p.passportType&&'نوع الجواز',!validDate(p.passportExpiry)&&'تاريخ انتهاء الجواز'];
 if(missing.some(Boolean))add('entry-input','missing','أكمل بيانات المراجعة',missing.filter(Boolean).join('، '));else add('entry-input','checked','مدخلات السفر مكتملة','هذا فحص اكتمال المدخلات، لا تحقق من الوثائق.');
 if(!policy)add('entry-policy','missing','لا توجد قاعدة آلية تطابق حالتك','راجع الجهة المختصة؛ لا نعمم قواعد السعودي أو السياحة على جواز أو غرض آخر.',visas[code]?.source);
 else{
  const first=policy.requirements[0];add('entry-policy',policy.requirements.some(r=>['missing','stale'].includes(factState(r,30,now)))?'stale':'estimate',policy.headline,policy.caveat,first?.source,first?.checked);
  if(dates){if(policy.validFrom&&dates.start<policy.validFrom||policy.validUntil&&dates.end>policy.validUntil)add('entry-window','conflict','الفترة خارج نافذة القاعدة المحفوظة','لا نفترض تمديد الإعفاء. راجع جهة الدخول بموعدك الكامل.',first?.source,first?.checked);else if(policy.validFrom||policy.validUntil)add('entry-window','checked','الموعد داخل النطاق الزمني المسجل','لا يعني ذلك استيفاء بقية شروط الدخول.');else add('entry-window','estimate','لا توجد نافذة انتهاء محددة في هذا السجل','لا يعني غياب تاريخ انتهاء استمرار السياسة؛ أعد مراجعة الجهة بموعدك.');
   if(policy.maxDays!==null&&dates.days>policy.maxDays)add('entry-duration','conflict','المدة تحتاج مراجعة نوع الدخول','الخطة أطول من حد '+policy.maxDays+' يومًا المسجل. نستخدم عدد أيام الرحلة كاملًا بشكل تحفظي؛ '+(policy.countFromNextDay?'المصدر يبدأ عد المدة النظامية من اليوم التالي للدخول.':'راجع طريقة العد مع الجهة.'));
   if(validDate(p.passportExpiry)){const minimum=policy.minPassportMonths!==null?addMonths(dates.start,policy.minPassportMonths):dates.end;if(p.passportExpiry<minimum)add('passport-expiry','conflict','صلاحية الجواز لا تغطي الحد المفحوص','الحد المستخدم '+minimum+(policy.minPassportMonths===null?'؛ شرط الصلاحية الإضافية غير موثق لهذه الحالة.':'. حد المصدر: '+policy.minPassportMonths+' أشهر من الدخول.'));else add('passport-expiry',policy.minPassportMonths===null?'missing':'checked','مراجعة صلاحية الجواز',policy.minPassportMonths===null?'يغطي نهاية الرحلة، لكن شرط الأشهر الإضافية يحتاج مصدرًا.':'التاريخ المدخل يغطي الحد المسجل؛ هذا ليس فحصًا لوثيقة الجواز.');}
  }
  for(const [i,fact] of policy.requirements.entries()){const status=factState(fact,30,now),outside=dates&&(fact.validFrom&&dates.start<fact.validFrom||fact.validUntil&&dates.end>fact.validUntil);add('entry-fact-'+i,outside?'missing':status==='checked'?'estimate':status,fact.title,fact.text+' '+fact.scope+(outside?' هذا المرجع خارج النطاق الزمني لرحلتك.':''),fact.source,fact.checked);}
  if(dates&&policy.maxDays===null&&!policy.maxYears)add('entry-duration-unknown','missing','حد الإقامة يحتاج تأكيدًا مباشرًا','الحد المرجعي لم يحول إلى قاعدة آلية موثقة. راجع المدة الممنوحة في مسار دخولك.');
  if(dates&&policy.maxYears&&dates.end>=addMonths(dates.start,policy.maxYears*12))add('entry-year-limit','conflict','المدة تتجاوز النطاق السنوي المسجل','راجع جهة الدخول؛ لا نحول السنة تلقائيًا إلى ٣٦٥ يومًا.');
 }
 if(dates&&dates.start<now)add('entry-past','conflict','موعد الرحلة في الماضي','حدّث الموعد قبل مراجعة حجز جديد.');
 if(p.transitMode==='unknown'||p.transitMode==='countries'&&!p.transits.length)add('transit','missing','مسار الترانزيت غير مكتمل','حدد رحلة مباشرة أو بلدان الترانزيت. تغيير المطار أو الخروج منه قد يغيّر المتطلبات.');
 else if(p.transitMode==='countries')for(const transit of p.transits){const key='transit-'+transit,proof=review.proofs?.[key];add(key,proofState(proof,basis,30,now),'ترانزيت '+countryName(transit),'تحتاج مراجعة المسار والمطار والمدة والجواز مع جهة الدخول وشركة الطيران؛ إثباتك لا يعد تصريحًا.',proof?.source,proof?.checked);}
 else add('transit','estimate','لا ترانزيت بحسب إدخالك','أعد المراجعة إذا تغير خط السير.');
 for(const [key,title] of [['entry','راجعت متطلبات الوجهة كاملة'],['departure','راجعت تعليمات بلد المغادرة وشركة الطيران']]){const proof=review.proofs?.[key];add('proof-'+key,proofState(proof,basis,30,now),title,proof?.basis===basis?'مراجعة أدخلتها أنت، لا تحقق آلي من المصدر.':'تُربط المراجعة بالوجهة والموعد والمدة والجواز والغرض ومسار العبور.',proof?.source,proof?.checked);}
 return result;
}
export function routeBasis(t:Trip,day:number,a:Activity,b:Activity){return JSON.stringify([t.selected,t.date,t.mode,day,a.id,b.id,a.time,a.duration,b.time,a.place,b.place,a.location?.lat,a.location?.lng,b.location?.lat,b.location?.lng]);}
export function venueBasis(t:Trip,day:number,a:Activity){return JSON.stringify([t.selected,t.date,t.mode,day,a.id,a.venueId,a.title,a.place,a.location?.lat,a.location?.lng]);}
export function routeKey(a:Activity,b:Activity){return a.id+'>'+b.id;}
export function itineraryChecks(t:Trip,now=today()):Check[]{
 const result:Check[]=[],r=reviewFor(t),days=t.plans[t.selected]||[],dates=travelDates(t),start=toMinutes(r.dayStart||''),end=toMinutes(r.dayEnd||'');
 const add=(id:string,state:ReviewState,title:string,detail:string,day?:number,source?:string,checked?:string)=>result.push({id,group:'days',state,title,detail,day,source,checked});
 if(!days.length){add('no-plan','missing','لا أيام محفوظة بعد','أنشئ الخطة أولًا ثم راجع قابليتها للتنفيذ.');return result;}
 if(days.length!==Number(t.days))add('length','conflict','مدة الخطة لا تطابق مدة الرحلة',days.length+' أيام في الخطة مقابل '+t.days+' في التفاصيل.');
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)add('day-window','missing','حدّد بداية اليوم ونهايته','نحتاج نافذة يومية من اختيارك لفحص الازدحام والراحة.');
 days.forEach((d,i)=>{let date='';try{if(dates)date=calendarDate(t.date,i);}catch{}const list=d.activities||[];
  if(!list.length){const note=r.dayNotes?.[String(i)]??d.notes;add('empty-'+i,note?.trim()?'estimate':'missing','اليوم '+(i+1)+' بلا أنشطة',note||'إن كان يوم راحة أو وصول، دوّن ذلك في مراجعة اليوم.',i);}
  const total=list.reduce((sum,a)=>sum+Number(a.duration||0),0);if(total>480)add('load-'+i,'estimate','أكثر من ٨ ساعات أنشطة','دون احتساب كامل النقل والراحة؛ راجع ملاءمة الوتيرة.',i);
  list.forEach((a,j)=>{const raw=venueFacts.find(v=>v.id===a.venueId),catalog=places.find(p=>p.id===a.venueId),manual=r.venues?.[a.id],manualValid=!!manual&&manual.basis===venueBasis(t,i,a)&&manual.visitDate===date&&!!date&&safeSource(manual.source)&&fresh(manual.checked,30,now),facts=venueForDate(a.venueId,date);
   const source=manualValid?manual!.source:facts?.facts[0]?.source||catalog?.source,checked=manualValid?manual!.checked:facts?.facts[0]?.checked|| (catalog?placesChecked:''),opens=manualValid?manual!.open:facts?.open||catalog?.open||'',closes=manualValid?manual!.close:facts?.close||catalog?.close||'',last=manualValid?manual!.lastEntry:facts?.lastEntry||catalog?.lastEntry||'',time=toMinutes(a.time),duration=Number(a.duration),label='اليوم '+(i+1)+' · '+(a.title||'نشاط بلا اسم');
   if(!a.location)add('point-'+a.id,'missing',label,'الموقع غير محدد؛ لا يمكن فحص تقارب الأماكن.',i);
   if(!Number.isFinite(time)||!Number.isInteger(duration)||duration<=0)add('time-'+a.id,'missing',label,'وقت البداية أو مدة الزيارة غير مدخلين.',i);else{
    if(time+duration>1440)add('midnight-'+a.id,'conflict',label,'يمتد إلى اليوم التالي.',i);
    if(Number.isFinite(start)&&Number.isFinite(end)&&(time<start||time+duration>end))add('window-'+a.id,'conflict',label,'يتجاوز بداية أو نهاية اليوم التي حددتها.',i);
    const o=toMinutes(opens),c=toMinutes(closes),lastM=toMinutes(last);if(date&&Number.isFinite(o)&&Number.isFinite(c)&& (manualValid||facts?.scheduleVerified!==false)){if(time<o||time+duration>c||Number.isFinite(lastM)&&time>lastM)add('hours-'+a.id,'conflict',label,'موعد النشاط خارج نافذة الزيارة أو آخر دخول المسجل.',i,source,checked);else add('hours-'+a.id,fresh(checked||'',30,now)?'checked':'stale',label,'الوقت داخل النافذة المسجلة فقط؛ تحقق من إغلاقات يومك الاستثنائية.',i,source,checked);}else add('hours-'+a.id,'missing',label,raw?.scheduleVerified===false?'توجد مراجع جزئية أو استثناءات؛ أكّد نافذة هذا اليوم من المشغّل.':'ساعات زيارة قابلة للفحص غير متاحة لهذا اليوم.',i,source,checked);
   }
   const closed=[...(facts?.closedDays||[]),...(catalog?.closedDays||[])],holiday=date?events.find(e=>countryFor(e.destination)===countryFor(t.selected)&&e.kind==='عطلة رسمية'&&e.start<=date&&e.end>=date):undefined;
   if(date&&(closed.includes(new Date(date+'T12:00:00Z').getUTCDay())||catalog?.closedDates?.includes(date))){const exception=!!holiday&&facts?.holidayOpeningException;add('closed-'+a.id,exception?'missing':'conflict',label,exception?'اليوم ضمن إغلاق أسبوعي وعطلة مدخلة، والمصدر يستثني العطلات؛ أكّد تشغيل هذا اليوم.':'يقع في يوم إغلاق مسجل؛ راجع الاستثناءات مع المشغّل.',i,source,checked);}
   if(date&&holiday&&facts?.closedOnHolidays)add('holiday-closure-'+a.id,facts.scheduleVerified===false?'missing':'conflict',label,'المرجع يذكر إغلاق العطلات؛ طابق هذه العطلة مع المشغّل.',i,holiday.source,checked);
   if(raw&&!facts&&date)add('expired-hours-'+a.id,'stale',label,'نافذة المرجع لا تغطي تاريخ الزيارة؛ لا نمدد ساعات معرض أو موسم تلقائيًا.',i,raw.facts[0]?.source,raw.facts[0]?.checked);
   if(manual&&!manualValid)add('manual-'+a.id,'stale',label,'مراجعة المكان لا تطابق يوم الزيارة، أو مصدرها/تاريخها غير مكتمل أو تجاوز مهلة المراجعة.',i,manual.source,manual.checked);
   const booking=manualValid?manual!.booking:facts?.booking||'unknown',linked=t.bookings?.find(b=>b.id===a.bookingId);
   if(a.bookingId&&(!linked||linked.status==='cancelled'))add('booking-link-'+a.id,'conflict',label,'الحجز المرتبط مفقود أو ملغى؛ نسخ الحجز لا تتحدث تلقائيًا.',i);
   if(linked&&date&&linked.date!==date)add('booking-date-'+a.id,'conflict',label,'تاريخ الحجز المرتبط يختلف عن يوم النشاط.',i);
   if(linked?.type==='activity'&&linked.status!=='cancelled'&&Number.isFinite(toMinutes(linked.time))&&Number.isFinite(time)&&toMinutes(linked.time)!==time)add('booking-time-'+a.id,'conflict',label,'وقت النشاط '+a.time+' يختلف عن وقت الحجز المرتبط '+linked.time+'؛ راجع الموعد، فالنسخة في الخطة لا تتحدث تلقائيًا.',i);
   if(booking==='unknown')add('booking-'+a.id,'missing',label,'متطلبات الحجز غير موثقة؛ راجع المشغّل.',i,source,checked);
   else if(booking==='required'&&!(linked?.status==='confirmed'&&linked.date===date))add('booking-'+a.id,'missing',label,'الحجز مطلوب ولا يوجد حجز مطابق مؤكد بإدخالك.',i,source,checked);
   else add('booking-'+a.id,!fresh(checked||'',30,now)?'stale':!manualValid&&facts?.scheduleVerified===false?'missing':booking==='not_required'?'checked':'estimate',label,booking==='not_required'?'لا حجز مسبق بحسب المرجع؛ راجع تغير السياسة.':'تأكيد بإدخالك؛ لم نتصل بالمشغّل للتحقق.',i,source,checked);
   const b=list[j+1];if(!b)return;const k=routeKey(a,b),route=r.transfers?.[k],minutes=route?.minutes===''?NaN:Number(route?.minutes),rest=route?.rest===''?NaN:Number(route?.rest),routeValid=route&&route.basis===routeBasis(t,i,a,b)&&Number.isInteger(minutes)&&minutes>=0&&Number.isInteger(rest)&&rest>=0&&safeSource(route.source)&&fresh(route.checked,7,now)&&!!route.mode;
   if(a.location&&b.location&&distanceKm(a.location,b.location)>50)add('far-'+k,'estimate','انتقال بعيد في اليوم '+(i+1),'المسافة المباشرة تتجاوز ٥٠ كم؛ ليست زمن طريق. راجع انتقالًا مستقلًا.',i);
   const next=toMinutes(b.time);if(Number.isFinite(time)&&duration>0&&Number.isFinite(next)){if(next<time+duration)add('overlap-'+k,'conflict','تداخل أو ترتيب غير زمني في اليوم '+(i+1),a.title+' ثم '+b.title,i);else if(routeValid&&next<time+duration+minutes+rest)add('gap-'+k,'conflict','وقت الانتقال والراحة لا يكفي',a.title+' ← '+b.title+': تحتاج '+(minutes+rest)+' دقيقة بين النشاطين بحسب إدخالك.',i,route!.source,route!.checked);}
   add('route-'+k,routeValid?'estimate':route?.basis?'stale':'missing','النقل: '+a.title+' ← '+b.title,routeValid?'مدة '+minutes+' دقيقة + '+rest+' راحة، نقلتها من مصدر؛ ليست حركة مرور مباشرة.':'أدخل مدة الطريق والراحة ومصدرها لهذا اليوم. تغيير ترتيب الأماكن أو مواقعها يبطل المراجعة.',i,route?.source,route?.checked);
  });
 });return result;
}
export function budgetReview(t:Trip,now=today()){
 const checks:Check[]=[],r=reviewFor(t),c=t.costs[t.selected]||{},extras=t.extras?.[t.selected]||[],n=Number(t.days),people=Number(t.travelers),rooms=Number(c.rooms),scale=10**moneyDigits(t.currency),factors=[Math.max(0,n-1)*rooms,n*people,n*people,n*people,people];let low=0,high=0;
 const add=(id:string,state:ReviewState,title:string,detail:string,source?:string,checked?:string)=>checks.push({id,group:'budget',state,title,detail,source,checked});
 const contextValid=!!t.currency&&[n,people,rooms].every(x=>Number.isInteger(x)&&x>=1&&x<=30);if(!contextValid)add('budget-input','missing','افتراضات الميزانية غير مكتملة','حدد المدة والمسافرين والعملة وعدد الغرف.');
 for(const [i,[key,title]] of Object.entries(baseLabels).entries()){const lo=minorAmount(c[key+'Low']||'',t.currency),hi=minorAmount(c[key+'High']||'',t.currency);if(lo===null||hi===null)add('base-'+key,'missing',title,'أدخل نطاقًا صحيحًا بدقة عملة الرحلة.');else if(hi<lo)add('base-'+key,'conflict',title,'الحد الأعلى أقل من الأدنى.');else{if(contextValid){low+=lo*factors[i];high+=hi*factors[i];}const proof=r.proofs?.['quote-'+key],url=proof?.source||c[key+'Source']||'',checked=proof?.checked||c[key+'Checked']||'';add('base-'+key,proofState(proof,budgetBasis(t),7,now),title,'النطاق بإدخالك، لا عرض حي. سجّل مراجعة المصدر لهذه المدة والعدد والعملة؛ تتقادم عند تغير افتراضات الرحلة.',url,checked);}}
 for(const e of extras){const amount=minorAmount(e.planned,t.currency);if(amount===null)add('extra-'+e.id,'missing',e.title||'رسم إضافي','قيمة مجهولة أو غير صالحة؛ لم تدخل في المجموع.');else{low+=amount;high+=amount;}}
 for(const [key,title] of Object.entries(chargeLabels)){const q=r.charges?.[key]||blankCharge;if(q.mode==='unknown'){add('charge-'+key,'missing',title,'لم تحدد إن كانت مشمولة أو إضافية أو غير مطلوبة.');continue;}
  if(q.mode==='extra'&&!extras.some(e=>e.id===q.extraId&&minorAmount(e.planned,t.currency)!==null)){add('charge-'+key,'missing',title,'الرسم الإضافي المرتبط مفقود أو غير مسعّر.');continue;}
  if(q.mode==='included'&&(!baseLabels[q.includedIn]||minorAmount(c[q.includedIn+'Low']||'',t.currency)===null)){add('charge-'+key,'missing',title,'حدد البند المسعّر الذي يشملها حتى لا تتكرر.');continue;}
  if(q.mode==='na'&&!q.note.trim()){add('charge-'+key,'missing',title,'دوّن سبب عدم انطباق البند.');continue;}
  const state=q.mode==='na'?q.basis===budgetBasis(t)?'estimate':'stale':proofState(q,budgetBasis(t),7,now);add('charge-'+key,state,title,q.mode==='extra'?'تُضاف مرة واحدة ضمن الرسوم الإضافية.':q.mode==='included'?'ضمن '+baseLabels[q.includedIn]+'؛ لا نضيفها مرة أخرى.':'غير مطلوبة بحسب إقرارك: '+q.note,q.source,q.checked);
 }
 const limit=minorAmount(t.budget,t.currency);if(limit!==null&&high>limit)add('over-budget','conflict','النطاق المدخل يتجاوز ميزانيتك','الحد الأعلى للبنود المحسوبة أكبر من الميزانية.');
 return {checks,low:low/scale,high:high/scale,contextValid,complete:!checks.some(c=>['missing','stale','conflict'].includes(c.state))};
}
export function patchCharge(t:Trip,key:string,patch:Partial<Charge>,amount?:string):Partial<Trip>{
 if(!Object.hasOwn(chargeLabels,key)||!t.selected)throw Error('اختر وجهة وبندًا صحيحًا.');const r=reviewFor(t),old=r.charges?.[key]||blankCharge,next={...old,...patch};let extras=[...(t.extras?.[t.selected]||[])];
 if(next.mode==='extra'){if(!next.extraId||!extras.some(e=>e.id===next.extraId)){if(extras.length>=100)throw Error('بلغت سعة الرسوم الإضافية.');next.extraId=crypto.randomUUID();extras.push({id:next.extraId,title:chargeLabels[key],category:['visa','insurance','internet'].includes(key)?key as 'visa'|'insurance'|'internet':'fees',planned:''});}if(amount!==undefined)extras=extras.map(e=>e.id===next.extraId?{...e,planned:amount}:e);}
 else if(old.mode==='extra'&&old.extraId){if(!Object.entries(r.charges||{}).some(([other,q])=>other!==key&&q.mode==='extra'&&q.extraId===old.extraId))extras=extras.filter(e=>e.id!==old.extraId);next.extraId='';}
 return {reliability:{...t.reliability,[t.selected]:{...r,charges:{...r.charges,[key]:next}}},extras:{...t.extras,[t.selected]:extras}};
}
export function usedSources(t:Trip):SourceFact[]{const code=countryFor(t.selected),activities=(t.plans[t.selected]||[]).flatMap(d=>d.activities||[]),used=plannerPlaces.filter(p=>activities.some(a=>a.venueId===p.id)),cities=new Set([...used.map(p=>p.city),...(t.countryCities||[])]),sources:SourceFact[]=[];
 const cityAlias:Record<string,string>={'beijing':'بكين','shanghai':'شنغهاي','kuala-lumpur':'كوالالمبور','tbilisi':'تبليسي'};
 for(const p of entryPolicies.filter(p=>p.country===code))sources.push(...p.requirements);
 for(const p of used){sources.push({title:p.name,text:p.summary,source:p.source,checked:p.checked,published:p.published,scope:p.city});for(const extra of p.additionalSources||[])sources.push({title:p.name+' · '+extra.name,text:'مرجع إضافي للمكان.',source:extra.url,checked:extra.checked,published:extra.published,scope:p.city});}
 for(const v of venueFacts.filter(v=>activities.some(a=>a.venueId===v.id)))sources.push(...v.facts,...(v.exceptions||[]));
 for(const g of cityGuides.filter(g=>g.country===code&&cities.has(g.city)))for(const section of g.sections)for(const f of section.sources)sources.push({title:g.city+' · '+section.title,text:section.text,source:f.url,checked:f.checked,published:f.published,scope:g.city});
 sources.push(...practicalFacts.filter(p=>p.country===code&&cities.has(cityAlias[p.city]||p.city)));
 for(const f of [...sources])for(const a of f.additionalSources||[])sources.push({title:a.name,text:a.note||'مرجع داعم للمعلومة.',source:a.url,checked:a.checked,published:a.published,scope:f.scope,verification:a.access.includes('index')?'indexed':'direct'});
 return [...new Map(sources.filter(s=>safeSource(s.source)).map(s=>[s.source+'|'+s.title,s])).values()];
}
export function reviewTrip(t:Trip,now=today()){const sources=usedSources(t),checks=[...entryChecks(t,now),...itineraryChecks(t,now),...budgetReview(t,now).checks,...sources.map((s,i):Check=>({id:'source-'+i,group:'sources',state:factState(s,90,now),title:s.title,detail:'تاريخ المصدر: '+s.published+' · النطاق: '+s.scope+'. القراءة السابقة لا تعني تحديثًا مباشرًا.',source:s.source,checked:s.checked}))];if(!sources.length)checks.push({id:'sources-empty',group:'sources',state:'missing',title:'المراجع المرتبطة بالخطة غير مكتملة',detail:'اختر أماكن من الدليل أو أضف مصادر المراجعة. لا توجد تغطية شاملة لكل وجهة.'});return {checks,sources,counts:Object.fromEntries(Object.keys(stateLabels).map(s=>[s,checks.filter(c=>c.state===s).length])) as Record<ReviewState,number>};}
