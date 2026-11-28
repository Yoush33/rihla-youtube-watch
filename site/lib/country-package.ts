import data from './country-package.json';
import {countryCatalog,countryCatalogCodes,type CountryCatalog} from './country-catalog';
import {arabicCapital, arabicCountryName, arabicCurrency, arabicLanguage} from './country-localization';

type Sourced<Value> = {value: Value; source: string; checked: string};
type VisaIndicator = Sourced<string> & {official: string | null; status: string};
type CountryNote = Sourced<string> & {topic: string; status: string; url?: string};
type CountryRecord = {
  iso2: string;
  name_ar: string;
  updated: string;
  static: {
    capital: Sourced<string[]>;
    currencies: Sourced<string[]>;
    languages: Sourced<string[]>;
    calling_code: Sourced<string | null>;
    region: Sourced<string>;
    timezones?: Sourced<string[]>;
  };
  semi_static: {
    visa_saudi_passport: VisaIndicator;
    public_holidays: Sourced<{date: string; name: string}[]> & {note: string};
  };
  manual: CountryNote[];
};

const checked = '2026-11-24';
const official = (value: string, source: string, url: string): Sourced<string> & {url:string} => ({value, source, url, checked});
const summaries: Record<string, ReturnType<typeof official>> = {
  TR: official('الخارجية التركية تذكر إعفاء الجواز السعودي العادي حتى ٩٠ يومًا ضمن أي ١٨٠ يومًا.', 'الخارجية التركية', 'https://www.mfa.gov.tr/visa-information-for-foreigners.en.mfa'),
  GE: official('القرار الجورجي رقم ٢٥٥ يدرج السعوديين ضمن الإعفاء حتى سنة كاملة. راجع شروط الدخول والتأمين قبل الحجز.', 'الجريدة التشريعية في جورجيا', 'https://www.matsne.gov.ge/en/document/view/2867361'),
  IN: official('التأشيرة السياحية الإلكترونية متاحة للسعوديين. راجع فئة الزيارة والرسوم وقدّم قبل الوصول بأربعة أيام على الأقل.', 'سفارة الهند في الرياض', 'https://www.eoiriyadh.gov.in/page/visa-services/'),
  AZ: official('إعفاء سياحي مؤقت للجواز السعودي العادي من ١٥ فبراير ٢٠٢٦ إلى ١٥ فبراير ٢٠٢٧، حتى ٣ زيارات و٣٠ يومًا لكل زيارة. تحقق إذا كانت سفرتك قرب نهاية الفترة أو بعدها.', 'دائرة الهجرة الأذربيجانية', 'https://migration.gov.az/en/news_detail/16753'),
  BA: official('قرار ٢٠٢٦ أعفى السعوديين من ١ يونيو إلى ٣٠ سبتمبر، حتى ٦٠ يومًا ضمن الفترة. انتهت فترة ٢٠٢٦. تحقق من التأشيرة والاستثناءات أو أي قرار جديد لسنة سفرك.', 'الخارجية البوسنية', 'https://www.mvp.gov.ba/en/org_cmd57sdlc000nn43u2rk8pgsd_639274788685078781'),
  ME: official('من ١ نوفمبر ٢٠٢٦ تُطلب تأشيرة مسبقة من السعوديين وفق الخارجية. راجع استثناءات التأشيرة أو الإقامة السارية وشروطها.', 'حكومة الجبل الأسود', 'https://www.gov.me/en/diplomatic-missions/embassies-and-consulates-of-montenegro/saudi-arabia'),
  TH: official('الهيئة السياحية التايلندية تدرج السعوديين ضمن إعفاء السياحة حتى ٣٠ يومًا اعتبارًا من ١٥ سبتمبر ٢٠٢٦. راجع شروط منفذ الدخول.', 'هيئة السياحة التايلندية', 'https://www.tatnews.org/2026/09/thailand-introduces-new-30-day-and-15-day-visa-exemption-rules-from-15-september/'),
  LK: official('دائرة الهجرة تدرج السعوديين ضمن التصريح السياحي الإلكتروني المجاني حتى ٣٠ يومًا. قدّم على ETA قبل الوصول وتحقق من استمرار البرنامج.', 'دائرة الهجرة السريلانكية', 'https://www.immigration.gov.lk/content/files/visa/Free%20Tourist%20Visas%20for%20Nationals%20of%2040%20Selected%20Countries.pdf'),
};

const officialLinks: Record<string, string> = {
  MY: 'https://www.imi.gov.my/index.php/en/main-services/visa/visa-requirement-by-country/',
  MA: 'https://diplomatie.ma/ar/زيارة-المغرب-0',
};

const verifiedNotes: Record<string, CountryNote[]> = {
  GE: [{
    topic:'التأمين', status:'مفحوص · رسمي',
    ...official('من ١ يناير ٢٠٢٦، وثيقة تأمين صحي وحوادث تغطي كامل الزيارة وبحد أدنى ٣٠٬٠٠٠ لاري للسائح، بالإنجليزية أو الجورجية. راجع الاستثناءات في النص الرسمي.', 'البوابة القنصلية الجورجية', 'https://www.geoconsul.gov.ge/en/news/69'),
  }],
  IN: [{
    topic:'رسوم التأشيرة', status:'مفحوص · رسمي',
    ...official('الجدول الرسمي للسعوديين يسرد ١٠ دولارات من أبريل إلى يونيو و٢٥ دولارًا من يوليو إلى مارس لفئة ٣٠ يومًا. راجع المبلغ النهائي ورسوم الدفع في البوابة.', 'جدول رسوم التأشيرة الإلكترونية الهندية', 'https://indianvisaonline.gov.in/evisa/images/Etourist_fee_final.pdf'),
  }, {
    topic:'فعاليات', status:'مفحوص · المنظم',
    ...official('مهرجان Serendipity للفنون في بنجيم، غوا، من ١٣ إلى ٢٠ ديسمبر ٢٠٢٦. راجع التسجيل وشروط كل فعالية.', 'موقع المهرجان', 'https://www.serendipityartsfestival.com/'),
  }],
};

const countryRecords = new Map<string, CountryRecord>(data.map(record =>
  [record.iso2, {...record, name_ar:arabicCountryName(record.iso2,record.name_ar)}]));
export const countryPackageCodes = [...new Set([...countryRecords.keys(), ...countryCatalogCodes])];

export function countryPackage(code: string,catalog?: CountryCatalog): CountryRecord | undefined {
  const current = countryCatalog(code,catalog);
  const previous = countryRecords.get(code.toUpperCase());
  if (!current) return previous;
  const stamp = <T,>(field:{value:T;source:string}) => ({...field, checked:current.updated});

  return {
    iso2:current.iso2,
    name_ar:current.name_ar,
    updated:current.updated,
    static:{
      capital:stamp(current.static.capital),
      currencies:stamp(current.static.currencies),
      languages:stamp(current.static.languages),
      calling_code:stamp(current.static.calling_code),
      region:previous?.static.region ?? stamp({value:current.region_rihla, source:'تصنيف الدول في ملف رِحلة'}),
      ...(previous?.static.timezones ? {timezones:previous.static.timezones} : {}),
    },
    semi_static:{
      visa_saudi_passport:current.visa_saudi_passport,
      public_holidays:current.public_holidays.value.length ? {
        ...current.public_holidays,
        note:'لقطة من التقويم؛ راجع التواريخ محليًا قبل الحجز',
      } : previous?.semi_static.public_holidays ?? {
        ...current.public_holidays,
        note:'التقويم المرفق ما فيه عطلات مسجّلة لهذه الدولة',
      },
    },
    manual:current.manual,
  };
}

export function countryDisplayFacts({static:info}:CountryRecord):CountryRecord['static'] {
  return {
    ...info,
    capital:{...info.capital, value:info.capital.value.map(arabicCapital)},
    currencies:{...info.currencies, value:info.currencies.value.map(arabicCurrency)},
    languages:{...info.languages, value:info.languages.value.map(arabicLanguage)},
  };
}

export function countryVisa(code: string,catalog?: CountryCatalog) {
  const record = countryPackage(code,catalog);
  if (!record) return undefined;
  const raw = record.semi_static.visa_saudi_passport;
  const reviewed = summaries[record.iso2];
  return {
    raw,
    reviewed,
    officialLink: reviewed?.url ?? raw.official ?? officialLinks[record.iso2],
    applyLink: record.iso2 === 'IN' ? raw.official : undefined,
    indicator: reviewed ?? raw,
  };
}

export function countryNotes(code: string,catalog?: CountryCatalog) {
  const record = countryPackage(code,catalog);
  if (!record) return [];
  const notes = record.manual.map(note => ({...note, status:note.status === 'مفحوص' ? 'مفحوص في الملف' : note.status}));
  const verified = verifiedNotes[record.iso2] ?? [];
  // The archive retains each supplied note. Keep superseded advice out of the active guide.
  const replaced: Record<string, string[]> = {GE:['التأمين'], IN:['التأشيرة','فعاليات'], BA:['التأشيرة'], ME:['التأشيرة']};
  return [...verified, ...notes.filter(note => !(replaced[record.iso2] ?? []).includes(note.topic))];
}

const prepTips: Record<string, {sim?: string; cash?: string; customs: string}> = {
  TR: {cash:'للأسواق والحمّام.', customs:'البس لبسًا محتشمًا عند زيارة المساجد.'},
  GE: {cash:'للحمّامات والرحلات القصيرة بالتاكسي.', customs:'راعِ اللباس المحتشم عند زيارة الكنائس والأديرة.'},
  IN: {sim:'جهّز الجواز للاستفسار عن شريحة محلية، أو راجع توفر eSIM.', cash:'للتوك توك والمحلات الصغيرة.', customs:'اسأل عن خلع الحذاء عند دخول المعابد والبيوت.'},
  AZ: {customs:'استأذن قبل تصوير الأشخاص واتبع قواعد الزيارة في المساجد.'},
  BA: {customs:'راعِ اللباس وقواعد التصوير عند زيارة دور العبادة.'},
  MY: {customs:'راجع قواعد اللباس وخلع الحذاء عند دخول المساجد والمعابد.'},
  ME: {customs:'اتبع تعليمات اللباس والتصوير في الأديرة والكنائس.'},
  TH: {customs:'غطّ الكتفين والركبتين عند زيارة المعابد واتبع تعليمات خلع الحذاء.'},
  LK: {customs:'راعِ اللباس المحتشم وتعليمات التصوير في المعابد.'},
  MA: {customs:'استأذن قبل تصوير الناس، وراجع السماح بالزيارة في المواقع الدينية.'},
};

export type CountryPreparation = Sourced<string> & {label: string; url?: string};
export function countryPreparation(code: string,catalog?: CountryCatalog): CountryPreparation[] {
  const record = countryPackage(code,catalog);
  const visa = countryVisa(code,catalog);
  if (!record || !visa) return [];
  const tips = prepTips[record.iso2];
  const currency = record.static.currencies;
  const editorial = (label: string, value: string) => ({label, value, source:'إرشاد تحريري من رِحلة', checked});
  const items: CountryPreparation[] = [
    {label:'التأشيرة', ...visa.indicator, url:visa.officialLink},
    editorial('الشريحة', tips?.sim ?? 'تحقق من تغطية الشريحة المحلية أو eSIM في منطقة السكن.'),
    {...currency, label:'الكاش', value:`العملة المحلية ${currency.value.map(arabicCurrency).join('، ')}. خذ مبلغًا صغيرًا ${tips?.cash ?? 'للمصاريف الصغيرة.'}`},
    editorial('العادات', tips?.customs ?? 'اتبع تعليمات الزيارة واللباس والتصوير في الموقع.'),
  ];
  if (record.iso2 === 'GE') {
    // Keep the original checklist slot for the weather item stable across upgrades.
    const insurance = verifiedNotes.GE[0];
    items.push(editorial('الطقس', 'راجع توقعات تبليسي وجهّز ملابس مناسبة لبرد ديسمبر.'));
    items.push({...insurance, label:insurance.topic});
  }
  return items;
}

export function countryHolidayYears(record: CountryRecord) {
  return [...new Set(record.semi_static.public_holidays.value.map(holiday => holiday.date.slice(0,4)))].sort();
}

export function countryHolidays(code: string, after: string, through: string,catalog?: CountryCatalog) {
  const holidays = countryPackage(code,catalog)?.semi_static.public_holidays.value ?? [];
  return holidays.filter(holiday => holiday.date >= after && holiday.date <= through).sort((a,b) => a.date.localeCompare(b.date));
}
