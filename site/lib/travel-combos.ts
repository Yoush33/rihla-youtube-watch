import data from './travel-combos.json';
import {monthUnsuitable,type CountryCatalog} from './country-catalog';
import type {TravelCombo} from './catalog-import-schema';
import {monthNames} from './world';
export type {TravelCombo} from './catalog-import-schema';

// Some entry and border notes in the source are too broad for a route decision.
const reviewNotes: Record<string,string> = {
  'bosnia-croatia':'تحقق من قرار الإعفاء البوسني لسنة سفرك وشروط دخول كرواتيا.',
  caucasus:'تحقق من وضع المعبر واتجاه العبور قبل اعتماد أي تنقل بري.',
  'central-europe':'راجع صلاحية التأشيرة وعدد الدخول وفق دول المسار.',
};
function reviewTravelCombo(combo:TravelCombo):TravelCombo {
  return {
    ...combo,
    watch:reviewNotes[combo.id] ?? combo.watch,
    links:combo.id === 'caucasus'
      ? [...combo.links.slice(0,1),'تحقق من الطيران بين باكو وتبليسي ومن إجراءات المعبر إذا خططت للتنقل برًا.']
      : combo.links,
  };
}

export const travelCombos = data.map(reviewTravelCombo);

export function combosForMonth(days:number,month:number,catalog?:CountryCatalog,imports?:TravelCombo[]) {
  if (days < 7) return [];
  const monthName = monthNames[month - 1];
  return (imports ? imports.map(reviewTravelCombo) : travelCombos).filter(combo => !combo.countries.some(code => monthUnsuitable(code,month,catalog)))
    .map(combo => {
      const [min,max = min] = combo.days.split(/[–-]/).map(Number);
      return {...combo, preferred:combo.best.includes(monthName), durationFits:days >= min && days <= max};
    })
    .sort((a,b) => Number(b.preferred) - Number(a.preferred) || Number(b.durationFits) - Number(a.durationFits));
}
