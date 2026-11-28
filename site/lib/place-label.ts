import {countryPackage} from './country-package';

/** اسم الدولة بالعربي من رمزها. */
export function countryNameAr(code:string|undefined) {
  if (!code) return '';
  return countryPackage(code)?.name_ar ?? code;
}

/** "المدينة، الدولة"، وما يكرر الدولة إذا كانت مكتوبة أصلًا. */
export function cityWithCountry(city:string, code:string|undefined) {
  const country = countryNameAr(code);
  if (!country || city.includes(country)) return city;
  return city + '، ' + country;
}
