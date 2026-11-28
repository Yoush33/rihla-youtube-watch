import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fallsInTrip,tripCalendarAlerts} from '../lib/country-guide.ts';

test('actual dates overlap inclusively across years and do not imply an event on every day of its usual month',()=>{
 const day={label:'عيد',value:'عطلة',date:'2027-01-01'};
 const peak={label:'إجازة مدرسية',value:'إجازة',date:'2026-12-28',end:'2027-01-03',peak:true};
 const guide={sections:{holidays:[day,{...day,value:'غير مؤكد'},{...day,alert:false},{...day,date:undefined,month:1}],peak:[peak,{...peak,peak:false}],events:[{month:1}]}};
 assert.deepEqual(tripCalendarAlerts(guide,'2026-12-31','2027-01-01'),[day,peak]);
 assert.deepEqual(tripCalendarAlerts(guide,'2027-01-04','2027-01-07'),[]);
 assert.ok(fallsInTrip({value:'موسم',month:1},'2026-12-30','2027-01-02'));
 assert.equal(fallsInTrip({value:'موسم',month:11},'2026-12-30','2027-01-02'),false);
});

test('each catalogue country has a complete standalone Arabic guide with checkable dates and sources',async()=>{
 const {readFile,readdir}=await import('node:fs/promises');
 const root=new URL('../countries/guide/',import.meta.url);
 const countries=JSON.parse(await readFile(new URL('../lib/country-catalog.json',import.meta.url),'utf8'));
 const files=(await readdir(root)).sort();
 assert.equal(files.length,70);
 assert.deepEqual(files,countries.map(c=>c.iso2+'.json').sort());
 for(const file of files){
  const g=JSON.parse(await readFile(new URL(file,root),'utf8'));
  assert.equal(file,g.code+'.json');
  for(const section of ['entry','money','connect','transport','food','customs','safety','stay','cities','holidays','peak','events']){
   assert.ok(g.sections[section]?.length,g.code+' '+section);
   for(const fact of g.sections[section]){
    assert.ok(fact.label && fact.value && /^https?:$/.test(new URL(fact.source).protocol));
    assert.match(fact.checked,/^\d{4}-\d{2}-\d{2}$/);
    if(fact.end)assert.ok(fact.date && fact.date<=fact.end);
   }
  }
 }
});

test('a provisional month in a particular year is not an annual event',()=>{
 const month={value:'تقريبي',month:3,year:2027};
 assert.equal(fallsInTrip(month,'2026-03-01','2026-03-30'),false);
 assert.equal(fallsInTrip(month,'2027-02-25','2027-03-01'),true);
});

test('one multi-day warning keeps distinct regional effects separate',()=>{
 const base={label:'عيد',value:'إجازة',scope:'المدينة أ',impact:'تغلق المصارف',date:'2027-01-01'};
 const next={...base,date:'2027-01-02'};
 const other={...next,scope:'المدينة ب'};
 const guide={sections:{holidays:[base,next,other],peak:[]}};
 assert.deepEqual(tripCalendarAlerts(guide,'2027-01-01','2027-01-03'),[base,other]);
});
