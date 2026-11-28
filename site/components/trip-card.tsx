'use client';

import {useId, useState, type FormEvent} from 'react';
import {CalendarDays, CircleCheck, ClipboardList, Copy, MapPin, Plane, Wallet} from 'lucide-react';
import {validMoneyInput} from '../lib/money';
import {formatWalkingMinutes} from '../lib/arabic-duration';
import {initialTripCards} from '../lib/trip-card-data';
import {countryHolidays, countryPackage} from '../lib/country-package';
import {CountryPreparationList} from './country-package';
import {PlaceImage} from './place-image';
import {YoutubeWatch} from './youtube-watch';
import {useCatalog} from './catalog-context';
import type {YoutubeReviews} from '../lib/youtube-watch-schema';
import type {OnYoutubeReview} from '../lib/youtube-watch';
import {
  cardCosts, cardDays, cardMode, cardMoney, cardNumber, cardSummary,
  copyCardGroup, costForTripDays, costLabels, costNeedsReview, dateText, shiftCardDate, stayNights, todayInRiyadh, tripDaysText, walkMap,
} from '../lib/trip-card';
import {maxTripCardGroups, type TripCard, type TripCardCost, type TripCardCostKey, type TripCardGroup, type TripCards} from '../lib/trip-card-schema';

export type TripCardSelection = {
  groupId: string;
  tripId: TripCard['id'];
  nonce?: number;
  estimate?: {days:number; budget:number; mode:TripCard['mode']};
};

type Props = {
  cards?: TripCards;
  selection?: TripCardSelection;
  canSave: boolean;
  updateCards: (change: (cards: TripCards) => TripCards) => boolean;
  saveSummary: (group: TripCardGroup, trip: TripCard, budget: number, summary: string, days: number) => boolean;
  openSaved: () => void;
  openCountry: (code: string) => void;
  youtubeReviews?: YoutubeReviews;
  onYoutubeReview?: OnYoutubeReview;
};

function AmountInput({label, value, disabled, integer, positive, onCommit}: {
  label: string;
  value: number | null;
  disabled: boolean;
  integer?: boolean;
  positive?: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();
  const text = draft ?? (value === null ? '' : String(value));

  function commit() {
    if (draft === null) return;
    const number = text ? Number(text) : null;
    if (!validMoneyInput(text, integer ? 'JPY' : 'SAR') || (positive && (number === null || number <= 0))) {
      setInvalid(true);
      return;
    }
    onCommit(number);
    setDraft(null);
    setInvalid(false);
  }

  return <span className="trip-card-amount">
    <input type="text" dir="ltr" inputMode={integer ? 'numeric' : 'decimal'} aria-label={label}
      aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined}
      placeholder="—" value={text} maxLength={20} disabled={disabled}
      onChange={e => {
        setDraft(e.target.value.replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c <= '٩' ? 1632 : 1776))).replace(/٫/g, '.').trim());
        setInvalid(false);
      }}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
    />
    {invalid && <small id={errorId} role="alert">{positive ? 'أدخل ميزانية أكبر من صفر.' : integer ? 'أدخل عدد أميال صحيحًا.' : 'أدخل مبلغًا حتى منزلتين عشريتين.'}</small>}
  </span>;
}

function CostRow({row, today, canSave, onUpdate}: {
  row: ReturnType<typeof cardCosts>['rows'][number];
  today: string;
  canSave: boolean;
  onUpdate: (key: TripCardCostKey, cost: TripCardCost) => void;
}) {
  const {key, cost, units, subtotal} = row;
  const label = costLabels[key];
  const multiplied = key === 'hotel' || key === 'daily';
  return <div className="trip-card-cost-row">
    <div>
      <strong>{label}</strong>
      {multiplied && <span className="trip-card-rate-line"> × {key === 'hotel' ? stayNights(units) : tripDaysText(units)}{subtotal !== null && ' = ' + cardMoney(subtotal)}</span>}
      <div className="trip-card-cost-meta">
        {cost.estimated && !cost.source.includes('تقديري') && <span className="trip-card-tag">تقديري</span>}
        {costNeedsReview(key, cost, today) && <span className="trip-card-tag warning">يحتاج تحقق</span>}
        <span>{cost.source} · آخر تحقق {cost.checkedOn ? <bdi>{cost.checkedOn}</bdi> : '—'}</span>
      </div>
    </div>
    <div>
      <AmountInput label={label + (key === 'milesCount' ? '' : ' (ر.س)')} value={cost.value}
        disabled={!canSave} integer={key === 'milesCount'}
        onCommit={value => {
          if (value === cost.value) return;
          onUpdate(key, {...cost, value, source: value === null ? 'غير مدخل' : 'إدخال يدوي', checkedOn: value === null ? null : today, review:false});
        }}
      />
      {canSave && cost.value !== null && <details className="trip-card-source">
        <summary>المصدر والتحقق</summary>
        <label>مصدر {label}
          <input value={cost.source} maxLength={260} onChange={e => onUpdate(key, {...cost, source:e.target.value})}/>
        </label>
        <label className="trip-card-check"><input type="checkbox" checked={cost.estimated}
          onChange={e => onUpdate(key, {...cost, estimated:e.target.checked})}/> تقديري</label>
        <button type="button" className="secondary" onClick={() => onUpdate(key, {...cost, checkedOn:today, review:false})}>سجّل تحقق اليوم</button>
      </details>}
    </div>
  </div>;
}

function Walking({trip, canSave, update}: {trip: TripCard; canSave:boolean; update:(change:(trip:TripCard) => TripCard) => void}) {
  return <article className="panel trip-card-section">
    <h3>من باب السكن</h3>
    <ul className="trip-card-walk">
      {trip.walk.map((place, index) => {
        const patch = (change:Partial<typeof place>) => update(current => ({
          ...current, walk:current.walk.map((item, i) => i === index ? {...item, ...change} : item),
        }));
        return <li key={place.kind} className={place.car ? 'by-car' : undefined}>
          <div className="trip-card-place-head">
            <strong>{place.kind}</strong>
            {place.car && <span className="trip-card-tag warning">يحتاج سيارة</span>}
            <a href={walkMap(place.query)} target="_blank" rel="noreferrer"><MapPin size={15}/> خرائط Google<span className="sr-only"> {place.kind}</span></a>
          </div>
          <div>{place.description}</div>
          {!place.car && <small>{place.minutes ? formatWalkingMinutes(place.minutes) + ' مشيًا' : 'مدة المشي تحتاج تحقق'}</small>}
          <div className="trip-card-buttons">
            <button type="button" className="secondary" aria-pressed={place.rating === 'yes'} disabled={!canSave}
              aria-label={'يستاهل · ' + place.kind} onClick={() => patch({rating:place.rating === 'yes' ? undefined : 'yes'})}>يستاهل</button>
            <button type="button" className="secondary negative" aria-pressed={place.rating === 'no'} disabled={!canSave}
              aria-label={'ما يستاهل · ' + place.kind} onClick={() => patch({rating:place.rating === 'no' ? undefined : 'no'})}>ما يستاهل</button>
          </div>
          {canSave && <details className="trip-card-edit-place">
            <summary>تعديل {place.kind}</summary>
            <label>وصف المكان<input value={place.description} maxLength={420} onChange={e => patch({description:e.target.value})}/></label>
            <label>اسم البحث في خرائط Google<input key={place.query}
              defaultValue={place.query} maxLength={180} onBlur={e => {
                const value = e.target.value.trim();
                if (value && value !== place.query) patch({query:value, needsLocation:undefined});
                else e.target.value = place.query;
              }}/></label>
            <label>دقائق المشي<input value={place.minutes} maxLength={40} onChange={e => patch({minutes:e.target.value})}/></label>
            <label className="trip-card-check"><input type="checkbox" checked={place.car} onChange={e => patch({car:e.target.checked})}/> يحتاج سيارة</label>
          </details>}
        </li>;
      })}
    </ul>
  </article>;
}

function Comparison({group, selectedId, days, budget, setTripId}: {
  group: TripCardGroup;
  selectedId: string;
  days: number;
  budget: number;
  setTripId: (id:TripCard['id']) => void;
}) {
  return <section className="panel trip-card-section">
    <h3>مقارنة المجاميع</h3>
    <div className="trip-card-comparison">
      {group.trips.map(trip => {
        const cash = costForTripDays(trip, days, 'cash');
        const miles = trip.milesRoute === 'available' ? costForTripDays(trip, days, 'miles') : undefined;
        return <article key={trip.id} data-selected={selectedId === trip.id}>
          <PlaceImage place={trip.id} kind="city" label={trip.city} className="trip-card-comparison-photo"/>
          <div className="trip-card-comparison-content">
            <button type="button" className="secondary" onClick={() => setTripId(trip.id)}>{trip.city}</button>
            <div><span>نقدي</span><strong>{cash.partial ? 'تحتاج تسعير' : cardMoney(cash.total)}</strong></div>
            {!cash.partial && <>
              <div className="trip-card-meter" aria-hidden="true"><span data-over={cash.total > budget} style={{width:Math.min(100, cash.total / budget * 100) + '%'}}/></div>
              <small className="trip-card-balance" data-over={cash.total > budget}>
                {cash.total > budget ? 'يتجاوز بـ ' + cardMoney(cash.total - budget) : 'يبقى ' + cardMoney(budget - cash.total)}
              </small>
            </>}
            {miles && <div><span>بالأميال</span><strong>{miles.partial ? 'تحتاج تسعير' : cardMoney(miles.total)}</strong>
              {miles.milesPending ? <small>التوفر غير متحقق</small> : <small>+ {cardNumber(trip.costs.milesCount.value ?? 0)} ميل</small>}
            </div>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}

export function TripCardWorkspace({cards = initialTripCards, selection, canSave, updateCards, saveSummary, openSaved, openCountry, youtubeReviews, onYoutubeReview}: Props) {
  const [groupId, setGroupId] = useState(selection?.groupId ?? cards.groups[0].id);
  const [tripId, setTripId] = useState<TripCard['id'] | null>(selection?.tripId ?? null);
  const [useSavedBudget, setUseSavedBudget] = useState(false);
  const [useSavedMode, setUseSavedMode] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [feedback, setFeedback] = useState<{text:string; saved?:boolean; error?:boolean}>();
  const group = cards.groups.find(g => g.id === groupId) ?? cards.groups[0];
  const trip = group.trips.find(t => t.id === tripId) ?? group.trips[0];
  const code = trip.country.toUpperCase();
  const {countries:catalog} = useCatalog();
  const country = countryPackage(code,catalog);
  const holidays = countryHolidays(code, group.start, group.end,catalog);
  const today = todayInRiyadh();
  const requestedEstimate = selection?.groupId === group.id ? selection.estimate : undefined;
  const requestedMode = requestedEstimate && selection?.tripId === trip.id && !useSavedMode ? requestedEstimate.mode : trip.mode;
  const budget = !useSavedBudget && requestedEstimate ? requestedEstimate.budget : cards.budget;
  const days = requestedEstimate?.days ?? cardDays(group);
  const mode = trip.milesRoute === 'available' ? requestedMode : 'cash';
  const estimate = costForTripDays(trip, days, mode);
  const remaining = budget - estimate.total;
  const pending = trip.checklist.filter(item => !item.done).length;
  const countryDone = cards.countryDone[trip.country] ?? [];
  const checkedPeriod = dateText(group.start) + ' إلى ' + dateText(group.end);

  function selectTrip(id:TripCard['id']) {
    setTripId(id);
    setFeedback(undefined);
  }

  function update(change:(trip:TripCard) => TripCard) {
    return updateCards(current => ({
      ...current,
      groups:current.groups.map(g => g.id === group.id ? {
        ...g,
        trips:g.trips.map(t => t.id === trip.id ? change(t) : t) as TripCardGroup['trips'],
      } : g),
    }));
  }

  function changeMode(next:TripCard['mode']) {
    if (next !== trip.mode && !update(t => ({...t, mode:next}))) return;
    if (requestedEstimate && selection?.tripId === trip.id) setUseSavedMode(true);
  }

  function duplicate(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedDays = cardDays({start:newStart, end:newEnd});
    if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 30) {
      setFeedback({text:'اختر فترة من يوم واحد إلى ٣٠ يومًا.', error:true});
      return;
    }
    if (cards.groups.some(g => g.name === group.name && g.start === newStart && g.end === newEnd)) {
      setFeedback({text:'هذه المجموعة موجودة بنفس التواريخ. اخترها من قائمة مجموعات السفرات.', error:true});
      return;
    }
    if (cards.groups.length >= maxTripCardGroups) {
      setFeedback({text:'وصلت إلى حد ' + cardNumber(maxTripCardGroups) + ' مجموعة محفوظة.', error:true});
      return;
    }
    const id = crypto.randomUUID();
    if (!updateCards(current => ({
      ...current,
      groups:[...current.groups, copyCardGroup(current.groups.find(g => g.id === group.id) ?? group, id, newStart, newEnd)],
    }))) return;
    setGroupId(id);
    setTripId(trip.id);
    setNewStart('');
    setNewEnd('');
    setFeedback({text:'جهزت مجموعة التواريخ الجديدة. راجع أسعار الطيران والأميال والفندق والمساج وقائمة الحجز.'});
  }

  async function copyText() {
    const summary = cardSummary(group, trip, budget, today, catalog, {days, mode});
    if (!saveSummary(group, trip, budget, summary, days)) return;
    setFeedback({text:'أُضيف النص إلى الرحلات المحفوظة.', saved:true});
    try { await navigator.clipboard.writeText(summary); } catch { /* The saved plan always contains the text. */ }
  }

  return <section className="trip-card-workspace" aria-labelledby="trip-card-title">
    <h1 id="trip-card-title">بطاقة السفرة</h1>
    <div className="trip-card-lead">
      <div className="trip-card-hero">
        <PlaceImage place={trip.id} kind="city" className="trip-card-photo" label={<div className="trip-card-photo-title">
          <h2>{trip.city}</h2>
          {trip.neighborhood && <span><MapPin size={16} aria-hidden="true"/>{trip.neighborhood}</span>}
        </div>}/>
        <div className="trip-card-hero-content">
          <div className="trip-card-overview">
            <div>{estimate.partial ? <strong>تحتاج تسعير</strong> : <><span>المجموع التقديري</span><strong>{cardMoney(estimate.total)}</strong></>}</div>
            {!estimate.partial && <span className="trip-card-balance" data-over={remaining < 0}>
              {remaining < 0 ? 'يتجاوز بـ ' : 'يبقى '}{cardMoney(Math.abs(remaining))}
            </span>}
          </div>
          <div className="trip-card-hero-actions">
            <div className="trip-card-tags">
              <span className="trip-card-tag"><CalendarDays size={16} aria-hidden="true"/>{tripDaysText(days)} · {stayNights(days - 1)}</span>
              <span className="trip-card-tag"><Plane size={16} aria-hidden="true"/>{mode === 'miles' ? 'بالأميال' : 'نقدي'}</span>
            </div>
            <a className="trip-card-checklist-link" href="#trip-card-checklist"><ClipboardList size={18} aria-hidden="true"/>باقي قبل الحجز</a>
          </div>
        </div>
      </div>
      <article id="trip-card-checklist" className="panel trip-card-section" aria-labelledby="trip-card-checklist-title" tabIndex={-1}>
        <div className="trip-card-section-head">
          <h3 id="trip-card-checklist-title">باقي قبل الحجز</h3>
          <span className={'trip-card-tag' + (pending ? '' : ' complete')}>{pending ? 'متبقي ' + cardNumber(pending) : <><CircleCheck size={15} aria-hidden="true"/> اكتملت</>}</span>
        </div>
        <ul className="trip-card-checklist">
          {trip.checklist.map((task, index) => <li key={task.text}><label className="trip-card-check">
            <input type="checkbox" checked={task.done} disabled={!canSave} onChange={e => {
              const done = e.target.checked;
              update(t => ({...t, checklist:t.checklist.map((item, i) => i === index ? {...item, done} : item)}));
            }}/>{task.text}</label></li>)}
        </ul>
      </article>
    </div>
    {!canSave && <p className="notice">تقدر تتصفح البطاقات الآن. التعديل يحتاج اتصالًا بحسابك.</p>}
    <div className="panel trip-card-group">
      <label>مجموعات السفرات<select value={group.id} onChange={e => {
        setGroupId(e.target.value);
        setTripId(null);
        setNewStart('');
        setNewEnd('');
        setFeedback(undefined);
      }}>
        {cards.groups.map(g => <option key={g.id} value={g.id}>{g.name}{!g.historical ? ' · ' + dateText(g.start) + ' إلى ' + dateText(g.end) : ''}</option>)}
      </select></label>
      <div className="trip-card-cap">
        <span><Wallet size={18}/> سقف الميزانية (ر.س)</span>
        <AmountInput label="سقف الميزانية (ر.س)" value={budget} disabled={!canSave} positive
          onCommit={value => {
            if (value === null || value === budget) return;
            if (value === cards.budget || updateCards(current => ({...current, budget:value}))) setUseSavedBudget(true);
          }}/>
      </div>
      <div className="trip-card-dates"><CalendarDays size={19}/><span>{group.historical ? 'أساس الأسعار' : 'تواريخ المجموعة'} · {checkedPeriod} · شخص واحد</span></div>
    </div>
    <div className="trip-card-choices" role="group" aria-label="وجهات المجموعة">
      {group.trips.map(option => {
        const optionMode = option.id === trip.id ? mode : cardMode(option);
        const totals = costForTripDays(option, days, optionMode);
        return <button type="button" key={option.id} aria-pressed={trip.id === option.id} onClick={() => selectTrip(option.id)}>
          <span><strong>{option.city}</strong><small>{option.neighborhood || 'حي يحتاج تحديد'}</small></span>
          <span><b>{cardMoney(totals.total)}</b><small>{optionMode === 'cash' ? 'نقدي' : 'أميال'}{totals.partial ? ' · مجموع جزئي' : ''}</small></span>
        </button>;
      })}
    </div>
    <div className="trip-card-layout" key={group.id + trip.id}>
      <div className="trip-card-stack">
        <article className="panel trip-card-section trip-card-costs">
          <div className="trip-card-section-head">
            <div>
              <h3>السكن وتفاصيل التكلفة</h3>
              <p>{trip.hotel || 'الفندق يحتاج تحديد'}{trip.hotelNotes && ' · ' + trip.hotelNotes}</p>
            </div>
          </div>
          {canSave && <details className="trip-card-stay">
            <summary>تعديل الحي والفندق</summary>
            <div>
              <label>الحي<input value={trip.neighborhood} maxLength={160} onChange={e => update(t => ({...t, neighborhood:e.target.value}))}/></label>
              <label>الفندق<input value={trip.hotel} maxLength={180} onChange={e => update(t => ({...t, hotel:e.target.value}))}/></label>
              <label>ملاحظات الفندق<input value={trip.hotelNotes} maxLength={240} onChange={e => update(t => ({...t, hotelNotes:e.target.value}))}/></label>
            </div>
          </details>}
          <div className="trip-card-total">
            <div><span>{estimate.partial ? 'تحتاج تسعير · مجموع البنود المدخلة' : 'المجموع التقديري'}</span><strong>{cardMoney(estimate.total)}</strong></div>
            {estimate.partial ? <small>الميزانية تحتاج تحقق بعد استكمال البنود. أدخل صفر إذا تأكدت أن البند بلا رسوم.</small> : <>
              <div className="trip-card-balance" data-over={remaining < 0}><span>{remaining < 0 ? 'يتجاوز بـ' : 'يبقى'}</span><b>{cardMoney(Math.abs(remaining))}</b></div>
              <div className="trip-card-meter" role="progressbar" aria-label="استخدام سقف الميزانية"
                aria-valuenow={Math.min(100, Math.round(estimate.total / budget * 100))} aria-valuemin={0} aria-valuemax={100}
                aria-valuetext={cardMoney(estimate.total) + ' من ' + cardMoney(budget)}>
                <span data-over={remaining < 0} style={{width:Math.min(100, estimate.total / budget * 100) + '%'}}/>
              </div>
            </>}
          </div>
          <div className="trip-card-flight">
            <span><Plane size={17}/> طريقة حساب الطيران</span>
            <div className="trip-card-buttons" role="group" aria-label="طريقة حساب الطيران">
              <button type="button" className="secondary" aria-pressed={mode === 'cash'} onClick={() => changeMode('cash')} disabled={!canSave}>نقدي</button>
              <button type="button" className="secondary" aria-pressed={mode === 'miles'} onClick={() => changeMode('miles')}
                disabled={!canSave || trip.milesRoute !== 'available'}>أميال</button>
            </div>
          </div>
          <p className="trip-card-route">{trip.routeNote}</p>
          {canSave && <details className="trip-card-stay">
            <summary>حالة مسار الخطوط السعودية</summary>
            <label>هل السعودية تشغّل المسار في هالتواريخ؟
              <select value={trip.milesRoute} onChange={e => {
                const route = e.target.value as TripCard['milesRoute'];
                const notes = {available:'المسار متاح حسب تحققك؛ راجع مقعد الفرسان والرسوم.', unavailable:'السعودية ما تشغّل المسار في هالتواريخ حسب تحققك.', unknown:'تشغيل السعودية للمسار يحتاج تحقق.'};
                update(t => ({...t, milesRoute:route, routeNote:notes[route]}));
              }}>
                <option value="unknown">يحتاج تحقق</option><option value="available">إي، تشغّله</option><option value="unavailable">لا، ما تشغّله</option>
              </select>
            </label>
          </details>}
          {estimate.milesPending && <p className="notice warning">التوفر غير متحقق</p>}
          {estimate.rows.map(row => <CostRow row={row} key={row.key} canSave={canSave} today={today}
            onUpdate={(key, cost) => update(t => ({...t, costs:{...t.costs, [key]:cost}}))}/>)}
        </article>
        <Walking trip={trip} canSave={canSave} update={update}/>
      </div>
      <div className="trip-card-stack">
        <article className="panel trip-card-section">
          <h3>قبل ما تطلع{country && ' · ' + country.name_ar}</h3>
          <CountryPreparationList code={code} checked={countryDone} onToggle={canSave ? (index, checked) => {
            updateCards(current => {
              const done = current.countryDone[trip.country] ?? [];
              const next = checked ? [...new Set([...done, index])] : done.filter(i => i !== index);
              return {...current, countryDone:{...current.countryDone, [trip.country]:next}};
            });
          } : undefined}/>
          <button className="secondary" type="button" onClick={() => openCountry(code)}>افتح دليل الدولة</button>
        </article>
        <article className="panel trip-card-section">
          <h3>فعاليات في التواريخ</h3>
          <textarea aria-label="فعاليات في التواريخ" placeholder="فعاليات التواريخ تحتاج تحقق." value={trip.events} rows={3}
            disabled={!canSave} maxLength={600} onChange={e => update(t => ({...t, events:e.target.value}))}/>
          {holidays.length > 0 && <p>عطلات تتقاطع مع الموعد حسب التقويم المرفق · {holidays.map(holiday => holiday.name).join('، ')}</p>}
        </article>
        <details className="panel trip-card-section">
          <summary>كلام الناس · يوتيوب</summary>
          <YoutubeWatch destination={trip.id} reviews={youtubeReviews} onReview={onYoutubeReview}/>
        </details>
        <article className="panel trip-card-section">
          <h3>نفس السفرة بتاريخ جديد</h3>
          <form className="trip-card-copy-form" onSubmit={duplicate}>
            <label>الذهاب<input type="date" required value={newStart} max="9999-12-31" disabled={!canSave} onChange={e => {
              const start = e.target.value;
              setNewStart(start);
              const end = /^\d{4}-\d{2}-\d{2}$/.test(start) ? shiftCardDate(start, days - 1) : '';
              setNewEnd(/^\d{4}-\d{2}-\d{2}$/.test(end) ? end : '');
            }}/></label>
            <label>العودة<input type="date" required value={newEnd} min={newStart || undefined} max="9999-12-31"
              disabled={!canSave} onChange={e => setNewEnd(e.target.value)}/></label>
            <button type="submit" className="secondary" disabled={!canSave}>نفس السفرة بتاريخ جديد</button>
          </form>
          <div className="trip-card-actions">
            <button type="button" disabled={!canSave} onClick={copyText}><Copy size={17}/> نسخ كنص</button>
            {feedback?.saved && <button className="secondary" type="button" onClick={openSaved}>افتح الخطة المحفوظة</button>}
          </div>
          {feedback && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'error' : undefined}>{feedback.text}</p>}
        </article>
        <article className="panel trip-card-section trip-card-post">
          <h3>بعد ما ترجع</h3>
          <div className="trip-card-post-amount"><span>التكلفة الفعلية (ر.س)</span>
            <AmountInput label="التكلفة الفعلية (ر.س)" value={trip.post.actual ?? null} disabled={!canSave}
              onCommit={actual => update(t => {
                const current = costForTripDays(t, days, mode);
                const post = {returnAgain:t.post.returnAgain};
                return {...t, post:actual === null ? post : {
                  ...post, actual, estimate:t.post.estimate ?? current.total,
                  incomplete:t.post.incomplete ?? (current.partial || current.milesPending),
                }};
              })}/>
          </div>
          {trip.post.actual !== undefined && trip.post.estimate !== undefined && <p>
            الفرق عن {trip.post.incomplete ? 'مجموع التقدير المدخل' : 'التقدير'} · <b>{trip.post.actual === trip.post.estimate ? 'مطابق' : cardMoney(Math.abs(trip.post.actual - trip.post.estimate)) + (trip.post.actual > trip.post.estimate ? ' أعلى' : ' أقل')}</b>
          </p>}
          <div className="trip-card-buttons" role="group" aria-label="أرجع لها؟">
            <strong>أرجع لها؟</strong>
            {(['yes','no'] as const).map(value => <button key={value} type="button" className={'secondary' + (value === 'no' ? ' negative' : '')}
              aria-pressed={trip.post.returnAgain === value} disabled={!canSave}
              onClick={() => update(t => ({...t, post:{...t.post, returnAgain:t.post.returnAgain === value ? undefined : value}}))}>{value === 'yes' ? 'إي' : 'لا'}</button>)}
          </div>
        </article>
      </div>
    </div>
    <Comparison group={group} selectedId={trip.id} days={days} budget={budget} setTripId={selectTrip}/>
  </section>;
}
