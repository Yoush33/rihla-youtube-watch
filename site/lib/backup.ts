import {normalizeData,planSchemaVersion,type Data} from './planning';
import {allDestinations} from './country-planning';
import {countryCodes} from './country-codes';
export const backupFileLimit=20_000_000;
const bytes=(text:string)=>new TextEncoder().encode(text).length;
const destinations=new Set(allDestinations.map(d=>d.id));
export function validPlanReferences(data:Data){return data.trips.some(t=>t.id===data.activeId)&&new Set(data.trips.map(t=>t.id)).size===data.trips.length&&[...Object.keys(data.world||{}),...(data.worldComparison?.codes||[])].every(code=>countryCodes.includes(code))&&data.trips.every(t=>(!t.selected||destinations.has(t.selected))&&t.compare.every(id=>destinations.has(id))&&[t.plans,t.costs,t.ideas||{},t.extras||{},t.expenses||{},t.reliability||{}].every(obj=>Object.keys(obj).every(id=>destinations.has(id))));}
function noUnknownFields(raw:unknown,parsed:unknown,path='النسخة'){
 if(!raw||typeof raw!=='object')return;
 for(const key of Object.keys(raw)){if(!parsed||typeof parsed!=='object'||!Object.hasOwn(parsed,key))throw Error('توجد بيانات غير مدعومة في '+path+'؛ لم نغيّرها أو نحذفها. استخدم نسخة الموقع المناسبة.');noUnknownFields((raw as Record<string,unknown>)[key],(parsed as Record<string,unknown>)[key],path+'.'+key);}
}
export function parseBackup(text:string):Data{
 if(bytes(text)>backupFileLimit)throw Error('الملف أكبر من ٢٠ ميجابايت.');
 let raw:any;try{raw=JSON.parse(text);}catch{throw Error('الملف ليس نسخة JSON صالحة.');}
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schemaVersion!==undefined&&(!Number.isInteger(raw.schemaVersion)||raw.schemaVersion<1||raw.schemaVersion>planSchemaVersion))throw Error('إصدار النسخة غير مدعوم. حدّث الموقع قبل استيراد نسخة أحدث.');
 let data:Data;try{data=normalizeData(raw);}catch{throw Error('بيانات النسخة غير مكتملة أو تتجاوز الحدود؛ لم يتغير شيء.');}
 noUnknownFields(raw,data);
 if(!validPlanReferences(data))throw Error('تحتوي النسخة على وجهة غير مدعومة أو معرفات رحلات متكررة.');
 return data;
}
export function worldRestorePreview(current:Data,backup:Data){const incoming=Object.entries(backup.world||{});return {added:incoming.filter(([code])=>!Object.hasOwn(current.world||{},code)).map(([code])=>code),kept:incoming.filter(([code])=>Object.hasOwn(current.world||{},code)).map(([code])=>code)};}
export function restoreTripCopies(current:Data,backup:Data,ids:string[],includeNewWorld:boolean,revision:number,idFactory=()=>crypto.randomUUID()):Data{
 if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!backup.trips.some(t=>t.id===id)))throw Error('اختر رحلة صالحة واحدة على الأقل.');
 if(current.trips.length+ids.length>50)throw Error('لا تتسع المساحة لهذه الرحلات؛ الحد ٥٠ رحلة. قلّل الاختيار.');
 const existing=new Set(current.trips.map(t=>t.id));
 const copies=backup.trips.filter(t=>ids.includes(t.id)).map(t=>{const id=idFactory();if(existing.has(id))throw Error('تعذر إنشاء معرف مستقل؛ حاول مرة أخرى.');existing.add(id);const suffix=' · مستعادة';return {...structuredClone(t),...(t.planDraft?{planDraft:{...structuredClone(t.planDraft),tripId:id}}:{}),id,name:t.name.length+suffix.length<=200?t.name+suffix:t.name};});
 const world={...current.world};if(includeNewWorld)for(const [code,memory] of Object.entries(backup.world||{}))if(!Object.hasOwn(world,code))world[code]=structuredClone(memory);
 const result:Data={...current,trips:[...current.trips,...copies],activeId:copies[0].id,...(includeNewWorld?{world}:{})};
 if(bytes(JSON.stringify({data:result,revision}))>3_000_000)throw Error('مجموع البيانات يتجاوز سعة الحفظ. اختر رحلات أقل؛ لم يتغير شيء.');
 return result;
}
