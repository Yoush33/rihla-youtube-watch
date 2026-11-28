import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {chinaKnowledge,chinaCities,chinaSources,chinaQuestionCities}=await import('../lib/china-knowledge.ts');
const {builtInKnowledge,repositoryAnswer}=await import('../lib/knowledge-server.ts');
const trip={origin:'',date:'',month:'',mode:'dates',days:'',travelers:'',budget:'',currency:'',nationality:'',interests:[],selected:'country-CN'};
test('China batch has 102 distinct written cards with provenance across six cities',()=>{
 assert.equal(chinaKnowledge.length,102);assert.equal(new Set(chinaKnowledge.map(c=>c.id)).size,102);assert.equal(new Set(chinaKnowledge.map(c=>c.text)).size,102);
 for(const city of chinaCities)assert.ok(chinaKnowledge.filter(c=>c.city===city.id).length>=14);
 for(const c of chinaKnowledge){assert.ok(Object.values(chinaSources).some(s=>s.url===c.source));assert.ok(c.source.startsWith('https://'));assert.equal(c.checked,'2026-09-25');assert.ok(c.sourcePublished);assert.equal(c.video,undefined);assert.equal(builtInKnowledge.filter(k=>k.id===c.id).length,1);}
});
test('city-specific answers do not use a different city and retain source dates/citation offsets',()=>{
 const a=repositoryAnswer('مواصلات شنغهاي',['CN'],trip,{},builtInKnowledge);
 assert.match(a.text,/ماغليف/);assert.doesNotMatch(a.text,/بكين|الباندا|T3/);assert.match(a.text,/2026-06-30/);
 for(const c of a.citations)assert.match(a.text.slice(c.start,c.end),/^\[المصدر \d+\]$/);
 const b=repositoryAnswer('طعام Guangzhou',['CN'],trip,{},builtInKnowledge);assert.match(b.text,/Yum cha/);assert.doesNotMatch(b.text,/شياولونغباو/);
});
test('Arabic and English aliases scope cities; comparison preserves both requested cities',()=>{
 assert.deepEqual(chinaQuestionCities('قارن بكين و Shanghai'),['beijing','shanghai']);assert.deepEqual(chinaQuestionCities('قوانزو'),['guangzhou']);
 const a=repositoryAnswer('طعام بكين وشنغهاي',['CN'],trip,{},builtInKnowledge);assert.match(a.text,/نيُوجي/);assert.match(a.text,/شياولونغباو/);
});
test('unknown facts stay unknown and a city question cannot invent a visa or live price',()=>{
 const a=repositoryAnswer('تأشيرة غوانزو والتكلفة',['CN'],trip,{},builtInKnowledge);assert.match(a.text,/لم نحدد حكم الدخول/);assert.match(a.text,/لا توجد عروض طيران أو سكن حية/);
 const b=repositoryAnswer('موسم تشنغدو',['CN'],trip,{},chinaKnowledge);assert.doesNotMatch(b.text,/أرخص شهر/);assert.match(b.text,/الباندا/);
});
