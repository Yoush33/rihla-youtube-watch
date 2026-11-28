import type {Data,Trip} from './planning';
export function validateDataSize(next:Data,revision:number){
 if(new TextEncoder().encode(JSON.stringify({data:next,revision})).length>3_000_000)throw Error('تجاوزت البيانات سعة الحفظ؛ لم نضف التعديل. نزّل نسخة احتياطية وقلّل حجم الإضافة.');
 return next;
}
export function commitDataChange(current:Data,change:(data:Data)=>Data,state:{enabled:boolean;blocked:boolean;revision:number}):Data{
 if(!state.enabled||state.blocked)throw Error('استعد الحفظ قبل التعديل. بياناتك الحالية باقية ويمكن تصديرها.');
 const next=change(current);
 if(next.trips.length>50)throw Error('وصلت إلى حد ٥٠ رحلة محفوظة.');
 if(!next.trips.some(t=>t.id===next.activeId))throw Error('الرحلة المختارة غير موجودة.');
 return validateDataSize(next,state.revision);
}
export function updateTripData(current:Data,tripId:string,patch:Partial<Trip>,revision:number):Data{
 if(current.activeId!==tripId||!current.trips.some(t=>t.id===tripId))throw Error('تغيّرت الرحلة النشطة؛ لم نطبق تعديلًا على رحلة مختلفة.');
 const next={...current,trips:current.trips.map(t=>t.id===tripId?{...t,...patch,id:t.id}:t)};
 return validateDataSize(next,revision);
}
