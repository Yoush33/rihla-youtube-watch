import {placeUpdateKnowledge} from './place-review-updates';
import {unifiedPlaceKnowledge} from './place-catalog';
import {cityDepthKnowledge} from './city-depth';
import {communityKnowledge} from './community-knowledge';
import {reliabilityKnowledge} from './reliability-knowledge';
import {videoCards,evidenceSummary,videoLink} from './video-evidence';
import {chinaKnowledge} from './china-knowledge';
import {arrivalKnowledge} from './arrival-knowledge';
import {countryExperiences} from './country-experiences';
import {questionCities,cardMatchesCities} from './knowledge-scope';
import {profiles,monthNames,visas,visaLabels,worldChecked} from './world';
import {climates,climateMatches} from './climate';
import {countryName,countryStops} from './country-planning';
import {seasonGuides,seasonGuideChecked} from './season-guides';
import {destinations,events,verified} from './travel';
import {countryFor} from './journey-insights';
import {normalizeSearch,topics,questionTopics,communityQueryKind,communityLabel,attributionText,type KnowledgeCard,type Topic} from './knowledge';
import {missingContext,tripContext,type ResearchAnswer} from './research';
import type {Data,Trip} from './planning';
import snapshot from './advice-snapshot.json';
export function seedCards():KnowledgeCard[]{const out:KnowledgeCard[]=[];
const add=(code:string,topic:Topic,title:string,text:string,source='',checked='',status:KnowledgeCard['status']='editorial')=>out.push({id:`seed-${code}-${out.length}`,code,topic,title,text,source,checked,status,revision:0,archived:false});
for(const [code,p] of Object.entries(profiles)){
 add(code,'overview',countryName(code)+' · المدن والبداية',p.summary+'\nنقاط بداية مقترحة: '+countryStops(code).join(' ← ')+'\n'+p.caution,p.source,p.reviewedAt||worldChecked);if(code==='MY')out[out.length-1].city='tioman';
 const c=climates[code];if(c){add(code,'season','مناخ '+c.city+' خلال السنة','نطاق نقطة قرب '+c.city+'؛ متوسطات ٢٠٠١–٢٠٢٠، لا توقعات ولا مناخ البلد كله.\n'+c.rows.map(r=>`${monthNames[r.month-1]}: ${r.temperature}°م، مطر ${r.rain} مم/يوم`).join('\n'),c.source,c.fetchedAt,'historical');
 const months=climateMatches(code,{min:15,max:28,rain:4});add(code,'season','مقارنة أشهر معتدلة في '+c.city,'مقارنة حسابية افتراضية للتجول: متوسط حرارة ١٥–٢٨°م ومطر لا يزيد عن ٤ مم/يوم. ليست تفضيلاتك ولا توصية رسمية أو حكمًا على الأسعار.\n'+(months.length?months.map(r=>monthNames[r.month-1]).join('، '):'لا شهر يحقق الحدود الثلاثة؛ افتح دليل المناخ لتعديلها.')+'\nلا تحدد هذه المقارنة الموسم الأرخص أو ذروة الأزهار.',c.source,c.fetchedAt,'historical');}
 const s=seasonGuides[code];if(s)for(const w of s.windows)add(code,'season',w.title+' · '+w.period,s.scope+'\n'+w.benefit+'\n'+w.tradeoff,w.source,seasonGuideChecked,'reference');
 const v=visas[code];if(v){add(code,'visa','مرجع الجواز السعودي · '+countryName(code),visaLabels[v.kind]+'\n'+v.text+'\n'+v.conditions+'\nيلزم إعادة التحقق قبل الحجز؛ لا يطبق على جنسية أخرى.',v.source,v.checked||worldChecked,'reference');if(v.published)Object.assign(out[out.length-1],{sourceName:'الجهة الرسمية للدخول',sourcePublished:v.published,sourceKind:'official'});}
 add(code,'budget','ما المتاح عن تكلفة '+countryName(code)+'؟','لا توجد عروض طيران أو سكن حية في المستودع. لا يمكن تحديد الأرخص من المناخ. استخدم ميزانية الرحلة لتسجيل عروضك مع تاريخها وعدد الليالي والمسافرين، ثم قارن السكن والطعام والتنقل والأنشطة كلًا على حدة.');
 const a=(snapshot as Record<string,any>)[code];if(a)add(code,'safety','إرشادات محفوظة · '+countryName(code),'نص إنجليزي من الخارجية البريطانية، مرجع مساعد للسلامة لا متطلبات دخول للسعودي. تحديث المصدر: '+a.updatedAt+'\n'+(a.warnings||'')+'\n'+a.sections.map((p:any)=>p.title+'\n'+p.text).join('\n'),a.source,a.fetchedAt,'reference');
}
for(const d of destinations){const code=countryFor(d.id);add(code,'activities','تجارب '+d.name,d.activities.map(a=>a.name+' — '+a.area).join('\n'),d.source,verified);add(code,'transport','السكن والنقل · '+d.name,d.transport+'\n'+d.stay,d.source,verified);add(code,'food','الطعام والعادات · '+d.name,d.food+'\n'+d.manners,d.source,verified);}
for(const e of events)add(countryFor(e.destination),'holidays',e.name,e.start+' → '+e.end+'\n'+e.kind+'؛ سجل جزئي لا تقويم شامل.',e.source,verified,e.kind==='عطلة رسمية'?'reference':'editorial');
add('CN','season','بكين · موسم زيارة بادالينغ','دليل بكين الحكومي المنشور في ديسمبر ٢٠٢٠ يقترح مارس–مايو وسبتمبر–نوفمبر لزيارة سور بادالينغ. هذا مرجع موسمي قديم يخص الموقع، وليس حكمًا على الصين كلها. لم ننقل أسعاره أو ساعات عمله القديمة.','https://english.beijing.gov.cn/travellinginbeijing/citytours/202012/t20201216_2166509.html','2026-09-25','reference');
add('CN','activities','بكين · تجارب لزيارة أولى','تتضمن مسارات هيئة الثقافة والسياحة في بكين: المدينة المحرمة، حديقة جينغشان، شارع وانغفوجينغ، سور موتيانيو ومعبد السماء. ابدأ باختيار تجاربك ثم تحقق من الحجز وساعات العمل الحالية. المصدر مسارات منشورة في فبراير ٢٠٢٥، وليس جدولًا جاهزًا لموعدك.','https://english.beijing.gov.cn/latest/news/202502/t20250205_4003602.html','2026-09-25','reference');
for(const [code,experiences] of Object.entries(countryExperiences))for(const x of experiences){add(code,'activities',x.area+' · '+x.name,'فكرة محفوظة من دليل الأماكن: '+x.name+' في '+x.area+' · '+x.tag+'. اقتراح تحريري؛ ساعات الفتح والتذاكر والملاءمة لموعد رحلتك تحتاج مراجعة. لا توجد أسعار أو إتاحة مباشرة.',x.source,'','editorial');out[out.length-1].city=x.area;}
return [...placeUpdateKnowledge,...reliabilityKnowledge,...out,...videoCards,...chinaKnowledge,...arrivalKnowledge,...cityDepthKnowledge,...communityKnowledge,...unifiedPlaceKnowledge];}
export const builtInKnowledge=seedCards();
export function repositoryAnswer(question:string,codes:string[],t:Trip,data:Data,cards:KnowledgeCard[]):ResearchAnswer{
 const requestedCommunity=communityQueryKind(question),wanted=questionTopics(question),needs=missingContext(t),sources:ResearchAnswer['sources']=[],citations:ResearchAnswer['citations']=[];let text='إجابة مستخرجة من المستودع المحفوظ حسب موضوع السؤال؛ بدون ذكاء اصطناعي مدفوع أو بحث مباشر.\n';
 for(const code of codes){text+='\n'+countryName(code)+'\n';const cities=questionCities(code,question);const available=cards.filter(c=>c.code===code&&!c.archived&&cardMatchesCities(c,code,cities));const chosenTopics=requestedCommunity&&(!wanted.length||wanted.length===1&&wanted[0]==='activities')?[...new Set(available.filter(c=>c.communityKind===requestedCommunity).map(c=>c.topic))]:wanted.length?wanted:['overview','season','activities'] as Topic[];
 for(const topic of chosenTopics){text+='\n'+topics[topic]+'\n';if(topic==='visa'&&!/^(sa|saudi|saudi arabia|سعودي|سعودية|السعودية|المملكة العربية السعودية)$/i.test(t.nationality.trim())){text+='لم نحدد حكم الدخول: أدخل جنسية الجواز والإقامة وسبب الزيارة؛ مراجعنا الحالية للتأشيرات تخص السعودي فقط.\n';continue;}
 if(topic==='visa'&&(!t.travelProfile?.purpose||!t.travelProfile?.passportType))text+='الآتي مرجع للجواز السعودي العادي بغرض السياحة، لا حكم على رحلتك. حدّد الغرض ونوع الجواز في مراجعة قبل الحجز.\n';
 const words=normalizeSearch(question).split(/\s+/).filter(w=>w.length>2),relevance=(c:KnowledgeCard)=>words.reduce((n,w)=>n+(normalizeSearch(c.title).includes(w)?4:normalizeSearch(c.text).includes(w)?1:0),0);
 const found=available.filter(c=>c.topic===topic&&(!['visa','safety'].includes(topic)||c.sourceKind!=='community')).sort((a,b)=>Number(b.communityKind===requestedCommunity&&!!requestedCommunity)-Number(a.communityKind===requestedCommunity&&!!requestedCommunity)||Number(!!b.city&&cities.includes(b.city))-Number(!!a.city&&cities.includes(a.city))||relevance(b)-relevance(a)||Number(b.status==='personal')-Number(a.status==='personal'));if(!found.length){text+='لا توجد معلومات محفوظة لهذا الموضوع؛ لا نفترض إجابة.\n';continue;}
 for(const c of found.slice(0,6)){text+=c.title+' — '+(communityLabel(c)||(c.status==='personal'?'ملاحظة شخصية غير متحققة':c.status==='editorial'?'اقتراح تحريري':c.status==='historical'?'مناخ تاريخي':'مرجع محفوظ'))+'\n'+(c.video?evidenceSummary(c)+'\n':'')+(c.sourceName?'المصدر: '+c.sourceName+' · تاريخ نشره: '+(c.sourcePublished||'غير مسجل')+'\n':'')+(c.attribution?attributionText(c)+'\n'+(c.attribution.historyUrl||'')+'\n':'')+c.text.slice(0,topic==='safety'?2500:6000)+(topic==='safety'&&c.text.length>2500?'\n[مقتطف؛ النص المحفوظ كامل في المستودع]':'')+'\n';if(c.source){const marker='[المصدر '+(sources.length+1)+']';citations.push({start:text.length,end:text.length+marker.length,url:c.source,title:c.title});text+=marker+' · '+(c.checked?c.checked.slice(0,10):'تاريخ المراجعة غير مسجل')+'\n';sources.push({url:c.source,title:c.title,checked:c.checked});}if(c.video){const url=videoLink(c.video),marker='[الفيديو '+(sources.length+1)+']';citations.push({start:text.length,end:text.length+marker.length,url,title:c.title});text+=marker+'\n';sources.push({url,title:c.title,checked:c.checked});}}
 if(found.length>6)text+='توجد مواد إضافية في المستودع؛ المعروض أول ست مواد لهذا الموضوع.\n';}
 }
 text+='\n'+(needs.length?'ينقص تخصيص الرحلة: '+needs.join('، '):'تقدير الميزانية يحتاج عروضًا موثقة.');return {text,citations,sources,at:new Date().toISOString(),kind:'library',context:JSON.stringify(tripContext(t,data)),needs};
}
