import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});

const {defaultDestinationExclusions,isDestinationExcluded,isRouteExcluded,destinationExclusionsSchema} = await import('../lib/destination-exclusions.ts');
const {normalizeData,planSchemaVersion} = await import('../lib/planning.ts');
const {parseBackup,restoreTripCopies} = await import('../lib/backup.ts');

test('default exclusions match Egypt and Muscat across known names while retaining Salalah',()=>{
  assert.deepEqual(defaultDestinationExclusions,[{kind:'country',code:'EG'},{kind:'city',name:'مسقط'}]);
  for(const country of ['EG','eg','country-EG','Egypt','مِصر','جمهورية مصر العربية','EGY']) {
    assert.equal(isDestinationExcluded({country}),true,country);
  }
  for(const city of ['مسقط','مَسْقَط','Muscat','Muscat (MCT)','MCT','Muscat International Airport','مطار مسقط الدولي','Cairo','مطار القاهرة الدولي']) {
    assert.equal(isDestinationExcluded({city}),true,city);
  }
  assert.equal(isDestinationExcluded({country:'US',city:'Cairo'}),false);
  assert.equal(isDestinationExcluded({country:'OM',city:'صلالة'}),false);
  assert.equal(isDestinationExcluded({country:'OM'}),false);
  assert.equal(isDestinationExcluded({city:'Muscatine'}),false);
  assert.equal(isDestinationExcluded({city:'أشياء عن مسقط في الدليل'}),false);
  assert.equal(isDestinationExcluded({country:'EG',city:'القاهرة'},[]),false);
  assert.equal(isDestinationExcluded({city:'Muscat'},[]),false);
});

test('route exclusions inspect every stop, named flight and transfer endpoint',()=>{
  const routes=[
    {country:'TR',countries:['TR','EG']},
    {country:'OM',stops:[{city:'صلالة'},{city:'مسقط',country:'OM'}]},
    {country:'OM',stops:[{city:'القاهرة'}]},
    {country:'OM',stops:[{city:'صلالة'}],transfers:[{from:'Muscat (MCT)',to:'Salalah'}]},
    {countries:['AE','OM'],route:['دبي (ثلاث ليالٍ)','مسقط أو صلالة (ثلاث ليالٍ)']},
    {countries:['AE','OM'],route:['دبي (٣ ليالٍ)','صلالة (٣ ليالٍ)'],links:['دبي ← مطار مسقط الدولي: طيران']},
    {countries:['AE','OM'],fly:'ادخل دبي واطلع من مسقط (تذكرة متعددة الوجهات)'},
  ];
  for(const route of routes) assert.equal(isRouteExcluded(route),true,JSON.stringify(route));
  assert.ok(routes.every(route=>!isRouteExcluded(route,[])));
  assert.equal(isRouteExcluded({country:'OM',stops:[{city:'صلالة'}],transfers:[{from:'مطار صلالة الدولي',to:'صلالة'}]}),false);
  assert.equal(isRouteExcluded({country:'JO',route:['عمّان (٣ ليالٍ)','البتراء (ليلة)']},[{kind:'country',code:'OM'}]),false);
  assert.equal(isRouteExcluded({country:'TR',route:['كوتور ٣ ليالٍ']},[{kind:'city',name:'كوتور'}]),true);
  assert.equal(isRouteExcluded({country:'FR',route:['Paris']},[{kind:'city',name:'باريس'}]),true);
});

test('exclusions validate aliases, preserve explicit empty preferences and round-trip in JSON backups',()=>{
  assert.equal(destinationExclusionsSchema.safeParse([{kind:'city',name:'مسقط'},{kind:'city',name:'Muscat'}]).success,false);
  assert.equal(destinationExclusionsSchema.safeParse([{kind:'country',code:'XX'}]).success,false);
  assert.equal(destinationExclusionsSchema.safeParse([{kind:'city',name:'  '}]).success,false);

  const trip={id:'x',name:'رحلة إلى القاهرة',origin:'الرياض',date:'',month:'',mode:'flexible',days:'4',travelers:'1',budget:'5000',currency:'SAR',nationality:'SA',level:'متوسط',pace:'هادئ',interests:[],selected:'country-EG',compare:[],costs:{},plans:{}};
  const legacy={schemaVersion:12,activeId:'x',trips:[trip]};
  const current=normalizeData(legacy);
  assert.equal(current.schemaVersion,planSchemaVersion);
  assert.equal(isDestinationExcluded({country:'EG'},current.excludedDestinations),true);
  assert.deepEqual(current.trips,[trip]);
  for(const excludedDestinations of [[],[{kind:'city',name:'باريس'}]]) {
    const state={...current,excludedDestinations};
    assert.deepEqual(parseBackup(JSON.stringify(state)),state);
  }
  const custom={...current,excludedDestinations:[{kind:'city',name:'باريس'}]};
  const restored=restoreTripCopies(custom,{...current,excludedDestinations:[]},['x'],false,0,()=> 'restored');
  assert.deepEqual(restored.excludedDestinations,custom.excludedDestinations);
  assert.equal(restored.trips.at(-1).selected,'country-EG');
});
