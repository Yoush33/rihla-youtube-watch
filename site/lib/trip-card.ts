import type {CountryCatalog} from './country-catalog';
import {formatWalkingMinutes} from './arabic-duration';
import {countryPackage, countryPreparation} from './country-package';
import type {TripCard, TripCardCost, TripCardCostKey, TripCardGroup} from './trip-card-schema';

const dayMs = 86_400_000;
const riyadhDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Riyadh', year:'numeric', month:'2-digit', day:'2-digit'});
const dateLabel = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'});
const cardNumberFormat = new Intl.NumberFormat('ar-SA', {maximumFractionDigits:2});
const sar = new Intl.NumberFormat('ar-SA', {maximumFractionDigits:0});
const yearFormat = new Intl.NumberFormat('ar-SA', {useGrouping:false});
const compact = (n:number) => Math.round(n * 100) / 100;
const stableCosts = ['hotel', 'daily', 'spa', 'taxi', 'visa'] as const;
const reviewCosts = ['flight', 'milesCash', 'milesCount', 'hotel', 'spa'] as const;
const unnamedPackageHotelRates:Record<string,number> = {kbv:170,cnx:172};
export const unpricedHotelSource = 'سعر الليلة يحتاج تسعير لفندق محدد';

export const costLabels: Record<TripCardCostKey, string> = {
  flight:'الطيران نقدًا',
  milesCash:'الرسوم النقدية مع الأميال',
  milesCount:'عدد أميال الفرسان',
  hotel:'سعر الفندق لليلة',
  daily:'المصروف اليومي',
  spa:'المساج',
  taxi:'نقل المطار ذهاب وعودة',
  visa:'التأشيرة',
};
export const todayInRiyadh = (date = new Date()) => riyadhDate.format(date);
export const cardNumber = (amount: number) => cardNumberFormat.format(compact(amount));
export const cardMoney = (amount: number) => sar.format(amount) + ' ر.س';
export const cardYear = (year: number) => yearFormat.format(year);
export const dateText = (date: string) => dateLabel.format(new Date(date));
export const cardDays = (group: Pick<TripCardGroup, 'start'|'end'>) => (Date.parse(group.end) - Date.parse(group.start)) / dayMs + 1;
export const shiftCardDate = (date: string, offset: number) => new Date(Date.parse(date) + offset * dayMs).toISOString().slice(0, 10);
export const walkMap = (query: string) => 'https://www.google.com/maps/search/?' + new URLSearchParams({api:'1', query});
export const stayNights = (n: number) => n === 2 ? 'ليلتان' : cardNumber(n) + (n >= 3 && n <= 10 ? ' ليالٍ' : ' ليلة');
export const tripDaysText = (n: number) => n === 2 ? 'يومان' : cardNumber(n) + (n >= 3 && n <= 10 ? ' أيام' : ' يوم');
export const cardMode = (trip: TripCard) => trip.milesRoute === 'available' ? trip.mode : 'cash';

export function costNeedsReview(key: TripCardCostKey, amount: TripCardCost, today: string) {
  if (amount.review) return true;
  return reviewCosts.some(cost => cost === key) && (!amount.checkedOn || Date.parse(today) - Date.parse(amount.checkedOn) > 7 * dayMs);
}

export function cardCosts(group: TripCardGroup, trip: TripCard, mode = cardMode(trip)) {
  return costForTripDays(trip, cardDays(group), mode);
}

// These two package rates were never tied to a named hotel. Match archived provenance so manual prices survive.
export function isUnnamedPackageHotelRate(id:string,rate:Pick<TripCardCost,'value'|'source'|'checkedOn'|'estimated'>) {
  return Object.hasOwn(unnamedPackageHotelRates,id) && rate.value === unnamedPackageHotelRates[id] &&
    rate.source === 'Booking.com · تقدير سعر الليلة من الحزمة' && rate.checkedOn === '2026-11-25' && rate.estimated;
}

export function tripCardHotelQuote(trip:TripCard):TripCardCost {
  const rate = trip.costs.hotel;
  return isUnnamedPackageHotelRate(trip.id,rate) ?
    {value:null,source:unpricedHotelSource,checkedOn:null,estimated:false,review:true} : rate;
}

type TripCostItem = {amount:number|null;units:number;excludeFromTotal?:boolean};

export function calculateTripCost<T extends TripCostItem>(items:readonly T[],budget?:number) {
  const rows = items.map(item => ({
    ...item,
    subtotal:item.units === 0 ? 0 : item.amount === null ? null : compact(item.amount * item.units),
  }));
  const payable = rows.filter(row => !row.excludeFromTotal);
  const total = compact(payable.reduce((sum,row) => sum + (row.subtotal ?? 0),0));
  const partial = payable.some(row => row.subtotal === null);
  const remaining = partial || budget === undefined ? null : compact(budget - total);
  return {rows,total,partial,remaining};
}

export function costForTripDays(trip: TripCard, days: number, mode = cardMode(trip)) {
  const usesMiles = mode === 'miles' && trip.milesRoute === 'available';
  const keys: TripCardCostKey[] = usesMiles ? ['milesCash', 'milesCount', ...stableCosts] : ['flight', ...stableCosts];
  const costs = {...trip.costs,hotel:tripCardHotelQuote(trip)};
  const estimate = calculateTripCost(keys.map(key => ({
    key, cost:costs[key], amount:costs[key].value,
    units:key === 'hotel' ? days - 1 : key === 'daily' ? days : 1,
    excludeFromTotal:key === 'milesCount',
  })));
  const milesPending = usesMiles && (trip.costs.milesCash.value === null || !trip.costs.milesCount.value);
  const rows = estimate.rows.map(({key,cost,units,subtotal}) => ({key,cost,units,subtotal}));
  return {rows,total:estimate.total,partial:estimate.partial,milesPending};
}

export function selectTripCardQuote(groups:readonly TripCardGroup[], id:string, days:number, travelMonth:string) {
  const choices = groups.flatMap(group => {
    const trip = group.trips.find(item => item.id === id);
    return trip ? [{group,trip}] : [];
  });
  const inMonth = choices.filter(({group}) => group.start.startsWith(travelMonth) && group.end.startsWith(travelMonth));
  return inMonth.sort((a,b) =>
    Number(!!a.trip.costs.flight.review) - Number(!!b.trip.costs.flight.review) ||
    Math.abs(cardDays(a.group) - days) - Math.abs(cardDays(b.group) - days) ||
    (b.trip.costs.flight.checkedOn ?? '').localeCompare(a.trip.costs.flight.checkedOn ?? '')
  )[0] ?? choices.find(choice => choice.group.historical) ?? choices[0];
}

export function copyCardGroup(group: TripCardGroup, id: string, start: string, end: string): TripCardGroup {
  const copy = structuredClone(group);
  copy.id = id;
  copy.start = start;
  copy.end = end;
  copy.historical = false;
  for (const trip of copy.trips) {
    for (const key of reviewCosts) trip.costs[key].review = true;
    trip.milesRoute = 'unknown';
    trip.routeNote = 'مسار السعودية ومقعد الفرسان يحتاجان تحقق للتواريخ الجديدة.';
    trip.checklist.forEach(task => { task.done = false; });
    trip.events = '';
    trip.post = {};
  }
  return copy;
}

export function cardSummary(group: TripCardGroup, trip: TripCard, budget: number, today: string,
  catalog?: CountryCatalog, estimate?: {days:number; mode:TripCard['mode']}) {
  const groupDays = cardDays(group);
  const days = estimate?.days ?? groupDays;
  const mode = estimate && trip.milesRoute === 'available' ? estimate.mode : cardMode(trip);
  const {rows, total, partial, milesPending} = costForTripDays(trip, days, mode);
  const remaining = budget - total;
  const period = dateText(group.start) + ' إلى ' + dateText(group.end);
  const periodLabel = group.historical ? 'أساس الأسعار ' : 'تواريخ المجموعة ';
  const country = countryPackage(trip.country,catalog);
  const preparation = countryPreparation(trip.country,catalog);
  const outstanding = trip.checklist.filter(task => !task.done).map(task => '• ' + task.text);
  return [
    'بطاقة السفرة · ' + trip.city + (trip.neighborhood ? ' — ' + trip.neighborhood : ''),
    days === groupDays ? period + ' · شخص واحد' : 'التقدير لـ' + tripDaysText(days) + ' · شخص واحد · ' + periodLabel + period,
    trip.hotel ? 'الفندق · ' + trip.hotel + (trip.hotelNotes ? ' · ' + trip.hotelNotes : '') : 'الفندق يحتاج تحديد',
    '',
    mode === 'cash' ? 'الطيران نقدًا' : 'الطيران بالأميال',
    ...rows.map(({key, cost, units, subtotal}) => {
      const value = cost.value === null ? 'غير مدخل' : key === 'milesCount' ? cardNumber(cost.value) + ' ميل' : cardMoney(cost.value);
      const breakdown = key === 'hotel' || key === 'daily' ? ' × ' + (key === 'hotel' ? stayNights(units) : tripDaysText(units)) + (subtotal === null ? '' : ' = ' + cardMoney(subtotal)) : '';
      const tags = [cost.estimated && !cost.source.includes('تقديري') && 'تقديري', costNeedsReview(key, cost, today) && 'يحتاج تحقق'].filter(Boolean);
      return '• ' + costLabels[key] + ' · ' + value + breakdown + (tags.length ? ' · ' + tags.join(' · ') : '') + ' · ' + cost.source + ' · آخر تحقق ' + (cost.checkedOn || '—');
    }),
    milesPending ? 'التوفر غير متحقق' : null,
    (partial ? 'مجموع البنود المدخلة' : 'المجموع التقديري') + ' · ' + cardMoney(total),
    'سقف الميزانية ' + cardMoney(budget) + ' · ' + (partial ? 'الميزانية تحتاج تحقق بعد استكمال البنود' :
      remaining < 0 ? 'فوق السقف بـ ' + cardMoney(-remaining) : 'المتبقي ' + cardMoney(remaining)),
    '',
    'من باب السكن',
    ...trip.walk.map(place => '• ' + place.kind + ' · ' + place.description + ' · ' + (place.car ? 'يحتاج سيارة' : place.minutes ? formatWalkingMinutes(place.minutes) + ' مشيًا' : 'مدة المشي تحتاج تحقق') + (place.rating ? ' · ' + (place.rating === 'yes' ? 'يستاهل' : 'ما يستاهل') : '') + '\n  ' + walkMap(place.query)),
    '',
    'باقي قبل الحجز',
    ...(outstanding.length ? outstanding : ['اكتملت قائمة قبل الحجز.']),
    '',
    'قبل ما تطلع' + (country ? ' · ' + country.name_ar : ''),
    ...preparation.map(item => '• ' + item.label + ' · ' + item.value + (item.url ? ' · ' + item.url : '')),
    '',
    'فعاليات في التواريخ',
    trip.events || 'فعاليات التواريخ تحتاج تحقق.',
    ...(trip.post.actual !== undefined || trip.post.returnAgain ? [
      '',
      'بعد ما ترجع',
      trip.post.actual !== undefined ? 'التكلفة الفعلية · ' + cardMoney(trip.post.actual) : null,
      trip.post.actual !== undefined && trip.post.estimate !== undefined ? 'الفرق (الفعلي − التقدير المدخل) · ' + cardMoney(trip.post.actual - trip.post.estimate) : null,
      trip.post.returnAgain ? 'أرجع لها؟ ' + (trip.post.returnAgain === 'yes' ? 'إي' : 'لا') : null,
    ] : []),
  ].filter(line => line !== null).join('\n');
}
