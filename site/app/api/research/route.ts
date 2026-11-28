import {builtInKnowledge,repositoryAnswer} from '../../../lib/knowledge-server';
import {personalCards} from '../knowledge/route';
import {getChatGPTUser} from '../../chatgpt-auth';
import {database} from '../../../db/storage';
import {normalizeData} from '../../../lib/planning';
import {profiles} from '../../../lib/world';
import {researchInput} from '../../../lib/research';

const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
async function settings(_owner:string){return {configured:false,enabled:false,monthlyLimit:0,used:0,model:'repository'};}
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return json({error:'سجّل الدخول أولًا.'},401);try{const url=new URL(request.url),trip=url.searchParams.get('trip')||'',before=url.searchParams.get('before')||'9999';const rows=await database().prepare('SELECT id,trip_id,mode,status,question,payload,created_at FROM research WHERE owner=? AND trip_id=? AND created_at < ? ORDER BY created_at DESC LIMIT 30').bind(user.userId,trip,before).all();return json({settings:await settings(user.userId),items:rows.results.map((r:any)=>({...r,answer:JSON.parse(r.payload)}))});}catch{return json({error:'تعذر تحميل سجل الأبحاث. أعد المحاولة.'},503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'سجّل الدخول أولًا.'},401);const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'طلب من مصدر غير مسموح.'},403);
 let id='';
 try{const raw=await request.text();if(new TextEncoder().encode(raw).length>10000)return json({error:'السؤال أطول من الحد المسموح.'},413);const input=JSON.parse(raw);
 if(input.action==='settings')return json({error:'الموقع يعمل بالمستودع المجاني؛ البحث المدفوع معطل.'},403);
 if(input.mode==='web')return json({error:'البحث المدفوع معطل. استخدم المستودع المجاني.'},403);
 const parsed=researchInput.safeParse(input);if(!parsed.success||parsed.data.countries.some(c=>!Object.hasOwn(profiles,c)))return json({error:'اختر دولة مدعومة واكتب سؤالًا من ٣ إلى ١٨٠٠ حرف.'},400);
 const p=parsed.data;id=p.id;
 const existing=await database().prepare('SELECT status,payload FROM research WHERE owner=? AND id=?').bind(user.userId,id).first<{status:string;payload:string}>();if(existing)return json({status:existing.status,answer:JSON.parse(existing.payload),replayed:true},existing.status==='pending'?202:200);
 const saved=await database().prepare('SELECT payload FROM plans WHERE owner=?').bind(user.userId).first<{payload:string}>();if(!saved)return json({error:'احفظ الرحلة أولًا.'},409);const data=normalizeData(JSON.parse(saved.payload)),trip=data.trips.find(t=>t.id===p.tripId);if(!trip)return json({error:'الرحلة غير موجودة في حسابك.'},404);
 const now=new Date().toISOString();
 const claim=await database().prepare("INSERT INTO research (owner,id,trip_id,mode,status,question,payload,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(owner,id) DO NOTHING").bind(user.userId,id,p.tripId,'library','pending',p.question,'{}',now).run();
 if(!claim.meta.changes)return json({error:'الطلب مسجل بالفعل؛ حدّث السجل.'},409);
 const notes=await personalCards(user.userId);
 const answer=repositoryAnswer(p.question,p.countries,trip,data,[...builtInKnowledge,...notes]),usage=null;
 await database().prepare("UPDATE research SET status='completed',payload=? WHERE owner=? AND id=? AND status='pending'").bind(JSON.stringify({...answer,usage}),user.userId,id).run();return json({status:'completed',answer,settings:await settings(user.userId)});
 }catch(e){const message=e instanceof SyntaxError?'صيغة طلب غير صالحة.':e instanceof Error&&/^[\u0600-\u06ff]/.test(e.message)?e.message:'تعذر إكمال البحث. لم نعتمد نتيجة؛ راجع السجل قبل إعادة الطلب.';if(id){try{await database().prepare("UPDATE research SET status='failed',payload=? WHERE owner=? AND id=? AND status='pending'").bind(JSON.stringify({error:message}),user.userId,id).run();}catch{}}return json({error:message},503);}
}
