import type {Activity} from './planning';
export type Point={lat:number;lng:number};
// Approximate city viewports only: never assigned to an activity as its location.
export const cityCenters:Record<string,[number,number]>={kyoto:[35.01,135.77],istanbul:[41.01,28.98],lisbon:[38.72,-9.14],singapore:[1.29,103.85],dubai:[25.20,55.27],marrakech:[31.63,-7.98]};
export function validPoint(p:Point){return Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;}
export function parsePoint(lat:string,lng:string):Point|null{if(!lat.trim()||!lng.trim())return null;const p={lat:Number(lat),lng:Number(lng)};return validPoint(p)?p:null;}
export function distanceKm(a:Point,b:Point){const rad=Math.PI/180;const h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}
export function directSegments(activities:Activity[]){return activities.slice(1).flatMap((b,i)=>{const a=activities[i];return a.location&&b.location?[{from:a,to:b,km:distanceKm(a.location,b.location)}]:[];});}
export function nearestOrder(activities:Activity[]):Activity[]{if(activities.length<2||activities.some(a=>!a.location||a.time))return activities;const pending=activities.slice(1),ordered=[activities[0]];while(pending.length){const last=ordered[ordered.length-1].location!;let nearest=0;for(let i=1;i<pending.length;i++)if(distanceKm(last,pending[i].location!)<distanceKm(last,pending[nearest].location!))nearest=i;ordered.push(pending.splice(nearest,1)[0]);}return ordered;}
export function mapsSearch(title:string,city:string){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([title,city].filter(Boolean).join(', '));}
export function mapsDirections(a:Point,b:Point){return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(`${a.lat},${a.lng}`)+'&destination='+encodeURIComponent(`${b.lat},${b.lng}`);}
