// A timed-out write may still have committed. Reconcile its exact revision and
// payload before retrying; never treat another tab's data as our own save.
export class PlanSyncError extends Error {
 status:number;
 constructor(message:string,status=0){super(message);this.status=status;this.name='PlanSyncError';}
 get blocked(){return this.status===409||this.status===426;}
}
const messages:Record<number,string>={401:'انتهت جلسة الدخول. بياناتك باقية هنا؛ سجّل الدخول ثم أعد محاولة الحفظ.',403:'لم يسمح الخادم بالحفظ. احتفظ بنسخة وأعد تسجيل الدخول.',409:'تغيّرت الرحلات في نافذة أو جهاز آخر. نزّل نسخة من تعديلاتك قبل إعادة التحميل.',426:'توجد نسخة أحدث للموقع. نزّل نسخة من تعديلاتك ثم أعد تحميل الصفحة.',413:'تجاوزت البيانات سعة الحفظ. نزّل نسخة وقلّل حجم الإضافة.',400:'تعذّر قبول البيانات. نزّل نسخة من تعديلاتك قبل إعادة التحميل.'};
export type PlanReply={data?:unknown;revision:number};
export type PlanRequest=(init?:RequestInit)=>Promise<PlanReply>;
export async function requestPlans(init:RequestInit={},fetcher:typeof fetch=fetch,timeoutMs=15000):Promise<PlanReply>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new PlanSyncError('استغرق الاتصال وقتًا طويلًا. تعديلاتك باقية هنا؛ أعد المحاولة عندما يتحسن الاتصال.'));controller.abort();},timeoutMs);});
 const work=(async()=>{const r=await fetcher('/api/plans',{...init,cache:'no-store',signal:controller.signal});if(!r.ok)throw new PlanSyncError(messages[r.status]||'تعذّر الاتصال بخدمة الحفظ. احتفظ بالصفحة مفتوحة وأعد المحاولة.',r.status);const v=await r.json() as PlanReply|null;if(!v||typeof v!=='object'||!Number.isInteger(v.revision)||v.revision<0||!init.method&&!Object.hasOwn(v,'data'))throw new PlanSyncError('وصل رد غير مكتمل من خدمة الحفظ. تعديلاتك باقية؛ أعد المحاولة.');return v;})();
 try{return await Promise.race([work,deadline]);}catch(e){throw e instanceof PlanSyncError?e:new PlanSyncError('انقطع الاتصال بخدمة الحفظ. تعديلاتك باقية هنا؛ أعد المحاولة.');}finally{clearTimeout(timer);}
}
type Attempt={snapshot:string;previous:string;revision:number};
export type PlanSaveState={revision:number;saved:string;pending?:Attempt;needsRetry?:boolean};
function canonical(v:unknown):string{if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';}
const same=(value:unknown,snapshot:string)=>canonical(value)===canonical(JSON.parse(snapshot));
function accepted(s:PlanSaveState,a:Attempt,revision:number){s.saved=a.snapshot;s.revision=revision;s.pending=undefined;}
async function resolveAttempt(s:PlanSaveState,request:PlanRequest){
 const a=s.pending!;
 // On a retry, first determine whether the previous uncertain write completed.
 const remote=await request();
 if(remote.revision===a.revision+1&&same(remote.data,a.snapshot)){accepted(s,a,remote.revision);return;}
 if(remote.revision!==a.revision||(remote.data===null?a.revision!==0:!same(remote.data,a.previous)))throw new PlanSyncError(messages[409],409);
 await writeAttempt(s,request);
}
async function writeAttempt(s:PlanSaveState,request:PlanRequest){
 const a=s.pending!;
 try{const result=await request({method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:JSON.parse(a.snapshot),revision:a.revision})});if(result.revision!==a.revision+1)throw new PlanSyncError('لم نستطع تأكيد رقم الحفظ. احتفظ بالصفحة مفتوحة وأعد المحاولة.');accepted(s,a,result.revision);}
 catch(e){
  if(e instanceof PlanSyncError&&e.status===409){const remote=await request();if(remote.revision===a.revision+1&&same(remote.data,a.snapshot)){accepted(s,a,remote.revision);return;}throw new PlanSyncError(messages[409],409);}
  // A known rejected request cannot have changed the stored payload.
  if(e instanceof PlanSyncError&&e.status>=400&&e.status<500)s.pending=undefined;
  throw e;
 }
}
export async function savePlanSnapshot(s:PlanSaveState,snapshot:string,request:PlanRequest=requestPlans){
 try{if(s.pending)await resolveAttempt(s,request);if(snapshot!==s.saved){s.pending={snapshot,previous:s.saved,revision:s.revision};await writeAttempt(s,request);}s.needsRetry=false;}
 catch(e){s.needsRetry=true;throw e;}
}
// Queued UI jobs read current state when they actually run, skipping snapshots
// superseded while the network was busy. An error pauses the queue until retry.
export async function saveLatestPlan(s:PlanSaveState,latest:()=>string,request:PlanRequest=requestPlans){
 if(s.needsRetry)return false;const snapshot=latest();if(snapshot===s.saved&&!s.pending)return false;await savePlanSnapshot(s,snapshot,request);return true;
}
