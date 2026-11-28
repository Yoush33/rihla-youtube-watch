import {getChatGPTUser} from '../../chatgpt-auth';
import {database} from '../../../db/storage';
import sources from '../../../lib/advice-sources.json';
import snapshots from '../../../lib/advice-snapshot.json';
import {parseOfficialAdvice,type OfficialAdvice} from '../../../lib/official-advice';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 if(!await getChatGPTUser())return reply({reason:'سجّل الدخول لعرض التنبيهات.'},401);
 const url=new URL(request.url),code=url.searchParams.get('country')||'',slug=(sources as Record<string,string>)[code];
 if(!slug)return reply({reason:'لم تُربط تغذية لهذه الدولة.'},404);
 let prior=(snapshots as Record<string,OfficialAdvice>)[code];
 try{const row=await database().prepare('SELECT payload FROM source_cache WHERE code=?').bind(code).first<{payload:string}>();if(row)prior=JSON.parse(row.payload);}catch{/* Read-only bundled snapshot remains available. */}
 if(prior&&Date.now()-Date.parse(prior.fetchedAt)<(url.searchParams.get('refresh')==='1'?60000:86400000))return reply({data:prior,cached:true});
 try{const r=await fetch('https://www.gov.uk/api/content/foreign-travel-advice/'+slug,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('upstream');const data=parseOfficialAdvice(await r.json(),slug);try{await database().prepare('INSERT INTO source_cache (code,payload,fetched_at) VALUES (?,?,?) ON CONFLICT(code) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at WHERE source_cache.fetched_at < excluded.fetched_at').bind(code,JSON.stringify(data),data.fetchedAt).run();}catch{/* Do not conceal successful retrieval if cache is unavailable. */}return reply({data,cached:false});}catch{return prior?reply({data:prior,stale:true,reason:'تعذر جلب المصدر الآن؛ المعروض آخر نسخة محفوظة بتاريخها.'}):reply({reason:'تعذر الوصول إلى المصدر الرسمي.'},503);}
}
