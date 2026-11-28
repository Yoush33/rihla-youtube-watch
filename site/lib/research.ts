import {z} from 'zod';
import {profiles,visas,visaLabels,worldChecked,monthNames} from './world';
import {climateMonth,climateMatches,climates} from './climate';
import {countryName,countryStops} from './country-planning';
import {countryFor} from './journey-insights';
import {isDestinationExcluded} from './destination-exclusions';
import type {Trip,Data} from './planning';
export type Citation={start:number;end:number;url:string;title:string};
export type ResearchAnswer={text:string;citations:Citation[];sources:{url:string;title:string;checked:string}[];at:string;kind:'library'|'web';context:string;needs:string[]};
export const researchInput=z.object({id:z.string().uuid(),tripId:z.string().min(1).max(200),question:z.string().trim().min(3).max(1800),countries:z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(3),mode:z.enum(['library','web'])});
export function safeUrl(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function missingContext(t:Trip){return [['origin','مدينة المغادرة'],[t.mode==='dates'?'date':'month','موعد السفر'],['days','عدد الأيام'],['travelers','عدد المسافرين'],['budget','الميزانية'],['currency','العملة'],['nationality','جنسية الجواز']].filter(([key])=>!t[key as keyof Trip]).map(([,label])=>label).concat(t.interests.length?[]:['الاهتمامات']);}
export function tripContext(t:Trip,data:Data){return {origin:t.origin,date:t.mode==='dates'?t.date:'',month:t.mode==='flexible'?t.month:'',days:t.days,travelers:t.travelers,budget:t.budget,currency:t.currency,nationality:t.nationality,interests:t.interests,pace:t.pace,level:t.level,selected:countryFor(t.selected),climatePreference:t.researchPrefs||null,planned:Object.entries(data.world||{}).filter(([,v])=>v.planned).map(([c])=>c),visited:Object.entries(data.world||{}).filter(([,v])=>v.visited).map(([c])=>c)};}
export function personalMatches(t:Trip,data:Data) {
  const month=Number((t.mode==='dates'?t.date:t.month).slice(5,7));
  const pref=t.researchPrefs;
  return Object.entries(profiles).filter(([code])=>
    (!pref?.avoidVisited || !data.world?.[code]?.visited) &&
    !isDestinationExcluded({country:code,city:climates[code]?.city},data.excludedDestinations)
  ).map(([code,profile])=>{
    const interests=profile.tags.filter(interest=>t.interests.includes(interest));
    const row=climateMonth(code,month);
    const climate=pref&&row?row.temperature>=pref.min&&row.temperature<=pref.max&&row.rain<=pref.rain:null;
    return {code,interests,row,climate,saved:!!data.world?.[code]?.planned};
  }).sort((a,b)=>b.interests.length-a.interests.length||Number(b.climate===true)-Number(a.climate===true)||
    Number(b.saved)-Number(a.saved)||a.code.localeCompare(b.code));
}
export function libraryAnswer(question:string,codes:string[],t:Trip,data:Data):ResearchAnswer{
 const needs=missingContext(t),lines=['هذه خلاصة من مكتبة رِحلة وقواعد المقارنة؛ لم يُنفذ بحث مباشر أو فهم لغوي شامل للسؤال.'],sources:ResearchAnswer['sources']=[],month=Number((t.mode==='dates'?t.date:t.month).slice(5,7));
 for(const code of codes){const p=profiles[code],c=climates[code],v=visas[code],match=p.tags.filter(i=>t.interests.includes(i));lines.push('\n'+countryName(code),p.summary,match.length?'توافق اهتماماتك: '+match.join('، '):'لم تظهر مطابقة مباشرة للاهتمامات المدخلة.','القيود: '+p.caution);
 if(c){const m=climateMonth(code,month);lines.push('النطاق المناخي: '+c.city+' فقط، متوسطات ٢٠٠١–٢٠٢٠.');if(m)lines.push(monthNames[m.month-1]+': متوسط حرارة '+m.temperature+'°م، ومعدل مطر '+m.rain+' مم/يوم. ليست توقعات.');if(t.researchPrefs){const months=climateMatches(code,t.researchPrefs);lines.push(months.length?'أشهر تطابق حدود الجو التي حفظتها: '+months.map(m=>monthNames[m.month-1]).join('، '):'لا شهر يطابق حدود الجو المحفوظة.');}sources.push({url:c.source,title:'NASA · '+c.city,checked:c.fetchedAt});}
 if(/ت[اأ]ش|جواز|دخول|visa/i.test(question)){lines.push(t.nationality==='سعودي'||/سعود/.test(t.nationality)?v?visaLabels[v.kind]+' (مراجعة سابقة '+(v.checked||worldChecked)+'): '+v.text+' '+v.conditions:'لا يتوفر حكم سعودي موثق لهذه الدولة في المكتبة.':'متطلبات الدخول تحتاج تحديد جنسية الجواز والإقامة وسبب الزيارة. الأحكام السعودية لا تنطبق تلقائيًا.');if(v)sources.push({url:v.source,title:'مصدر دخول السعودي — يلزم إعادة تحقق',checked:v.checked||worldChecked});}
 lines.push('نقاط بداية للمسار: '+countryStops(code).join(' ← '),'الأسعار ووقت الوصول والعطلات الكاملة تحتاج تحققًا منفصلًا.');sources.push({url:p.source,title:'دليل '+countryName(code),checked:p.reviewedAt||worldChecked});
 }
 lines.push(needs.length?'ينقص لتحسين الحكم: '+needs.join('، '):'المدخلات الأساسية مكتملة، لكن ملاءمة الميزانية غير محسومة دون عروض.');
 return {text:lines.join('\n'),citations:[],sources,at:new Date().toISOString(),kind:'library',context:JSON.stringify(tripContext(t,data)),needs};
}
export function officialDomains(codes:string[]){const urls=['https://www.mofa.gov.sa/','https://www.gov.uk/','https://power.larc.nasa.gov/','https://www.who.int/'];for(const code of codes){const p=profiles[code];if(p)urls.push(p.source,p.seasonSource);if(visas[code])urls.push(visas[code].source);}return [...new Set(urls.flatMap(s=>{try{return [new URL(s).hostname.replace(/^www\./,'')];}catch{return [];}}))];}
export function parseResearchResponse(raw:any,domains:string[],context:string,needs:string[],now=new Date()):ResearchAnswer{
 if(raw.status!=='completed'||!Array.isArray(raw.output)||!raw.output.some((x:any)=>x.type==='web_search_call'&&x.status==='completed'))throw Error('لا توجد نتيجة بحث مكتملة؛ لم نعتمد الإجابة.');
 let text='',citations:Citation[]=[];for(const output of raw.output){if(output.type!=='message')continue;for(const item of output.content||[]){if(item.type!=='output_text'||typeof item.text!=='string')continue;const offset=text.length;text+=item.text+'\n';for(const a of item.annotations||[]){const url=safeUrl(a.url||'');if(a.type!=='url_citation'||!url||!Number.isInteger(a.start_index)||!Number.isInteger(a.end_index)||a.start_index<0||a.end_index<=a.start_index||a.end_index>item.text.length)continue;const host=new URL(url).hostname;if(!domains.some(d=>host===d||host.endsWith('.'+d))||/gov\.uk\/foreign-travel-advice\/[^/]+\/entry-requirements/.test(url))continue;citations.push({start:offset+a.start_index,end:offset+a.end_index,url,title:String(a.title||host).slice(0,300)});}}}
 if(!text.trim()||!citations.length)throw Error('لم تُرفق مصادر رسمية قابلة للتحقق؛ لم نعتمد الإجابة.');
 citations.sort((a,b)=>a.start-b.start);citations=citations.filter((a,i)=>!i||a.start>=citations[i-1].end);
 return {text,citations,sources:[...new Map(citations.map(c=>[c.url,{url:c.url,title:c.title,checked:now.toISOString()}])).values()],kind:'web',at:now.toISOString(),context,needs};
}
