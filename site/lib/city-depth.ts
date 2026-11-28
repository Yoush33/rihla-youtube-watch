import data from './city-depth-data.json';
import {venueKnowledgeScope} from './venue-knowledge';
import {plannerPlaces} from './place-catalog';
export {plannerPlaces,type PlannerPlace} from './place-catalog';
import type {KnowledgeCard} from './knowledge';
import {countryFor} from './journey-insights';


export const cityGuides=data.guides;
const cityDestination:Record<string,string>={kyoto:'كيوتو',istanbul:'إسطنبول',lisbon:'لشبونة',singapore:'سنغافورة',dubai:'دبي',marrakech:'مراكش'};
export function cityOptions(destination:string){const code=countryFor(destination);return [...new Set(plannerPlaces.filter(p=>p.country===code&&(destination.startsWith('country-')||p.city===cityDestination[destination])).map(p=>p.city))];}
const cityKey=(city:string)=>({'بكين':'beijing','شنغهاي':'shanghai','كوالالمبور':'kuala-lumpur','تبليسي':'tbilisi'}[city]||city);
export const cityDepthKnowledge:KnowledgeCard[]=[...data.activities.map(p=>({id:'depth-'+p.id,...venueKnowledgeScope(p.id),code:p.country,city:cityKey(p.city),topic:'activities' as const,title:p.city+' · '+p.name,text:p.summary+(p.additionalSources.length?'\nمراجع إضافية: '+p.additionalSources.map(r=>r.name+': '+r.url+' (تاريخ المصدر: '+r.published+'؛ تحقق: '+r.checked+')').join('\n'):''),source:p.source,sourceName:p.sourceName,sourcePublished:p.published,checked:p.checked,status:'reference' as const,revision:0,archived:false})),...cityGuides.flatMap(g=>g.sections.map((s,i)=>({id:'depth-'+g.country+'-'+g.city+'-'+i,code:g.country,city:cityKey(g.city),topic:s.topic as 'transport'|'season',title:g.city+' · '+s.title,text:s.text+'\n'+s.sources.map(r=>r.name+': '+r.url+' (نشر/تحديث: '+r.published+'؛ تحقق: '+r.checked+')').join('\n'),source:s.sources[0].url,sourceName:s.sources[0].name,sourcePublished:s.sources[0].published,checked:s.sources[0].checked,status:s.editorial?'editorial' as const:'reference' as const,revision:0,archived:false})))];
