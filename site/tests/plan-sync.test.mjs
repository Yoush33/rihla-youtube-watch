import {test} from 'node:test';
import assert from 'node:assert/strict';
const {requestPlans,PlanSyncError,savePlanSnapshot,saveLatestPlan}=await import('../lib/plan-sync.ts');
const json=JSON.stringify;
const initial=json({trips:[{name:'أصلية',notes:'لا تضيع'}]}),next=json({trips:[{name:'معدلة',notes:'لا تضيع'}]});
const state=()=>({revision:3,saved:initial});
const response=(data,status=200)=>new Response(json(data),{status,headers:{'Content-Type':'application/json'}});
test('deadline bounds both a hanging network and a hanging response body, and aborts the request',async()=>{
 for(const bodyOnly of [false,true]){let signal;const fetcher=async(_url,init)=>{signal=init.signal;return bodyOnly?{ok:true,json:()=>new Promise(()=>{})}:new Promise(()=>{});};
  await assert.rejects(requestPlans({},fetcher,20),e=>e instanceof PlanSyncError&&/طويلًا/.test(e.message));assert.equal(signal.aborted,true);
 }
});
test('load and save replies require a revision and retain actionable authentication or outdated-client errors',async()=>{
 const ok=await requestPlans({},async()=>response({data:null,revision:0}),100);assert.deepEqual(ok,{data:null,revision:0});
 for(const v of [{revision:1},{data:null,revision:'1'},{data:null,revision:-1}])await assert.rejects(requestPlans({},async()=>response(v),100));
 for(const status of [401,409,413,426,503])await assert.rejects(requestPlans({method:'PUT'},async()=>response({},status),100),e=>e.status===status&&e.blocked===[409,426].includes(status));
});
test('success advances exactly one revision and unchanged state performs no write',async()=>{
 const s=state(),calls=[];await savePlanSnapshot(s,next,async init=>{calls.push(JSON.parse(init.body));return {revision:4};});assert.equal(s.saved,next);assert.equal(s.revision,4);assert.equal(s.pending,undefined);
 assert.equal(await saveLatestPlan(s,()=>next,async()=>{throw Error('unexpected');}),false);assert.equal(calls.length,1);assert.equal(calls[0].revision,3);
});
test('lost acknowledgement is reconciled before saving newer edits, without duplicating the committed write',async()=>{
 const s=state(),latest=json({trips:[{name:'الأحدث',notes:'لا تضيع'}]});
 await assert.rejects(savePlanSnapshot(s,next,async()=>{throw new PlanSyncError('timeout');}));assert.equal(s.saved,initial);assert.equal(s.pending.snapshot,next);
 const calls=[];await savePlanSnapshot(s,latest,async init=>{calls.push(init?.method||'GET');if(!init)return {data:JSON.parse(next),revision:4};assert.equal(JSON.parse(init.body).revision,4);return {revision:5};});
 assert.deepEqual(calls,['GET','PUT']);assert.equal(s.saved,latest);assert.equal(s.revision,5);assert.equal(s.needsRetry,false);
});
test('an uncertain uncommitted write is retried with its original revision before the latest snapshot',async()=>{
 const s=state(),latest=json({trips:[{name:'أحدث'}]});await assert.rejects(savePlanSnapshot(s,next,async()=>{throw Error('offline');}));
 const sent=[];await savePlanSnapshot(s,latest,async init=>{if(!init)return {revision:3,data:JSON.parse(initial)};const p=JSON.parse(init.body);sent.push(p);return {revision:p.revision+1};});
 assert.deepEqual(sent.map(p=>p.revision),[3,4]);assert.deepEqual(sent.map(p=>p.data),[JSON.parse(next),JSON.parse(latest)]);assert.equal(s.saved,latest);
});
test('late previous completion may produce a conflict but identical payload and exact next revision recover safely',async()=>{
 const s=state();await savePlanSnapshot(s,next,async init=>{if(init)throw new PlanSyncError('conflict',409);return {revision:4,data:JSON.parse(next)};});assert.equal(s.saved,next);assert.equal(s.revision,4);
 for(const remote of [{revision:4,data:{trips:[{name:'تعديل نافذة أخرى'}]}},{revision:5,data:JSON.parse(next)}]){const x=state();await assert.rejects(savePlanSnapshot(x,next,async init=>{if(init)throw new PlanSyncError('conflict',409);return remote;}),e=>e.blocked);assert.equal(x.saved,initial);}
});
test('a remote change during retry cannot be overwritten; JSON object key ordering is irrelevant',async()=>{
 const s={revision:0,saved:json({a:0,b:0})},desired=json({a:1,b:2});await assert.rejects(savePlanSnapshot(s,desired,async()=>{throw Error('network');}));
 await savePlanSnapshot(s,desired,async init=>{assert.equal(init,undefined);return {revision:1,data:{b:2,a:1}};});assert.equal(s.saved,desired);
 const x=state();await assert.rejects(savePlanSnapshot(x,next,async()=>{throw Error('network');}));await assert.rejects(savePlanSnapshot(x,next,async init=>{assert.equal(init,undefined);return {revision:4,data:{different:true}};}),e=>e.blocked);assert.equal(x.saved,initial);
});
test('many queued changes coalesce to the latest snapshot, and a failed queue pauses until explicit retry',async()=>{
 const s=state(),writes=[];let latest=next,release;const first=new Promise(resolve=>{release=resolve;});
 const request=async init=>{const p=JSON.parse(init.body);writes.push(p);if(writes.length===1)await first;return {revision:p.revision+1};};
 let queue=saveLatestPlan(s,()=>latest,request);await Promise.resolve();latest=json({trips:[{name:'التعديل الأخير'}]});for(let i=0;i<20;i++)queue=queue.then(()=>saveLatestPlan(s,()=>latest,request));release();await queue;
 assert.equal(writes.length,2);assert.equal(s.saved,latest);assert.deepEqual(writes.map(w=>w.revision),[3,4]);
 const x=state();let attempts=0;await assert.rejects(saveLatestPlan(x,()=>next,async()=>{attempts++;throw new PlanSyncError('offline');}));for(let i=0;i<20;i++)assert.equal(await saveLatestPlan(x,()=>latest,async()=>{attempts++;}),false);assert.equal(attempts,1);assert.equal(x.saved,initial);
});
test('known rejected writes and malformed acknowledgements never become a successful saved status',async()=>{
 const s=state();await assert.rejects(savePlanSnapshot(s,next,async()=>{throw new PlanSyncError('old client',426);}),e=>e.blocked);assert.equal(s.saved,initial);assert.equal(s.pending,undefined);assert.equal(s.needsRetry,true);
 const x=state();await assert.rejects(savePlanSnapshot(x,next,async()=>({revision:20})));assert.equal(x.saved,initial);assert.equal(x.pending.snapshot,next);
});
