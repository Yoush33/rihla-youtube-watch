import {editCommandSchema,planEditSchema,type Trip,type Day,type Activity} from './planning';
import {digest,paceLimit} from './plan-draft';
import {findPlace} from './place-catalog';
import {placeAvailability,dateForSchedule} from './place-scheduling';
import {nearestOrder} from './geo';
import {z} from 'zod';
export type PlanEdit=z.infer<typeof planEditSchema>;
type Command=z.infer<typeof editCommandSchema>;
const norm=(s:string)=>s.replace(/[\u064b-\u065f\u0670ـ]/g,'').replace(/[أإآ]/g,'ا').replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/\s+/g,' ').trim();
function dayNumber(s:string){const n=norm(s),ord=['الاول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];return /^\d+$/.test(n)?Number(n):ord.indexOf(n)+1;}
const frozen=(a:Activity)=>!!(a.done||a.time||a.bookingId);
const museum=(a:Activity)=>{const p=a.venueId?findPlace(a.venueId):undefined;return /متحف|museum/i.test(a.title)||!!p&&(p.categories?.includes('متحف')||/متحف|museum/i.test(p.name));};
const basis=(t:Trip)=>[t.id,t.selected,t.days,t.mode,t.date,t.month,t.pace,t.plans[t.selected]];
export function parsePlanCommand(request:string,days:Day[]):Command{
 const q=norm(request),count=days.length;
 const validDay=(s:string)=>{const day=dayNumber(s);if(day<1||day>count)throw Error('اختر رقم يوم موجود في خطتك؛ نقرأ الأرقام أو الأول إلى العاشر.');return day;};
 let m=q.match(/^خفف (?:لي )?اليوم (.+)$/);if(m)return {kind:'lighten',day:validDay(m[1])};
 if(/^(?:خل|خلي|اجمع) (?:ال)?متاحف (?:ب|في )يوم واحد$/.test(q))return {kind:'museums'};
 m=q.match(/^رتب اليوم (.+?) حسب القرب$/);if(m)return {kind:'nearby',day:validDay(m[1])};
 m=q.match(/^انقل (.+?) (?:الى|ل) اليوم (.+)$/)||q.match(/^انقل (.+?) لليوم (.+)$/);
 if(m){const items=days.flatMap(d=>d.activities||[]).filter(a=>norm(a.title)===m![1]);if(items.length!==1)throw Error('اكتب اسم النشاط كما يظهر في خطتك؛ إذا تكرر اسمه غيّر أحد الاسمين أولًا.');return {kind:'move',activityId:items[0].id,day:validDay(m[2])};}
 throw Error('لم نغيّر شيئًا. جرّب «خفف اليوم الثاني»، «خل المتاحف بيوم واحد»، «رتب اليوم ٢ حسب القرب»، أو «انقل اسم النشاط إلى اليوم ٣». هذه أوامر محددة وليست فهمًا حرًا لكل العبارات.');
}
function calculate(t:Trip,input:Command){
 const command=editCommandSchema.parse(input),original=t.plans[t.selected]||[];
 if(!original.length)throw Error('أضف أيامًا وأنشطة إلى الخطة أولًا.');
 if(Number(t.days)!==original.length)throw Error('وحّد مدة الرحلة مع عدد أيام الخطة قبل تعديلها بالمساعد.');
 if(command.day&&command.day>original.length)throw Error('اليوم لم يعد موجودًا.');
 const all=original.flatMap((d,i)=>(d.activities||[]).map(a=>({a,day:i})));
 if(new Set(all.map(e=>e.a.id)).size!==all.length)throw Error('توجد معرفات أنشطة مكررة؛ لا يمكن تعديلها بأمان.');
 const result=original.map(d=>({...d,activities:[...(d.activities||[])]})),changes:PlanEdit['changes']=[],warnings=new Set<string>();
 const capacity=paceLimit(t.pace);
 function compatible(a:Activity,to:number,group:Activity[]){
  const p=a.venueId?findPlace(a.venueId):undefined;
  if(p&&group.some(b=>{const other=b.venueId?findPlace(b.venueId):undefined;return !!other&&(p.city!==other.city||p.country!==other.country);}))return false;
  if(p&&placeAvailability(p,dateForSchedule(t.mode==='dates'?t.date:'',to+1)).blocked)return false;
  return true;
 }
 function move(a:Activity,from:number,to:number,reason:string){
  if(frozen(a))throw Error('النشاط له وقت ثابت أو حجز مرتبط أو علامة إنجاز؛ عدّله يدويًا بعد مراجعة التزامك.');
  if(from===to)return;
  const group=result[to].activities;if(group.length>=capacity||!compatible(a,to,group))throw Error('اليوم المستهدف لا يناسب الوتيرة أو مدينة المكان أو إغلاقًا مسجلًا.');
  result[from].activities=result[from].activities.filter(b=>b.id!==a.id);result[to].activities.push(a);changes.push({title:a.title||'نشاط دون اسم',from:from+1,to:to+1,reason});
 }
 if(command.kind==='lighten'){
  if(!command.day)throw Error('اختر اليوم.');const from=command.day-1,list=[...result[from].activities].reverse();
  if(list.length<2)throw Error('هذا اليوم يحتوي نشاطًا واحدًا أو أقل؛ لا يوجد ازدحام عددي لتخفيفه.');
  const candidates=list.filter(a=>!frozen(a)&&a.priority!=='essential');let moved=false;
  for(const a of candidates){const to=result.map((d,i)=>({i,count:d.activities.length})).filter(d=>d.i!==from&&d.count<capacity&&d.count<list.length-1&&compatible(a,d.i,result[d.i].activities)).sort((a,b)=>a.count-b.count||Math.abs(a.i-from)-Math.abs(b.i-from)||a.i-b.i)[0];if(to){move(a,from,to.i,'نقل نشاط غير أساسي إلى يوم أقل ازدحامًا ضمن الوتيرة.');moved=true;break;}}
  if(!moved)throw Error('لم نجد يومًا مناسبًا دون المساس بحجز أو وقت ثابت أو نشاط أساسي. أضف يومًا مرنًا أو عدّل الأنشطة يدويًا.');
 }else if(command.kind==='move'){
  const item=all.find(e=>e.a.id===command.activityId);if(!item||!command.day)throw Error('النشاط أو اليوم غير موجود.');move(item.a,item.day,command.day-1,'نقل النشاط إلى اليوم الذي طلبته.');
 }else if(command.kind==='museums'){
  const items=all.filter(e=>museum(e.a));if(items.length<2)throw Error('نحتاج متحفين على الأقل معروفين بالاسم أو التصنيف في خطتك.');
  if(new Set(items.map(e=>e.day)).size===1)throw Error('المتاحف المحددة مجتمعة في يوم واحد بالفعل.');
  const targets=result.map((d,i)=>({i,count:items.filter(e=>e.day===i).length})).sort((a,b)=>b.count-a.count||a.i-b.i);
  const target=targets.find(({i})=>{const group=result[i].activities.filter(a=>!museum(a)),combined=[...group,...items.map(e=>e.a)];return combined.length<=capacity&&items.every(e=>(e.day===i||!frozen(e.a))&&compatible(e.a,i,combined.filter(a=>a.id!==e.a.id)));});
  if(!target)throw Error('لا يمكن جمع المتاحف ضمن الوتيرة والمواعيد والمدن الحالية. لن نضغطها في يوم غير مناسب.');
  for(const item of items)move(item.a,item.day,target.i,'جمع المتاحف المعروفة بالاسم أو التصنيف مع احترام الأيام الثابتة.');
 }else{
  if(!command.day)throw Error('اختر اليوم.');const i=command.day-1,list=result[i].activities;
  if(list.length<2||list.some(a=>!a.location||frozen(a)))throw Error('ترتيب القرب يحتاج نشاطين بمواقع محددة، دون وقت ثابت أو حجز أو علامة إنجاز.');
  const cities=new Set(list.flatMap(a=>{const p=a.venueId?findPlace(a.venueId):undefined;return p?[p.country+':'+p.city]:[]}));if(cities.size>1)throw Error('هذا اليوم يضم مدنًا مختلفة؛ راجع الانتقال بين المدن أولًا.');
  const next=nearestOrder(list);if(next.every((a,j)=>a.id===list[j].id))throw Error('الترتيب الحالي يطابق اقتراح القرب مع تثبيت أول مكان.');result[i].activities=next;
  changes.push({title:original[i].title||'اليوم '+(i+1),from:i+1,to:i+1,reason:'إعادة ترتيب الأنشطة حسب النقاط الأقرب، مع تثبيت البداية؛ ليس أقصر طريق مضمونًا.'});
 }
 if(!changes.length)throw Error('لم ينتج الطلب تغييرًا؛ الخطة الحالية تحقق هذا الجزء بالفعل.');
 if(changes.length>30)throw Error('التعديل كبير؛ قسّمه إلى طلبات أصغر.');
 const changedDays=new Set(changes.flatMap(c=>[c.from-1,c.to-1]));
 for(const i of changedDays){const list=result[i].activities,known=list.filter(a=>a.duration).reduce((n,a)=>n+Number(a.duration),0);if(known>480)throw Error('اليوم '+(i+1)+' يتجاوز ٨ ساعات زيارة مدخلة دون التنقل؛ عدّل المدد أو قلّل الأنشطة.');
  if(list.some(a=>!a.duration))warnings.add('بعض مدد الزيارة غير محددة؛ التخفيف حسب عدد الأنشطة لا يثبت كفاية الوقت.');
  if(list.some(a=>!a.venueId||!findPlace(a.venueId)))warnings.add('بعض الأنشطة غير مرتبطة بمكان في المستودع؛ لم نتحقق من مدينتها أو ساعاتها.');
  for(const a of list){const p=a.venueId?findPlace(a.venueId):undefined;if(p){const check=placeAvailability(p,dateForSchedule(t.mode==='dates'?t.date:'',i+1));if(!check.known)warnings.add('ساعات '+p.name+' تحتاج مراجعة لموعد الزيارة.');}}
 }
 warnings.add('زمن الطريق والراحة لم يُحسبا؛ راجعهما من روابط التنقل قبل الحجز. نقل النشاط يجعل تحقق الموعد والتنقل السابق بحاجة لإعادة مراجعة.');
 return {plans:result,changes,warnings:[...warnings].slice(0,30)};
}
export async function proposePlanEdit(t:Trip,request:string):Promise<PlanEdit>{
 const q=z.string().trim().min(1).max(600).parse(request),command=parsePlanCommand(q,t.plans[t.selected]||[]),result=calculate(t,command);
 return planEditSchema.parse({id:crypto.randomUUID(),tripId:t.id,destinationId:t.selected,request:q,command,createdAt:new Date().toISOString(),basis:await digest(basis(t)),resultHash:await digest(result.plans),changes:result.changes,warnings:result.warnings});
}
export async function applyPlanEdit(t:Trip,draft:PlanEdit):Promise<Partial<Trip>>{
 planEditSchema.parse(draft);
 if(!t.planEdit||t.planEdit.id!==draft.id||await digest(t.planEdit)!==await digest(draft))throw Error('هذه المعاينة لم تعد الحالية أو سبق اعتمادها.');
 if(t.id!==draft.tripId||t.selected!==draft.destinationId||await digest(basis(t))!==draft.basis)throw Error('تغيّرت الخطة أو تفاصيل الرحلة؛ أنشئ معاينة جديدة قبل الاعتماد.');
 const result=calculate(t,draft.command);if(await digest(result.plans)!==draft.resultHash)throw Error('تغيّر التوزيع أو مرجعه منذ المعاينة؛ أنشئ معاينة جديدة.');
 return {plans:{...t.plans,[t.selected]:result.plans},planEdit:undefined};
}
