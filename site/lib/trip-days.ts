import {z} from 'zod';
import type {ReadyPlan} from './ready-plan-schema';

export const daySlots = {morning:'صباح', noon:'ظهر', evening:'مساء'} as const;
export type DaySlot = keyof typeof daySlots;
const slotStart:Record<DaySlot,number> = {morning:9*60, noon:13*60, evening:19*60};

const webUrl = z.string().max(2000).url().refine(value=>/^https?:\/\//.test(value));
export const dayItemSchema = z.object({
  id:z.string().min(1).max(80),
  slot:z.enum(['morning','noon','evening']),
  kind:z.enum(['note','place','event']),
  name:z.string().min(1).max(300),
  price:z.number().min(0).max(1_000_000).nullable(),
  walk:z.number().min(0).max(1440).nullable(),
  maps:webUrl.optional(),
});
export type DayItem = z.infer<typeof dayItemSchema>;
export const dayListSchema = z.array(z.array(dayItemSchema).max(15)).max(30);
export type DayList = z.infer<typeof dayListSchema>;
export const departTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export type DayKind = 'arrival'|'explore'|'move'|'rest'|'departure';
export const dayKindLabels:Record<DayKind,string> = {arrival:'وصول', explore:'استكشاف', move:'انتقال', rest:'راحة', departure:'مغادرة'};

export type TripDay = {
  index:number; stopIndex:number; city:string; country:string;
  kind:DayKind; hotelNight:number|null; daily:number|null;
};

let counter = 0;
export const newItemId = (prefix:string) => prefix + '-' + Date.now().toString(36) + '-' + (counter++).toString(36);

/** يبني قائمة الأيام من محطات الخطة وعدد لياليها. */
export function tripDays(plan:ReadyPlan, nights:number[]):TripDay[] {
  const out:TripDay[] = [];
  const daily = plan.cost_estimate.daily.amount;
  plan.stops.forEach((stop,stopIndex)=>{
    const count = nights[stopIndex] ?? stop.nights;
    for (let local = 0; local < count; local++) {
      const record = stop.day_plan[local];
      const kind:DayKind = out.length === 0 ? 'arrival' : local === 0 ? 'move' : record?.rest ? 'rest' : 'explore';
      out.push({index:out.length, stopIndex, city:stop.city, country:stop.country ?? plan.country, kind,
        hotelNight:stop.hotel.night_price.amount, daily});
    }
  });
  const last = plan.stops.length - 1;
  out.push({index:out.length, stopIndex:last, city:plan.stops[last].city, country:plan.stops[last].country ?? plan.country,
    kind:'departure', hotelNight:null, daily});
  return out;
}

/** الجدول المبدئي: نصوص الخطة لكل يوم (صباح/ظهر/مساء). */
export function defaultDayItems(plan:ReadyPlan, nights:number[]):DayList {
  const days = tripDays(plan,nights);
  return days.map(day=>{
    const stop = plan.stops[day.stopIndex];
    const before = days.filter(other=>other.stopIndex === day.stopIndex && other.index < day.index && other.kind !== 'departure').length;
    const last = stop.day_plan.at(-1);
    const record = day.kind !== 'departure' ? stop.day_plan[before] :
      last?.evening.startsWith('المغادرة') ? last :
        {morning:'فطور قريب وتسجيل الخروج', noon:'الانتقال إلى المطار حسب موعد الرحلة', evening:'المغادرة إلى الرياض'};
    if (!record || (day.kind !== 'departure' && record.evening.startsWith('المغادرة'))) return [];
    return (Object.keys(daySlots) as DaySlot[]).filter(slot=>record[slot]).map(slot=>({
      id:'d' + day.index + '-' + slot, slot, kind:'note' as const, name:record[slot], price:null, walk:null,
    }));
  });
}

/** يرتّب عناصر اليوم حسب الفترة ويحسب وقت الوصول المتوقع لكل عنصر. */
export function scheduleDay(items:readonly DayItem[]) {
  const used:Record<DaySlot,number> = {morning:0, noon:0, evening:0};
  return (Object.keys(daySlots) as DaySlot[]).flatMap(slot=>items.filter(item=>item.slot === slot)).map(item=>{
    const travel = item.walk ?? 0;
    const start = slotStart[item.slot] + used[item.slot] + travel;
    used[item.slot] += travel + 75;
    return {item, eta:clock(start)};
  });
}

export function clock(minutes:number) {
  const value = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return String(Math.floor(value / 60)).padStart(2,'0') + ':' + String(value % 60).padStart(2,'0');
}

/** مجموع اليوم: ليلة السكن + المصروف اليومي + أسعار العناصر المعروفة. */
export function dayTotal(day:TripDay, items:readonly DayItem[]) {
  const parts = [day.hotelNight, day.daily, ...items.map(item=>item.price)];
  const known = parts.filter((value):value is number=>typeof value === 'number');
  const missing = (day.kind !== 'departure' && day.hotelNight === null) || day.daily === null || items.some(item=>item.kind !== 'note' && item.price === null);
  return {total:known.reduce((sum,value)=>sum + value,0), partial:missing};
}

export function shiftDate(date:string, days:number) {
  const time = Date.parse(date + 'T00:00:00Z') + days * 86400000;
  return new Date(time).toISOString().slice(0,10);
}

/** منطقة زمنية تمثيلية لكل دولة، لحساب وقت الوصول المحلي. */
export const countryZones:Record<string,string> = {
  AE:'Asia/Dubai', AL:'Europe/Tirane', AM:'Asia/Yerevan', AT:'Europe/Vienna', AU:'Australia/Sydney', AZ:'Asia/Baku',
  BA:'Europe/Sarajevo', BE:'Europe/Brussels', BG:'Europe/Sofia', BH:'Asia/Bahrain', CA:'America/Toronto', CH:'Europe/Zurich',
  CN:'Asia/Shanghai', CY:'Asia/Nicosia', CZ:'Europe/Prague', DE:'Europe/Berlin', DK:'Europe/Copenhagen', EG:'Africa/Cairo',
  ES:'Europe/Madrid', FI:'Europe/Helsinki', FR:'Europe/Paris', GB:'Europe/London', GE:'Asia/Tbilisi', GR:'Europe/Athens',
  HR:'Europe/Zagreb', HU:'Europe/Budapest', ID:'Asia/Makassar', IE:'Europe/Dublin', IN:'Asia/Kolkata', IS:'Atlantic/Reykjavik',
  IT:'Europe/Rome', JO:'Asia/Amman', JP:'Asia/Tokyo', KE:'Africa/Nairobi', KG:'Asia/Bishkek', KR:'Asia/Seoul', KW:'Asia/Kuwait',
  KZ:'Asia/Almaty', LK:'Asia/Colombo', MA:'Africa/Casablanca', ME:'Europe/Podgorica', MK:'Europe/Skopje', MT:'Europe/Malta',
  MU:'Indian/Mauritius', MV:'Indian/Maldives', MX:'America/Mexico_City', MY:'Asia/Kuala_Lumpur', NL:'Europe/Amsterdam',
  NO:'Europe/Oslo', NP:'Asia/Kathmandu', OM:'Asia/Muscat', PH:'Asia/Manila', PK:'Asia/Karachi', PL:'Europe/Warsaw',
  PT:'Europe/Lisbon', QA:'Asia/Qatar', RO:'Europe/Bucharest', RS:'Europe/Belgrade', SC:'Indian/Mahe', SE:'Europe/Stockholm',
  SG:'Asia/Singapore', SI:'Europe/Ljubljana', TH:'Asia/Bangkok', TN:'Africa/Tunis', TR:'Europe/Istanbul', TZ:'Africa/Dar_es_Salaam',
  US:'America/New_York', UZ:'Asia/Tashkent', VN:'Asia/Ho_Chi_Minh', ZA:'Africa/Johannesburg',
};

/** وقت الوصول بالتوقيت المحلي للوجهة، من وقت الإقلاع من الرياض ومدة الرحلة. */
export function arrivalTime(startDate:string, departTime:string, hours:number, country:string) {
  const [h,m] = departTime.split(':').map(Number);
  const departUtc = Date.parse(startDate + 'T00:00:00Z') + (h * 60 + m - 180) * 60000; // الرياض UTC+3
  const arriveUtc = departUtc + hours * 3600000;
  const zone = countryZones[country];
  if (!zone) return null;
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'})
    .formatToParts(new Date(arriveUtc));
  const get = (type:string) => parts.find(part=>part.type === type)?.value ?? '';
  return {date:get('year') + '-' + get('month') + '-' + get('day'), time:get('hour') + ':' + get('minute')};
}

/** لما تتغير الليالي: الجدول المبدئي الجديد، مع إبقاء اللي أضافه المستخدم في نفس اليوم إذا باقي. */
export function mergeDays(previous:DayList, defaults:DayList):DayList {
  return defaults.map((items,index)=>{
    const old = previous[index];
    if (!old) return items;
    const custom = old.filter(item=>!item.id.startsWith('d'));
    const keptDefaults = items.filter(item=>old.some(other=>other.id === item.id));
    return [...(old.some(item=>item.id.startsWith('d')) ? keptDefaults : items), ...custom];
  });
}
