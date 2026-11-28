import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(s)?s+'.ts':s,c);},load(u,c,next){if(u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(u),'utf8'),shortCircuit:true};return next(u,c);}});
const {parsePoint,distanceKm,directSegments,nearestOrder,mapsDirections}=await import('../lib/geo.ts');
const {newActivity,activitySchema,moveActivity,normalizeData}=await import('../lib/planning.ts');
const activity=(lng,id)=>({...newActivity(),id,title:id,location:{lat:0,lng,source:'user',updatedAt:'2026-09-24T12:00:00Z'}});
test('coordinates reject empty, invalid and out of range while accepting zero',()=>{assert.equal(parsePoint('','0'),null);assert.equal(parsePoint('Infinity','0'),null);assert.equal(parsePoint('91','0'),null);assert.equal(parsePoint('0','181'),null);assert.deepEqual(parsePoint('0','0'),{lat:0,lng:0});assert.equal(activitySchema.safeParse({...activity(0,'a'),location:{lat:0,lng:999,source:'user',updatedAt:'2026-09-24T12:00:00Z'}}).success,false);});
test('great-circle distance handles coincident and antimeridian points',()=>{assert.equal(distanceKm({lat:35,lng:135},{lat:35,lng:135}),0);assert.ok(Math.abs(distanceKm({lat:0,lng:179},{lat:0,lng:-179})-222.39)<.1);});
test('missing locations are not bridged in day totals',()=>{assert.equal(directSegments([activity(0,'a'),newActivity(),activity(1,'c')]).length,0);assert.equal(directSegments([activity(0,'a'),activity(1,'b')]).length,1);});
test('nearest proposal preserves first stop and metadata without mutating inputs',()=>{const a=[activity(0,'first'),activity(2,'far'),activity(1,'near')];const proposed=nearestOrder(a);assert.deepEqual(proposed.map(x=>x.id),['first','near','far']);assert.deepEqual(a.map(x=>x.id),['first','far','near']);assert.equal(proposed[2],a[1]);const fixed=[{...a[0],time:'10:00'},...a.slice(1)];assert.equal(nearestOrder(fixed),fixed);});
test('moving day preserves coordinates and directions contain only coordinates',()=>{const a=activity(1,'a');const moved=moveActivity([{title:'a',notes:'',activities:[a]},{title:'b',notes:'',activities:[]}],0,a.id,1);assert.deepEqual(moved[1].activities[0].location,a.location);assert.ok(mapsDirections({lat:0,lng:0},{lat:1,lng:1}).startsWith('https://www.google.com/maps/dir/?api=1&'));});

