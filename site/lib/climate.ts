import raw from './climate-data.json';
export type Climate={city:string;lat:number;lng:number;source:string;fetchedAt:string;period:string;rows:{month:number;temperature:number;rain:number}[]};
export const climates=raw as Record<string,Climate>;
export type ClimatePreference={min:number;max:number;rain:number};
export function climateMatches(code:string,p:ClimatePreference){if(!Number.isFinite(p.min)||!Number.isFinite(p.max)||p.min>p.max||p.rain<0)return [];return (climates[code]?.rows||[]).filter(r=>r.temperature>=p.min&&r.temperature<=p.max&&r.rain<=p.rain);}
export function climateMonth(code:string,month:number){return climates[code]?.rows.find(x=>x.month===month);}
