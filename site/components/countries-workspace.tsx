'use client';

import {useMemo, useRef, useState} from 'react';
import {Globe2, Map as MapIcon, Search} from 'lucide-react';
import '../app/countries-visual.css';
import geography from '../public/countries.json';
import {countryCatalog,recommendedCountryForMonth} from '../lib/country-catalog';
import {countryExperiences} from '../lib/country-experiences';
import {isDestinationExcluded,type DestinationExclusion} from '../lib/destination-exclusions';
import {normalizeSearch} from '../lib/knowledge';
import guideCityNames from '../lib/place-image-city-keys.json';
import {destinations} from '../lib/travel';
import {cardNumber} from '../lib/trip-card';
import {blankCountry, monthNames, profiles, type Country, type CountryMemory, type WorldMemory} from '../lib/world';
import type {OnYoutubeReview} from '../lib/youtube-watch';
import type {YoutubeReviews} from '../lib/youtube-watch-schema';
import {ArrivalGuide} from './arrival-guide';
import {useCatalog} from './catalog-context';
import {ChinaGuide} from './china-guide';
import {CityDepthGuide} from './city-depth-guide';
import {CommunityReferences} from './community-references';
import {CountryGuidePanel} from './country-guide';
import {CountryPackageGuide} from './country-package';
import {PlaceImage} from './place-image';
import {VideoKnowledge} from './video-knowledge';
import {CountryMap} from './world-map';

type Props = {
  code:string;
  travelMonth:number;
  tripStart?:string;
  tripEnd?:string;
  memories:WorldMemory;
  canSave:boolean;
  updateMemory:(code:string, memory:CountryMemory) => void;
  onCountry:(code:string) => void;
  onPlan:(code:string) => void;
  youtubeReviews?:YoutubeReviews;
  onYoutubeReview?:OnYoutubeReview;
  exclusions?:readonly DestinationExclusion[];
};

type CountryFilter = 'catalog' | 'guides' | 'visited' | 'planned';
const countryPageSize = 6;

function CountryContent({code}: {code:string}) {
  const profile = profiles[code];
  const city = destinations.find(destination => destination.id === profile?.city);
  const ideas = new Map<string, {name:string; area?:string; source?:string}>();
  for (const name of profile?.places ?? []) ideas.set(name,{name});
  for (const place of city?.activities ?? []) ideas.set(place.name,place);
  for (const place of countryExperiences[code] ?? []) ideas.set(place.name,place);

  return <>
    {profile && <section className="panel country-data-block">
      <h2>أماكن وتجارب</h2>
      <p>{profile.tags.join(' · ')}</p>
      <p>{profile.caution}</p>
      <ul>{[...ideas.values()].map(({name,area,source}) => <li key={name}>
        {area && area + ' · '}{source ? <a href={source} target="_blank" rel="noreferrer">{name}</a> : name}
      </li>)}</ul>
      {profile.sourceNote && <small className="country-data-source">{profile.sourceNote}</small>}
      {profile.reviewedAt && <small className="country-data-source">مراجعة الدليل <bdi>{profile.reviewedAt}</bdi></small>}
      <a href={profile.source} target="_blank" rel="noreferrer">مرجع الدليل السياحي</a>
      {city && <details>
        <summary>السكن والتنقل والطعام في {city.name}</summary>
        <PlaceImage place={city.name} kind="city" className="city-guide-image"/>
        <p>{city.stay}</p><p>{city.transport}</p><p>{city.food}</p><p>{city.manners}</p>
      </details>}
      {Object.hasOwn(guideCityNames,code) && <details>
        <summary>مدن في الدليل</summary>
        <div className="guide-city-photos">
          {(guideCityNames[code as keyof typeof guideCityNames]).map(name => <PlaceImage key={name} place={name} kind="city"
            className="travel-combo-photo" label={name}/>)}
        </div>
      </details>}
    </section>}
    <ArrivalGuide code={code}/>
    <CityDepthGuide code={code}/>
    {code === 'CN' && <ChinaGuide/>}
    <CommunityReferences code={code}/>
    {profile && <VideoKnowledge country={code}/>}
  </>;
}

export function CountriesWorkspace({code, travelMonth, tripStart, tripEnd, memories, canSave, updateMemory,
  onCountry, onPlan, youtubeReviews, onYoutubeReview, exclusions}: Props) {
  const {countries} = useCatalog();
  const [filter,setFilter] = useState<CountryFilter>('catalog');
  const [query,setQuery] = useState('');
  const [countryLimit,setCountryLimit] = useState(countryPageSize);
  const [mapOpen,setMapOpen] = useState(false);
  const guide = useRef<HTMLDivElement>(null);
  const directory = useMemo(() => {
    const entries = new Map<string,Country>(geography.map(country => [country.code,country]));
    for (const record of countries.values()) {
      const location = entries.get(record.iso2);
      entries.set(record.iso2, location ? {...location, name:record.name_ar} : {
        code:record.iso2, id:record.iso2, name:record.name_ar, en:record.iso2, lat:record.weather.lat, lng:record.weather.lon,
      });
    }
    return [...entries.values()].sort((a,b) => a.name.localeCompare(b.name,'ar'));
  },[countries]);

  const requestedCountry = directory.find(item => item.code === code.toUpperCase());
  const fallbackCode = requestedCountry ? '' : recommendedCountryForMonth(travelMonth,countries,exclusions);
  const country = requestedCountry ?? directory.find(item => item.code === fallbackCode) ??
    directory.find(item => !isDestinationExcluded({country:item.code,city:countries.get(item.code)?.weather.city},exclusions)) ?? directory[0];
  const selected = country.code;
  const profile = profiles[selected];
  const memory = memories[selected] ?? blankCountry();
  const queryText = normalizeSearch(query.trim());
  const filters = {
    catalog:(item:Country) => countries.has(item.code),
    guides:(item:Country) => !!profiles[item.code],
    visited:(item:Country) => !!memories[item.code]?.visited,
    planned:(item:Country) => !!memories[item.code]?.planned,
  };
  const choices = directory.filter(item => filters[filter](item) &&
    normalizeSearch([item.name,item.en,item.code,...(profiles[item.code]?.places ?? [])].join(' ')).includes(queryText));
  const patchMemory = (change:Partial<CountryMemory>) => updateMemory(selected,{...memory,...change});
  function selectCountry(next:string) {
    onCountry(next);
    guide.current?.scrollIntoView({block:'start'});
  }

  return <section className="countries-workspace" aria-labelledby="countries-title">
    <div className="countries-heading">
      <Globe2 aria-hidden="true" size={26}/>
      <div>
        <h1 id="countries-title">الدول</h1>
        <p>{cardNumber(countries.size)} دولة · طقس وتأشيرة</p>
      </div>
    </div>
    <div className="countries-layout">
      <aside className="countries-picker panel" aria-labelledby="countries-picker-title">
        <h2 id="countries-picker-title">اختر دولة</h2>
        <label className="field">ابحث عن دولة أو مدينة
          <span className="country-search-input">
            <Search aria-hidden="true" size={17}/>
            <input type="search" value={query} onChange={event => {
              setQuery(event.target.value);
              setCountryLimit(countryPageSize);
            }}/>
          </span>
        </label>
        <label className="field">قائمة الدول
          <select value={filter} onChange={event => {
            setFilter(event.target.value as CountryFilter);
            setCountryLimit(countryPageSize);
          }}>
            <option value="catalog">الطقس والتأشيرة</option>
            <option value="guides">دول فيها محتوى سياحي</option>
            <option value="visited">الدول اللي زرتها</option>
            <option value="planned">الدول اللي أبي أزورها</option>
          </select>
        </label>
        {choices.length > 0 ? <ul className="country-picker-list" aria-label="الدول المتاحة">
          {choices.slice(0,countryLimit).map(item => <li key={item.code} className="country-picker-row" data-selected={item.code === selected}>
            <PlaceImage place={item.code} kind="country" fallbackName={item.name} className="country-picker-photo"/>
            <button type="button" aria-current={item.code === selected ? 'true' : undefined} onClick={() => selectCountry(item.code)}>
              {item.name}
            </button>
          </li>)}
        </ul> : <p className="notice" role="status">ما فيه دولة تطابق البحث في القائمة المختارة.</p>}
        {choices.length > countryLimit && <button type="button" className="secondary country-picker-more"
          onClick={() => setCountryLimit(count => count + countryPageSize)}>
          اعرض المزيد ({cardNumber(choices.length - countryLimit)})
        </button>}
      </aside>
      <div ref={guide} className="countries-hero">
        <PlaceImage place={selected} kind="country" fallbackName={country.name} className="countries-hero-photo"
          label={<h2 id="selected-country-title">{country.name}</h2>}/>
      </div>
      <section className="countries-information" aria-labelledby="selected-country-title">
        <details className="panel countries-map" onToggle={event => setMapOpen(event.currentTarget.open)}>
          <summary><MapIcon aria-hidden="true" size={20}/> الخريطة</summary>
          {mapOpen && <>
            <CountryMap countries={directory} memories={memories} selected={selected} onSelect={selectCountry}/>
            <p className="micro">مصادر الخريطة <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> · <a href="/licenses/world-atlas.txt">ترخيص world-atlas</a> · <a href="/licenses/world-countries.txt">ترخيص world-countries</a></p>
          </>}
        </details>
        <div className="panel country-data-block countries-intro">
          {profile && <div className="countries-intro-layout">
            <p>{profile.summary}</p>
            {!isDestinationExcluded({country:selected},exclusions) &&
              <button type="button" className="secondary" onClick={() => onPlan(selected)}>خطّط رحلة إلى {country.name}</button>}
          </div>}
          <details key={selected}>
            <summary>ملاحظاتي عن {country.name}</summary>
            <fieldset className="world-memory" aria-label="حفظ الدولة" disabled={!canSave}>
              <div className="chips">
                <button type="button" className={memory.visited ? 'chip chosen' : 'chip'} aria-pressed={memory.visited}
                  onClick={() => patchMemory({visited:!memory.visited})}>زرتها</button>
                <button type="button" className={memory.planned ? 'chip chosen' : 'chip'} aria-pressed={memory.planned}
                  onClick={() => patchMemory({planned:!memory.planned})}>أبي أزورها</button>
              </div>
              <label className="field">شهر أفكر أسافر فيه
                <select value={memory.month} onChange={event => patchMemory({month:event.target.value})}>
                  <option value="">لم أحدد</option>
                  {monthNames.map((month,index) => <option key={month} value={index + 1}>{month}</option>)}
                </select>
              </label>
              <label className="field">ملاحظات
                <textarea maxLength={1000} value={memory.notes} onChange={event => patchMemory({notes:event.target.value})}/>
              </label>
            </fieldset>
          </details>
        </div>
        {countryCatalog(selected) && <CountryGuidePanel key={selected} code={selected} month={travelMonth} start={tripStart} end={tripEnd}/>}
        {countries.has(selected) ? <CountryPackageGuide key={'data-'+selected} code={selected} travelMonth={travelMonth} tripStart={tripStart}
          tripEnd={tripEnd} youtubeReviews={youtubeReviews} onYoutubeReview={onYoutubeReview}/> :
          <p className="notice">ما فيه بيانات للطقس والتأشيرة في ملف الدول لـ{country.name}.</p>}
        <CountryContent key={'content-'+selected} code={selected}/>
      </section>
    </div>
  </section>;
}
