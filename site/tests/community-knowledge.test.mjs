import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {communityKnowledge}=await import('../lib/community-knowledge.ts');
const {builtInKnowledge,repositoryAnswer}=await import('../lib/knowledge-server.ts');
const {retrieveLocalCards,localPrompt}=await import('../lib/browser-advisor.ts');
const trip={origin:'',date:'',month:'',mode:'dates',days:'',travelers:'',budget:'',currency:'',nationality:'سعودي',interests:[],selected:'country-CN'};

test('community requests retrieve reports by subject and never borrow another country',()=>{
 for(const q of ['وش تجارب الناس عن الدفع بالصين؟','تجارب المسافرين بالصين','وش يقول ريدت عن الصين؟']){
  const cards=retrieveLocalCards(builtInKnowledge,'CN',q).slice(0,3);
  assert.ok(cards.length,q);assert.ok(cards.some(c=>c.communityKind==='experience'),q);
  if(q.includes('الدفع'))assert.ok(cards[0].topic==='budget');
 }
 const guides=retrieveLocalCards(builtInKnowledge,'CN','ويكي فوياج مناخ بكين');
 assert.equal(guides[0].id,'community-CN-beijing-season');
 assert.ok(!retrieveLocalCards(builtInKnowledge,'JP','تجارب المسافرين').some(c=>c.code==='CN'));
});
test('traveler experiences cannot supply official visa or health answers',()=>{
 for(const q of ['تجارب المسافرين عن تأشيرة الصين','وش يقول ريدت عن الصحة في الصين؟']){
  const cards=retrieveLocalCards(builtInKnowledge,'CN',q);
  assert.ok(cards.length);assert.ok(cards.every(c=>c.sourceKind!=='community'));
 }
});
test('free answers and local prompts retain source type, authorship and reuse license',()=>{
 const answer=repositoryAnswer('ويكي فوياج مناخ بكين',['CN'],trip,{},builtInKnowledge);
 assert.match(answer.text,/دليل سفر جماعي/);assert.match(answer.text,/مساهمو Wikivoyage/);assert.match(answer.text,/CC BY-SA 4.0/);assert.match(answer.text,/creativecommons.org/);
 const reports=retrieveLocalCards(builtInKnowledge,'CN','تجارب الناس عن الدفع');
 const prompt=localPrompt(trip,'تجارب الناس عن الدفع',reports,[])[0].content;
 assert.match(prompt,/تجربة مسافر فردية/);assert.match(prompt,/رواية فردية/);assert.match(prompt,/u\//);
 for(const c of answer.citations)assert.match(answer.text.slice(c.start,c.end),/المصدر|الفيديو/);
});
test('built-in and exported cards retain attribution, and reports do not inherit the guide license',()=>{
 const stored=JSON.parse(JSON.stringify(builtInKnowledge)).filter(c=>c.sourceKind==='community');
 assert.equal(stored.length,communityKnowledge.length);assert.equal(new Set(stored.map(c=>c.id)).size,stored.length);
 for(const c of stored){assert.ok(c.attribution.author);assert.ok(c.source.startsWith('https://'));assert.equal(c.status,'editorial');
  if(c.communityKind==='guide'){assert.equal(c.attribution.license,'CC BY-SA 4.0');assert.match(c.attribution.historyUrl,/action=history/);}
  else {assert.equal(c.attribution.license,undefined);assert.match(c.sourcePublished,/^\d{4}-\d{2}-\d{2}$/);}
 }
});
