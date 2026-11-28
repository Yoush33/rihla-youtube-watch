import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {questionTopics}=await import('../lib/knowledge.ts');
const {retrieveLocalCards}=await import('../lib/browser-advisor.ts');
const {reliabilityKnowledge}=await import('../lib/reliability-knowledge.ts');
const card=(id,patch={})=>({id,code:'GE',topic:'safety',title:'مرجع اختبار',text:'محتوى اختبار',source:'https://example.org/'+id,checked:'2026-09-25',status:'reference',revision:0,archived:false,...patch});

test('insurance queries address entry and safety without matching weather inside Georgia',()=>{
  for(const q of ['هل التأمين إلزامي في جورجيا؟','هل أحتاج تأمين في تبليسي؟','Is travel insurance required in Georgia?']){
    const topics=questionTopics(q);assert.ok(topics.includes('visa'));assert.ok(topics.includes('safety'));assert.ok(!topics.includes('season'),q);
  }
  assert.ok(!questionTopics('جورجيا').includes('season'));
  for(const q of ['كيف الجو في جورجيا؟','جو تبليسي','والجو في شنغهاي؟','أفضل وقت لزيارة جورجيا'])assert.ok(questionTopics(q).includes('season'),q);
});

test('museum admission and tickets stay with activities while explicit passport or visa requirements remain distinct',()=>{
  for(const q of ['متى آخر دخول متحف شنغهاي؟','وقت دخول متحف شنغهاي','هل أحتاج حجز تذكرة لمتحف شنغهاي؟','Shanghai museum opening hours']){
    const topics=questionTopics(q);assert.ok(topics.includes('activities'),q);assert.ok(!topics.includes('visa'),q);assert.ok(!topics.includes('season'),q);
  }
  for(const q of ['هل أحتاج تأشيرة لشنغهاي؟','متطلبات دخول الصين','هل أحتاج جوازًا أو تأشيرة لزيارة متحف شنغهاي؟'])assert.ok(questionTopics(q).includes('visa'),q);
});

test('Georgia insurance retrieval surfaces the reviewed policy rather than unrelated city safety or seasons',()=>{
  const cards=[card('city-internet',{city:'tbilisi',title:'تبليسي · الإنترنت',text:'الاتصال والإنترنت في تبليسي'}),card('old-generic-visa',{topic:'visa',title:'جورجيا · متطلبات الدخول',text:'راجع التأمين في جورجيا',checked:'2025-01-01'}),...reliabilityKnowledge];
  for(const q of ['هل التأمين إلزامي في جورجيا؟','هل أحتاج تأمين في تبليسي؟']){
    const found=retrieveLocalCards(cards,'GE',q);assert.ok(found.length);assert.ok(found.every(c=>c.code==='GE'&&['visa','safety'].includes(c.topic)));
    assert.ok(!found.some(c=>c.id==='city-internet'));
    assert.equal(found[0].sourceKind,'official');assert.equal(found[0].checked,'2026-09-25');assert.match(found[0].text,/30,000/);assert.match(found[0].text,/2026/);assert.match(found[0].title,/التأمين/);
  }
});

test('Shanghai museum admission retrieves city-specific venue facts and never substitutes visa records',()=>{
  const found=retrieveLocalCards(reliabilityKnowledge,'CN','متى آخر دخول متحف شنغهاي؟',['تأشيرة بكين']);
  assert.ok(found.length);assert.ok(found.every(c=>c.topic==='activities'&&c.city==='shanghai'));
  assert.ok(found.some(c=>/دخول/.test(c.text)));assert.ok(found.every(c=>c.sourceKind==='official'));
  assert.deepEqual(retrieveLocalCards(reliabilityKnowledge.filter(c=>c.topic==='visa'),'CN','متى آخر دخول متحف شنغهاي؟'),[]);
});

test('equally relevant sources prefer primary provenance then a newer review without relying on record ID prefixes',()=>{
  const text='التأمين الصحي للسائح في جورجيا',title='جورجيا · التأمين الصحي';
  const old=card('old-official',{topic:'visa',title,text,sourceKind:'official',checked:'2025-01-01'}),current=card('ordinary-id',{topic:'visa',title,text,sourceKind:'official'}),personal=card('review-entry-promoted-looking-id',{topic:'visa',title,text,status:'personal',checked:'2026-09-26'});
  assert.equal(retrieveLocalCards([old,personal,current],'GE','التأمين في جورجيا')[0].id,current.id);
  const restaurant=card('ordinary-food',{city:'tbilisi',topic:'food',title:'مطاعم تبليسي',text:'مطاعم تبليسي وتجارب الطعام'}),unrelated=card('review-practical-new',{topic:'food',title:'عادات الزيارة',text:'آداب التعامل المحلية',sourceKind:'official'});
  assert.equal(retrieveLocalCards([unrelated,restaurant],'GE','مطاعم تبليسي')[0].id,restaurant.id);
});

test('current explicit city and topic override history while an unnamed follow-up retains relevant insurance context',()=>{
  const tb=card('tb-insurance',{city:'tbilisi',title:'تبليسي · التأمين',text:'مرجع التأمين في تبليسي'}),ba=card('ba-insurance',{city:'batumi',title:'باتومي · التأمين',text:'مرجع التأمين في باتومي'}),season=card('ba-weather',{city:'batumi',topic:'season',title:'طقس باتومي',text:'مناخ باتومي'});
  const next=retrieveLocalCards([tb,ba,season],'GE','وش بعد؟',['تأمين تبليسي']);assert.ok(next.some(c=>c.id===tb.id));assert.ok(!next.some(c=>c.id===ba.id));
  const explicit=retrieveLocalCards([tb,ba,season],'GE','هل أحتاج تأمين في باتومي؟',['تأمين تبليسي']);assert.ok(explicit.some(c=>c.id===ba.id));assert.ok(!explicit.some(c=>c.id===tb.id));
  assert.deepEqual(retrieveLocalCards([tb,ba,season],'GE','طيب والطقس؟',['تأمين باتومي']).map(c=>c.id),[season.id]);
});

test('specific insurance questions remain empty when only unrelated safety facts exist',()=>{
  const wifi=card('wifi',{city:'tbilisi',text:'إنترنت تبليسي',title:'الإنترنت في تبليسي'});
  assert.deepEqual(retrieveLocalCards([wifi],'GE','هل أحتاج تأمين في تبليسي؟'),[]);
  assert.deepEqual(retrieveLocalCards([card('archived',{title:'التأمين',archived:true})],'GE','التأمين في جورجيا'),[]);
});
