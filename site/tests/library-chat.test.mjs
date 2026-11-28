import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {libraryChatAnswer}=await import('../lib/library-chat.ts');
const {pendingLocalChat}=await import('../lib/browser-advisor.ts');
const {localRequestBasis}=await import('../lib/browser-advisor.ts');
const {browserTurnSchema}=await import('../lib/planning.ts');
const {communityKnowledge}=await import('../lib/community-knowledge.ts');
const t={id:'test',selected:'country-CN',nationality:'',mode:'dates',date:'2026-10-12',days:'4',interests:[]};
const card={id:'test-fact',code:'CN',topic:'activities',title:'مرجع اختبار',text:'معلومة محفوظة للاختبار فقط.',source:'https://example.org/fact',checked:'2026-09-26',status:'reference',revision:0,archived:false};
test('free chat cites only active matching references and identifies extracted rather than generated prose',()=>{
 const r=libraryChatAnswer(t,'CN',[{...card,code:'JP'},{...card,archived:true},card,...Array.from({length:4},(_,i)=>({...card,id:String(i),title:'مرجع '+i}))]);
 assert.equal(r.sources.length,3);assert.match(r.answer,/دون توليد نص/);assert.match(r.answer,/\[3\]/);assert.ok(!r.answer.includes('[4]'));
 assert.throws(()=>libraryChatAnswer(t,'CN',[{...card,code:'JP'}]),/لا توجد/);
});
test('a reference outside the trip date never supplies its obsolete opening window',()=>{
 const r=libraryChatAnswer(t,'CN',[{...card,text:'EXPIRED_OPENING_WINDOW',validUntil:'2026-09-01'}]);assert.ok(!r.answer.includes('EXPIRED_OPENING_WINDOW'));assert.match(r.answer,/خارج نطاق/);
});
test('Saudi visa references are not applied to missing, different or negated nationality',()=>{
 for(const nationality of ['', 'كويتي','لست سعودي']){const r=libraryChatAnswer({...t,nationality},'CN',[{...card,topic:'visa',text:'SAUDI_ONLY_RULE'}]);assert.ok(!r.answer.includes('SAUDI_ONLY_RULE'));assert.equal(r.sources.length,0);assert.match(r.answer,/لم نطبق/);}
 const sa=libraryChatAnswer({...t,nationality:'سعودي'},'CN',[{...card,topic:'visa'}]);assert.equal(sa.sources.length,1);assert.match(sa.answer,/ليس تأكيد أهلية/);
});
test('community extracts retain attribution and license rather than becoming official claims',()=>{
 const guide=communityKnowledge.find(c=>c.communityKind==='guide'&&c.code==='CN');const r=libraryChatAnswer(t,'CN',[guide]);assert.ok(r.answer.includes(guide.attribution.license));assert.ok(r.answer.includes(guide.attribution.author));assert.match(r.answer,/دليل سفر جماعي/);
});
test('free replies use existing saved chat format and preserve unrelated turns without duplicate saving',()=>{
 const result=libraryChatAnswer(t,'CN',[card]),turn={id:crypto.randomUUID(),question:'سؤال اختبار',...result,at:new Date().toISOString(),model:'repository-extract-v1',country:'CN'};
 assert.ok(browserTurnSchema.safeParse(turn).success);const before=structuredClone(t),pending={turn,basis:localRequestBasis(t,'CN')};const saved=pendingLocalChat(t,pending);assert.deepEqual(t,before);assert.equal(saved.length,1);assert.equal(pendingLocalChat({...t,browserChat:saved},pending).length,1);
 assert.throws(()=>pendingLocalChat({...t,date:'2026-11-01'},pending),/تغيّرت/);
});
