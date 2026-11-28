import {calendarDate,foldLine,icsText,type Trip} from './planning';
import {minorAmount,moneyDigits} from './money';
import {priceWatchSchema,priceObservationSchema,type PriceWatch,type PriceObservation} from './price-watch-schema';
import {budgetBasis} from './reliability';
export const googleTravelLinks={flight:'https://www.google.com/travel/flights',stay:'https://www.google.com/travel/hotels',flightHelp:'https://support.google.com/travel/answer/6235879?hl=ar',hotelHelp:'https://blog.google/products-and-platforms/products/search/summer-travel-tips-ai-overviews-hotel-price-tracking/',partnerDocs:'https://developers.google.com/hotels/hotel-prices/api-reference/rest'};
export const priceTripBasis=(t:Trip)=>JSON.stringify([t.selected,t.origin,t.mode,t.date,t.month,t.days,t.travelers,t.currency]);
export const priceNights=(w:PriceWatch)=>Math.round((Date.parse(w.end+'T12:00:00Z')-Date.parse(w.start+'T12:00:00Z'))/86400000);
export function quoteTotal(w:PriceWatch,o:PriceObservation){const n=minorAmount(o.amount,w.currency);if(n===null)return null;const factor=o.unit==='personRoundTrip'?w.travelers:o.unit==='roomNight'?w.rooms*priceNights(w):1;return Number.isSafeInteger(n*factor)?n*factor/10**moneyDigits(w.currency):null;}
export function watchSummary(w:PriceWatch,today=new Date().toISOString().slice(0,10)){
 const observations=w.observations.filter(o=>o.observedOn<=today).sort((a,b)=>a.observedOn.localeCompare(b.observedOn)||a.recordedAt.localeCompare(b.recordedAt)),latest=observations.at(-1),previous=observations.at(-2);
 const current=latest?quoteTotal(w,latest):null,old=previous?quoteTotal(w,previous):null;
 const sameTerms=latest&&previous&&latest.taxes!=='unknown'&&latest.taxes===previous.taxes&&!!latest.conditions.trim()&&latest.conditions.trim()===previous.conditions.trim();
 return {latest,current,delta:sameTerms&&current!==null&&old!==null?Number((current-old).toFixed(moneyDigits(w.currency))):null,comparable:!!sameTerms,due:!!(w.active&&w.nextReview&&w.nextReview<=today),targetReached:!!(latest&&latest.taxes==='included'&&current!==null&&w.target!==''&&current<=Number(w.target)),future:w.observations.some(o=>o.observedOn>today)};
}
export function addPriceObservation(w:PriceWatch,input:Omit<PriceObservation,'id'|'recordedAt'>,now=new Date()){
 const today=now.toISOString().slice(0,10);if(input.observedOn>today)throw Error('لا تسجل سعرًا بتاريخ تحقق مستقبلي.');
 if(w.observations.length>=40)throw Error('بلغ هذا البحث ٤٠ رصدًا؛ أنشئ بحثًا جديدًا مع إبقاء السجل السابق.');
 const observation=priceObservationSchema.parse({...input,id:crypto.randomUUID(),recordedAt:now.toISOString()});
 return priceWatchSchema.parse({...w,observations:[...w.observations,observation],nextReview:calendarDate(input.observedOn,w.reviewEveryDays)});
}
export function priceSearchBrief(w:PriceWatch){return [(w.kind==='flight'?'بحث طيران ذهاب وعودة':'بحث سكن')+' — '+w.title,(w.kind==='flight'?w.origin+' → ':'')+w.destination,w.start+' → '+w.end,w.travelers+' مسافر'+(w.kind==='stay'?' · '+w.rooms+' غرفة · '+priceNights(w)+' ليالٍ':''),'العملة: '+w.currency,'راجع أعمار المسافرين، الشروط والضرائب والأمتعة في خدمة البحث؛ هذه التفاصيل غير مفترضة في رِحلة.'].join('\n');}
export function priceReviewCalendar(w:PriceWatch,now=new Date()){
 priceWatchSchema.parse(w);if(!w.active||!w.nextReview)throw Error('حدد موعد مراجعة لبحث نشط أولًا.');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Rihla//Price Review//AR','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:price-'+w.id+'@rihla.local','DTSTAMP:'+now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART;VALUE=DATE:'+w.nextReview.replaceAll('-',''),'DTEND;VALUE=DATE:'+calendarDate(w.nextReview,1).replaceAll('-',''),'SUMMARY:'+icsText('راجع السعر — '+w.title),'DESCRIPTION:'+icsText(priceSearchBrief(w)+'\nتذكير للمراجعة اليدوية؛ لا يجلب السعر ولا ينفذ حجزًا.\n'+googleTravelLinks[w.kind]),'END:VEVENT','END:VCALENDAR'].map(foldLine).join('\r\n')+'\r\n';
}
export function comparableSearches(w:PriceWatch,other:PriceWatch){return w.kind===other.kind&&w.destinationId===other.destinationId&&w.origin.trim()===other.origin.trim()&&w.destination.trim()===other.destination.trim()&&w.travelers===other.travelers&&w.currency===other.currency&&(w.kind==='flight'||w.rooms===other.rooms&&priceNights(w)===priceNights(other));}
export function priceBudgetPatch(t:Trip,w:PriceWatch,now=new Date().toISOString().slice(0,10)):Partial<Trip>{
 priceWatchSchema.parse(w);const s=watchSummary(w,now),o=s.latest;
 if(!o||s.current===null||o.taxes!=='included'||!o.conditions.trim())throw Error('سجّل عرضًا شامل الضرائب بشروط واضحة قبل استخدامه في الميزانية.');
 if((Date.parse(now)-Date.parse(o.observedOn))/86400000>7)throw Error('الرصد أقدم من ٧ أيام؛ راجع السعر وسجّل رصدًا جديدًا.');
 if(t.mode!=='dates'||w.destinationId!==t.selected||w.start!==t.date||w.end!==calendarDate(t.date,Number(t.days)-1)||w.travelers!==Number(t.travelers)||w.currency!==t.currency||w.tripBasis!==priceTripBasis(t))throw Error('تواريخ هذا البحث أو أعداده أو عملته لا تطابق الرحلة الحالية؛ لا ننقل عرضًا لتواريخ بديلة إلى ميزانيتها.');
 const scale=10**moneyDigits(w.currency),total=Math.round(s.current*scale),factor=w.kind==='flight'?w.travelers:w.rooms*priceNights(w);
 if(!Number.isInteger(factor)||factor<1||total%factor!==0)throw Error('لا يمكن تحويل المجموع إلى سعر الوحدة بدقة العملة دون تقريب؛ أدخل نطاقًا مناسبًا يدويًا.');
 const rate=(total/factor/scale).toFixed(moneyDigits(w.currency)),key=w.kind==='flight'?'flight':'stay';
 const costs={...t.costs,[t.selected]:{...t.costs[t.selected],[key+'Low']:rate,[key+'High']:rate,[key+'Source']:'',[key+'Checked']:'',...(w.kind==='stay'?{rooms:String(w.rooms)}:{})}};
 const review=t.reliability?.[t.selected]||{},proof={source:o.source,checked:o.observedOn,note:('رصد يدوي: '+w.title+' · '+o.conditions).slice(0,1000),basis:budgetBasis({...t,costs})};
 return {costs,reliability:{...t.reliability,[t.selected]:{...review,proofs:{...review.proofs,['quote-'+key]:proof}}}};
}
