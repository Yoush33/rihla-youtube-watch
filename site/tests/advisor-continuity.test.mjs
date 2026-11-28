import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {localTripContext,localPrompt,localRequestBasis,validateLocalAnswer,retrieveLocalCards}=await import('../lib/browser-advisor.ts');
const {builtInKnowledge}=await import('../lib/knowledge-server.ts');
const {offlineTrip}=await import('../lib/offline-trip.ts');
const {blankProfile}=await import('../lib/reliability-schema.ts');
const {newActivity}=await import('../lib/planning.ts');
const {reviewTrip}=await import('../lib/reliability.ts');
const trip=()=>({id:'continuity-test',name:'رحلة اختبار',origin:'الرياض',date:'2027-01-04',month:'',mode:'dates',days:'2',travelers:'2',budget:'5000',currency:'SAR',nationality:'سعودي',level:'متوسط',pace:'متوازن',interests:['الثقافة'],selected:'country-CN',compare:[],costs:{},plans:{'country-CN':[{title:'يوم اختبار',notes:'',activities:[{...newActivity(),title:'زيارة تجريبية',time:'19:00',duration:'60'}]}]},travelProfile:{...blankProfile,purpose:'business',passportType:'other',passportExpiry:'2026-12-31',residence:'إقامة أدخلها المستخدم',transitMode:'countries',transits:['AE']},reliability:{'country-CN':{dayStart:'08:00',dayEnd:'18:00'}}});

test('accommodation registration uses national registration guidance instead of airport or hotel comparisons',()=>{
 for(const q of ['كيف أسجل السكن إذا سكنت خارج الفندق في الصين؟ أجب باختصار مع المرجع.','وش تسجيل الإقامة في الصين؟','How do I register accommodation in China?']){
  const cards=retrieveLocalCards(builtInKnowledge,'CN',q).slice(0,3);
  assert.ok(cards.length,q);assert.ok(cards.some(c=>c.source.includes('en.nia.gov.cn')&&c.text.includes('24')),q);
  assert.ok(cards.every(c=>/تسجيل|يسجل|regist/.test(c.text+' '+c.title)),q);
  assert.ok(!cards.some(c=>/قطار المطار|نقطة بداية للمقارنة/.test(c.title)),q);
 }
});

test('model context includes user-entered entry details and keeps missing fields unknown',()=>{
 const t=trip(),context=localTripContext(t,'GE');
 assert.equal(context.discussionCountry,'GE');assert.equal(context.tripCountry,'CN');
 for(const k of ['purpose','passportType','passportExpiry','residence','transitMode','transits'])assert.deepEqual(context[k],t.travelProfile[k]);
 const empty=localTripContext({...t,travelProfile:undefined});
 assert.equal(empty.purpose,'');assert.equal(empty.passportType,'');assert.equal(empty.transitMode,'unknown');assert.deepEqual(empty.transits,[]);
 const prompt=localPrompt({...t,members:[{name:'PRIVATE MEMBER'}],bookings:[{note:'PRIVATE BOOKING'}]},'راجع متطلبات الدخول',[],[],'GE')[0].content;
 assert.ok(!prompt.includes('PRIVATE'));assert.match(prompt,/دولة الحديث قد تختلف/);
 const serialized=prompt.split('ملخص الرحلة: ')[1].split('\nالمراجع:')[0];assert.deepEqual(JSON.parse(serialized),context);
 const long=localPrompt({...t,origin:'س'.repeat(200),nationality:'ج'.repeat(200),travelProfile:{...t.travelProfile,residence:'ر'.repeat(200)}},'سؤال',[],[])[0].content;
 assert.equal(JSON.parse(long.split('ملخص الرحلة: ')[1].split('\nالمراجع:')[0]).transits[0],'AE');
});

test('answer request becomes stale after any relevant trip or entry detail changes',()=>{
 const t=trip(),basis=localRequestBasis(t,'CN');
 for(const patch of [{id:'other'},{selected:'country-GE'},{date:'2027-01-05'},{days:'3'},{nationality:'مصري'},{travelers:'3'},{budget:'1'},{currency:'USD'},{interests:['الطبيعة']},{pace:'هادئ'},{level:'اقتصادي'}])assert.notEqual(localRequestBasis({...t,...patch},'CN'),basis,JSON.stringify(patch));
 for(const patch of [{purpose:'tourism'},{passportType:'ordinary'},{passportExpiry:'2028-01-01'},{transitMode:'none'},{transits:['MY']},{residence:'جديدة'}])assert.notEqual(localRequestBasis({...t,travelProfile:{...t.travelProfile,...patch}},'CN'),basis);
 assert.notEqual(localRequestBasis(t,'GE'),basis);
 assert.equal(localRequestBasis({...t,name:'اسم جديد',browserChat:[{answer:'رد'}],members:[{name:'اسم'}]},'CN'),basis);
});

test('incomplete responses and nonexistent citations cannot become saved answers',()=>{
 for(const reason of ['length','content_filter',null,undefined])assert.throws(()=>validateLocalAnswer('راجع المصدر [1]',reason,1));
 for(const answer of ['','<think>internal only</think>','[0]','[4]','[٤]','[۴]','x'.repeat(6001)])assert.throws(()=>validateLocalAnswer(answer,'stop',3),answer.slice(0,20));
 assert.equal(validateLocalAnswer('<think>private reasoning</think> نص [1] [٢] [۳]','stop',3),'نص [1] [٢] [۳]');
 assert.equal(validateLocalAnswer('ما تاريخ سفرك؟','stop',3),'ما تاريخ سفرك؟');
});

test('offline pack contains dated prebooking findings and the selected destination references',()=>{
 const t=trip(),now=new Date('2026-09-26T12:00:00Z'),report=reviewTrip(t,'2026-09-26'),html=offlineTrip(t,now);
 assert.match(html,/id="review"/);assert.match(html,/id="references"/);assert.match(html,/تخص الوجهة المعتمدة/);assert.match(html,/2026-09-26T12:00:00.000Z/);
 assert.match(html,/يتجاوز بداية أو نهاية اليوم/);assert.match(html,/تاريخ إنشاء الملف لا يعني تحديث المراجع/);
 for(const c of report.checks.filter(c=>c.group!=='sources'))assert.ok(html.includes(c.detail.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))),c.id);
 assert.ok(report.sources.length>0);for(const s of report.sources)assert.ok(html.includes(s.checked));
 const older=offlineTrip(t,new Date('2027-09-26T12:00:00Z'));assert.match(older,/يحتاج إعادة مراجعة/);
});

test('offline review escapes injected notes and never embeds external resources',()=>{
 const t=trip();t.plans[t.selected][0].activities=[];
 t.reliability[t.selected].dayNotes={'0':'<img src=x onerror="alert(1)">'};
 const html=offlineTrip(t,new Date('2026-09-26T12:00:00Z'));
 assert.match(html,/&lt;img/);assert.ok(!/<script|<img|<iframe|<link|<video/i.test(html));assert.ok(html.includes("default-src 'none'"));
 const empty=offlineTrip({...t,selected:''});assert.match(empty,/لم تُعتمد وجهة/);assert.ok(!empty.includes('href="#references"'));
});
