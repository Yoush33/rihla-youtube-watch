import {getChatGPTUser} from '../../chatgpt-auth';
import {database} from '../../../db/storage';
import {builtInKnowledge} from '../../../lib/knowledge-server';
import {noteSchema,searchCards,type KnowledgeCard} from '../../../lib/knowledge';
import {profiles} from '../../../lib/world';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function personalCards(owner:string){const rows=await database().prepare('SELECT payload,revision FROM knowledge_notes WHERE owner=? ORDER BY updated_at DESC').bind(owner).all();return rows.results.map((r:any)=>({...JSON.parse(r.payload),revision:r.revision,status:'personal'})) as KnowledgeCard[];}
export async function GET(req:Request) {
  const user = await getChatGPTUser();
  if (!user) return json({error:'سجّل الدخول أولًا.'},401);
  try {
    const params = new URL(req.url).searchParams;
    const code = params.get('country');
    const own = await personalCards(user.userId);
    const all = [...builtInKnowledge,...own];
    if (params.get('export') === '1') return json({format:'rihla-knowledge-v1',exportedAt:new Date().toISOString(),cards:all});
    const base = all.filter(card => (!code || card.code === code) && (!card.archived || params.get('archived') === '1'));
    const filtered = searchCards(base,params.get('q') || '',params.get('topic') || '')
      .filter(card => params.get('video') !== '1' || !!card.video);
    const offset = Math.max(0,Number(params.get('offset')) || 0);
    return json({cards:filtered.slice(offset,offset+30),total:filtered.length,builtIn:builtInKnowledge.length,personal:own.length,countries:Object.keys(profiles).length});
  } catch {
    return json({error:'تعذر تحميل المستودع. حاول مجددًا.'},503);
  }
}
export async function PUT(req:Request){const user=await getChatGPTUser();if(!user)return json({error:'سجّل الدخول أولًا.'},401);if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'مصدر طلب غير مسموح.'},403);try{const raw=await req.text();if(new TextEncoder().encode(raw).length>30000)return json({error:'الملاحظة أكبر من الحد المسموح.'},413);const p=noteSchema.safeParse(JSON.parse(raw));if(!p.success||!Object.hasOwn(profiles,p.data.code))return json({error:'راجع الدولة والعنوان والنص والرابط والتاريخ.'},400);const v=p.data;const result=await database().prepare('INSERT INTO knowledge_notes (owner,id,payload,revision,updated_at) SELECT ?,?,?,1,? WHERE ?=0 ON CONFLICT(owner,id) DO UPDATE SET payload=excluded.payload,revision=knowledge_notes.revision+1,updated_at=excluded.updated_at WHERE knowledge_notes.revision=?').bind(user.userId,v.id,JSON.stringify({...v,status:'personal'}),new Date().toISOString(),v.revision,v.revision).run();if(!result.meta.changes){if(v.revision===0)return json({error:'المعلومة موجودة؛ حدّث القائمة.'},409);const changed=await database().prepare('UPDATE knowledge_notes SET payload=?,revision=revision+1,updated_at=? WHERE owner=? AND id=? AND revision=?').bind(JSON.stringify({...v,status:'personal'}),new Date().toISOString(),user.userId,v.id,v.revision).run();if(!changed.meta.changes)return json({error:'تغيرت المعلومة في نافذة أخرى. حدّث القائمة قبل تعديلها.'},409);}return json({revision:v.revision+1});}catch{return json({error:'تعذر حفظ المعلومة.'},503);}}
