import type {Trip} from './planning';
import {routeBasis,routeKey,travelDates,validDate,safeSource} from './reliability';
import {transferReviewSchema,type TransferReview} from './reliability-schema';
export function saveRouteReview(t:Trip,day:number,from:string,to:string,value:TransferReview,now=new Date().toISOString().slice(0,10)):Partial<Trip>{
 const list=t.plans[t.selected]?.[day]?.activities||[],i=list.findIndex(a=>a.id===from),a=list[i],b=list[i+1];
 if(!travelDates(t)||!a||!b||b.id!==to)throw Error('حدد موعدًا صحيحًا وراجع انتقالًا بين نشاطين متجاورين.');
 if(!a.location||!b.location)throw Error('حدد نقطتي المكانين قبل ربط زمن الطريق بهما.');
 const v=transferReviewSchema.parse(value);if(!v.mode||!safeSource(v.source)||!validDate(v.checked)||v.checked>now||[v.minutes,v.rest].some(s=>!/^\d+$/.test(s)||Number(s)>1440))throw Error('أكمل الوسيلة والمصدر وتاريخًا غير مستقبلي، وأدخل زمن الطريق والراحة بين صفر و١٤٤٠ دقيقة.');
 const review=t.reliability?.[t.selected]||{};return {reliability:{...t.reliability,[t.selected]:{...review,transfers:{...review.transfers,[routeKey(a,b)]:{...v,basis:routeBasis(t,day,a,b)}}}}};
}
