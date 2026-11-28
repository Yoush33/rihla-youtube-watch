import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {videoCards,videoEvidenceSchema,videoLink}=await import('../lib/video-evidence.ts');
const {builtInKnowledge,repositoryAnswer}=await import('../lib/knowledge-server.ts');
const {noteSchema}=await import('../lib/knowledge.ts');
const base={url:'https://www.youtube.com/watch?v=syMm02MLAsg',publisher:'ناشر اختبار',basis:'visual',start:0,end:60,duration:600};
const card=(video=base,extra={})=>({...videoCards[0],video,...extra});
test('publisher descriptions retain unknown duration and no timing claim',()=>{
 assert.equal(videoCards.length,6);
 for(const c of videoCards.filter(c=>c.code==='JP')){assert.equal(c.video.duration,null);assert.equal(c.video.start,null);assert.ok(videoEvidenceSchema.safeParse(c.video).success);}
 assert.equal(videoEvidenceSchema.safeParse({...base,basis:'description'}).success,false);
});
test('invalid intervals, insecure URLs, missing source and dates are rejected',()=>{
 for(const v of [{...base,start:60,end:20},{...base,end:601},{...base,start:null},{...base,url:'javascript:alert(1)'},{...base,url:'https://user:password@example.org'}])assert.equal(videoEvidenceSchema.safeParse(v).success,false);
 const note={...card(),id:crypto.randomUUID(),status:'personal'};
 assert.ok(noteSchema.safeParse(note).success);
 assert.equal(noteSchema.safeParse({...note,checked:''}).success,false);
 assert.equal(noteSchema.safeParse({...note,source:''}).success,false);
 assert.match(videoLink({...base,start:30}),/t=30s/);
});
test('video-derived written notes actually enter advisor answers with provenance',()=>{
 const t={origin:'',date:'',month:'',mode:'dates',days:'',travelers:'',budget:'',currency:'',nationality:'',interests:[],selected:'country-JP'};
 const answer=repositoryAnswer('آداب القطار والمطاعم والتصوير',['JP'],t,{},builtInKnowledge);
 assert.match(answer.text,/آداب القطار والحافلة/);assert.match(answer.text,/شرح الناشر المكتوب/);assert.match(answer.text,/لا توقيت متحقق/);
 assert.ok(answer.sources.some(s=>s.url==='https://www.okayama-japan.jp/en/24343'));
 assert.ok(answer.sources.some(s=>s.url.includes('syMm02MLAsg')));
 for(const c of answer.citations)assert.match(answer.text.slice(c.start,c.end),/المصدر|الفيديو/);
});
test('China frame observations preserve their timestamps and source links',()=>{
 const cn=videoCards.filter(c=>c.code==='CN');assert.equal(cn.length,3);
 assert.deepEqual(cn.map(c=>c.video.start),[14,25,46]);
 for(const c of cn){assert.ok(videoEvidenceSchema.safeParse(c.video).success);assert.equal(c.video.end,null);assert.match(c.text,/لقطات ثابتة/);assert.match(c.video.publisher,/تجارية/);}
 assert.equal(videoEvidenceSchema.safeParse({...base,basis:'frame',end:null}).success,true);
 assert.equal(videoEvidenceSchema.safeParse({...base,basis:'frame'}).success,false);
 assert.equal(videoEvidenceSchema.safeParse({...base,basis:'frame',start:600,end:null}).success,false);
 const t={origin:'',date:'',month:'',mode:'dates',days:'',travelers:'',budget:'',currency:'',nationality:'',interests:[],selected:'country-CN'};
 // A broad answer now favors newer operator references. Verify the video-only
 // corpus path independently rather than pinning an old card into its top six.
 const a=repositoryAnswer('الدفع بالبطاقة وزيارة المعالم',['CN'],t,{},builtInKnowledge.filter(c=>c.video));
 assert.match(a.text,/Alipay/);assert.match(a.text,/رتّب المدينة المحرمة/);assert.match(a.text,/00:00:14/);
 assert.ok(a.sources.some(s=>s.url.includes('tiktok.com')));
});
