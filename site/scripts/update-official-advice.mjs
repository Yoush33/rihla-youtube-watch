import fs from 'node:fs';
import {climatePoints} from '../lib/climate-points.ts';
import {parseOfficialAdvice} from '../lib/official-advice.ts';
const countries=JSON.parse(fs.readFileSync(new URL('../public/countries.json',import.meta.url),'utf8'));
const index=await (await fetch('https://www.gov.uk/api/content/foreign-travel-advice')).json();
const aliases={TR:'Turkey',KR:'South Korea',CZ:'Czechia',CV:'Cape Verde',US:'USA',BS:'Bahamas',MK:'North Macedonia'};
const map={},data={};
for(const code of Object.keys(climatePoints)){if(code==='GB')continue;const c=countries.find(c=>c.code===code),names=[c.en,aliases[code]].filter(Boolean).map(x=>x.toLowerCase());const item=index.links.children.find(x=>[x.details.country.name,...(x.details.country.synonyms||[])].some(s=>names.includes(s.toLowerCase())));if(item)map[code]=item.details.country.slug;else console.log('NO MATCH '+code+' '+c.en);}
fs.writeFileSync(new URL('../lib/advice-sources.json',import.meta.url),JSON.stringify(map,null,2)+'\n');
const queue=Object.entries(map);
async function worker(){while(queue.length){const [code,slug]=queue.shift();try{const r=await fetch('https://www.gov.uk/api/content/foreign-travel-advice/'+slug,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);data[code]=parseOfficialAdvice(await r.json(),slug);console.log(code+' OK');}catch(e){console.log(code+' FAILED '+e.message);}}}
await Promise.all([worker(),worker(),worker()]);
fs.writeFileSync(new URL('../lib/advice-snapshot.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log('Saved '+Object.keys(data).length);
