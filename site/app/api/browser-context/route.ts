import {getChatGPTUser} from '../../chatgpt-auth';
import {builtInKnowledge} from '../../../lib/knowledge-server';
import {personalCards} from '../knowledge/route';
import {retrieveLocalCards} from '../../../lib/browser-advisor';
import {profiles} from '../../../lib/world';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return json({error:'سجّل الدخول أولًا.'},401);const u=new URL(request.url),code=u.searchParams.get('country')||'',q=u.searchParams.get('q')||'',previous=u.searchParams.getAll('previous');if(!Object.hasOwn(profiles,code)||q.length>600||previous.length>2||previous.some(p=>p.length>600)||previous.reduce((n,p)=>n+p.length,0)>600)return json({error:'راجع الدولة وطول السؤال.'},400);try{return json({cards:retrieveLocalCards([...builtInKnowledge,...await personalCards(user.userId)],code,q,previous).map(c=>({...c,text:c.text.slice(0,1800)}))});}catch{return json({error:'تعذر تحميل المراجع.'},503);}}
