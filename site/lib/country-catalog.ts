import catalog from './country-catalog.json';
import type {CountryCatalogRecord} from './catalog-import-schema';
import {arabicCountryName} from './country-localization';
import {isDestinationExcluded,type DestinationExclusion} from './destination-exclusions';

function withArabicName(record:CountryCatalogRecord):CountryCatalogRecord {
  const name_ar = arabicCountryName(record.iso2,record.name_ar);
  return name_ar === record.name_ar ? record : {...record,name_ar};
}

const records = new Map<string,CountryCatalogRecord>(catalog.map(record => [record.iso2,withArabicName(record as CountryCatalogRecord)]));
export const countryCatalogCodes = [...records.keys()];
export type CountryCatalog = ReadonlyMap<string,CountryCatalogRecord>;
export const countryCatalog = (code:string, catalog:CountryCatalog = records) => catalog.get(code.toUpperCase());
export const countryMonth = (code:string,month:number,catalog?:CountryCatalog) => countryCatalog(code,catalog)?.weather.months.find(row => row.month === month);
export const monthUnsuitable = (code:string,month:number,catalog?:CountryCatalog) => countryMonth(code,month,catalog)?.fit === 'غير مناسب';

export function catalogWithImports(imported?:CountryCatalogRecord[]):CountryCatalog {
  if (!imported) return records;
  const merged = new Map(records);
  for (const item of imported) {
    merged.set(item.iso2,withArabicName(item));
  }
  return merged;
}

export const countryMonthFitRank = {'ممتاز':0, 'مقبول':1, 'غير مناسب':3};

export function recommendedCountryForMonth(month:number, catalog:CountryCatalog = records, exclusions?:readonly DestinationExclusion[]):string {
  const candidates = Array.from(catalog.values()).flatMap(({iso2,weather}) => {
    if (isDestinationExcluded({country:iso2,city:weather.city},exclusions)) return [];
    const row = weather.months.find(item => item.month === month);
    return row ? [{iso2, row, temperatureDistance:Math.abs((row.tmax + row.tmin) / 2 - 24)}] : [];
  });
  candidates.sort((a,b) => countryMonthFitRank[a.row.fit] - countryMonthFitRank[b.row.fit] ||
    a.row.rain_mm - b.row.rain_mm || a.temperatureDistance - b.temperatureDistance || a.iso2.localeCompare(b.iso2));
  return candidates[0]?.iso2 ?? '';
}
