export type OfficialAdvice={source:string;fetchedAt:string;updatedAt:string;alerts:string[];change:string;warnings:string;sections:{title:string;slug:string;text:string}[]};
export const plain=(s:string)=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<\/(?:p|li|h[1-6]|div)>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\n\s*\n/g,'\n').trim();
export function parseOfficialAdvice(data:any,slug:string,now=new Date()):OfficialAdvice{
 if(data.document_type!=='travel_advice'||data.details?.country?.slug!==slug||!Array.isArray(data.details?.parts)||!Number.isFinite(Date.parse(data.public_updated_at))||Date.parse(data.public_updated_at)>now.getTime()+86400000)throw Error('Invalid official source');
 const parts=data.details.parts;
 return {source:'https://www.gov.uk/foreign-travel-advice/'+slug,fetchedAt:now.toISOString(),updatedAt:data.public_updated_at,alerts:Array.isArray(data.details.alert_status)?data.details.alert_status.filter((x:unknown)=>typeof x==='string'):[],change:plain(String(data.details.change_description||'')).slice(0,1500),warnings:plain(String(parts.find((p:any)=>p.slug==='warnings-and-insurance')?.body||'')).slice(0,16000),sections:parts.filter((p:any)=>['safety-and-security','regional-risks','health'].includes(p.slug)).map((p:any)=>({slug:p.slug,title:p.title,text:plain(String(p.body||'')).slice(0,6000)}))};
}
export function freshness(checked:string,days:number,now=Date.now()){
 const at=Date.parse(checked);if(!Number.isFinite(at)||at>now+86400000)return 'unknown';return now-at>days*86400000?'review':'current';
}
