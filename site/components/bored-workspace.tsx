'use client';

import {useId, useState, type FormEvent} from 'react';
import {ChevronDown, Clock, Footprints, Plane, SlidersHorizontal, TriangleAlert, Wallet} from 'lucide-react';
import {DestinationCalendarAlert} from './country-guide';
import {MilesLine} from './miles-line';
import {MoneyInput} from './money-input';
import {BoredPlanningTools} from './bored-planning-tools';
import {PlaceImage} from './place-image';
import {YoutubeWatch} from './youtube-watch';
import {CommunityTips,useCommunityTips} from './community-tips';
import {TravelCombos} from './travel-combos';
import {useCatalog} from './catalog-context';
import {formatArabicDuration} from '../lib/arabic-duration';
import {isDestinationExcluded,type DestinationExclusion} from '../lib/destination-exclusions';
import {countryMonth, countryMonthFitRank} from '../lib/country-catalog';
import type {YoutubeReviews} from '../lib/youtube-watch-schema';
import type {OnYoutubeReview} from '../lib/youtube-watch';
import {boredResults, boredTypes, defaultBoredSettings, type BoredResult} from '../lib/bored';
import {safeBoredLink, type BoredData, type BoredSettings, type BoredType} from '../lib/bored-schema';
import {cardMoney, cardNumber, cardYear, dateText, todayInRiyadh, shiftCardDate, tripDaysText} from '../lib/trip-card';
import {initialTripCards, tripCardsWithDefaults} from '../lib/trip-card-data';
import type {TripCard, TripCards} from '../lib/trip-card-schema';

const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const initial: BoredData = {settings:defaultBoredSettings, links:{}};

function CommunityLinks({id, open, city, country, links, canSave, onChange, destination, reviews, onReview}: {
  id: string;
  open: boolean;
  city: string;
  country: string;
  destination: string;
  reviews?: YoutubeReviews;
  onReview?: OnYoutubeReview;
  links: string[];
  canSave: boolean;
  onChange: (links: string[]) => boolean;
}) {
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');
  const tips = useCommunityTips(open ? [{city,country}] : []);
  function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = url.trim();
    if (!safeBoredLink(value)) {
      setNotice('أدخل رابط http أو https صالح.');
      return;
    }
    const clean = new URL(value).href;
    if (clean.length > 1000) {
      setNotice('الرابط طويل. استخدم رابط المشاركة المختصر.');
      return;
    }
    if (links.some(link => new URL(link).href === clean)) {
      setNotice('الرابط محفوظ مسبقًا.');
      return;
    }
    if (onChange([...links, clean])) {
      setUrl('');
      setNotice('');
    }
  }
  return <section id={id} className="bored-people" hidden={!open} aria-label={'كلام الناس عن ' + city}>
    {open && <>
      <CommunityTips tips={tips}/>
      <details><summary>المقاطع والتقييمات</summary>
        <YoutubeWatch destination={destination} reviews={reviews} onReview={onReview}/>
      </details>
    </>}
    {links.length > 0 && <p>روابطك المحفوظة</p>}
    {links.length > 0 && <ul>{links.map(link => {
      const url = new URL(link);
      return <li key={link}>
        <a href={link} target="_blank" rel="noopener noreferrer" dir="ltr" title={link}>{url.hostname + (url.pathname === '/' ? '' : url.pathname)}</a>
        <button type="button" className="secondary" disabled={!canSave} onClick={() => onChange(links.filter(value => value !== link))}
          aria-label={'إزالة رابط ' + url.hostname + ' من ' + city}>إزالة</button>
      </li>;
    })}</ul>}
    {canSave ? <form onSubmit={add}>
      <input dir="ltr" inputMode="url" type="url" required maxLength={1000} value={url}
        placeholder="https://" aria-label={'رابط مقطع أو ثريد عن ' + city}
        onChange={event => {setUrl(event.target.value);setNotice('');}}/>
      <button type="submit" className="secondary" disabled={links.length >= 30}>احفظ الرابط</button>
    </form> : <p>سجّل دخولك عشان تحفظ روابطك.</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}

function DestinationOption({option, settings, links, canSave, updateLinks, openCard, youtubeReviews, onYoutubeReview}: {
  option: BoredResult;
  settings: BoredSettings;
  links: string[];
  canSave: boolean;
  updateLinks: (links: string[]) => boolean;
  openCard: () => void;
  youtubeReviews?: YoutubeReviews;
  onYoutubeReview?: OnYoutubeReview;
}) {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const peopleId = useId();
  const {trip, group, profile, estimate} = option;
  const balance = settings.budget - estimate.total;
  const percent = Math.min(100, estimate.total / settings.budget * 100);
  const flight = estimate.rows.find(row => row.key === 'milesCash' || row.key === 'flight');
  const quotePeriod = 'أساس الأسعار ' + dateText(group.start) + ' إلى ' + dateText(group.end) + '.';
  const routeWarning = trip.milesRoute === 'unknown' ? 'تشغيل السعودية على المسار يحتاج تحقق.' :
    trip.milesRoute === 'unavailable' ? 'السعودية ما تشغّل المسار حسب البطاقة. التقدير نقدي.' :
    'رسوم الأميال ناقصة. التقدير نقدي.';
  const warnings = [
    !estimate.partial && option.over && 'يتجاوز السقف بـ ' + cardMoney(-balance) + '.',
    estimate.partial && 'راجع البنود الناقصة في بطاقة السفرة.',
    option.offMonth && 'الأسعار لفترة مختلفة عن الشهر والسنة المختارين. ' + quotePeriod,
    settings.departure && (settings.departure!==group.start || shiftCardDate(settings.departure,settings.days-1)!==group.end) && 'تواريخ سفرتك تختلف عن تواريخ فحص السعر. ' + quotePeriod,
    !settings.departure && option.outsideQuotePeriod && 'مدة رحلتك تختلف عن فترة الفحص. تأكد من سعر الطيران والسكن للتواريخ الجديدة.',
    option.quotesNeedReview && 'بعض الأسعار المتغيرة تحتاج تحقق.',
    settings.miles && !option.useMiles && routeWarning,
    option.useMiles && estimate.milesPending && 'توفر مقعد الفرسان غير متحقق. التقدير يحسب الجزء النقدي المسجّل فقط.',
    option.useMiles && !estimate.milesPending && 'الهامش بالريال. راجع توفر مقعد الفرسان قبل الحجز.',
    profile.hours > 8 && settings.days <= 4 && 'الوصول طويل بالنسبة لسفرة ' + tripDaysText(settings.days) + '.',
    ...profile.cautions,
  ].filter((value): value is string => typeof value === 'string');

  return <article className="bored-option">
    <PlaceImage kind="city" place={trip.id} className="bored-image"
      label={<div className="bored-image-text"><h3>{trip.city}{option.country ? '، ' + option.country : ''}</h3><p>{[trip.neighborhood,option.country].filter(Boolean).join(' · ')}</p></div>}
      overlay={<span className="bored-season" data-best={option.season === 2}>{option.season === 2 ? 'أفضل شهر لها' : 'مناسب · مو أفضل شهر'}</span>}/>
    <div className="bored-option-body">
      <div className="bored-price">
        <div className="bored-total">{estimate.partial ? <strong>تحتاج تسعير</strong> : <><span>المجموع التقديري</span><strong>{cardMoney(estimate.total)}</strong></>}</div>
        {!estimate.partial && <div className="bored-balance" data-over={option.over}>
          <span>{option.over ? 'يتجاوز السقف بـ' : 'يبقى'}</span><b>{cardMoney(Math.abs(balance))}</b>
        </div>}
      </div>
      {!estimate.partial && <div className="bored-meter" role="progressbar" aria-label={'استخدام سقف الميزانية في ' + trip.city}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}
        aria-valuetext={cardMoney(estimate.total) + ' من ' + cardMoney(settings.budget)}>
        <span data-over={option.over} style={{width:percent + '%'}}/>
      </div>}
      <ul className="bored-data-chips" aria-label="الوصول والتنقل">
        <li data-tone={profile.hours > 8 ? 'warning' : 'neutral'}><Clock size={16} aria-hidden="true"/> وصول {formatArabicDuration(profile.hours * 60)}</li>
        {flight && flight.subtotal !== null && <li><Plane size={16} aria-hidden="true"/> طيران {cardMoney(flight.subtotal)}{option.useMiles ?
          ' + ' + (trip.costs.milesCount.value ? cardNumber(trip.costs.milesCount.value) + ' ميل' : 'أميال غير محددة') : ''}</li>}
        <li data-tone={option.walk ? 'positive' : 'neutral'}><Footprints size={16} aria-hidden="true"/> {option.walk ? 'كل شي مشي' : 'المشي حسب المكان'}</li>
      </ul>
      <MilesLine country={trip.country.toUpperCase()} city={trip.city}/>
      {settings.departure && <DestinationCalendarAlert code={trip.country.toUpperCase()} start={settings.departure} end={shiftCardDate(settings.departure,settings.days-1)}/>}
      <p className="bored-reason"><strong>ليش يناسبك؟</strong> {profile.why[0]}</p>
      {warnings[0] && <div className="bored-warning"><TriangleAlert size={17} aria-hidden="true"/><p>{warnings[0]}</p></div>}
      <details className="bored-option-details">
        <summary>التفاصيل <ChevronDown size={16} aria-hidden="true"/></summary>
        <ul>
          <li>يطابق {option.matching.map(type => boredTypes[type]).join('، ')}.</li>
          {option.walk && <li>الفطور والطبيعة والمساج والعشاء لها خيارات مشي من السكن.</li>}
          {profile.why.slice(1).map(reason => <li key={reason}>{reason}</li>)}
          {warnings.slice(1).map(warning => <li key={warning}>{warning}</li>)}
        </ul>
      </details>
      <div className="bored-option-actions">
        <button type="button" className="bored-open-card" onClick={openCard} aria-label={'افتح بطاقة ' + trip.city}>افتح البطاقة</button>
        <button type="button" className="bored-people-toggle" onClick={() => setPeopleOpen(value => !value)}
          aria-expanded={peopleOpen} aria-controls={peopleId}>كلام الناس{links.length > 0 && ' · ' + cardNumber(links.length)}</button>
      </div>
      <CommunityLinks id={peopleId} open={peopleOpen} city={trip.city} country={trip.country} destination={trip.id} links={links} canSave={canSave} onChange={updateLinks}
        reviews={youtubeReviews} onReview={onYoutubeReview}/>
    </div>
  </article>;
}

function CountriesForMonth({month, cards, exclusions, openCountry}: {
  month:number; cards:TripCards; exclusions?:readonly DestinationExclusion[]; openCountry:(code:string) => void;
}) {
  const {countries} = useCatalog();
  const pricedCountries = new Set(tripCardsWithDefaults(cards).groups.flatMap(group => group.trips
    .filter(({costs}) => costs.flight.value !== null || costs.hotel.value !== null)
    .map(trip => trip.country.toUpperCase())));
  const options = [...countries.values()].filter(record => !isDestinationExcluded({country:record.iso2,city:record.weather.city},exclusions))
    .map(({iso2:code, name_ar:name}) => {
    const fit = countryMonth(code,month,countries)?.fit;
    return {code, name, fit, rank:fit ? countryMonthFitRank[fit] : 2};
  }).sort((a,b) => a.rank - b.rank || a.name.localeCompare(b.name,'ar'));
  return <div className="bored-tool-body country-month-picker">
    <p>الترتيب حسب مناخ المدينة الممثلة لكل دولة في الشهر المختار.</p>
    <label>افتح دليل دولة
      <select value="" onChange={event => {if (event.target.value) openCountry(event.target.value);}}>
        <option value="">اختر الدولة</option>
        {options.map(({code, name, fit}) => <option key={code} value={code}>
          {[name, fit ?? 'المناخ يحتاج تحقق', !pricedCountries.has(code) && 'بدون أسعار'].filter(Boolean).join(' · ')}
        </option>)}
      </select>
    </label>
  </div>;
}

export function BoredWorkspace({cards = initialTripCards, saved, canSave, save, monthOverride, tripDate, onMonthChange, openCard, openCountry, openAdvisor, youtubeReviews, onYoutubeReview, exclusions}: {
  cards?: TripCards;
  saved?: BoredData;
  canSave: boolean;
  save: (change: (data: BoredData) => BoredData) => boolean;
  monthOverride?: number;
  tripDate?: string;
  onMonthChange?: (month:number) => void;
  openCard: (groupId: string, tripId:TripCard['id'], estimate:{days:number;budget:number;mode:'cash'|'miles'}) => void;
  openCountry: (code:string,month:number,departure?:string,days?:number) => void;
  openAdvisor?: () => void;
  youtubeReviews?: YoutubeReviews;
  onYoutubeReview?: OnYoutubeReview;
  exclusions?: readonly DestinationExclusion[];
}) {
  const [local, setLocal] = useState<Partial<BoredSettings>>({});
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [filtersExpanded,setFiltersExpanded] = useState(false);
  const filtersId = useId();
  const resultsId = useId();
  const {countries} = useCatalog();
  const stored = saved ?? initial;
  const settings = {...stored.settings, ...local, month:monthOverride ?? local.month ?? stored.settings.month};
  const departure = settings.departure ?? tripDate;
  settings.departure = departure && Number(departure.slice(5,7))===settings.month ? departure : '';
  const {candidates, excluded, travelMonth} = boredResults(cards, settings, todayInRiyadh(),countries,exclusions);
  const filterSummary = [settings.types.map(type => boredTypes[type]).join('، ') || 'اختر نوع السفرة',
    tripDaysText(settings.days), months[settings.month - 1], cardMoney(settings.budget), settings.miles && 'أميال الفرسان'].filter(Boolean).join(' · ');

  function update(patch: Partial<BoredSettings>) {
    const next = {...settings, ...patch};
    if (patch.month !== undefined) onMonthChange?.(patch.month);
    if (canSave && save(data => ({...data, settings:next}))) setLocal({});
    else setLocal(current => ({...current, ...patch}));
    setShowAll(false);
  }

  function toggle(type: BoredType) {
    update({types:settings.types.includes(type) ? settings.types.filter(value => value !== type) : [...settings.types,type]});
  }

  function openOption(option:BoredResult) {
    openCard(option.group.id,option.trip.id,{days:settings.days,budget:settings.budget,mode:option.useMiles?'miles':'cash'});
  }

  return <section className="bored-workspace" aria-labelledby="bored-title">
    <div className="bored-hero">
      <h1 id="bored-title">طفشان؟ وين تروح</h1>
      <p>قارن وجهات من الرياض، واعرف التكلفة ووش باقي تتأكد منه قبل الحجز.</p>
    </div>
    <div className="bored-filter-box">
      <button type="button" className="bored-filter-toggle" aria-expanded={filtersExpanded} aria-controls={filtersId}
        onClick={() => setFiltersExpanded(value => !value)}>
        <span>{filterSummary}</span><span><SlidersHorizontal size={16} aria-hidden="true"/> {filtersExpanded ? 'تم' : 'تعديل'}</span>
      </button>
      <div id={filtersId} className="bored-filters" data-expanded={filtersExpanded}>
        <fieldset>
          <legend>وش تبي من السفرة؟</legend>
          <div className="bored-types">
            {(Object.entries(boredTypes) as [BoredType,string][]).map(([type,label]) =>
              <button type="button" key={type} className="secondary" aria-pressed={settings.types.includes(type)} onClick={() => toggle(type)}>{label}</button>
            )}
          </div>
        </fieldset>
        <div className="bored-fields">
          <label>عدد الأيام
            <select value={settings.days} onChange={event => update({days:Number(event.target.value)})}>
              {Array.from({length:30}, (_,index) => index + 1).map(days => <option value={days} key={days}>{tripDaysText(days)}</option>)}
            </select>
          </label>
          <div className="bored-budget">
            <span><Wallet size={16}/> الميزانية القصوى (ر.س)</span>
            <MoneyInput label="الميزانية القصوى (ر.س)" currency="SAR" value={budgetDraft ?? String(settings.budget)}
              onChange={value => {
                setBudgetDraft(value);
                if (Number(value) > 0) update({budget:Number(value)});
              }}/>
            {budgetDraft !== null && Number(budgetDraft) <= 0 && <small role="status">أدخل ميزانية أكبر من صفر.</small>}
          </div>
          <label>تاريخ المغادرة
            <input type="date" value={settings.departure} onChange={event=>{const value=event.target.value;update({departure:value,...(value?{month:Number(value.slice(5,7))}:{})});}}/>
          </label>
          <label>الشهر
            <select value={settings.month} onChange={event => update({month:Number(event.target.value),departure:''})}>
              {months.map((name,index) => <option value={index + 1} key={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <label className="trip-card-check bored-miles">
          <input type="checkbox" checked={settings.miles} onChange={event => update({miles:event.target.checked})}/>
          أبي أستخدم أميال الفرسان
        </label>
      </div>
    </div>

    <div className="bored-results-head">
      <div><h2>الوجهات المناسبة</h2>
        <p>{months[settings.month - 1]} {cardYear(Number(travelMonth.slice(0,4)))} · {tripDaysText(settings.days)} · سقف {cardMoney(settings.budget)} · شخص واحد</p>
      </div>
      {candidates.length > 0 && <span role="status">{cardNumber(candidates.length)} من {cardNumber(candidates.length + excluded.length)} وجهة</span>}
    </div>
    {!settings.types.length ? <p className="notice" role="status">اختر نوع سفرة واحد على الأقل.</p> :
      candidates.length === 0 ? <p className="notice" role="status">ما فيه وجهة تطابق اختياراتك في هذا الشهر. جرّب شهر أو نوع سفرة ثاني.</p> :
      <div id={resultsId} className="bored-results">
        {candidates.slice(0, showAll ? undefined : 3).map(option => {
          const {trip} = option;
          return <DestinationOption key={trip.id} option={option} settings={settings} links={stored.links[trip.id] ?? []} canSave={canSave}
            updateLinks={links => save(current => ({...current, links:{...current.links,[trip.id]:links}}))}
            openCard={() => openOption(option)} youtubeReviews={youtubeReviews} onYoutubeReview={onYoutubeReview}/>;
        })}
      </div>
    }
    {candidates.length > 3 && <button type="button" className="bored-more" aria-expanded={showAll} aria-controls={resultsId} onClick={() => setShowAll(value => !value)}>
      {showAll ? 'اعرض أول ٣ وجهات' : 'اعرض باقي الوجهات (' + cardNumber(candidates.length - 3) + ')'}
    </button>}
    {settings.types.length > 0 && excluded.length > 0 && <details className="bored-excluded">
      <summary>ليش استُبعدت {cardNumber(excluded.length)} وجهات؟</summary>
      <ul>{excluded.map(item => <li key={item.city}><strong>{item.city}</strong> · {item.type && item.season ?
        'النوع والشهر خارج الاختيارات' : item.type ? 'النوع خارج اختياراتك' : 'الشهر خارج الموسم المحدد'}</li>)}</ul>
    </details>}
    <BoredPlanningTools cards={cards} settings={settings} candidates={candidates} updateSettings={update} openCard={openOption}
      openAdvisor={openAdvisor} countryCount={countries.size} exclusions={exclusions}
      compoundPlans={<TravelCombos days={settings.days} month={settings.month} exclusions={exclusions} openCountry={code=>openCountry(code,settings.month,settings.departure,settings.days)}/>}
      countries={<CountriesForMonth month={settings.month} cards={cards} exclusions={exclusions} openCountry={code=>openCountry(code,settings.month,settings.departure,settings.days)}/>}/>
    <p className="bored-meta">التكاليف من بطاقات السفر المسجلة بالريال. مدة الوصول والمواسم تقديرات الكتالوج.</p>
  </section>;
}
