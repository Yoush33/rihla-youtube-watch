import {z} from 'zod';
import countries from '../public/countries.json';
import cityCatalog from './place-image-city-keys.json';
import {countryCodes} from './country-codes';
import {arabicCapital,arabicCountryName} from './country-localization';
import {destinations} from './travel';

const knownCountryCodes = new Set(countryCodes);
const keyFor = (name:string) => name.normalize('NFKD').toLowerCase()
  .replace(/[\p{M}ـ]/gu,'').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim();

const countryNames = new Map<string,string>();
for (const {code,name,en} of countries) {
  for (const alias of [code,name,en,arabicCountryName(code,name)]) countryNames.set(keyFor(alias),code);
}
for (const alias of ['EGY','جمهورية مصر العربية','Arab Republic of Egypt']) countryNames.set(keyFor(alias),'EG');
for (const alias of ['سلطنة عمان','Sultanate of Oman']) countryNames.set(keyFor(alias),'OM');

const cityNames = new Map<string,string>();
const cityCountries = new Map<string,string>();
for (const [code,names] of Object.entries(cityCatalog)) {
  for (const name of names) {
    const key = keyFor(name);
    const previous = cityCountries.get(key);
    cityCountries.set(key,previous === undefined || previous === code ? code : '');
  }
}

function addCity(name:string, aliases:readonly string[], country?:string) {
  const key = keyFor(name);
  for (const alias of aliases) cityNames.set(keyFor(alias),key);
  if (country) cityCountries.set(key,country);
}

for (const place of destinations) addCity(place.name,[place.id,place.en],countryNames.get(keyFor(place.country)));
addCity('عمّان',['Amman','AMM','مطار الملكة علياء الدولي','Queen Alia International Airport'],'JO');
addCity('مسقط',['Muscat','Masqat','MCT','مطار مسقط','مطار مسقط الدولي','Muscat airport','Muscat International Airport','Seeb International Airport'],'OM');
addCity('صلالة',['Salalah','SLL','مطار صلالة','مطار صلالة الدولي','Salalah International Airport'],'OM');
addCity('القاهرة',['Cairo','CAI','مطار القاهرة','مطار القاهرة الدولي','Cairo airport','Cairo International Airport'],'EG');
addCity('الجيزة',['Giza','Sphinx International Airport','مطار سفنكس الدولي','SPX'],'EG');
addCity('الإسكندرية',['Alexandria','Borg El Arab International Airport','مطار برج العرب الدولي','HBE'],'EG');
addCity('الأقصر',['Luxor','LXR'],'EG');
addCity('أسوان',['Aswan','ASW'],'EG');
addCity('شرم الشيخ',['Sharm El Sheikh','Sharm Al Sheikh','SSH'],'EG');
addCity('الغردقة',['Hurghada','HRG'],'EG');
addCity('دهب',['Dahab'],'EG');
addCity('بورسعيد',['Port Said','بور سعيد'],'EG');
addCity('مرسى علم',['Marsa Alam','RMF'],'EG');
addCity('أنطاليا',['Antalya','AYT'],'TR');
addCity('تبليسي',['Tbilisi','تبيليسي','TBS'],'GE');
addCity('فاركالا',['Varkala','فاركلا'],'IN');
addCity('غوا',['Goa','GOA'],'IN');
addCity('كوتشي',['Kochi','Cochin','كوشي','COK'],'IN');
addCity('أوزنجول',['Uzungöl','أوزونغول','أوزونجول'],'TR');
addCity('كازبيغي',['Kazbegi','Stepantsminda','كازبيك','ستيبانتسميندا'],'GE');
addCity('باتومي',['Batumi','BUS'],'GE');
addCity('كرابي',['Krabi','KBV'],'TH');
addCity('شيانغ ماي',['Chiang Mai','تشيانغ ماي','تشانغ ماي','CNX'],'TH');
addCity('لنكاوي',['Langkawi','لانكاوي','LGK'],'MY');
addCity('غابالا',['Gabala','Qabala','Qəbələ','قبالا','GBL'],'AZ');
addCity('إيلا',['Ella'],'LK');

function cityKey(value:string) {
  const name = value.trim().replace(/\s*\([a-z]{3}\)$/i,'').replace(/^مطار\s+|\s+airport$/giu,'');
  const key = keyFor(value);
  return cityNames.get(key) ?? cityNames.get(keyFor(name)) ?? keyFor(arabicCapital(name));
}

const destinationExclusionSchema = z.discriminatedUnion('kind',[
  z.object({kind:z.literal('country'),code:z.string().refine(code=>knownCountryCodes.has(code))}).strict(),
  z.object({kind:z.literal('city'),name:z.string().trim().min(1).max(100).refine(name=>!!keyFor(name))}).strict(),
]);
export type DestinationExclusion = z.infer<typeof destinationExclusionSchema>;
export type DestinationExclusions = readonly DestinationExclusion[];
export const defaultDestinationExclusions:DestinationExclusions = [{kind:'country',code:'EG'},{kind:'city',name:'مسقط'}];
export const destinationExclusionsLimit = 50;
export const exclusionKey = (item:DestinationExclusion) => item.kind==='country' ? 'country:'+item.code : 'city:'+cityKey(item.name);
export const destinationExclusionsSchema = z.array(destinationExclusionSchema).max(destinationExclusionsLimit)
  .refine(items=>new Set(items.map(exclusionKey)).size===items.length);
export function destinationExclusion(value:unknown) {
  const parsed = destinationExclusionSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

type DestinationReference = {country?:string;city?:string};
type RouteReference = {
  country?:string;
  countries?:readonly string[];
  stops?:readonly DestinationReference[];
  transfers?:readonly {from:string;to:string}[];
  route?:readonly string[];
  links?:readonly string[];
  fly?:string;
};

export function isDestinationExcluded({country,city}:DestinationReference, exclusions:DestinationExclusions = defaultDestinationExclusions) {
  const cityName = city ? cityKey(city) : '';
  const countryCode = (country ? countryNames.get(keyFor(country.replace(/^country-/i,''))) : undefined)
    ?? cityCountries.get(cityName);
  return exclusions.some(item=>item.kind==='country' ? item.code===countryCode : cityKey(item.name)===cityName);
}

function routePlaces(value:string) {
  return value.replace(/\(([^)]*)\)/g,', $1, ')
    .split(/[،,؛;|:·←→↔]|\s+[–—-]\s+|\s+(?:أو|or|عبر|via|واطلع من|وغادر من)\s+/i)
    .map(place=>place.trim().replace(/^(?:ادخل|اطلع من|غادر من|الوصول إلى|المغادرة من)\s+/,'')
      .replace(/\s+[\d٠-٩۰-۹]+(?:\s*[–-]\s*[\d٠-٩۰-۹]+)?\s+(?:لي(?:ال|ل)\S*|أيام|يوم|nights?|days?)$/i,''));
}

export function isRouteExcluded(plan:RouteReference, exclusions:DestinationExclusions = defaultDestinationExclusions) {
  if ([plan.country,...(plan.countries??[])].some(country=>isDestinationExcluded({country},exclusions))) return true;
  if (plan.stops?.some(stop=>routePlaces(stop.city??'').some(city=>isDestinationExcluded({city,country:stop.country},exclusions)))) return true;
  const segments = [...(plan.route??[]),...(plan.links??[]),plan.fly??'',...(plan.transfers??[]).flatMap(({from,to})=>[from,to])];
  return segments.some(segment=>routePlaces(segment).some(place=>{
    const country=cityCountries.get(cityKey(place))||place;
    return isDestinationExcluded({country,city:place},exclusions);
  }));
}
