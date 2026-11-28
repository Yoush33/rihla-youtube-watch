import {newActivity,type Activity,calendarDate,type Day} from './planning';
import {distanceKm} from './geo';
export type Place={id:string;country:string;city:string;name:string;kind:'معلم'|'مطعم'|'تجربة';tag:string;address:string;lat:number;lng:number;source:string;hours:string;open?:string;close?:string;lastEntry?:string;closedDays?:number[];closedDates?:string[];minutes:number};
export const placesChecked='2026-09-25';
export const places:Place[]=[
 {id:'sg-cloud',country:'SG',city:'سنغافورة',name:'Cloud Forest — الغابة السحابية',kind:'معلم',tag:'الطبيعة',address:'18 Marina Gardens Drive, Singapore',lat:1.2838,lng:103.8658,source:'https://www.gardensbythebay.com.sg/en/things-to-do/attractions/cloud-forest.html',hours:'٩ صباحًا–٩ مساءً؛ آخر دخول ٨ مساءً. صيانة دورية؛ راجع تقويم الإغلاق.',open:'09:00',close:'21:00',lastEntry:'20:00',closedDates:['2026-10-26','2026-11-17'],minutes:60},
 {id:'sg-flower',country:'SG',city:'سنغافورة',name:'Flower Dome — قبة الزهور',kind:'معلم',tag:'الطبيعة',address:'18 Marina Gardens Drive, Singapore',lat:1.2847,lng:103.8645,source:'https://www.gardensbythebay.com.sg/en/plan-your-visit/opening-hours.html',hours:'٩ صباحًا–٩ مساءً؛ آخر دخول ٨:٣٠ مساءً. الإغلاقات المدخلة جزئية.',open:'09:00',close:'21:00',lastEntry:'20:30',closedDates:['2026-10-06','2026-11-16'],minutes:90},
 {id:'sg-acm',country:'SG',city:'سنغافورة',name:'متحف الحضارات الآسيوية',kind:'معلم',tag:'الثقافة',address:'1 Empress Place, Singapore 179555',lat:1.2875,lng:103.8514,source:'https://www.acm.nhb.gov.sg/visit/plan-your-visit',hours:'يوميًا ١٠ صباحًا–٧ مساءً؛ الجمعة حتى ٩. آخر دخول قبل الإغلاق بنصف ساعة. الجدولة تستخدم النافذة الأقصر.',open:'10:00',close:'19:00',lastEntry:'18:30',minutes:120},
 {id:'ae-frame',country:'AE',city:'دبي',name:'برواز دبي',kind:'معلم',tag:'العائلة',address:'حديقة زعبيل، بوابة 4، دبي',lat:25.2355,lng:55.3003,source:'https://www.dubaiframe.ae/en/plan-your-visit',hours:'٨ صباحًا–٩ مساءً؛ قد تتغير المواعيد في رمضان والعطلات.',open:'08:00',close:'21:00',minutes:90},
 {id:'ae-tea',country:'AE',city:'دبي',name:'Arabian Tea House — الفهيدي',kind:'مطعم',tag:'الثقافة',address:'شارع الفهيدي، البستكية، بر دبي',lat:25.2633,lng:55.2995,source:'https://arabianteahouse.com/al-fahidi/',hours:'يوميًا ٧ صباحًا–١١ مساءً. تحقق من الحجز والمكونات الغذائية مباشرة.',open:'07:00',close:'23:00',minutes:60},
 {id:'tr-topkapi',country:'TR',city:'إسطنبول',name:'قصر طوب قابي',kind:'معلم',tag:'الثقافة',address:'Cankurtaran, Babı Hümayun Cad. No:1, Fatih',lat:41.0115,lng:28.9834,source:'https://www.millisaraylar.gov.tr/Lokasyon/2/topkapi-sarayi',hours:'مغلق الثلاثاء. شباك التذاكر ٩–١٧؛ لا نعتمد وقت إغلاق القاعات من ساعات الشباك.',closedDays:[2],minutes:180},
 {id:'jp-kiyomizu',country:'JP',city:'كيوتو',name:'معبد كيوميزو ديرا',kind:'معلم',tag:'الثقافة',address:'1-294 Kiyomizu, Higashiyama-ku, Kyoto',lat:34.9949,lng:135.785,source:'https://www.kiyomizudera.or.jp/en/location/',hours:'يفتح ٦ صباحًا، والإغلاق موسمي. تحقق من مدخل نيومون أو طريق تشاوانزاكا؛ بعض تطبيقات الخرائط تعرض مسارًا غير صالح.',minutes:120},
 {id:'ma-majorelle',country:'MA',city:'مراكش',name:'حديقة ماجوريل',kind:'معلم',tag:'الطبيعة',address:'شارع إيف سان لوران، مراكش',lat:31.6415,lng:-7.9891,source:'https://www.jardinmajorelle.com/en/thegarden/',hours:'يوميًا ٨ صباحًا–٦:٣٠ مساءً؛ آخر دخول ٦. التذاكر عبر الموقع الرسمي؛ هذه النافذة للحديقة فقط.',open:'08:00',close:'18:30',lastEntry:'18:00',minutes:90},
 {id:'fr-louvre',country:'FR',city:'باريس',name:'متحف اللوفر',kind:'معلم',tag:'الثقافة',address:'Musée du Louvre, Paris',lat:48.8606,lng:2.3376,source:'https://www.louvre.fr/en/visit/hours-admission',hours:'راجع ساعات اليوم والتذكرة في صفحة الزيارة؛ الجدولة تحتاج نافذة تؤكدها.',minutes:180},
 {id:'fr-eiffel',country:'FR',city:'باريس',name:'برج إيفل',kind:'معلم',tag:'العائلة',address:'Champ de Mars, Paris',lat:48.8584,lng:2.2945,source:'https://www.toureiffel.paris/en/rates-opening-times',hours:'المواعيد تختلف حسب التاريخ وطريقة الصعود. حدد نافذة من تذكرتك أو المصدر.',minutes:120},
 {id:'au-opera',country:'AU',city:'سيدني',name:'دار أوبرا سيدني',kind:'تجربة',tag:'الثقافة',address:'Bennelong Point, Sydney',lat:-33.8568,lng:151.2153,source:'https://www.sydneyoperahouse.com/visit/getting-here',hours:'اختر جولة أو عرضًا محددًا وتحقق من موعده؛ لا توجد نافذة موحدة لكل التجارب.',minutes:90}
];
export function placeActivity(p:Place):Activity{return {...newActivity(),venueId:p.id,title:p.name,place:p.address,url:p.source,duration:String(p.minutes),location:{lat:p.lat,lng:p.lng,source:'catalog',updatedAt:placesChecked+'T00:00:00.000Z'},notes:p.hours+'\nمدة الزيارة تقدير تخطيطي قابل للتعديل. الدبوس تقريبي؛ تحقق من المدخل. المصدر مراجع '+placesChecked};}
export const toMinutes=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):NaN;
const time=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
export function schedulePlaces(days:Day[],ideas:Activity[],ids:string[],slots:number[],date:string,settings:{start:string;end:string;transfer:number;rest:number}){
 const start=toMinutes(settings.start),end=toMinutes(settings.end);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||![settings.transfer,settings.rest].every(n=>Number.isInteger(n)&&n>=0&&n<=240))throw Error('راجع بداية اليوم ونهايته وهوامش التنقل والراحة.');
 if(!slots.length||new Set(slots).size!==slots.length||slots.some(i=>!days[i]||(days[i].activities?.length||0)>0))throw Error('اختر أيامًا فارغة فقط؛ أيامك الموجودة لا تُستبدل.');
 if(new Set([...days.flatMap(d=>d.activities||[]),...ideas].map(a=>a.id)).size!==days.flatMap(d=>d.activities||[]).length+ideas.length)throw Error('توجد معرفات أماكن مكررة.');
 const selected=ideas.filter(a=>ids.includes(a.id));if(!selected.length||selected.length!==ids.length||selected.some(a=>!a.location||a.time||a.done||!Number.isInteger(Number(a.duration))||Number(a.duration)<1))throw Error('حدد أفكارًا بمواقع ومدد صحيحة ودون أوقات ثابتة.');
 const result=days.map(d=>({...d,activities:[...(d.activities||[])]})),pending=[...selected],warnings:string[]=[];
 for(const slot of [...slots].sort((a,b)=>a-b)){
  const dayDate=date?calendarDate(date,slot):'',weekday=dayDate?new Date(dayDate+'T12:00:00Z').getUTCDay():null;let cursor=start;let previous:Activity|undefined;
  while(pending.length&&result[slot].activities.length<30){
   const candidates=pending.map(a=>{const p=places.find(v=>v.id===a.venueId),o=a.opening;
    if(p&&(dayDate&&p.closedDates?.includes(dayDate)||weekday!==null&&p.closedDays?.includes(weekday)))return null;
    const known=o||p?.open&&p?.close;const opens=o?toMinutes(o.start):p?.open?toMinutes(p.open):start,closes=o?toMinutes(o.end):p?.close?toMinutes(p.close):end;
    if(!Number.isFinite(opens)||!Number.isFinite(closes)||closes<=opens)return null;
    const begins=Math.max(cursor,opens),finishes=begins+Number(a.duration);if(finishes>Math.min(end,closes)||p?.lastEntry&&begins>toMinutes(p.lastEntry))return null;
    return {a,begins,finishes,known,distance:previous?distanceKm(previous.location!,a.location!):0};
   }).filter((v):v is NonNullable<typeof v>=>v!==null).sort((a,b)=>a.distance-b.distance||a.begins-b.begins);
   const next=candidates[0];if(!next)break;
   if(previous&&next.distance>20){warnings.push('أوقفنا إضافة أماكن متباعدة بأكثر من ٢٠ كم مباشرة في اليوم '+(slot+1)+'؛ خصص لها يومًا آخر أو راجع انتقالًا مستقلًا.');break;}
   if(!next.known)warnings.push('ساعات '+next.a.title+' غير مؤكدة؛ الوقت المقترح مبدئي فقط.');
   if(!dayDate)warnings.push('لم يحدد تاريخ فعلي؛ لا يمكن تطبيق أيام الإغلاق الأسبوعية أو الاستثنائية.');
   result[slot].activities.push({...next.a,time:time(next.begins),notes:next.a.notes});
   warnings.push('المواعيد تخطيطية؛ الهوامش من اختيارك وليست زمن طريق محسوبًا.');
   pending.splice(pending.findIndex(a=>a.id===next.a.id),1);cursor=next.finishes+settings.transfer+settings.rest;previous=next.a;
  }
 }
 const added=new Set(result.flatMap(d=>d.activities).filter(a=>ids.includes(a.id)).map(a=>a.id));
 return {days:result,ideas:ideas.filter(a=>!added.has(a.id)),remaining:pending,warnings:[...new Set(warnings)],count:added.size};
}
