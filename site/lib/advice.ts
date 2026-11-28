import type {Trip} from './planning';
import type {Destination,Event} from './travel';
export function tripWindow(t:Pick<Trip,'mode'|'month'|'date'|'days'>):[string,string]{
 if(t.mode==='flexible'){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(t.month))return ['',''];const [y,m]=t.month.split('-').map(Number);return [t.month+'-01',new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)];}
 const n=Number(t.days),date=new Date(t.date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isInteger(n)||n<1||n>30||!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==t.date)return ['',''];date.setUTCDate(date.getUTCDate()+n-1);return [t.date,date.toISOString().slice(0,10)];
}
export function matchingEvents(t:Trip,d:Destination,events:Event[]){const [start,end]=tripWindow(t);return start?events.filter(e=>e.destination===d.id&&e.start<=end&&e.end>=start):[];}
export function explain(t:Trip,d:Destination,events:Event[]){
 const matched=t.interests.filter(x=>d.tags.includes(x)),unmatched=t.interests.filter(x=>!d.tags.includes(x));const [start,end]=tripWindow(t);const months=new Set<number>();if(start){const cursor=new Date(start+'T12:00:00Z');while(cursor.toISOString().slice(0,10)<=end){months.add(cursor.getUTCMonth()+1);cursor.setUTCDate(cursor.getUTCDate()+1);}}
 const reasons=matched.length?['يتقاطع دليل الوجهة مع: '+matched.join('، ')]:['حدد اهتماماتك لتظهر أسباب شخصية للاقتراح.'];if(t.interests.length&&!matched.length)reasons[0]='لا توجد مطابقة مباشرة لاهتماماتك ضمن تصنيفات هذا الدليل؛ هذا لا يعني غياب التجارب في المدينة.';
 const cautions:string[]=[];if(unmatched.length)cautions.push('لم يوثّق دليلنا تغطية: '+unmatched.join('، '));
 let seasonal='لا توجد قاعدة موسمية متحققة لهذا الموعد في دليلنا.';
 if(d.id==='kyoto'&&months.size){if([...months].every(m=>[3,4,5,10,11].includes(m)))seasonal='تتزامن الفترة مع الربيع أو الخريف، وهما مناسبان عادةً للتجول بحسب دليل كيوتو؛ الطقس الفعلي قد يختلف.';if([...months].some(m=>[6,7].includes(m)))cautions.push('تشمل الفترة يونيو أو يوليو؛ موسم الأمطار المعتاد يمتد من أوائل يونيو إلى منتصف يوليو. جهّز بدائل داخلية.');if([...months].some(m=>[7,8,9].includes(m)))cautions.push('تشمل الفترة أشهرًا حارة ورطبة عادةً في كيوتو؛ راجع الطقس قبل الأنشطة الخارجية.');if([...months].some(m=>[3,4,5,10,11].includes(m)))cautions.push('موسم شائع للزيارة؛ تحقق من التوافر. لا نملك قياس ازدحام أو زيادة أسعار مباشرة.');}
 const holidays=matchingEvents(t,d,events);if(holidays.length)cautions.push((t.mode==='flexible'?'توجد مناسبات داخل الشهر المحتمل: ':'تتقاطع رحلتك مع: ')+holidays.map(e=>e.name).join('، '));
 const missing:string[]=[];if(!start)missing.push('موعد صالح ومدة الرحلة');if(!t.interests.length)missing.push('اهتماماتك');if(!t.origin)missing.push('مدينة المغادرة');if(!t.currency||!t.budget)missing.push('العملة والميزانية');if(!t.nationality)missing.push('جنسية الجواز لمراجعة التأشيرة');missing.push('مدة الوصول وعروض الحجز الحية غير مرتبطة');
 const coverage=d.id==='kyoto'&&start>='2026-01-01'&&end<='2027-12-31'?'عطلات وطنية موثقة لعامي ٢٠٢٦–٢٠٢٧؛ لا تشمل جميع المناسبات المحلية.':'تغطية العطلات جزئية أو غير متاحة؛ عدم ظهور مناسبة لا يؤكد خلو الموعد من العطلات.';
 return {matched,unmatched,reasons,cautions,missing,seasonal,holidays,coverage};
}
export function budgetVerdict(b:{complete:boolean;invalid:boolean;low:number;high:number},t:Trip){if(!b.complete||b.invalid||t.budget===''||!Number.isFinite(Number(t.budget)))return 'لا يمكن تقييم الميزانية قبل اكتمال نطاقاتك وعدد المسافرين والمدة والعملة.';if(b.low>Number(t.budget))return 'حتى الحد الأدنى من تقديرك يتجاوز ميزانيتك.';if(b.high>Number(t.budget))return 'ميزانيتك تغطي جزءًا من النطاق المدخل؛ الحد الأعلى يتجاوزها.';return 'النطاق الذي أدخلته ضمن ميزانيتك؛ ليس عرض سعر أو ضمانًا لتكلفة الحجز.';}
