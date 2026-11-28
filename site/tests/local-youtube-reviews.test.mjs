import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});

const {localYoutubeReviewsKey,mergeYoutubeReviews,readLocalYoutubeReviews,withLocalYoutubeReviews} = await import('../lib/local-youtube-reviews.ts');
const {youtubeReviewsLimit,youtubeReviewsSchema} = await import('../lib/youtube-watch-schema.ts');
const {planSchemaVersion} = await import('../lib/planning.ts');
const {parseBackup} = await import('../lib/backup.ts');

test('local ratings validate stored IDs and statuses and respect cleared storage',()=>{
  let value = JSON.stringify({AAAAAAAAAAA:'ما ينفع',BBBBBBBBBBB:'مرشح للمراجعة'});
  const storage = {getItem:key=>{assert.equal(key,localYoutubeReviewsKey);return value;}};
  assert.deepEqual(readLocalYoutubeReviews(storage),{AAAAAAAAAAA:'ما ينفع',BBBBBBBBBBB:'مرشح للمراجعة'});
  value = null;
  assert.deepEqual(readLocalYoutubeReviews(storage),{});
  for (const malformed of ['{','[]','null','{"https://example.test":"ينفع"}','{"BBBBBBBBBBB":"ربما"}']) {
    value = malformed;
    assert.deepEqual(readLocalYoutubeReviews(storage),{},malformed);
  }
});

test('rating merge keeps existing selections and stays within the accepted backup capacity',()=>{
  const current = Object.fromEntries(Array.from({length:youtubeReviewsLimit-1},(_,i)=>[String(i).padStart(11,'0'),'ينفع']));
  const result = mergeYoutubeReviews(current,{'00000000000':'ما ينفع',AAAAAAAAAAA:'مرشح للمراجعة',BBBBBBBBBBB:'ما ينفع'});
  assert.equal(result['00000000000'],'ينفع');
  assert.equal(result.AAAAAAAAAAA,'مرشح للمراجعة');
  assert.equal(result.BBBBBBBBBBB,undefined);
  assert.ok(youtubeReviewsSchema.safeParse(result).success);
  assert.equal(Object.keys(result).length,youtubeReviewsLimit);
});

test('a trip JSON export combines browser choices and previously saved ratings',()=>{
  const trip = {id:'x',name:'رحلة',origin:'الرياض',date:'',month:'',mode:'flexible',days:'4',travelers:'1',budget:'5000',currency:'SAR',nationality:'SA',level:'متوسط',pace:'هادئ',interests:[],selected:'country-TR',compare:[],costs:{},plans:{}};
  const saved = {schemaVersion:planSchemaVersion,activeId:'x',trips:[trip],youtubeReviews:{AAAAAAAAAAA:'ينفع',BBBBBBBBBBB:'مرشح للمراجعة'}};
  const local = {AAAAAAAAAAA:'ما ينفع',CCCCCCCCCCC:'ينفع'};
  const exported = withLocalYoutubeReviews(saved,local);
  assert.deepEqual(parseBackup(JSON.stringify(exported)),{...saved,youtubeReviews:{...saved.youtubeReviews,...local}});
  assert.equal(saved.youtubeReviews.AAAAAAAAAAA,'ينفع');
  assert.equal(withLocalYoutubeReviews(saved,{}),saved);
});
