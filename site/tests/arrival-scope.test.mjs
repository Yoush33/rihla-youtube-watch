import {test} from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {retrieveLocalCards,localPrompt}=await import('../lib/browser-advisor.ts');const {builtInKnowledge,repositoryAnswer}=await import('../lib/knowledge-server.ts');const {arrivalKnowledge}=await import('../lib/arrival-knowledge.ts');const {countryExperiences}=await import('../lib/country-experiences.ts');
test('arrival references retain primary provenance and isolate Malaysian and Georgian cities',()=>{
 assert.equal(arrivalKnowledge.length,8);assert.equal(new Set(builtInKnowledge.map(c=>c.id)).size,builtInKnowledge.length);
 for(const c of arrivalKnowledge){assert.equal(c.checked,'2026-09-25');assert.equal(c.sourceKind,'operator');assert.ok(c.city);assert.match(c.source,/^https:/);assert.ok(c.sourcePublished);}
 const kl=retrieveLocalCards(builtInKnowledge,'MY','قطار مطار كوالالمبور');assert.ok(kl.some(c=>c.id==='arrival-my-kl-airport-rail'));assert.ok(!kl.some(c=>c.city==='tioman'));
 for(const [code,q,forbidden] of [['MY','مواصلات تيومان','kuala-lumpur'],['MY','مواصلات ماليزيا','kuala-lumpur'],['GE','إنترنت باتومي','tbilisi']])assert.ok(!retrieveLocalCards(builtInKnowledge,code,q).some(c=>c.city===forbidden));
 const tb=retrieveLocalCards(builtInKnowledge,'GE','إنترنت تبليسي');assert.ok(tb.some(c=>c.id==='arrival-ge-tbilisi-airport-wifi'));
});
test('an explicit city overrides recent context, while unnamed follow-ups retain it',()=>{
 assert.ok(retrieveLocalCards(builtInKnowledge,'MY','وش بعد؟','قطار كوالالمبور').some(c=>c.city==='kuala-lumpur'));
 assert.ok(!retrieveLocalCards(builtInKnowledge,'MY','كيف أدفع في تيومان؟',['قطار كوالالمبور']).some(c=>c.city==='kuala-lumpur'));
 const t={origin:'',mode:'dates',date:'',days:'',travelers:'',budget:'',currency:'',nationality:'',interests:[],pace:'متوازن',selected:'country-MY',costs:{},plans:{}};
 const answer=repositoryAnswer('مواصلات تيومان',['MY'],t,{trips:[t]},builtInKnowledge);assert.doesNotMatch(answer.text,/KLIA|KL Sentral/);
 const prompt=localPrompt(t,'بطاقة النقل في تبليسي',arrivalKnowledge.filter(c=>c.id==='arrival-ge-tbilisi-transport-card'),[])[0].content;assert.match(prompt,/2019-06-03/);assert.match(prompt,/أكد الشروط الحالية/);
});
test('every experience already offered in planning is available as an editorial reference',()=>{
 for(const [code,items] of Object.entries(countryExperiences))for(const item of items)assert.ok(builtInKnowledge.some(c=>c.code===code&&c.topic==='activities'&&c.title.includes(item.name)&&c.city===item.area&&c.source===item.source&&c.status==='editorial'&&!c.checked));
});
