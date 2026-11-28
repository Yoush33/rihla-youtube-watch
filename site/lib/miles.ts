import chart from './miles-chart.json';

export type MilesZone = {label:string; reward:number; reward_plus:number; business:number};
export type MilesQuote = {
  zone:string; label:string;
  reward:number; rewardPlus:number; business:number; // ذهاب وعودة
  note:string;
};
export type MilesSettings = {balance:number|null; prefer:boolean};

export const milesChart = chart as unknown as {
  program:string; source:string; checked_date:string; note:string;
  zones:Record<string,MilesZone>; countries:Record<string,string>;
  south_india_cities:string[]; los_angeles_cities:string[];
};

/** يرجع سعر التذكرة ذهاب وعودة بأميال الفرسان، أو null إذا الدولة مو في جدول السعودية. */
export function milesQuote(country:string, city = ''):MilesQuote|null {
  let zone = milesChart.countries[country.toUpperCase()];
  if (!zone) return null;
  if (country === 'IN' && milesChart.south_india_cities.some(name=>city.includes(name))) zone = 'subcontinent_b';
  if (country === 'US' && milesChart.los_angeles_cities.some(name=>city.includes(name))) zone = 'north_america_b';
  const row = milesChart.zones[zone];
  if (!row) return null;
  const note = country === 'IN' ? 'تأكد من مدينة الوصول: جنوب الهند منطقة غير شمالها.' :
    'تنفع بس إذا السعودية تطير لمدينة الوصول.';
  return {zone,label:row.label,reward:row.reward*2,rewardPlus:row.reward_plus*2,business:row.business*2,note};
}

const storageKey = 'rihla-miles';

export function readMilesSettings():MilesSettings {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(storageKey) ?? 'null') as Partial<MilesSettings>|null;
    const balance = typeof raw?.balance === 'number' && Number.isFinite(raw.balance) && raw.balance >= 0 ? Math.floor(raw.balance) : null;
    return {balance,prefer:raw?.prefer === true};
  } catch {
    return {balance:null,prefer:false};
  }
}

export function writeMilesSettings(settings:MilesSettings) {
  try {
    globalThis.localStorage?.setItem(storageKey,JSON.stringify(settings));
    globalThis.dispatchEvent?.(new Event(storageKey));
  } catch {
    /* التخزين المحلي غير متاح */
  }
}

export const milesEventName = storageKey;

/** مقارنة الرصيد بسعر التذكرة. */
export function milesGap(balance:number|null, needed:number) {
  if (balance === null) return null;
  return balance - needed;
}
