import fs from 'node:fs';
import {climatePoints} from '../lib/climate-points.ts';
const target=new URL('../lib/climate-data.json',import.meta.url);
const result=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):{};
const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const queue=Object.entries(climatePoints).filter(([code])=>!result[code]||process.argv.includes('--refresh'));
let done=0;
async function worker(){while(queue.length){const [code,p]=queue.shift();const source=`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${p.lng}&latitude=${p.lat}&format=JSON`;try{const response=await fetch(source,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json(),v=data.properties?.parameter;const rows=months.map((m,i)=>({month:i+1,temperature:v?.T2M?.[m],rain:v?.PRECTOTCORR?.[m]}));if(data.parameters?.T2M?.units!=='C'||data.parameters?.PRECTOTCORR?.units!=='mm/day'||rows.some(r=>!Number.isFinite(r.temperature)||r.temperature<-90||r.temperature>65||!Number.isFinite(r.rain)||r.rain<0||r.rain>100))throw Error('Invalid data');result[code]={...p,source,fetchedAt:new Date().toISOString(),period:data.header.range,rows};console.log(code+' OK '+(++done));}catch(e){console.log(code+' FAILED '+e.message);}fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');}}
await Promise.all(Array.from({length:4},worker));
console.log('Saved '+Object.keys(result).length+' countries');
if(Object.keys(result).length!==Object.keys(climatePoints).length)process.exitCode=1;
