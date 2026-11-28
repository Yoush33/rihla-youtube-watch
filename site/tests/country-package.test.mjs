import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});

const {countryDisplayFacts,countryPackage,countryPackageCodes,countryVisa,countryPreparation,countryNotes,countryHolidays,countryHolidayYears}=await import('../lib/country-package.ts');
const {climates}=await import('../lib/climate.ts');
const {catalogWithImports,countryCatalog,countryCatalogCodes,monthUnsuitable}=await import('../lib/country-catalog.ts');
const {travelCombos,combosForMonth}=await import('../lib/travel-combos.ts');
const {youtubeForDestinations,countryYoutubeDestinations,youtubeCoverage,youtubeSnapshotDate}=await import('../lib/youtube-watch.ts');
const {youtubeReviewsSchema}=await import('../lib/youtube-watch-schema.ts');
const {allDestinations}=await import('../lib/country-planning.ts');

test('each supplied country has a guide, monthly climate and sourced preparation',()=>{
  assert.equal(countryPackageCodes.length,70);
  assert.deepEqual(new Set(countryPackageCodes),new Set(countryCatalogCodes));
  for (const code of countryPackageCodes) {
    const weather = countryCatalog(code).weather;
    assert.equal(weather.months.length,12,code);
    assert.match(weather.source,/2021.2025/,code);
    if (code!=='PK') {
      assert.ok(allDestinations.some(d=>d.id==='country-'+code),code);
      assert.equal(climates[code].rows.length,12);
    }
    const record=countryPackage(code);
    assert.ok(countryHolidayYears(record).every(year=>year==='2026'||year==='2027'),code);
    for (const field of [...Object.values(record.static), ...Object.values(record.semi_static), ...record.manual]) {
      assert.ok(field.source && field.checked && Object.hasOwn(field,'value'),code);
    }
    const prep=countryPreparation(code.toLowerCase());
    assert.deepEqual(prep.slice(0,4).map(x=>x.label),['التأشيرة','الشريحة','الكاش','العادات']);
    assert.ok(prep.every(x=>x.source && x.checked));
    assert.ok(countryVisa(code).indicator.checked,code);
  }
  assert.equal(countryPackage('XX'),undefined);
  assert.equal(monthUnsuitable('TR',12),true);
  assert.equal(monthUnsuitable('IN',12),false);
  assert.equal(monthUnsuitable('US',12),true);
  assert.ok(countryHolidays('IN','2026-01-01','2027-12-31').length>0);
});

test('country labels stay canonical when older Arabic spellings are imported',()=>{
  for(const [code,oldName,expected] of [
    ['RS','صيربيا','صربيا'], ['UZ','أوزباكستان','أوزبكستان'], ['ME','الجبل الاسود','الجبل الأسود'], ['MX','المسكيك','المكسيك'],
  ]) {
    const row=countryCatalog(code);
    const imported=catalogWithImports([{...row,name_ar:oldName}]);
    assert.equal(row.name_ar,expected);
    assert.equal(countryCatalog(code,imported).name_ar,expected);
    assert.equal(countryPackage(code,imported).name_ar,expected);
  }
});

test('country facts display Arabic names while preserving source metadata and currency codes',()=>{
  const china=countryPackage('CN');
  const facts=countryDisplayFacts(china);
  assert.deepEqual(facts.capital,{...china.static.capital,value:['بكين']});
  assert.deepEqual(facts.languages,{...china.static.languages,value:['الصينية']});
  assert.deepEqual(facts.currencies,{...china.static.currencies,value:['يوان صيني (CNY)']});
  assert.deepEqual(china.static.capital.value,['Beijing']);
  for(const code of countryCatalogCodes) {
    const {capital,languages,currencies}=countryDisplayFacts(countryPackage(code));
    for(const name of [...capital.value,...languages.value,...currencies.value]) assert.match(name,/\p{Script=Arabic}/u,code);
  }
});

test('conflicting entry rules use verified official guidance without losing the archive',()=>{
  assert.match(countryVisa('TH').raw.value,/60/);
  assert.match(countryVisa('TH').indicator.value,/٣٠ يومًا/);
  assert.match(countryVisa('BA').indicator.value,/حتى ٦٠ يومًا/);
  assert.match(countryVisa('BA').indicator.value,/انتهت فترة ٢٠٢٦/);
  assert.match(countryVisa('AZ').indicator.value,/١٥ فبراير ٢٠٢٧/);
  assert.match(countryVisa('LK').indicator.value,/ETA قبل الوصول/);
  assert.match(countryVisa('IN').applyLink,/^https:\/\/indianvisaonline\.gov\.in/);
  assert.match(countryNotes('ME')[0].status,/يحتاج تحقق/);
  assert.match(countryNotes('GE')[0].value,/٣٠٬٠٠٠ لاري/);
  assert.equal(countryPreparation('GE')[4].label,'الطقس');
  assert.equal(countryPreparation('GE')[5].label,'التأمين');
  assert.equal(countryNotes('GE').filter(x=>x.topic==='التأمين').length,1);
});

test('holiday comparison includes both endpoints and handles dates outside the snapshot',()=>{
  const results=countryHolidays('TR','2026-01-01','2026-03-20');
  assert.deepEqual(results.map(x=>x.date),['2026-01-01','2026-03-20']);
  assert.deepEqual(countryHolidays('TR','2028-01-01','2028-12-31'),[]);
});

test('combinations activate from seven days and exclude known unsuitable months',()=>{
  assert.equal(travelCombos.length,10);
  assert.deepEqual(combosForMonth(6,5),[]);
  const options=combosForMonth(7,5);
  assert.ok(options.some(combo=>combo.id==='turkey-classic'&&combo.preferred&&combo.durationFits));
  assert.ok(!combosForMonth(7,12).some(combo=>combo.id==='turkey-classic'));
  assert.ok(options.every(combo=>combo.countries.every(code=>countryPackage(code)&&!monthUnsuitable(code,5))));
});

test('YouTube candidates are destination-scoped and account reviews change sorting and visibility',()=>{
  const all=youtubeForDestinations(countryPackageCodes.flatMap(countryYoutubeDestinations));
  assert.ok(all.length > 0);
  assert.equal(new Set(all.map(video=>video.video_id)).size,all.length);
  const goa=youtubeForDestinations(['goa']);
  assert.ok(goa.length>2 && goa.every(video=>video.destinations.includes('goa')));
  const rejected=goa[0].video_id, approved=goa.at(-1).video_id;
  const review={ [rejected]:'ما ينفع',[approved]:'ينفع' };
  assert.equal(youtubeReviewsSchema.safeParse(review).success,true);
  const ranked=youtubeForDestinations(['goa'],review);
  assert.equal(ranked[0].video_id,approved);
  assert.equal(ranked[0].status,'ينفع');
  assert.ok(ranked.every(video=>video.video_id!==rejected));
  assert.equal(youtubeReviewsSchema.safeParse({'https://x':'ينفع'}).success,false);
});

test('destination cards match the city name in a video title or imported description',async()=>{
  const {parseCatalogFile}=await import('../lib/catalog-import.ts');
  const varkala=youtubeForDestinations(['vkl'],{},undefined,true).find(video=>video.video_id==='te7qQn__ZgA');
  assert.ok(varkala);
  assert.ok(youtubeForDestinations(['cok'],{},undefined,true).some(video=>video.video_id==='QEeGqtbiEPc'));

  const {youtube}=parseCatalogFile('youtube-candidates.json',JSON.stringify({updated:'2026-11-29',videos:[
    {...varkala,title:'Day at the beach in Kerala',title_ar:'يوم على الشاطئ في كيرالا',destinations:[],description:'We spent the day in VARKALA.'},
    {...varkala,video_id:'gdqO8lfn9p1',title:'Day in Kochi',title_ar:'يوم في كوتشي',destinations:['vkl'],description:'Varkalapuram, Kerala'},
  ]}));
  assert.deepEqual(youtubeForDestinations(['vkl'],{},youtube,true).map(video=>video.video_id),['te7qQn__ZgA']);
  assert.equal(Object.hasOwn(youtube.videos[0],'description'),false);
});

test('YouTube coverage counts unique useful reviews by destination and country',async()=>{
  const {parseCatalogFile}=await import('../lib/catalog-import.ts');
  const metadata={published:'2026-11-25',channel:'قناة اختبار',status:'مرشح للمراجعة',destinations:[]};
  const first={...metadata,video_id:'zzY0UA_aB12',title:'Varkala beach route',countries:['IN'],duration_seconds:180,
    summary_ar:'١. ممشى الجرف\n٢. طريق الوصول إلى الشاطئ\n٣. موقع المطاعم',summary_basis:'description',summary_source:'https://example.com/notes'};
  const second={...metadata,video_id:'zzY0UA_aB13',title:'Kochi waterfront',destinations:['cok','vkl']};
  const third={...metadata,video_id:'zzY0UA_aB14',title:'Varkala transport',destinations:['vkl']};
  const mexico={...metadata,video_id:'zzY0UA_aB15',title:'Mexico City',countries:['MX'],duration_seconds:60};
  const vietnam={...metadata,video_id:'zzY0UA_aB16',title:'Old Hanoi',destinations:['country-vn'],summary_ar:'جولة مشي في الحي القديم.'};
  const parse=videos=>parseCatalogFile('youtube-candidates.json',JSON.stringify({updated:'2026-11-25',videos})).youtube;
  const source=parse([first,second,third,mexico,vietnam]);
  const duplicateSource={...source,videos:[...source.videos,source.videos[0]]};
  const reviews={[first.video_id]:'ينفع',[third.video_id]:'ما ينفع'};
  const varkalaScope={kind:'destination',id:'vkl'};
  const baseline=youtubeCoverage(varkalaScope).counts;
  const varkala=youtubeCoverage(varkalaScope,reviews,duplicateSource);
  assert.equal(varkala.target,5);
  assert.deepEqual(varkala.counts,{total:baseline.total+2,useful:baseline.useful+1,pending:baseline.pending,rejected:baseline.rejected+1,
    durationKnown:baseline.durationKnown+1,durationSeconds:baseline.durationSeconds+180});
  const reviewed=varkala.videos.find(video=>video.video_id===first.video_id);
  const rejected=varkala.videos.find(video=>video.video_id===third.video_id);
  assert.equal(reviewed.status,'ينفع');
  assert.equal(rejected.status,'ما ينفع');
  assert.deepEqual(reviewed.summary_ar,['ممشى الجرف','طريق الوصول إلى الشاطئ','موقع المطاعم']);
  assert.equal(reviewed.summary_basis,'description');
  assert.equal(reviewed.summary_source,'https://example.com/notes');
  assert.equal(rejected.duration_seconds,null);
  assert.equal(rejected.summary_ar,undefined);
  const india=youtubeCoverage({kind:'country',code:'in'},reviews,duplicateSource);
  assert.equal(india.target,2);
  assert.equal(india.counts.total,youtubeCoverage({kind:'country',code:'IN'}).counts.total+3);
  assert.ok(youtubeCoverage({kind:'country',code:'MX'},{},source).videos.some(video=>video.video_id===mexico.video_id));
  assert.deepEqual(youtubeCoverage({kind:'country',code:'VN'},{},source).videos.find(video=>video.video_id===vietnam.video_id)?.summary_ar,
    ['جولة مشي في الحي القديم.']);
  assert.equal(youtubeCoverage({kind:'country',code:'JP'},{},source).counts.total,youtubeCoverage({kind:'country',code:'JP'}).counts.total);
  assert.throws(()=>parse([{...first,duration_seconds:0}]),/راجع تاريخ/);
  assert.throws(()=>parse([{...first,summary_ar:['١','٢','٣','٤','٥','٦']}]),/راجع تاريخ/);
  for (const summary_ar of [null,'',[]]) assert.equal(parse([{...first,summary_ar}]).videos[0].summary_ar,undefined);
});

test('watcher minutes show on each candidate and add once to its country duration',async()=>{
  const {parseCatalogFile}=await import('../lib/catalog-import.ts');
  const metadata={published:'2026-11-25',channel:'قناة اختبار',status:'مرشح للمراجعة',title:'Varkala and Kochi',countries:['IN']};
  const first={...metadata,video_id:'zzY1UA_aB12',destinations:['cok','vkl'],minutes:37.5,duration_seconds:4};
  const second={...metadata,video_id:'zzY1UA_aB13',destinations:['vkl'],minutes:22.5};
  const parse=videos=>parseCatalogFile('youtube-candidates.json',JSON.stringify({updated:'2026-11-27',videos})).youtube;
  const source=parse({[first.video_id]:first,[second.video_id]:second});
  const scope={kind:'country',code:'IN'};
  const original=youtubeCoverage(scope).counts;
  const actual=youtubeCoverage(scope,{},source);
  assert.equal(actual.videos.find(video=>video.video_id===first.video_id)?.duration_seconds,2250);
  assert.equal(actual.videos.find(video=>video.video_id===second.video_id)?.duration_seconds,1350);
  assert.equal(actual.counts.durationKnown,original.durationKnown+2);
  assert.equal(actual.counts.durationSeconds,original.durationSeconds+3600);
  assert.equal(parse([{...first,minutes:null}]).videos[0].duration_seconds,4);
  assert.throws(()=>parse([{...first,minutes:-2}]),/راجع تاريخ/);
});

test('older imports do not hide the canonical YouTube snapshot or local ratings',()=>{
  const scope={kind:'destination',id:'vkl'};
  const canonical=youtubeCoverage(scope);
  const existing=canonical.videos[0];
  assert.ok(existing);
  const {video_id:id}=existing;
  const imported={updated:'2026-01-01',videos:[{...existing,title:'outdated title',status:'ينفع',duration_seconds:42}]};
  const result=youtubeCoverage(scope,{[id]:'ما ينفع'},imported);
  const matched=result.videos.find(video=>video.video_id===id);
  assert.equal(result.updated,youtubeSnapshotDate);
  assert.equal(result.counts.total,canonical.counts.total);
  assert.equal(matched.title,existing.title);
  assert.equal(matched.duration_seconds,existing.duration_seconds??42);
  assert.equal(matched.status,'ما ينفع');
});

test('featured community tips leave room for recommendations and fill gaps with warnings',async()=>{
  const {featuredYoutubeTips}=await import('../lib/youtube-watch.ts');
  const tip=(type,index)=>({type,tip:'نصيحة '+index,at:'00:01',videoId:'zzTIPSa_b01',channel:'قناة اختبار',seconds:1});
  const warnings=Array.from({length:6},(_,index)=>tip('تحذير',index));
  const recommendations=['أكل','مساج','طبيعة','سكن','سعر'].map((type,index)=>tip(type,index+6));
  const other=[tip('تنقل',11),tip('عام',12)];
  assert.deepEqual(featuredYoutubeTips([...warnings,...other,...recommendations]),[...warnings.slice(0,2),...recommendations.slice(0,3)]);
  const secondFood=tip('أكل',13);
  assert.deepEqual(featuredYoutubeTips([...warnings,recommendations[0],secondFood,...recommendations.slice(1)]),
    [...warnings.slice(0,2),...recommendations.slice(0,3)]);
  assert.deepEqual(featuredYoutubeTips([...warnings,recommendations[0]]),[...warnings.slice(0,4),recommendations[0]]);
  assert.deepEqual(featuredYoutubeTips(warnings),warnings.slice(0,5));
  assert.deepEqual(featuredYoutubeTips([...warnings.slice(0,1),...recommendations]),[warnings[0],...recommendations.slice(0,4)]);
  assert.deepEqual(featuredYoutubeTips(recommendations),recommendations);
  assert.deepEqual(featuredYoutubeTips(other),[]);
});

test('community tips prioritize warnings, preserve playback offsets and stay in the right city',async()=>{
  const {parseCatalogFile}=await import('../lib/catalog-import.ts');
  const {youtubeTravelTips,tipMatchesPlace}=await import('../lib/youtube-watch.ts');
  const basic={published:'2026-11-26',channel:'قناة اختبار',status:'مرشح للمراجعة'};
  const warning={type:'تحذير',tip:'تنبيه اختبار عن وضع الطريق',place:'شاطئ آو نانغ (Ao Nang Beach)',price:'',at:'11:45'};
  const food={type:'أكل',tip:'توصية اختبار للأكل',place:'',price:'100 بات',at:'1:02:03'};
  const video={...basic,video_id:'zzTIPSa_b01',title:'A Krabi guide',destinations:['kbv','cnx'],
    tips_ar:{about_destination:true,tips:[food,warning,{...warning,tip:'توقيت مستحيل',at:'03:99'}]}};
  const unrelated={...video,video_id:'zzTIPSa_b02',tips_ar:{about_destination:false,tips:[{...warning,tip:'مكان خارج الوجهة'}]}};
  const excluded={...video,video_id:'zzTIPSa_b03',about_destination:false,tips_ar:{tips:[{...food,tip:'مقطع مستبعد'}]}};
  const empty={...video,video_id:'zzTIPSa_b04',tips_ar:{tips:[]}};
  const source=parseCatalogFile('youtube-candidates.json',JSON.stringify({updated:'2026-11-28',videos:[video,unrelated,excluded,empty]})).youtube;
  assert.equal(source.videos[0].tips_ar.tips.length,2);
  const krabi={city:'كرابي',country:'TH'};
  const testRows=rows=>rows.filter(tip=>tip.videoId.startsWith('zzTIPS'));
  const tips=testRows(youtubeTravelTips([krabi],{},source));
  assert.deepEqual(tips.map(tip=>tip.seconds),[705,3723]);
  assert.ok(tipMatchesPlace(tips[0],{name:'หาดอ่าวนาง',name_en:'Ao Nang Beach'}));
  assert.equal(tipMatchesPlace(tips[0],{name:'Ao Nang Hotel'}),false);
  assert.deepEqual(testRows(youtubeTravelTips([{city:'شيانغ ماي',country:'TH'}],{},source)),[]);
  assert.deepEqual(testRows(youtubeTravelTips([krabi],{[video.video_id]:'ما ينفع'},source)),[]);
});

test('the checked-in snapshot covers all 70 countries and all 14 starter destinations',async()=>{
  const {tripCardIdSchema}=await import('../lib/trip-card-schema.ts');
  const {countryCatalogCodes}=await import('../lib/country-catalog.ts');
  assert.equal(countryCatalogCodes.length,70);
  for (const code of countryCatalogCodes) assert.ok(youtubeCoverage({kind:'country',code}).counts.total>0,code);
  assert.equal(tripCardIdSchema.options.length,14);
  for (const id of tripCardIdSchema.options) assert.ok(youtubeCoverage({kind:'destination',id}).counts.total>0,id);
});

test('each GitHub export shape can be imported and consumed by the corresponding view',async()=>{
  const {parseCatalogFile}=await import('../lib/catalog-import.ts');
  const {catalogImportsSchema}=await import('../lib/catalog-import-schema.ts');
  const {catalogWithImports}=await import('../lib/country-catalog.ts');
  const {boredResults,defaultBoredSettings}=await import('../lib/bored.ts');
  const {initialTripCards}=await import('../lib/trip-card-data.ts');
  const file=path=>JSON.parse(readFileSync(new URL('../lib/'+path,import.meta.url),'utf8'));

  const countries=file('country-catalog.json');
  const india=countries.find(country=>country.iso2==='IN');
  india.weather.months.find(row=>row.month===12).fit='غير مناسب';
  india.static.currencies.value=['INR (imported)'];
  const importedCountries=parseCatalogFile('all.json',JSON.stringify(countries));
  assert.equal(importedCountries.countries.length,70);
  const catalog=catalogWithImports(importedCountries.countries);
  assert.deepEqual(countryPackage('IN',catalog).static.currencies.value,['INR (imported)']);
  assert.equal(monthUnsuitable('IN',12,catalog),true);
  const candidates=boredResults(initialTripCards,defaultBoredSettings,'2026-11-25',catalog).candidates;
  assert.ok(candidates.some(item=>item.trip.id==='vkl'&&item.season===2));

  const plans=file('travel-combos.json');
  const importedCombos=parseCatalogFile('combos.json',JSON.stringify({combos:plans.slice(0,1)}));
  assert.equal(combosForMonth(8,6,catalog,importedCombos.combos)[0].id,plans[0].id);
  assert.deepEqual(combosForMonth(6,6,catalog,importedCombos.combos),[]);

  const snapshot=JSON.parse(readFileSync(new URL('../data/youtube-candidates.json',import.meta.url),'utf8'));
  const row=snapshot.videos.find(item=>item.destinations.includes('goa'));
  const importedVideos=parseCatalogFile('youtube-candidates.json',JSON.stringify({
    updated:'2026-11-29',videos:{[row.video_id]:{...row,title_ar:'عنوان بعد الاستيراد',description:'لا يخزّن هذا النص'}},
  }));
  assert.equal(youtubeForDestinations(['goa'],{},importedVideos.youtube)[0].title_ar,'عنوان بعد الاستيراد');
  assert.equal(Object.hasOwn(importedVideos.youtube.videos[0],'description'),false);
  assert.deepEqual(youtubeForDestinations(['goa'],{[row.video_id]:'ما ينفع'},importedVideos.youtube),[]);
  assert.ok(catalogImportsSchema.safeParse({...importedCountries,...importedCombos,...importedVideos}).success);
});

test('imports reject malformed JSON, duplicate countries and unsafe links',async()=>{
  const {parseCatalogFile}=await import('../lib/catalog-import.ts');
  const country=JSON.parse(readFileSync(new URL('../lib/country-catalog.json',import.meta.url),'utf8'))[0];
  assert.throws(()=>parseCatalogFile('countries.yml','{}'),/اختر أحد ملفات/);
  assert.throws(()=>parseCatalogFile('all.json','{'),/تعذّر قراءة/);
  assert.throws(()=>parseCatalogFile('all.json',JSON.stringify([country,country])),/راجع بنية بيانات الدول/);
  country.visa_saudi_passport.official='javascript:alert(1)';
  assert.throws(()=>parseCatalogFile('all.json',JSON.stringify([country])),/راجع بنية بيانات الدول/);
});

test('the default country follows the selected month and imported climate data',async()=>{
  const {catalogWithImports,recommendedCountryForMonth}=await import('../lib/country-catalog.ts');
  assert.equal(recommendedCountryForMonth(12),'OM');
  assert.equal(recommendedCountryForMonth(7),'PT');
  assert.equal(recommendedCountryForMonth(0),'');
  const changed = structuredClone(countryCatalog('OM'));
  changed.weather.months.find(row => row.month === 12).fit = 'غير مناسب';
  const imported=catalogWithImports([changed]);
  assert.equal(recommendedCountryForMonth(12,imported,[]),'EG');
  assert.notEqual(recommendedCountryForMonth(12,imported),'EG');
});
