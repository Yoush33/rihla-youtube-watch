import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';

// Same native TypeScript + JSON hooks as the Site's existing test suite.
registerHooks({
  resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},
  load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}
});
const root='../lib/';
const {parseBackup,restoreTripCopies,worldRestorePreview,validPlanReferences,backupFileLimit}=await import(root+'backup.ts');
const {dataSchema,activitySchema,bookingSchema,expenseSchema,extraSchema,newActivity,planSchemaVersion}=await import(root+'planning.ts');
const {validMoneyInput,minorAmount,moneyDigits}=await import(root+'money.ts');
const {bookingToActivity,splitLedger}=await import(root+'trip-tools.ts');
const fixedUuid='ffba0912-c919-4b56-a21d-f3ddcba99a8b';
function booking(){return {id:'booking-1',type:'stay',title:'الفندق',provider:'المزوّد',date:'2026-10-01',endDate:'2026-10-03',time:'15:00',location:'شنغهاي',url:'https://example.org/booking',note:'نص الحجز',status:'confirmed'};}
function trip(id='trip-a'){
  const a={...newActivity(),id:'activity-1',bookingId:'booking-1',title:'زيارة',notes:'نص عربي محفوظ',cost:'0'};
  return {id,name:'رحلة الاختبار',origin:'الرياض',date:'2026-10-01',month:'',mode:'dates',days:'3',travelers:'2',budget:'1000',currency:'KWD',nationality:'سعودي',level:'متوسط',pace:'هادئ',interests:['الثقافة'],selected:'country-CN',compare:['country-CN'],costs:{'country-CN':{rooms:'1',stayLow:'40',stayHigh:'60'}},plans:{'country-CN':[{title:'اليوم الأول',notes:'ملاحظة اليوم',activities:[a]}]},ideas:{'country-CN':[{...newActivity(),id:'idea-1',title:'فكرة'}]},expenses:{'country-CN':[{id:'expense-1',title:'عشاء',category:'food',amount:'1.234',date:'2026-10-01',note:'بالفلس',shared:{payer:'member-a',people:['member-a','member-b']}}]},extras:{'country-CN':[{id:'extra-1',title:'رسوم',category:'fees',planned:'0.123'}]},bookings:[booking()],members:[{id:'member-a',name:'أ'},{id:'member-b',name:'ب'}],packing:[{id:'pack-1',title:'شاحن',quantity:1,packed:true,note:'محفوظ'}],checklist:[{id:'check-1',title:'تجهيز',status:'done',note:'لا تمسح',dueDate:'2026-09-29'}],countryCities:['شنغهاي'],advisor:{entry:'all',seasonOnly:false,savedOnly:true},researchPrefs:{min:15,max:28,rain:4,avoidVisited:true},browserChat:[{id:fixedUuid,question:'السؤال',answer:'الجواب [1]',at:'2026-09-25T12:00:00.000Z',model:'local-model',country:'CN',sources:[{title:'المرجع',url:'https://example.org/source',checked:'2026-09-25',text:'النص الموثق'}]}]};
}
function data(id='trip-a'){return {schemaVersion:planSchemaVersion,activeId:id,trips:[trip(id)],world:{CN:{visited:false,planned:true,month:'10',notes:'ذاكرة الصين'}},worldComparison:{codes:['CN','JP'],month:'10',sort:'season'}};}
const stringify=JSON.stringify;
const bytes=v=>new TextEncoder().encode(typeof v==='string'?v:stringify(v)).length;

test('complete current backup round-trips all optional fields without dropping data',()=>{
  const input=data(); assert.deepEqual(parseBackup(stringify(input)),input);
});
test('legacy versions load without rounding historical invalid-for-currency amounts',()=>{
  for(const schemaVersion of [undefined,1,3,4,7,8,11]){
    const input=data();if(schemaVersion===undefined)delete input.schemaVersion;else input.schemaVersion=schemaVersion;
    input.trips[0].currency='JPY';input.trips[0].expenses['country-CN'][0].amount='1.25';input.trips[0].extras['country-CN'][0].planned='1.';
    input.trips[0].costs['country-CN'].foodLow='unpriced';input.trips[0].costs['country-CN'].stayLow='-4';
    const parsed=parseBackup(stringify(input));assert.equal(parsed.schemaVersion,planSchemaVersion);assert.deepEqual(parsed.trips,input.trips);
  }
});
test('future versions, unsupported fields and malformed input are rejected',()=>{
  for(const version of [0,planSchemaVersion+1,'8',null,1.5])assert.throws(()=>parseBackup(stringify({...data(),schemaVersion:version})));
  assert.throws(()=>parseBackup(stringify({...data(),unknownPreference:'do not drop'})));
  const nested=data();nested.trips[0].plans['country-CN'][0].unknownNote='do not drop';assert.throws(()=>parseBackup(stringify(nested)));
  for(const text of ['{','null','[]','42'])assert.throws(()=>parseBackup(text));
});
test('backup validates active ID, duplicate trips, destination and country references',()=>{
  const broken=[()=>({...data(),activeId:'missing'}),()=>{const d=data();d.trips.push(structuredClone(d.trips[0]));return d;},()=>{const d=data();d.trips[0].selected='country-ZZ';return d;},()=>{const d=data();d.trips[0].plans.unknown=[];return d;},()=>({...data(),world:{ZZ:{visited:false,planned:false,month:'',notes:''}}})];
  for(const make of broken)assert.throws(()=>parseBackup(stringify(make())));
  const dangerous=stringify(data()).replace('"rooms":"1"','"constructor":"bad","rooms":"1"');assert.throws(()=>parseBackup(dangerous));
});
test('file size limit counts UTF-8 bytes and accepts ordinary pretty export',()=>{
  assert.deepEqual(parseBackup(JSON.stringify(data(),null,2)),data());
  const tooBig=' '.repeat(backupFileLimit+1);assert.throws(()=>parseBackup(tooBig),/٢٠/);
  // Arabic input is below the character limit but over the byte limit.
  const unicode='ع'.repeat(Math.floor(backupFileLimit/2)+1);assert.ok(unicode.length<backupFileLimit);assert.throws(()=>parseBackup(unicode),/٢٠/);
});
test('restore creates independent copies while retaining existing trips and nested references',()=>{
  const current=data('same-id'),incoming=data('same-id');incoming.trips[0].plans['country-CN'][0].notes='من النسخة';
  const before=stringify(current),sourceBefore=stringify(incoming);
  const merged=restoreTripCopies(current,incoming,['same-id'],false,2,()=> 'restored-1');
  assert.equal(stringify(current),before);assert.equal(stringify(incoming),sourceBefore);assert.deepEqual(merged.trips[0],current.trips[0]);
  assert.equal(merged.activeId,'restored-1');assert.equal(merged.trips[1].id,'restored-1');
  const {id:oldId,name:oldName,...oldFields}=incoming.trips[0];const {id:newId,name:newName,...newFields}=merged.trips[1];assert.deepEqual(newFields,oldFields);
  assert.equal(merged.trips[1].plans['country-CN'][0].activities[0].bookingId,merged.trips[1].bookings[0].id);
  assert.ok(merged.trips[1].members.some(m=>m.id===merged.trips[1].expenses['country-CN'][0].shared.payer));
  assert.ok(dataSchema.safeParse(merged).success);assert.ok(validPlanReferences(merged));
  merged.trips[1].browserChat[0].sources[0].text='new';assert.equal(incoming.trips[0].browserChat[0].sources[0].text,'النص الموثق');
});
test('restore never truncates a valid 200-character original trip name',()=>{
  const incoming=data('incoming');incoming.trips[0].name='ر'.repeat(199)+'خ';
  const merged=restoreTripCopies(data('current'),incoming,['incoming'],false,0,()=> 'restored-long-name');
  assert.ok(merged.trips[1].name.includes(incoming.trips[0].name),'Restoring must not discard the tail of the original trip name to add a label');
  assert.ok(dataSchema.safeParse(merged).success);
});
test('restore selection, ID collisions, and trip capacity fail without partial mutation',()=>{
  const current=data('existing'),source=data('incoming'),before=stringify(current);
  for(const ids of [[],['missing'],['incoming','incoming']])assert.throws(()=>restoreTripCopies(current,source,ids,false,0));
  assert.throws(()=>restoreTripCopies(current,source,['incoming'],false,0,()=> 'existing'));
  const full={...current,trips:Array.from({length:50},(_,i)=>({...trip('old-'+i)})),activeId:'old-0'};
  assert.throws(()=>restoreTripCopies(full,source,['incoming'],false,0));assert.equal(stringify(current),before);
  const oneSlot={...full,trips:full.trips.slice(0,49)};
  assert.equal(restoreTripCopies(oneSlot,source,['incoming'],false,0,()=> 'fiftieth').trips.length,50);
});
test('restore preserves existing global memories and comparison while opt-in adds only new countries',()=>{
  const current=data('existing'),source=data('incoming');source.world.CN.notes='متعارضة';source.world.JP={visited:true,planned:false,month:'4',notes:'يابان'};source.worldComparison={codes:['JP'],month:'4',sort:'interest'};
  assert.deepEqual(worldRestorePreview(current,source),{added:['JP'],kept:['CN']});
  const without=restoreTripCopies(current,source,['incoming'],false,0,()=> 'copy-a');assert.deepEqual(without.world,current.world);
  const withNew=restoreTripCopies(current,source,['incoming'],true,0,()=> 'copy-b');assert.deepEqual(withNew.world.CN,current.world.CN);assert.deepEqual(withNew.world.JP,source.world.JP);assert.deepEqual(withNew.worldComparison,current.worldComparison);
});
test('restore enforces combined UTF-8 request size, including account data, not just source file',()=>{
  function large(id){const t=trip(id);t.plans['country-CN']=Array.from({length:14},(_,i)=>({title:'اليوم '+i,notes:'',activities:Array.from({length:30},(_,j)=>({...newActivity(),id:`${i}-${j}`,notes:'ع'.repeat(2000)}))}));return {...data(id),trips:[t]};}
  const current=large('existing'),source=large('incoming');assert.ok(dataSchema.safeParse(current).success);assert.ok(dataSchema.safeParse(source).success);
  assert.ok(bytes({data:current,revision:1})<3_000_000);assert.ok(bytes({data:source,revision:1})<3_000_000);
  const before=stringify(current);assert.throws(()=>restoreTripCopies(current,source,['incoming'],false,1,()=> 'copy-big'),/سعة الحفظ/);assert.equal(stringify(current),before);
});
test('KWD three-place amounts survive all storage positions and conserve split balances',()=>{
  assert.equal(moneyDigits('KWD'),3);assert.equal(validMoneyInput('1.234','KWD'),true);assert.equal(minorAmount('1.234','KWD'),1234);
  const t=trip();assert.equal(expenseSchema.safeParse(t.expenses['country-CN'][0]).success,true);assert.equal(extraSchema.safeParse(t.extras['country-CN'][0]).success,true);assert.equal(activitySchema.safeParse({...newActivity(),cost:'1.234'}).success,true);
  const restored=parseBackup(stringify(data())).trips[0];assert.equal(restored.expenses['country-CN'][0].amount,'1.234');const split=splitLedger(restored);assert.equal(split.included.length,1);assert.equal(split.balances.reduce((n,b)=>n+b.amount,0),0);assert.equal(split.scale,1000);
});
test('new JPY/SAR precision is rejected but legacy JPY fractions remain loadable and excluded',()=>{
  assert.equal(validMoneyInput('1.25','JPY'),false);assert.equal(minorAmount('1.25','JPY'),null);assert.equal(validMoneyInput('1.234','SAR'),false);assert.equal(validMoneyInput('1.23','SAR'),true);
  const legacy=data();legacy.trips[0].currency='JPY';legacy.trips[0].expenses['country-CN'][0].amount='1.25';const parsed=parseBackup(stringify(legacy));assert.equal(parsed.trips[0].expenses['country-CN'][0].amount,'1.25');assert.equal(splitLedger(parsed.trips[0]).included.length,0);
});
test('money distinguishes blank/zero and enforces sign, exponent, upper bound and excessive precision',()=>{
  assert.equal(validMoneyInput('','KWD'),true);assert.equal(minorAmount('','KWD'),null);assert.equal(minorAmount('0','KWD'),0);
  for(const value of ['-1','1e2','1000000000.001','1.2345'])assert.equal(validMoneyInput(value,'KWD'),false,value);
  assert.equal(validMoneyInput('1000000000.000','KWD'),true);
});
test('maximum valid booking note is preserved exactly when copied to a valid activity and plan',()=>{
  const b={...booking(),provider:'م'.repeat(200),note:'ن'.repeat(2000)};assert.ok(bookingSchema.safeParse(b).success);
  const a=bookingToActivity(b);assert.equal(a.notes,b.note);assert.equal(a.bookingId,b.id);assert.equal(a.cost,'');assert.ok(activitySchema.safeParse(a).success);
  const d=data();d.trips[0].bookings=[b];d.trips[0].plans['country-CN'][0].activities.push(a);assert.ok(dataSchema.safeParse(d).success);
});


const {displayCalendarDate,calendarDate,makeCalendar}=await import(root+'planning.ts');
test('invalid imported dates stay readable while calendar export still rejects them',()=>{const bad=data();bad.trips[0].date='2026-02-30';const restored=parseBackup(JSON.stringify(bad));assert.equal(restored.trips[0].date,'2026-02-30');assert.match(displayCalendarDate(restored.trips[0].date,0),/راجع تاريخ/);assert.throws(()=>calendarDate('2026-02-30',0));assert.throws(()=>makeCalendar(restored.trips[0],'country-CN','الصين'));assert.equal(displayCalendarDate('2028-02-28',1),'2028-02-29');});
