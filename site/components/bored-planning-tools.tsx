'use client';

import {useId, useState, type ReactNode} from 'react';
import {CalendarDays, GitCompareArrows, Globe2, MessageCircle} from 'lucide-react';
import {useCatalog} from './catalog-context';
import {formatArabicDuration} from '../lib/arabic-duration';
import type {DestinationExclusion} from '../lib/destination-exclusions';
import {boredResults, compareBoredRanks, type BoredResult} from '../lib/bored';
import type {BoredSettings} from '../lib/bored-schema';
import {cardMoney, cardNumber, cardYear, todayInRiyadh, tripDaysText} from '../lib/trip-card';
import type {TripCards} from '../lib/trip-card-schema';

type Props = {
  cards: TripCards;
  settings: BoredSettings;
  candidates: BoredResult[];
  updateSettings: (patch: Partial<BoredSettings>) => void;
  openCard: (option: BoredResult) => void;
  exclusions?: readonly DestinationExclusion[];
};

const monthFormat = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {month:'long', timeZone:'UTC'});
const months = Array.from({length:12}, (_, index) => monthFormat.format(new Date(Date.UTC(2000, index, 1))));
const durations = Array.from({length:30}, (_, index) => index + 1);
const seasonText = (option:BoredResult) => option.season === 2 ? 'من أفضل شهورها' : 'مناسب · مو أفضل شهر';

function FlexibleDates({cards, settings, updateSettings, exclusions}: Pick<Props,'cards'|'settings'|'updateSettings'|'exclusions'>) {
  const {countries} = useCatalog();
  const [duration, setDuration] = useState<number>();
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState('');
  const days = duration ?? settings.days;
  const today = todayInRiyadh();
  const options = months.flatMap((label, index) => {
    const month = index + 1;
    if (month === settings.month && days === settings.days) return [];
    const {candidates, travelMonth} = boredResults(cards, {...settings, days, month}, today, countries,exclusions);
    const best = candidates[0];
    return best ? [{label, month, travelMonth, best}] : [];
  }).sort((a,b) => compareBoredRanks(a.best,b.best) || a.travelMonth.localeCompare(b.travelMonth));

  return <div className="bored-tool-body">
    <p>شوف أفضل وجهة في كل شهر حسب اهتماماتك وسقف {cardMoney(settings.budget)}.</p>
    <label className="bored-tool-duration">مدة الموعد المرن
      <select value={days} onChange={event => setDuration(Number(event.target.value))}>
        {durations.map(value => <option key={value} value={value}>{tripDaysText(value)}</option>)}
      </select>
    </label>
    {options.length ? <div className="bored-flexible-options">
      {options.slice(0,showAll ? undefined : 3).map(({label, month, travelMonth, best}) => {
        const date = label + ' ' + cardYear(Number(travelMonth.slice(0,4)));
        return <article key={month}>
          <h3>{date}</h3>
          <p><strong>{best.trip.city}</strong> · {seasonText(best)}</p>
          <p>{best.estimate.partial ? 'تحتاج تسعير' : 'التقدير ' + cardMoney(best.estimate.total)}{!best.estimate.partial && best.over && ' · فوق السقف'}</p>
          {(best.offMonth || best.outsideQuotePeriod || best.quotesNeedReview) && <p className="bored-tool-note">راجع سعر الطيران والسكن للموعد الجديد.</p>}
          <button type="button" className="secondary" onClick={() => {
            updateSettings({days,month});
            setNotice('تحدّثت نتائج الوجهات إلى ' + date + ' · ' + tripDaysText(days) + '.');
          }}
            aria-label={'اعتمد ' + date + ' لمدة ' + tripDaysText(days)}>اعتمد الموعد</button>
        </article>;
      })}
    </div> : <p role="status">{settings.types.length ? 'ما فيه موعد بديل يطابق اختياراتك.' : 'اختر نوع سفرة عشان تظهر المواعيد.'}</p>}
    {options.length > 3 && <button type="button" className="secondary" onClick={() => setShowAll(value => !value)}
      aria-expanded={showAll}>{showAll ? 'اعرض أقوى ٣ شهور' : 'اعرض باقي الشهور'}</button>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}

function DestinationComparison({candidates, settings, openCard}: Pick<Props,'candidates'|'settings'|'openCard'>) {
  const [firstId, setFirstId] = useState<string>();
  const [secondId, setSecondId] = useState<string>();
  const first = candidates.find(option => option.trip.id === firstId) ?? candidates[0];
  const other = candidates.filter(option => option.trip.id !== first?.trip.id);
  const second = other.find(option => option.trip.id === secondId) ?? other[0];

  if (!first || !second) return <p className="bored-tool-body" role="status">تحتاج وجهتين مناسبتين للمقارنة. جرّب تغيير الشهر أو نوع السفرة.</p>;
  const selected = [first, second];
  return <div className="bored-tool-body">
    <p>{months[settings.month - 1]} · {tripDaysText(settings.days)} · سقف {cardMoney(settings.budget)}</p>
    <table className="bored-city-comparison" aria-label="مقارنة المدن">
      <thead><tr>
        <th scope="col">الوجهة</th>
        {selected.map((option,index) => <th scope="col" key={index}>
          <select value={option.trip.id} aria-label={index === 0 ? 'المدينة الأولى' : 'المدينة الثانية'}
            onChange={event => (index === 0 ? setFirstId : setSecondId)(event.target.value)}>
            {candidates.map(candidate => <option key={candidate.trip.id} value={candidate.trip.id}
              disabled={candidate.trip.id === selected[1 - index].trip.id}>{candidate.trip.city}</option>)}
          </select>
        </th>)}
      </tr></thead>
      <tbody>
        <tr><th scope="row">الحي</th>{selected.map(({trip,country}) => <td key={trip.id}>{trip.neighborhood || 'يحتاج تحديد'}<small>{country}</small></td>)}</tr>
        <tr><th scope="row">التكلفة</th>{selected.map(option => <td key={option.trip.id}>
          <strong>{option.estimate.partial ? 'تحتاج تسعير' : cardMoney(option.estimate.total)}</strong>
          {!option.estimate.partial && <small>تقدير للشخص{option.over && ' · فوق السقف'}</small>}
          {(option.offMonth || option.outsideQuotePeriod || option.quotesNeedReview) && <small>الأسعار تحتاج تحقق</small>}
        </td>)}</tr>
        <tr><th scope="row">مدة الوصول</th>{selected.map(({trip,profile}) => <td key={trip.id}>نحو {formatArabicDuration(profile.hours * 60)} للسكن</td>)}</tr>
        <tr><th scope="row">الموسم</th>{selected.map(option => <td key={option.trip.id}>{seasonText(option)}</td>)}</tr>
        <tr><th scope="row">باقي قبل الحجز</th>{selected.map(({trip}) => {
          const pending = trip.checklist.filter(task => !task.done);
          return <td key={trip.id}>{pending.length ? <ul>{pending.map((task,index) => <li key={index}>{task.text}</li>)}</ul> : 'اكتملت القائمة'}</td>;
        })}</tr>
        <tr><th scope="row">رحلتي</th>{selected.map(option => <td key={option.trip.id}>
          <button type="button" className="secondary" onClick={() => openCard(option)} aria-label={'افتح بطاقة ' + option.trip.city}>افتح البطاقة</button>
        </td>)}</tr>
      </tbody>
    </table>
  </div>;
}

export function BoredPlanningTools({cards, settings, candidates, updateSettings, openCard, openAdvisor, countryCount, countries, compoundPlans, exclusions}: Props & {
  openAdvisor?: () => void;
  countryCount: number;
  countries: ReactNode;
  compoundPlans: ReactNode;
}) {
  const panelId = useId();
  const [active,setActive] = useState<'flexible'|'compare'|'countries'>();
  const [flexibleLoaded, setFlexibleLoaded] = useState(false);
  const tools = [
    {id:'flexible',title:'موعدي مرن',description:'قارن الشهور وشوف الخطط المركبة',Icon:CalendarDays},
    {id:'compare',title:'مقارنة المدن',description:'قارن الحي والتكلفة والوصول',Icon:GitCompareArrows},
    {id:'countries',title:'أدلة الدول',description:cardNumber(countryCount) + ' دولة · طقس وتأشيرة',Icon:Globe2},
  ] as const;
  return <section className="bored-planning-tools" aria-labelledby={panelId + '-heading'}>
    <h2 id={panelId + '-heading'}>أدوات ثانية</h2>
    <div className="bored-tool-tiles">
      {tools.map(({id,title,description,Icon}) => <button type="button" key={id} className="bored-tool-tile"
        aria-label={title} aria-expanded={active === id} aria-controls={panelId + '-' + id}
        onClick={() => {
          if (id === 'flexible') setFlexibleLoaded(true);
          setActive(current => current === id ? undefined : id);
        }}>
        <Icon size={23} aria-hidden="true"/><span><strong>{title}</strong><small>{description}</small></span>
      </button>)}
      {openAdvisor && <button type="button" className="bored-tool-tile" aria-label="اسأل مستشاري" onClick={() => {
        setActive(undefined);
        openAdvisor();
      }}>
        <MessageCircle size={23} aria-hidden="true"/><span><strong>اسأل مستشاري</strong><small>اسأل عن وجهة أو تفاصيل سفرتك</small></span>
      </button>}
    </div>
    <div id={panelId + '-flexible'} className="bored-tool-panel" hidden={active !== 'flexible'}>
      {flexibleLoaded && <><FlexibleDates cards={cards} settings={settings} updateSettings={updateSettings} exclusions={exclusions}/>{compoundPlans}</>}
    </div>
    <div id={panelId + '-compare'} className="bored-tool-panel" hidden={active !== 'compare'}>
      <DestinationComparison candidates={candidates} settings={settings} openCard={openCard}/>
    </div>
    <div id={panelId + '-countries'} className="bored-tool-panel" hidden={active !== 'countries'}>{countries}</div>
  </section>;
}
