const preferredCountryNames = new Map([
  ['ME','الجبل الأسود'], ['MX','المكسيك'], ['RS','صربيا'], ['UZ','أوزبكستان'],
]);

export const arabicCountryName = (code:string, fallback:string) => preferredCountryNames.get(code.toUpperCase()) ?? fallback;

// Translate the supplied city name so a new or different capital in an import stays intact.
const capitalNames = new Map(Object.entries({
  'abu dhabi':'أبوظبي', 'amsterdam':'أمستردام', 'amman':'عمّان', 'ankara':'أنقرة', 'astana':'أستانا',
  'athens':'أثينا', 'baku':'باكو', 'bangkok':'بانكوك', 'beijing':'بكين', 'belgrade':'بلغراد', 'berlin':'برلين',
  'bern':'برن', 'bishkek':'بيشكيك', 'bloemfontein':'بلومفونتين', 'brussels':'بروكسل', 'bucharest':'بوخارست',
  'budapest':'بودابست', 'cairo':'القاهرة', 'canberra':'كانبرا', 'cape town':'كيب تاون', 'colombo':'كولومبو',
  'copenhagen':'كوبنهاغن', 'dodoma':'دودوما', 'doha':'الدوحة', 'dublin':'دبلن', 'hanoi':'هانوي', 'helsinki':'هلسنكي',
  'islamabad':'إسلام آباد', 'jakarta':'جاكرتا', 'kathmandu':'كاتماندو', 'kuala lumpur':'كوالالمبور',
  'kuwait city':'مدينة الكويت', 'lisbon':'لشبونة', 'ljubljana':'ليوبليانا', 'london':'لندن', 'madrid':'مدريد',
  'male':'ماليه', 'manama':'المنامة', 'manila':'مانيلا', 'mexico city':'مكسيكو سيتي', 'muscat':'مسقط',
  'nairobi':'نيروبي', 'new delhi':'نيودلهي', 'nicosia':'نيقوسيا', 'oslo':'أوسلو', 'ottawa':'أوتاوا', 'paris':'باريس',
  'podgorica':'بودغوريتسا', 'port louis':'بورت لويس', 'prague':'براغ', 'pretoria':'بريتوريا', 'rabat':'الرباط',
  'reykjavik':'ريكيافيك', 'rome':'روما', 'sarajevo':'سراييفو', 'seoul':'سيول', 'singapore':'سنغافورة',
  'skopje':'سكوبيه', 'sofia':'صوفيا', 'stockholm':'ستوكهولم', 'tashkent':'طشقند', 'tbilisi':'تبليسي',
  'tirana':'تيرانا', 'tokyo':'طوكيو', 'tunis':'تونس', 'valletta':'فاليتا', 'victoria':'فيكتوريا', 'vienna':'فيينا',
  'warsaw':'وارسو', 'washington dc':'واشنطن العاصمة', 'yerevan':'يريفان', 'zagreb':'زغرب',
}));

export function arabicCapital(value:string) {
  const key = value.toLowerCase().normalize('NFD').replace(/[\p{M}.,]/gu,'').trim().replace(/\s+/g,' ');
  return capitalNames.get(key) ?? value;
}

const languageCodes = new Map(Object.entries({
  afrikaans:'af', albanian:'sq', arabic:'ar', armenian:'hy', azerbaijani:'az', bosnian:'bs', bulgarian:'bg', chinese:'zh',
  croatian:'hr', czech:'cs', danish:'da', dutch:'nl', english:'en', filipino:'fil', finnish:'fi', french:'fr', georgian:'ka',
  german:'de', greek:'el', hindi:'hi', hungarian:'hu', icelandic:'is', indonesian:'id', irish:'ga', italian:'it', japanese:'ja',
  kazakh:'kk', korean:'ko', kyrgyz:'ky', macedonian:'mk', malay:'ms', maldivian:'dv', maltese:'mt', nepali:'ne',
  'northern sotho':'nso', 'norwegian bokmål':'nb', 'norwegian nynorsk':'nn', polish:'pl', portuguese:'pt', romanian:'ro',
  romansh:'rm', russian:'ru', serbian:'sr', 'seychellois creole':'crs', sinhala:'si', slovak:'sk', slovene:'sl',
  'southern ndebele':'nr', 'southern sotho':'st', spanish:'es', swahili:'sw', swazi:'ss', swedish:'sv', 'swiss german':'gsw',
  tamil:'ta', thai:'th', tsonga:'ts', tswana:'tn', turkish:'tr', urdu:'ur', uzbek:'uz', venda:'ve', vietnamese:'vi',
  xhosa:'xh', zulu:'zu',
}));

const languageNames = new Map(Object.entries({
  'austro-bavarian german':'الألمانية النمساوية البافارية', berber:'الأمازيغية', montenegrin:'المونتينيغرية',
  'mauritian creole':'الكريولية الموريشية', sami:'لغات السامي',
}));

const languages = new Intl.DisplayNames('ar', {type:'language', fallback:'none'});
const currencies = new Intl.DisplayNames('ar', {type:'currency', fallback:'none'});

export function arabicLanguage(value:string) {
  const key = value.trim().toLowerCase();
  const name = languageNames.get(key);
  if (name) return name;
  const code = languageCodes.get(key) ?? (/^[a-z]{2,3}$/.test(key) ? key : undefined);
  return (code && languages.of(code)) ?? value;
}

export function arabicCurrency(value:string) {
  const code = value.trim().match(/^[A-Z]{3}(?=\s|\(|$)/)?.[0];
  const name = code && currencies.of(code);
  return name ? name + ' (' + code + ')' : value;
}
