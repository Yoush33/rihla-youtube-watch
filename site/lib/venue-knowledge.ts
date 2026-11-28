import depth from './city-depth-data.json';
import {venueFacts} from './reliability-catalog';
const aliases:Record<string,string[]>={
 'cn-beijing-palace-museum':['متحف القصر','المدينة المحرمة','Palace Museum','Forbidden City'],
 'cn-beijing-jingshan':['جينغشان','Jingshan'],
 'cn-beijing-temple-heaven':['معبد السماء','Temple of Heaven'],
 'cn-shanghai-bund':['البوند','The Bund'],
 'cn-shanghai-yuyuan':['يويوان','Yuyuan','Yu Garden'],
 'cn-shanghai-museum-peoples-square':['متحف شنغهاي','Shanghai Museum'],
 'kl-petronas-skybridge':['بتروناس','Petronas'],
 'kl-klcc-park':['حديقة KLCC','KLCC Park'],
 'kl-islamic-arts-museum':['متحف الفنون الإسلامية','Islamic Arts Museum'],
 'tbilisi-abanotubani':['أبانوتوباني','Abanotubani'],
 'tbilisi-mtatsminda-funicular':['متاتسميندا','Mtatsminda'],
 'tbilisi-simon-janashia-museum':['متحف جورجيا','سيمون جاناشيا','Simon Janashia']
};
export function venueKnowledgeScope(id:string){
 const v=venueFacts.find(v=>v.id===id),place=depth.activities.find(p=>p.id===id);
 return {venueId:id,venueNames:[...(place?[place.name]:[]),...(aliases[id]||[])],validFrom:v?.validFrom,validUntil:v?.validUntil,applicability:v?[v.scope,...(v.hoursSeasons||[]).map(s=>`الأشهر ${s.fromMonth} إلى ${s.toMonth}: ${s.open}–${s.close}؛ آخر دخول ${s.lastEntry}؛ ${s.scope}`)].join('\n'):undefined};
}
