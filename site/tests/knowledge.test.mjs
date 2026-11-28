import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {builtInKnowledge,repositoryAnswer}=await import('../lib/knowledge-server.ts');
const {noteSchema,questionTopics,searchCards}=await import('../lib/knowledge.ts');
const trip={origin:'',date:'',month:'',mode:'dates',days:'',travelers:'',budget:'',currency:'',nationality:'',interests:[],selected:'country-CN'};
test('country repository coverage and China answers address requested topics without inventing price or visa',()=>{
 assert.equal(new Set(builtInKnowledge.map(c=>c.code)).size,120);
 const a=repositoryAnswer('أفضل وقت للزيارة وتجارب والتكلفة والتأشيرة',['CN'],trip,{},builtInKnowledge);
 assert.match(a.text,/بادالينغ/);assert.match(a.text,/مارس–مايو/);assert.match(a.text,/المدينة المحرمة/);assert.match(a.text,/لا توجد عروض/);assert.match(a.text,/لم نحدد حكم الدخول/);
 for(const c of a.citations){assert.match(a.text.slice(c.start,c.end),/المصدر|الفيديو/);assert.ok(c.url.startsWith('https://'));}
});
test('personal information remains marked unverified and archived notes do not enter answers',()=>{
 const n={id:'personal',code:'CN',topic:'food',title:'تجربة طعام',text:'طبق اختبار خاص',status:'personal',source:'',checked:'',archived:false,revision:1};
 assert.match(repositoryAnswer('الطعام',['CN'],trip,{},[n]).text,/غير متحققة/);
 assert.ok(!repositoryAnswer('الطعام',['CN'],trip,{},[{...n,archived:true}]).text.includes(n.text));
});
test('Arabic topic matching and saved note validation reject unsafe links and invalid dates',()=>{
 assert.ok(questionTopics('تَأشيرة وأَرخص وقت').includes('visa'));assert.ok(questionTopics('أَرخص وقت').includes('budget'));
 assert.ok(searchCards(builtInKnowledge,'بادالينغ','season').length);
 const note={id:crypto.randomUUID(),code:'CN',topic:'overview',title:'عنوان',text:'معلومة',source:'javascript:alert(1)',checked:'2026-02-30',revision:0,archived:false};
 assert.equal(noteSchema.safeParse(note).success,false);
 assert.equal(noteSchema.safeParse({...note,source:'https://example.com',checked:''}).success,true);
});
