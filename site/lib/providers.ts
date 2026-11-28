export type Provenance={sourceUrl:string;checkedAt:string;assumptions:string[]};
export type TravelResult<T>={status:'live'|'estimate';data:T;provenance:Provenance}|{status:'unavailable';reason:string};
export interface TravelProvider {
 hotels(input:{destination:string;checkIn:string;checkOut:string;rooms:number;adults:number;currency:string}):Promise<TravelResult<{total:number;currency:string;taxesIncluded:boolean;checkedAt:string;expiresAt?:string;cancellation:string;sourceUrl:string}[]>>;
 flights(input:{origin:string;destination:string;departure:string;days:number;travelers:number;currency:string}):Promise<TravelResult<{low:number;high:number;durationMinutes:number}>>;
 weather(input:{destination:string;date:string}):Promise<TravelResult<{minC:number;maxC:number;description:string}>>;
 visa(input:{destinationCountry:string;passportNationality:string;residenceCountry?:string}):Promise<TravelResult<{summary:string;conditions:string[]}>>;
}
// No fabricated fallback. A future adapter must supply provenance and an explicit status.
export const unavailableProvider:TravelProvider={
 async hotels(){return {status:'unavailable',reason:'لم تُربط خدمة أسعار سكن؛ يلزم اتفاق مزوّد وبيانات وصول'};},
 async flights(){return {status:'unavailable',reason:'لم تُربط خدمة عروض طيران موثوقة بعد'};},
 async weather(){return {status:'unavailable',reason:'لم تُربط تغذية توقعات جوية مباشرة بعد'};},
 async visa(){return {status:'unavailable',reason:'راجع الجهة الرسمية؛ لا يتوفر قرار آلي موثوق بحسب الجواز'};}
};
