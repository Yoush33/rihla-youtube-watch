export const guideSections = {
  entry:'الدخول',money:'المال',connect:'الاتصال',transport:'التنقل',
  food:'الأكل والعبادة',customs:'العادات',safety:'الأمان',stay:'السكن',
  cities:'المدن',holidays:'الأعياد والإجازات',peak:'مواسم الذروة',events:'الفعاليات السنوية',
};
export type GuideSection = keyof typeof guideSections;
export type GuideFact = {
  label:string; value:string; source:string; checked:string;
  date?:string; end?:string; month?:number; year?:number; provisional?:boolean; tentative?:boolean; lawSource?:string; status?:"confirmed"|"uncertain"|"estimate"|"recommendation"; scope?:string; scopeSource?:string; regional?:boolean; impact?:string; impactSource?:string; fxSource?:string; peak?:boolean; alert?:boolean;
};
export type CountryGuide = {code:string;sections:Record<GuideSection,GuideFact[]>};

export async function loadCountryGuide(code:string):Promise<CountryGuide> {
  if (!/^[A-Z]{2}$/.test(code)) throw new Error('رمز الدولة غير صالح');
  const module = await import(`../countries/guide/${code}.json`);
  return module.default;
}

export function fallsInTrip(fact:GuideFact, start:string, end:string) {
  if (!start || !end || start > end || fact.value === 'غير مؤكد') return false;
  if (fact.date) return fact.date <= end && (fact.end || fact.date) >= start;
  if (!fact.month || fact.month < 1 || fact.month > 12) return false;
  const month = String(fact.month).padStart(2,'0');
  if (fact.year) {
    const slot=fact.year+'-'+month;
    return start.slice(0,7)<=slot && slot<=end.slice(0,7);
  }
  const firstYear = Number(start.slice(0,4));
  const year = firstYear + Number(month < start.slice(5,7));
  return year + '-' + month <= end.slice(0,7);
}

export function tripCalendarAlerts(guide:CountryGuide,start:string,end:string) {
  const matches=[...guide.sections.holidays.filter(fact=>!!fact.date),...guide.sections.peak.filter(fact=>fact.peak === true)]
    .filter(fact=>fact.alert!==false && fallsInTrip(fact,start,end));
  const seen=new Set<string>();
  return matches.filter(fact=>{
    const key=JSON.stringify([fact.label,fact.scope,fact.impact,fact.provisional,fact.tentative]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
