import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {retrieveLocalCards,localPrompt,localEvidence,localRequestBasis,pendingLocalChat}=await import('../lib/browser-advisor.ts');
const {builtInKnowledge}=await import('../lib/knowledge-server.ts');
const {budgetScenario}=await import('../lib/journey-insights.ts');
const {validMoneyInput,minorAmount,exactActivityRate}=await import('../lib/money.ts');
const {commitDataChange}=await import('../lib/trip-update.ts');
const {itineraryChecks}=await import('../lib/reliability.ts');
const {newActivity,planSchemaVersion}=await import('../lib/planning.ts');
const trip=()=>({id:'final-audit',name:'اختبار نهائي',origin:'',date:'2028-01-04',month:'',mode:'dates',days:'2',travelers:'1',budget:'5000',currency:'SAR',nationality:'',level:'متوسط',pace:'متوازن',interests:[],selected:'country-CN',compare:[],costs:{},plans:{'country-CN':[]}});
const priced=(currency='SAR',amount='1')=>{const t=trip();t.currency=currency;t.costs[t.selected]={rooms:'1',...Object.fromEntries(['stay','food','transport','activities','flight'].flatMap(k=>[[k+'Low',amount],[k+'High',amount]]))};return t;};

test('all global changes reject disabled/conflicted saves and preserve their input',()=>{
 const data={schemaVersion:planSchemaVersion,activeId:'final-audit',trips:[trip()]},copy=structuredClone(data);
 const changes=[d=>({...d,activeId:'new',trips:[...d.trips,{...trip(),id:'new'}]}),d=>({...d,world:{CN:{visited:true,planned:true,notes:'',month:''}}}),d=>({...d,worldComparison:{codes:['CN'],month:'2028-01',sort:'interest'}})];
 for(const change of changes)for(const state of [{enabled:false,blocked:false},{enabled:true,blocked:true}])assert.throws(()=>commitDataChange(data,change,{...state,revision:1}),/استعد الحفظ/);
 assert.deepEqual(data,copy);
 assert.throws(()=>commitDataChange(data,d=>({...d,world:{CN:{notes:'中'.repeat(1_100_000)}}}),{enabled:true,blocked:false,revision:1}),/سعة الحفظ/);
 assert.deepEqual(data,copy);
 const next=commitDataChange(data,changes[0],{enabled:true,blocked:false,revision:1});assert.equal(next.activeId,'new');assert.equal(next.trips.length,2);
});
test('currency amounts and exact daily conversion never silently alter group cost',()=>{
 assert.equal(validMoneyInput('1.','SAR'),true);assert.equal(minorAmount('1.','SAR'),100);
 assert.equal(minorAmount('1.5','JPY'),null);assert.equal(minorAmount('1.001','KWD'),1001);
 assert.equal(exactActivityRate(['100','20'],'SAR',3,2),'20.00');
 assert.throws(()=>exactActivityRate(['1000'],'JPY',30,30),/دون تغيير قيمته/);
 assert.throws(()=>exactActivityRate(['1'],'SAR',30,30),/دون تغيير قيمته/);
 assert.throws(()=>exactActivityRate([''],'SAR',3,2),/أكمل/);
});
test('budget scenario rejects invalid currency amounts, overrides and extras',()=>{
 const invalid=priced('JPY','1.5');const r=budgetScenario(invalid,invalid.selected);assert.equal(r.complete,false);assert.equal(r.missing.length,5);assert.equal(r.high,0);
 const valid=priced('JPY');assert.equal(budgetScenario(valid,valid.selected).complete,true);assert.equal(budgetScenario(valid,valid.selected,2,'1.5','1.5').complete,false);
 valid.extras={[valid.selected]:[{planned:'1.5'}]};assert.equal(budgetScenario(valid,valid.selected).extraUnknown,true);assert.equal(budgetScenario(valid,valid.selected).complete,false);
 const kwd=priced('KWD','0.001');kwd.extras={[kwd.selected]:[{planned:'0.003'}]};assert.equal(budgetScenario(kwd,kwd.selected).high,0.011);assert.equal(budgetScenario(kwd,kwd.selected).complete,true);
});
test('explicit venues retrieve their own hours in the top three, overriding old city context',()=>{
 for(const [q,id,hours] of [['متى يفتح معبد السماء؟','cn-beijing-temple-heaven','08:00'],['متى يفتح متحف القصر؟','cn-beijing-palace-museum','08:30']]){
  const cards=retrieveLocalCards(builtInKnowledge,'CN',q,['أنشطة شنغهاي']).slice(0,3);assert.ok(cards.length,q);assert.ok(cards.every(c=>c.venueId===id));assert.match(cards[0].title,/نافذة الزيارة/);assert.ok(cards[0].text.includes(hours));
 }
});
test('actual museum top-three prompt preserves validity and excludes expired schedule',()=>{
 const t=trip(),cards=retrieveLocalCards(builtInKnowledge,'CN','متى آخر دخول متحف شنغهاي؟').slice(0,3);
 assert.ok(cards.length);assert.ok(cards.every(c=>c.validFrom==='2026-07-09'&&c.validUntil==='2027-11-14'));
 const p=localPrompt(t,'متى آخر دخول متحف شنغهاي؟',cards,[])[0].content;assert.match(p,/2026-07-09/);assert.match(p,/2027-11-14/);assert.match(p,/خارج نطاق/);assert.ok(!p.includes('09:00–17:00'));assert.ok(!p.includes('15:00'));
 t.date='2026-10-01';assert.match(localPrompt(t,'متى آخر دخول متحف شنغهاي؟',cards,[])[0].content,/09:00–17:00/);
 t.date='2027-11-14';assert.match(localEvidence(cards[0],t),/خارج نطاق/);
 t.date='bad';assert.doesNotThrow(()=>localEvidence(cards[0],t));
});
test('venue names preserve national visa evidence and resolve cities outside China',()=>{
 for(const q of ['هل أحتاج تأشيرة لزيارة معبد السماء؟','هل أحتاج جوازًا أو تأشيرة لزيارة متحف شنغهاي؟']){const cards=retrieveLocalCards(builtInKnowledge,'CN',q).slice(0,3);assert.equal(cards[0]?.topic,'visa');}
 for(const [code,q,id] of [['MY','متى يفتح متحف الفنون الإسلامية؟','kl-islamic-arts-museum'],['GE','متى يفتح متحف جورجيا؟','tbilisi-simon-janashia-museum']]){const cards=retrieveLocalCards(builtInKnowledge,code,q);assert.ok(cards.length);assert.ok(cards.every(c=>c.venueId===id));}
});
test('completed answer can save after unrelated edits, with no duplicate or changed-context reuse',()=>{
 const t=trip(),turn={id:'answer',country:'CN',question:'اختبار',answer:'جواب [1]',sources:[{title:'مرجع',url:'https://example.com',checked:'2026-09-26',text:'نص'}]},pending={turn,basis:localRequestBasis(t,'CN')};
 const edited={...t,plans:{[t.selected]:[{title:'يوم',notes:'ملاحظة جديدة'}]}};const saved=pendingLocalChat(edited,pending);assert.equal(saved[0],turn);assert.equal(edited.plans[t.selected][0].notes,'ملاحظة جديدة');assert.equal(pendingLocalChat({...edited,browserChat:saved},pending).length,1);
 assert.throws(()=>pendingLocalChat({...edited,date:'2028-01-05'},pending),/تغيّرت/);assert.throws(()=>pendingLocalChat({...edited,id:'other'},pending),/تغيّرت/);
});
test('same-day timed activity reservation drift is explicit without changing the plan',()=>{
 const t=trip(),a={...newActivity(),id:'a',title:'نشاط تجريبي',time:'14:00',duration:'60',bookingId:'b'};
 t.plans[t.selected]=[{title:'يوم',notes:'',activities:[a]}];t.bookings=[{id:'b',type:'activity',status:'confirmed',date:t.date,time:'15:00'}];
 const checks=()=>itineraryChecks(t,'2026-09-26');assert.ok(checks().some(c=>c.id==='booking-time-a'&&c.state==='conflict'));assert.equal(a.time,'14:00');
 t.bookings[0].time='14:00';assert.ok(!checks().some(c=>c.id==='booking-time-a'));
 t.bookings[0].time='';assert.ok(!checks().some(c=>c.id==='booking-time-a'));
 t.bookings[0].time='15:00';t.bookings[0].type='stay';assert.ok(!checks().some(c=>c.id==='booking-time-a'));
});
