import {test} from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {retrieveLocalCards,localPrompt,appendDayNote,localModels}=await import('../lib/browser-advisor.ts');const {builtInKnowledge}=await import('../lib/knowledge-server.ts');const {browserTurnSchema}=await import('../lib/planning.ts');
test('follow-up references stay within the city, and explicit city overrides old context',()=>{const a=retrieveLocalCards(builtInKnowledge,'CN','وش بعد؟','مواصلات شنغهاي');assert.ok(a.length);assert.ok(a.every(c=>c.city==='shanghai'));const b=retrieveLocalCards(builtInKnowledge,'CN','طعام بكين','مواصلات شنغهاي');assert.ok(b.every(c=>c.city==='beijing'));assert.ok(b.some(c=>c.topic==='food'));});
test('national visa evidence outranks unrelated city cards, and missing topics remain empty',()=>{
 const cards=retrieveLocalCards(builtInKnowledge,'CN','هل أحتاج تأشيرة لشنغهاي؟');
 assert.ok(cards.length);assert.ok(cards.every(c=>c.topic==='visa'&&c.code==='CN'&&!c.city));
 assert.ok(cards.slice(0,3).every(c=>c.sourceKind==='official'&&new URL(c.source).hostname.endsWith('.gov.cn')&&c.checked==='2026-09-25'));
 const context=cards.slice(0,3).map(c=>c.text.slice(0,600)).join('\n');
 assert.match(context,/(?:٣١ ديسمبر ٢٠٢٦|31 ديسمبر 2026)/);assert.match(context,/(?:٣٠|30) يوم/);assert.match(context,/الجواز السعودي العادي/);assert.match(context,/لا (?:نفترض|يثبت|يُفترض)/);
 assert.deepEqual(retrieveLocalCards(builtInKnowledge.filter(c=>c.topic!=='visa'),'CN','تأشيرة شنغهاي'),[]);
});
test('structured follow-up history keeps the latest city and topic, including explicit comparisons',()=>{
 for(const [history,city] of [[['مواصلات بكين','طعام شنغهاي'],'shanghai'],[['طعام شنغهاي','مواصلات بكين'],'beijing']]){
  const cards=retrieveLocalCards(builtInKnowledge,'CN','طيب والطقس؟',history);assert.ok(cards.length);assert.ok(cards.every(c=>c.topic==='season'&&(!c.city||c.city===city)));assert.ok(!cards.some(c=>c.title.includes(city==='shanghai'?'بكين':'شنغهاي')));
 }
 const more=retrieveLocalCards(builtInKnowledge,'CN','وش بعد؟',['مواصلات بكين','طعام شنغهاي']);assert.ok(more.length);assert.ok(more.every(c=>c.city==='shanghai'&&c.topic==='food'));
 const comparison=retrieveLocalCards(builtInKnowledge,'CN','قارن الطعام في بكين وشنغهاي',['طعام غوانزو']);assert.ok(comparison.some(c=>c.city==='beijing'));assert.ok(comparison.some(c=>c.city==='shanghai'));
});
test('old numeric citations cannot point to newly numbered references',()=>{
 const cards=retrieveLocalCards(builtInKnowledge,'CN','طعام شنغهاي');
 const p=localPrompt({mode:'dates',date:'2027-01-01',nationality:'مصري'},'وطعامها؟',cards,[{question:'نقل شنغهاي',answer:'Longyang Road [1] [٢]'}]);
 assert.match(p[0].content,/\[1\]/);assert.match(p[0].content,/2027-01-01/);assert.match(p[0].content,/مصري/);assert.match(p[0].content,/لا تمدد إعفاء منتهيًا/);
 assert.match(p[2].content,/جواب سابق مولّد، وليس مرجعًا/);assert.doesNotMatch(p[2].content,/\[[\d٠-٩]+\]/);
});
test('local prompt uses bounded recent dialogue and excludes booking/private identity fields',()=>{const t={origin:'الرياض',date:'',mode:'dates',days:'5',travelers:'2',budget:'',currency:'SAR',interests:[],pace:'هادئ',members:[{name:'PRIVATE NAME'}],bookings:[{note:'PRIVATE BOOKING'}]};const h=Array.from({length:5},(_,i)=>({question:'question '+i,answer:'answer '+i}));const p=localPrompt(t,'رتب يومي',[],h);assert.equal(p.length,6);const text=JSON.stringify(p);assert.ok(!text.includes('PRIVATE'));assert.ok(!text.includes('question 0'));assert.match(text,/question 4/);assert.match(text,/لا مراجع مطابقة/);});
test('applying reviewed note preserves existing activities and rejects overflow and invalid day',()=>{const d=[{title:'الأول',notes:'قديم',activities:[{id:'a',title:'محفوظ'}]},{title:'الثاني',notes:''}];const r=appendDayNote(d,0,'جديد');assert.equal(r[0].notes,'قديم\n\nجديد');assert.equal(d[0].notes,'قديم');assert.deepEqual(r[0].activities,d[0].activities);assert.deepEqual(r[1],d[1]);assert.throws(()=>appendDayNote(d,3,'جديد'));assert.throws(()=>appendDayNote(d,0,'x'.repeat(2000)));});
test('saved local dialogue validates sizes and rejects executable or credential-bearing source links',()=>{const t={id:crypto.randomUUID(),question:'سؤال',answer:'جواب',at:new Date().toISOString(),model:localModels[0].id,country:'CN',sources:[{title:'مرجع',url:'https://example.org',text:'نص',checked:'2026-09-25'}]};assert.ok(browserTurnSchema.safeParse(t).success);for(const url of ['javascript:alert(1)','https://secret@example.org'])assert.ok(!browserTurnSchema.safeParse({...t,sources:[{...t.sources[0],url}]}).success);assert.ok(!browserTurnSchema.safeParse({...t,answer:'x'.repeat(6001)}).success);});
