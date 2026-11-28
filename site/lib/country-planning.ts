import {countryExperiences} from './country-experiences';
import {destinations, type Destination} from './travel';
import {profiles,visas} from './world';
import countries from '../public/countries.json';
import {newActivity,type Trip,type Day} from './planning';
export const countrySearchText=(code:string)=>{const c=countries.find(c=>c.code===code);return [code,c?.name,c?.en,...(profiles[code]?.places||[])].join(' ').toLowerCase().normalize('NFD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا');};
export const countryName=(code:string)=>countries.find(c=>c.code===code)?.name||code;
export const countryCenter=(id:string)=>{const c=countries.find(c=>'country-'+c.code===id);return c?[c.lat,c.lng] as [number,number]:[20,0] as [number,number];};
const bases:Record<string,string[]>={JP:['كيوتو'],TR:['إسطنبول'],PT:['لشبونة'],SG:['سنغافورة'],AE:['دبي'],MA:['مراكش'],GE:['تبليسي','متسخيتا','باتومي'],GB:['لندن','كوتسوولدز'],TH:['كو تشانغ'],MY:['تيومان']};
export function countryStops(code:string){return bases[code]||profiles[code]?.places||[];}
export const countryDestinations:Destination[]=Object.entries(profiles).map(([code,p])=>({id:'country-'+code,name:countryName(code),country:countryName(code),en:countries.find(c=>c.code===code)?.en||code,tags:p.tags,summary:p.summary,season:p.season,months:p.months,weather:p.scope,weatherSource:p.seasonSource,transport:'اقتراح تخطيط: تحقق من وسائل النقل والوقت بين المناطق قبل اعتماد ترتيب الأيام.',stay:'اقتراح تخطيط: قارن إقامة قريبة من أنشطتك، وسعة الغرف وسياسة الإلغاء والضرائب.',food:'اختَر تجارب الطعام من الدليل الرسمي وتحقق من المكونات واحتياجاتك الغذائية.',manners:'راجع إرشادات الزيارة واللباس والتصوير لكل موقع. لا تتوفر هنا مراجعة شاملة للعادات المحلية.',activities:p.places.map(name=>({name,area:countryName(code),tag:p.tags[0]})),source:p.source,sourceName:'دليل السياحة الرسمي',visa:visas[code]?.source||'https://www.mofa.gov.sa/'}));
export const allDestinations=[...destinations,...countryDestinations];
export function generateCountryPlan(code:string,t:Pick<Trip,'days'|'pace'|'interests'>,stops:string[]):Day[]{
 const p=profiles[code],n=Number(t.days);if(!p||!Number.isInteger(n)||n<1||n>30||!stops.length||stops.some(s=>!countryStops(code).includes(s))||new Set(stops).size!==stops.length||stops.length>Math.max(1,n-2))throw Error('اختر مناطق متاحة وعدد أيام يكفي لتوزيعها.');
 const active=n>2?n-2:n,used=new Set<string>();
 return Array.from({length:n},(_,i)=>{
  if(n>2&&i===0)return {title:'الوصول إلى '+stops[0],notes:'موعد الوصول والنقل إلى الإقامة يحتاجان تحققًا. اترك اليوم مرنًا.',activities:[]};
  if(n>2&&i===n-1)return {title:'المغادرة من '+stops.at(-1),notes:'راجع مطار المغادرة ووقت الانتقال وتسجيل الخروج؛ الترتيب لا يتضمن حجوزات.',activities:[]};
  const offset=n>2?i-1:i,stopIndex=Math.min(stops.length-1,Math.floor(offset*stops.length/active)),stop=stops[stopIndex];
  const core=destinations.find(d=>d.id===p.city),ideas=[...(countryExperiences[code]||[]),...(core?.activities.map(a=>({...a,source:p.source}))||[])].filter(a=>a.area===stop||!!core&&countryStops(code).length===1).sort((a,b)=>Number(t.interests.includes(b.tag))-Number(t.interests.includes(a.tag))); 
  const available=ideas.filter(a=>!used.has(a.name)).slice(0,t.pace==='هادئ'?1:2);available.forEach(a=>used.add(a.name));
  const title=available[0]?.name||('استكشاف '+stop+' حسب اهتماماتك');
  const first=offset===0||Math.floor((offset-1)*stops.length/active)!==stopIndex;
  return {title:stop+' · '+title,notes:(first&&stopIndex>0?'يوم انتقال محتمل؛ تحقق من الوقت ووسيلة النقل وخفف الأنشطة.\n':'')+'اقتراح قابل للتعديل، وليس مسارًا محجوزًا. '+(available.length?'راجع ساعات الزيارة والتذاكر.':'اختر معلمًا محددًا من الدليل الرسمي وأضف موقعه. لا توجد أنشطة تفصيلية موثقة كافية لملء هذا اليوم تلقائيًا.')+'\nملاءمة التكلفة لميزانيتك غير محسومة.',activities:available.length?available.map(a=>({...newActivity(),title:a.name,place:stop,url:a.source,priority:'optional' as const})):[{...newActivity(),title:'اختيار تجربة في '+stop,place:stop,url:p.source,notes:'فكرة عامة تحتاج تحديد المعلم وموعده وتكلفته؛ اهتماماتك: '+t.interests.join('، ')}]};
 });
}
export function newChecklist(){return ['مراجعة متطلبات التأشيرة لكل مسافر','التحقق من صلاحية الجواز ووثائق السفر','مراجعة التأمين ومتطلبات الدخول الصحية','تأكيد تذاكر الوصول والمغادرة','تأكيد السكن والضرائب وسياسة الإلغاء','ترتيب النقل بين المدن ومن المطار','حفظ نسخ التذاكر والوثائق دون اتصال','مراجعة الطقس والعطلات وساعات المعالم','تجهيز الاتصال بالإنترنت'].map((title,i)=>({id:'prep-'+i,title,status:'todo' as const,note:'',dueDate:''}));}
export function countryRank(code:string,interest:string[],month:string,sort:string){const p=profiles[code],v=visas[code];if(sort==='entry')return v?({free:0,eta:1,evisa:2,arrival:2,required:3,verify:9}[v.kind]):9;if(sort==='season')return !month||!p?.months.length?9:p.months.includes(Number(month))?0:1;return p?-p.tags.filter(t=>interest.includes(t)).length:9;}
