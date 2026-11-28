'use client';

import {useId, useState} from 'react';
import {countryCatalog} from '../lib/country-catalog';
import {cardNumber} from '../lib/trip-card';
import {monthNames} from '../lib/world';
import type {OnYoutubeReview} from '../lib/youtube-watch';
import type {YoutubeReviews} from '../lib/youtube-watch-schema';
import {YoutubeWatch} from './youtube-watch';
import {useCatalog} from './catalog-context';
import {PlaceImage} from './place-image';
import {countryDisplayFacts, countryHolidayYears, countryHolidays, countryNotes, countryPackage, countryPreparation, countryVisa} from '../lib/country-package';

const reference = (url: string, label: string) => <a href={url} target="_blank" rel="noreferrer">{label}</a>;

function GuideSectionLink({code,section,children}:{code:string;section:'entry'|'holidays';children:string}) {
  if (!countryCatalog(code)) return null;
  const target='country-guide-'+code+'-'+section;
  return <a href={'/?country='+code+'#'+target} onClick={event=>{
    const tab=document.getElementById(target);
    if (!tab) return;
    event.preventDefault();
    tab.click();
    tab.focus();
    tab.scrollIntoView({block:'center'});
  }}>{children}</a>;
}

function Provenance({source, checked}: {source: string; checked: string}) {
  return <small className="country-data-source">{source} · آخر مراجعة <bdi>{checked}</bdi></small>;
}

export function CountryPreparationList({code, checked, onToggle}: {
  code: string;
  checked?: readonly number[];
  onToggle?: (index: number, value: boolean) => void;
}) {
  const {countries} = useCatalog();
  const items = countryPreparation(code,countries);
  if (!items.length) return null;

  return <ul className="trip-card-checklist country-data-prep">
    {items.map((item, index) => <li key={item.label}>
      {checked ? <label className="trip-card-check">
        <input type="checkbox" checked={checked.includes(index)} disabled={!onToggle} onChange={event => onToggle?.(index,event.target.checked)}/>
        <span><strong>{item.label}</strong> · {item.value}</span>
      </label> : <div><strong>{item.label}</strong> · {item.value}</div>}
      <Provenance source={item.source} checked={item.checked}/>
      {item.url && reference(item.url, item.label === 'التأشيرة' ? 'راجع الجهة الرسمية قبل الحجز' : 'المتطلبات الرسمية')}
    </li>)}
  </ul>;
}

export function CountryVisaGuide({code}: {code: string}) {
  const {countries} = useCatalog();
  const visa = countryVisa(code,countries);
  if (!countryCatalog(code,countries) || !visa) return null;
  return <section className="panel country-data-block">
    <h2>مؤشر التأشيرة للجواز السعودي</h2>
    <GuideSectionLink code={code} section="entry">افتح شروط الدخول والمدة والرسوم في دليل الدولة</GuideSectionLink>
    <p>{visa.indicator.value}</p>
    <Provenance source={visa.indicator.source} checked={visa.indicator.checked}/>
    <p>{!visa.reviewed && 'هذا مؤشر من قاعدة مفتوحة. '}راجع الجهة الرسمية قبل الحجز حسب نوع الجواز وتواريخ السفر.</p>
    <div className="country-data-links">
      {visa.officialLink && reference(visa.officialLink,'الجهة الرسمية للدخول')}
      {visa.applyLink && visa.applyLink !== visa.officialLink && reference(visa.applyLink,'بوابة طلب التأشيرة')}
    </div>
    {visa.reviewed && <details>
      <summary>مؤشر التأشيرة في ملف الدول</summary>
      <p>{visa.raw.value}</p>
      <Provenance source={visa.raw.source} checked={visa.raw.checked}/>
    </details>}
  </section>;
}

function CountryMonthlyWeather({code, travelMonth}: {code:string; travelMonth?:number}) {
  const {countries} = useCatalog();
  const [selectedMonth, setSelectedMonth] = useState<number>();
  const id = useId();
  const record = countryCatalog(code,countries);
  if (!record) return null;
  const {city,months,lat,lon} = record.weather;
  const month = selectedMonth ?? travelMonth;
  const current = months.find(row => row.month === month) ?? months[0];
  return <section className="panel country-data-block">
    <PlaceImage place={city} kind="city" className="country-weather-photo" label={<h2>المناخ الشهري · {city}</h2>}/>
    {current ? <>
      <label htmlFor={id}>الشهر</label>
      <select id={id} value={current.month} onChange={event => setSelectedMonth(Number(event.target.value))}>
        {months.map(row => <option key={row.month} value={row.month}>{monthNames[row.month - 1]}</option>)}
      </select>
      <p><strong>{current.fit}</strong> · العظمى {cardNumber(current.tmax)}°م · الصغرى {cardNumber(current.tmin)}°م · المطر {cardNumber(current.rain_mm)} مم</p>
      <p>متوسطات تاريخية في {city} · {record.weather.source}</p>
      <details><summary>اعرض بقية الشهور</summary>
      <div className="monthly-weather-scroll" tabIndex={0} role="region" aria-label={'جدول المناخ الشهري في ' + city}>
        <table className="monthly-weather">
          <thead><tr><th scope="col">الشهر</th><th scope="col">العظمى °م</th><th scope="col">الصغرى °م</th><th scope="col">المطر مم</th><th scope="col">الموسم</th></tr></thead>
          <tbody>{months.map(row => <tr key={row.month}>
            <th scope="row">{row.name}</th><td>{row.tmax}</td><td>{row.tmin}</td><td>{row.rain_mm}</td><td>{row.fit}</td>
          </tr>)}</tbody>
        </table>
      </div>
      </details>
      <p>الموقع <bdi>{lat}، {lon}</bdi> · {reference('https://open-meteo.com/en/docs/historical-weather-api','Open-Meteo Historical Weather API')}</p>
    </> : <p>ملف الدول ما فيه قياسات شهرية لهذه المدينة.</p>}
  </section>;
}

export function CountryPackageGuide({code, travelMonth, tripStart, tripEnd, youtubeReviews, onYoutubeReview}: {
  code:string; travelMonth?:number; tripStart?:string; tripEnd?:string; youtubeReviews?:YoutubeReviews; onYoutubeReview?:OnYoutubeReview;
}) {
  const {countries} = useCatalog();
  const record = countryPackage(code,countries);
  const id = useId();
  const [selectedYear, setYear] = useState('');
  if (!record || !countryCatalog(code,countries)) return null;
  const info = countryDisplayFacts(record);
  const years = countryHolidayYears(record);
  const tripYear = tripStart?.slice(0,4) ?? '';
  const year = selectedYear || (years.includes(tripYear) ? tripYear : years[0]);
  const holidays = year ? countryHolidays(code, year + '-01-01', year + '-12-31',countries) : [];
  const matches = tripStart && tripEnd ? countryHolidays(code, tripStart, tripEnd,countries) : [];
  const holidaySource = record.semi_static.public_holidays;
  const notes = countryNotes(code,countries);
  const rows = [
    ['العاصمة', info.capital],
    ['العملة', info.currencies],
    ['اللغات', info.languages],
    ['مفتاح الاتصال', info.calling_code],
    ['المنطقة', info.region],
    ['التوقيت', info.timezones],
  ] as const;

  return <div className="country-data">
    <CountryMonthlyWeather code={code} travelMonth={travelMonth}/>
    <CountryVisaGuide code={code}/>
    <section className="panel country-data-block">
      <h2>بيانات {record.name_ar}</h2>
      <dl className="country-data-grid">
        {rows.map(([label, field]) => field && <div key={label}>
          <dt>{label}</dt>
          <dd>{Array.isArray(field.value) ? field.value.join('، ') || 'غير متوفر' : field.value || 'غير متوفر'}</dd>
          <dd><Provenance source={field.source} checked={field.checked}/></dd>
        </div>)}
      </dl>
    </section>
    <section className="panel country-data-block">
      <h2>العطلات في ملف الدول الأصلي</h2>
      <GuideSectionLink code={code} section="holidays">افتح تقويم دليل الدولة</GuideSectionLink>
      <Provenance source={holidaySource.source} checked={holidaySource.checked}/>
      <p>{!years.length && countryCatalog(code)
        ? 'لم يسجّل هذا المصدر عطلات لهذه الدولة. تجد المواعيد التي جُمعت من مصادر أخرى في دليل الدولة.'
        : holidaySource.note+'. قد تختلف العطلات المحلية داخل الدولة.'}</p>
      {matches.length > 0 && <p className="notice">أثناء رحلتك تظهر في البيانات {matches.map(holiday => holiday.name).join('، ')}.</p>}
      {years.length > 0 && <details>
        <summary>عرض تقويم العطلات</summary>
        <label htmlFor={id}>السنة</label>
        <select id={id} value={year} onChange={event => setYear(event.target.value)}>
          {years.map(value => <option key={value}>{value}</option>)}
        </select>
        <ul className="country-data-holidays">
          {holidays.map((holiday,index) => <li key={holiday.date + index}><time dateTime={holiday.date}>{holiday.date}</time><span dir="auto">{holiday.name}</span></li>)}
        </ul>
      </details>}
    </section>
    <details className="panel country-data-block country-youtube-coverage">
      <summary>كلام الناس · تغطية يوتيوب</summary>
      <YoutubeWatch country={code} reviews={youtubeReviews} onReview={onYoutubeReview}/>
    </details>
    {notes.length > 0 && <section className="panel country-data-block">
      <h2>ملاحظات السفر</h2>
      <ul className="country-data-notes">
        {notes.map(note => <li key={note.topic}>
          <strong>{note.topic}</strong><span className={note.status.startsWith('يحتاج') ? 'trip-card-tag warning' : 'trip-card-tag'}>{note.status}</span>
          <p>{note.value}</p>
          <Provenance source={note.source} checked={note.checked}/>
          {note.url && reference(note.url,'فتح المصدر')}
        </li>)}
      </ul>
    </section>}
  </div>;
}
