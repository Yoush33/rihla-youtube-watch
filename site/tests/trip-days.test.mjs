import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({
  resolve(specifier,context,next){return next(specifier.startsWith('.')&&!/\.(ts|json|mjs|js)$/.test(specifier)?specifier+'.ts':specifier,context);},
  load(url,context,next){return url.endsWith('.json')?{format:'module',source:'export default '+readFileSync(new URL(url),'utf8'),shortCircuit:true}:next(url,context);},
});

const {readyPlans} = await import('../lib/ready-plans.ts');
const {tripDays, defaultDayItems, scheduleDay, dayTotal, arrivalTime, mergeDays} = await import('../lib/trip-days.ts');
const {milesQuote} = await import('../lib/miles.ts');
const {savedReadyPlanSchema, saveReadyPlanSnapshot} = await import('../lib/ready-plan-saved.ts');
const {cityWithCountry} = await import('../lib/place-label.ts');

const plan = readyPlans.find(item => item.stops.length > 1) ?? readyPlans[0];
const nights = plan.stops.map(stop => stop.nights);
const totalNights = nights.reduce((a, b) => a + b, 0);

test('عدد الأيام = الليالي + يوم المغادرة، وأول يوم وصول وآخر يوم مغادرة', () => {
  const days = tripDays(plan, nights);
  assert.equal(days.length, totalNights + 1);
  assert.equal(days[0].kind, 'arrival');
  assert.equal(days.at(-1).kind, 'departure');
  assert.equal(days.at(-1).hotelNight, null);
});

test('الجدول المبدئي فيه يوم لكل يوم رحلة، والمغادرة ما تتكرر في يوم عادي', () => {
  const list = defaultDayItems(plan, nights);
  assert.equal(list.length, totalNights + 1);
  list.slice(0, -1).forEach(items => items.forEach(item => assert.ok(!(item.slot === 'evening' && item.name.startsWith('المغادرة')))));
});

test('أوقات اليوم مرتبة صباح ثم ظهر ثم مساء، والمشي ينضاف للوقت', () => {
  const out = scheduleDay([
    {id:'a', slot:'evening', kind:'place', name:'عشاء', price:80, walk:null},
    {id:'b', slot:'morning', kind:'place', name:'فطور', price:30, walk:10},
  ]);
  assert.deepEqual(out.map(entry => entry.item.id), ['b', 'a']);
  assert.equal(out[0].eta, '09:10');
  assert.equal(out[1].eta, '19:00');
});

test('يوم الوصول: الجدول يبدأ بعد وقت الوصول', () => {
  const out = scheduleDay([
    {id:'a', slot:'morning', kind:'note', name:'الوصول', price:null, walk:null},
    {id:'b', slot:'evening', kind:'note', name:'عشاء', price:null, walk:null},
  ], 20 * 60);
  assert.deepEqual(out.map(entry => entry.eta), ['20:00', '21:15']);
});

test('مجموع اليوم يجمع السكن والمصروف والأسعار المعروفة، ويعلّم الناقص', () => {
  const day = {index:0, stopIndex:0, city:'x', country:'TR', kind:'explore', hotelNight:300, daily:100};
  assert.deepEqual(dayTotal(day, [{id:'1', slot:'noon', kind:'place', name:'مساج', price:150, walk:null}]), {total:550, partial:false});
  assert.equal(dayTotal(day, [{id:'1', slot:'noon', kind:'place', name:'مطعم', price:null, walk:null}]).partial, true);
});

test('وقت الوصول بالتوقيت المحلي: الرياض 08:00 + 9.5 ساعة إلى الهند = 20:00', () => {
  assert.deepEqual(arrivalTime('2026-12-10', '08:00', 9.5, 'IN'), {date:'2026-12-10', time:'20:00'});
  assert.deepEqual(arrivalTime('2026-12-10', '23:00', 4, 'TR'), {date:'2026-12-11', time:'03:00'});
});

test('تغيير الليالي يحافظ على اللي أضافه المستخدم', () => {
  const base = defaultDayItems(plan, nights);
  const edited = base.map((items, index) => index === 1 ? [...items, {id:'a-x', slot:'noon', kind:'event', name:'مهرجان', price:null, walk:null}] : items);
  const longer = nights.map((night, index) => index === 0 ? night + 1 : night);
  const merged = mergeDays(edited, defaultDayItems(plan, longer));
  assert.equal(merged.length, base.length + 1);
  assert.ok(merged[1].some(item => item.id === 'a-x'));
});

test('أميال الفرسان: ذهاب وعودة ضعف الجدول، وجنوب الهند منطقة ثانية، وجورجيا ما تنفع', () => {
  assert.equal(milesQuote('TR', 'أنطاليا').reward, 23000);
  assert.equal(milesQuote('IN', 'فاركالا').reward, 24000);
  assert.equal(milesQuote('IN', 'دلهي').reward, 18000);
  assert.equal(milesQuote('GE', 'تبليسي'), null);
});

test('اسم الدولة جنب المدينة وما يتكرر', () => {
  assert.equal(cityWithCountry('فاركالا', 'IN'), 'فاركالا، الهند');
  assert.equal(cityWithCountry('الهند', 'IN'), 'الهند');
});

test('الخطة المحفوظة تقبل الجدول المعدّل ووقت الإقلاع', () => {
  const days = defaultDayItems(plan, nights);
  const saved = saveReadyPlanSnapshot({plan, nights, month:12, budget:5000, days, depart_time:'08:30', start_date:'2026-12-10'}, '2026-11-28');
  assert.equal(savedReadyPlanSchema.safeParse(saved).success, true);
  assert.equal(saved.depart_time, '08:30');
  assert.equal(saved.days.length, days.length);
});
