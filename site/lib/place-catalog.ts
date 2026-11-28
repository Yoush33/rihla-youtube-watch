import data from './city-depth-data.json';
import {places,placesChecked} from './places';
import {venueFacts,type VenueFacts} from './reliability-catalog';
import {cnPlaceEnrichment,type PlaceEnrichment} from './cn-place-enrichment';
import {venueKnowledgeScope} from './venue-knowledge';
import type {KnowledgeCard} from './knowledge';

export type PlannerPlace={id:string;country:string;city:string;name:string;area:string;summary:string;source:string;sourceName:string;published:string;checked:string;location?:{lat:number;lng:number};additionalSources?:{name:string;url:string;published:string;checked:string}[];closedDays?:number[];closedDates?:string[];coordinateSource?:PlaceEnrichment['coordinateSource'];visit?:PlaceEnrichment['visit'];categories?:string[];operations?:VenueFacts;cost:{status:'unknown';note:string}};
const basic=[...data.activities,...places.map(p=>({id:p.id,country:p.country,city:p.city,name:p.name,area:p.address,summary:p.hours,source:p.source,sourceName:'الموقع الرسمي للمكان',published:'غير مسجل',checked:placesChecked,location:{lat:p.lat,lng:p.lng},closedDays:p.closedDays,closedDates:p.closedDates}))];
export const plannerPlaces:PlannerPlace[]=basic.map(p=>({...p,...cnPlaceEnrichment[p.id],operations:venueFacts.find(v=>v.id===p.id),cost:{status:'unknown',note:'سعر موثق لهذه الزيارة غير محفوظ في السجل؛ لا نحسبه صفرًا ولا نفترض أنه مجاني.'}}));
export const findPlace=(id:string)=>plannerPlaces.find(p=>p.id===id);
export const unifiedPlaceKnowledge:KnowledgeCard[]=plannerPlaces.filter(p=>!!p.visit).map(p=>({
 id:'catalog-planning-'+p.id,code:p.country,city:p.city==='بكين'?'beijing':'shanghai',topic:'activities',title:p.name+' · مدة الزيارة وموقع تقريبي',
 text:`مدة تخطيط تحريرية: ${p.visit!.minMinutes}–${p.visit!.maxMinutes} دقيقة؛ ${p.visit!.note}\n${p.coordinateSource!.scope} إحداثيات WGS84: ${p.location!.lat}, ${p.location!.lng}. مصدر الإحداثيات: ${p.coordinateSource!.url}، بيانات CC0. تفيد في تجميع الأماكن تقريبًا، ولا تعطي زمن الطريق.\n${p.cost.note}`,
 source:p.coordinateSource!.url,sourceName:p.coordinateSource!.name,checked:p.coordinateSource!.checked,status:'editorial',revision:0,archived:false,...venueKnowledgeScope(p.id),
 applicability:'مدة تقديرية يغيّرها المستخدم، ونقطة خرائط جماعية غير رسمية؛ لا تثبت وقت السير أو مدخل الزيارة.'
}));
