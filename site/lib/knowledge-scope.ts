import {chinaQuestionCities} from './china-knowledge';
import {countryExperiences} from './country-experiences';
import {normalizeSearch,type KnowledgeCard} from './knowledge';
const aliases:Record<string,Record<string,string[]>>={
 MY:{'kuala-lumpur':['كوالالمبور','كوالا لمبور','kuala lumpur','klia'],tioman:['تيومان','tioman'],penang:['بينانج','بينانغ','penang'],langkawi:['لنكاوي','لانكاوي','langkawi']},
 GE:{tbilisi:['تبليسي','تفليس','tbilisi'],batumi:['باتومي','batumi'],mtskheta:['متسخيتا','متسخيتة','mtskheta']}
};
export function questionCities(code:string,question:string){
 if(code==='CN')return chinaQuestionCities(question);
 const q=normalizeSearch(question),entries={...aliases[code]};
 for(const experience of countryExperiences[code]||[])entries[experience.area]=[experience.area];
 return Object.entries(entries).filter(([,names])=>names.some(name=>q.includes(normalizeSearch(name)))).map(([id])=>id);
}
export function cardMatchesCities(card:KnowledgeCard,code:string,cities:string[]){
 const scope=card.city?[card.city]:questionCities(code,card.title);
 if(!cities.length)return !(['MY','GE'].includes(code)&&scope.length>0);
 if(card.sourceKind==='community'&&!scope.length)return false;
 return !scope.length||scope.some(city=>cities.includes(city));
}
