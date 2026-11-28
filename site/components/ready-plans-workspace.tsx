'use client';

import {useRef, useState} from 'react';
import {CalendarDays, Check, Clock3, Footprints, MapPin, MapPinned, Minus, Plus, Route, TrainFront, Wallet} from 'lucide-react';
import '../app/ready-plans.css';
import {formatArabicDuration, formatArabicHours} from '../lib/arabic-duration';
import type {DestinationExclusion} from '../lib/destination-exclusions';
import {readyCityMap, readyHotelMap, readyPlaceMap, verifiedReadyPlaces} from '../lib/ready-plan-maps';
import {filterReadyPlans, estimateReadyPlan, readyPlanRoute, readyPlanTypeLabels, readyCategoryLabels, readyDurationLabels, resolveReadyPlanTripCard,
  type ReadyPlan, type ReadyPlanChoice, type ReadyPlanType, type ReadyDuration} from '../lib/ready-plans';
import {cardMoney, cardNumber, dateText, stayNights, todayInRiyadh, tripDaysText} from '../lib/trip-card';
import type {TripCards} from '../lib/trip-card-schema';
import {monthNames} from '../lib/world';
import {tipMatchesPlace,type YoutubeTravelTip} from '../lib/youtube-watch';
import {CommunityTipList,CommunityTips,useCommunityTips} from './community-tips';
import {MoneyInput} from './money-input';
import {PlaceImage} from './place-image';
import {ReadyPriceSource} from './ready-price-source';
import {ReadyRouteMaps} from './ready-route-maps';

const steps = ['اختر رحلتك','اختر المسار','تفاصيل المسار','احفظ في رحلتي'];
const categories = Object.entries(readyCategoryLabels) as [keyof typeof readyCategoryLabels, string][];
const maxPlanDays = 30;

type Props = {initialMonth?:number; initialBudget?:number; cards?:TripCards; exclusions?:readonly DestinationExclusion[];
  canSave:boolean; onSave:(choice:ReadyPlanChoice) => boolean; onOpenSaved:() => void};
type Estimate = ReturnType<typeof estimateReadyPlan>;
type Stop = ReadyPlan['stops'][number];

function CostTotal({estimate}: {estimate:Estimate}) {
  return <div className="ready-cost-total">
    {estimate.partial ? <span className="ready-tag ready-tag-warn">تحتاج تسعير</span> :
      <div><span>المجموع التقديري</span><strong>{cardMoney(estimate.total)}</strong></div>}
    {estimate.remaining !== null ? <span className="ready-cost-balance" data-over={estimate.remaining < 0}>
      {estimate.remaining < 0 ? 'يتجاوز بـ ' : 'يبقى '}{cardMoney(Math.abs(estimate.remaining))}
    </span> : null}
  </div>;
}

function Transfers({transfers}: {transfers: ReadyPlan['transfers']}) {
  return transfers.length > 0 && <ul className="ready-transfers" aria-label="التنقّل بين المدن">
    {transfers.map((transfer,index) => <li key={transfer.from + transfer.to + index}>
      <TrainFront aria-hidden="true" size={18}/>
      <div>
        <strong>{transfer.from} إلى {transfer.to}</strong>
        <span>{transfer.mode} · {transfer.hours === null ? 'المدة تحتاج تحقق' : formatArabicHours(transfer.hours)} · {transfer.price.amount === null ? 'تحتاج تسعير' : cardMoney(transfer.price.amount)}</span>
        <ReadyPriceSource price={transfer.price}/>
      </div>
    </li>)}
  </ul>;
}

function RouteCard({plan, month, budget, onChoose}: {plan:ReadyPlan; month:number; budget:number; onChoose:() => void}) {
  const first = plan.stops[0];
  const tips = useCommunityTips(plan.stops.map(stop=>({...stop,country:stop.country ?? plan.country})));
  const estimate = estimateReadyPlan(plan,undefined,budget);
  const season = plan.months_best.includes(month) ? 'أفضل شهر لها' : 'مناسب · مو أفضل شهر';
  return <article className="panel ready-route-card">
    <PlaceImage place={first.image_key ?? first.city} fallbackName={first.city} className="ready-route-photo"
      label={<h3>{plan.title}</h3>} overlay={<span className={'ready-tag ' + (plan.months_best.includes(month) ? 'ready-tag-best' : 'ready-tag-warn')}>{season}</span>}/>
    <div className="ready-route-card-content">
      <p className="ready-route-line"><Route aria-hidden="true" size={18}/><span>{readyPlanRoute(plan)}</span></p>
      <CostTotal estimate={estimate}/>
      <p className="ready-arrival"><Clock3 aria-hidden="true" size={18}/>
        {plan.arrival_hours === null ? 'مدة الوصول من الرياض تحتاج تحقق' : 'الوصول من الرياض نحو ' + formatArabicHours(plan.arrival_hours)}
      </p>
      {plan.arrival_note && <p className="ready-arrival-note">{plan.arrival_note}</p>}
      <Transfers transfers={plan.transfers}/>
      <details className="ready-people"><summary>كلام الناس</summary><CommunityTips tips={tips}/></details>
      <button type="button" className="ready-primary" onClick={onChoose} aria-label={'اختر مسار ' + plan.title}>اختر هذا المسار</button>
    </div>
  </article>;
}

function StopPlaces({stop,tips}: {stop:Stop;tips:readonly YoutubeTravelTip[]}) {
  const [category,setCategory] = useState<keyof typeof readyCategoryLabels>(categories[0][0]);
  const places = verifiedReadyPlaces(stop).filter(place => place.category === category);
  return <section className="ready-stop-places" aria-label={'الأماكن في ' + stop.city}>
    <h3>الأماكن في {stop.city}</h3>
    <div className="ready-place-categories" role="group" aria-label="الفئات">
      {categories.map(([id, label]) => <button type="button" className="secondary" aria-pressed={category === id} key={id}
        onClick={() => setCategory(id)}>{label}</button>)}
    </div>
    {places.length > 0 ? <ul className="ready-location-list">
      {places.map(place => <li key={place.osm_url}>
        <div>
          <strong>{place.name}</strong>
          <span className="ready-location-time"><Footprints aria-hidden="true" size={16}/>
            {place.distance_meters <= 1500 && place.walk_minutes !== null ? 'مشي تقديري · ' + formatArabicDuration(place.walk_minutes) : 'مدة التنقّل تحتاج تحقق'}
          </span>
          <small className="ready-price-source">{cardNumber(place.distance_meters)} م من السكن بخط مستقيم</small>
          <span>{place.price?.amount != null ? cardMoney(place.price.amount) : 'السعر يحتاج تحقق'}</span>
          {place.price && <ReadyPriceSource price={place.price}/>}
          <small className="ready-price-source"><a href={place.osm_url} target="_blank" rel="noreferrer">المصدر: OpenStreetMap</a></small>
          <CommunityTipList tips={tips.filter(tip=>tipMatchesPlace(tip,place))}/>
        </div>
        <a className="ready-map-link" href={readyPlaceMap(place)} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" size={18}/> Google Maps</a>
      </li>)}
    </ul> : <p className="ready-muted">ما فيه مكان موثّق لهالفئة في الخطة.</p>}
  </section>;
}

function StopDays({stop, days, startDay, departureDay}: {stop:Stop; days:number; startDay:number; departureDay:boolean}) {
  const lastRecordedDay = stop.day_plan.at(-1);
  const departure = departureDay && lastRecordedDay?.evening.startsWith('المغادرة') ? lastRecordedDay : undefined;
  const cityDays = departure ? stop.day_plan.slice(0,-1) : stop.day_plan;
  return <section className="ready-stop-days" aria-label={'جدول الأيام في ' + stop.city}>
    <h3>جدول الأيام</h3>
    <ol className="ready-days-list">
      {Array.from({length:days},(_,index) => {
        const lastDay = departureDay && index === days - 1;
        const day = lastDay ? departure : cityDays[index];
        return <li key={index}>
          <h4>اليوم {cardNumber(startDay + index)}</h4>
          {day ? <>
            <dl><div><dt>صباح</dt><dd>{day.morning || 'وقت مرن'}</dd></div>
              <div><dt>ظهر</dt><dd>{day.noon || 'وقت مرن'}</dd></div>
              <div><dt>مساء</dt><dd>{day.evening || 'وقت مرن'}</dd></div></dl>
            {day.rest && <span className="ready-tag">يوم راحة</span>}
          </> : <p className="ready-muted">{lastDay ? 'تسجيل الخروج والانتقال إلى مطار المغادرة حسب حجزك.' : 'وقت مرن، ما له جدول مسجّل في هالخطة.'}</p>}
        </li>;
      })}
    </ol>
  </section>;
}

function StopCard({stop, country, nights, startDay, departureDay, canAdd, onNight}: {
  stop:Stop; country:string; nights:number; startDay:number; departureDay:boolean; canAdd:boolean; onNight:(change:number) => void;
}) {
  const hotelMap = readyHotelMap(stop);
  const cityMap = readyCityMap(stop);
  const tips = useCommunityTips([{...stop,country,places:[stop.hotel,...stop.places]}]);
  return <article className="panel ready-stop-card">
    <PlaceImage place={stop.image_key ?? stop.city} className="ready-stop-photo" fallbackName={stop.city} label={<h2>{stop.city}</h2>}/>
    <div className="ready-stop-content">
      <div className="ready-stop-heading">
        <p>{stop.summary}</p>
        <div className="ready-nights" aria-label={'عدد الليالي في ' + stop.city}>
          <button type="button" className="secondary" aria-label={'قلّل الليالي في ' + stop.city} disabled={nights <= 1}
            onClick={() => onNight(-1)}><Minus aria-hidden="true" size={19}/></button>
          <strong aria-live="polite">{stayNights(nights)}</strong>
          <button type="button" className="secondary" aria-label={'زد الليالي في ' + stop.city} disabled={!canAdd}
            onClick={() => onNight(1)}><Plus aria-hidden="true" size={19}/></button>
        </div>
      </div>
      <section className="ready-stay">
        <div>
          <h3>سكنك</h3>
          <p>الحي · {stop.base_area || 'يحتاج تحديد'}</p>
          <p>{stop.hotel.name || 'الفندق يحتاج تحديد'}</p>
          <strong>{stop.hotel.night_price.amount === null ? 'الليلة تحتاج تسعير' : cardMoney(stop.hotel.night_price.amount) + ' لليلة'}</strong>
          <ReadyPriceSource price={stop.hotel.night_price}/>
          {stop.hotel.osm_url && <small className="ready-price-source"><a href={stop.hotel.osm_url} target="_blank" rel="noreferrer">المصدر: OpenStreetMap</a></small>}
          {stop.hotel.coordinate_source && !stop.hotel.osm_url && <small className="ready-price-source"><a href={stop.hotel.coordinate_source} target="_blank" rel="noreferrer">مصدر موقع الفندق</a></small>}
          <CommunityTipList tips={tips.filter(tip=>tipMatchesPlace(tip,stop.hotel))}/>
        </div>
        {hotelMap && <a className="ready-map-link" href={hotelMap} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" size={18}/> خريطة الفندق</a>}
      </section>
      {cityMap && <a className="ready-map-link ready-stop-map" href={cityMap} target="_blank" rel="noreferrer">
        <MapPinned aria-hidden="true" size={20}/> عرض على الخريطة
      </a>}
      <details className="ready-people"><summary>كلام الناس</summary><CommunityTips tips={tips}/></details>
      <StopPlaces stop={stop} tips={tips}/>
      <StopDays stop={stop} days={nights + Number(departureDay)} startDay={startDay} departureDay={departureDay}/>
    </div>
  </article>;
}

function RouteDetails({choice, estimate, onNight}: {choice:ReadyPlanChoice; estimate:Estimate; onNight:(index:number,change:number) => void}) {
  const {plan,nights} = choice;
  return <>
    <div className="panel ready-route-overview">
      <div>
        <h2>{plan.title}</h2>
        <p className="ready-route-line"><Route aria-hidden="true" size={18}/><span>{readyPlanRoute(plan,nights)}</span></p>
        <p>تبدأ رحلتك من {plan.stops[0].city}</p>
      </div>
      <CostTotal estimate={estimate}/>
    </div>
    <ReadyRouteMaps stops={plan.stops} className="panel ready-maps"/>
    {plan.transfers.length > 0 && <div className="panel ready-detail-transfers"><h2>التنقّل بين المدن</h2><Transfers transfers={plan.transfers}/></div>}
    {plan.stops.map((stop,index) => <StopCard stop={stop} country={stop.country ?? plan.country} key={stop.city + index} nights={nights[index]}
      departureDay={index === plan.stops.length - 1} startDay={1 + nights.slice(0,index).reduce((sum,night) => sum + night,0)}
      canAdd={estimate.days < maxPlanDays} onNight={change => onNight(index,change)}/>)}
    <p className="panel ready-route-line"><MapPin size={18} aria-hidden="true"/> تنتهي في {plan.stops[plan.stops.length - 1].city}</p>
  </>;
}

function ReviewPlan({choice, estimate}: {choice:ReadyPlanChoice; estimate:Estimate}) {
  const {plan, nights, month, budget} = choice;
  return <article className="panel ready-review">
    <div className="ready-route-overview">
      <div>
        <h2>{plan.title}</h2>
        <p className="ready-route-line"><Route aria-hidden="true" size={18}/><span>{readyPlanRoute(plan,nights)}</span></p>
        <p>{monthNames[month - 1]} · {tripDaysText(estimate.days)} · سقف {cardMoney(budget)}</p>
      </div>
      <CostTotal estimate={estimate}/>
    </div>
    <h3>بنود التكلفة</h3>
    <ul className="ready-review-lines">
      {estimate.lines.map((line,index) => <li key={line.label + index}>
        <div><strong>{line.label}</strong><ReadyPriceSource price={line.price}/></div>
        <span>{line.total === null ? 'تحتاج تسعير' : cardMoney(line.total)}</span>
      </li>)}
    </ul>
    {estimate.partial && estimate.lines.some(line => line.total !== null) &&
      <p className="ready-muted">مجموع البنود المعروفة · <strong>{cardMoney(estimate.total)}</strong></p>}
    {plan.sources.length > 0 && <details className="ready-evidence">
      <summary>المصادر</summary>
      <ul>{plan.sources.map((item,index) => <li key={item.label + index}>
        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.label}</a> : item.label}
      </li>)}</ul>
      {plan.checked_date && <small>آخر فحص مسجّل {dateText(plan.checked_date)}</small>}
    </details>}
  </article>;
}

export function ReadyPlansWorkspace({initialMonth = 12, initialBudget = 5000, cards, exclusions, canSave, onSave, onOpenSaved}: Props) {
  const [step,setStep] = useState(0);
  const [type,setType] = useState<'all'|ReadyPlanType>('all');
  const [month,setMonth] = useState(initialMonth);
  const [duration,setDuration] = useState<'all'|ReadyDuration>('all');
  const [budgetInput,setBudgetInput] = useState(String(initialBudget));
  const [selectedId,setSelectedId] = useState<string>();
  const [nights,setNights] = useState<number[]>([]);
  const [saved,setSaved] = useState(false);
  const [saveError,setSaveError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const budget = Number(budgetInput);
  const budgetValid = Number.isFinite(budget) && budget > 0 && budget <= 1_000_000_000;
  const today = todayInRiyadh();
  const matches = budgetValid ? filterReadyPlans({type,month,duration,budget,exclusions},cards,today) : [];
  const selected = matches.find(plan => plan.id === selectedId);
  const plan = selected && resolveReadyPlanTripCard(selected,cards,nights,month,today);
  const activeStep = step > 1 && !plan ? 1 : step;
  const choice = plan && {plan,nights,month,budget};
  const estimate = plan && estimateReadyPlan(plan,nights,budget);

  function go(next: number) {
    setStep(next);
    heading.current?.scrollIntoView?.({block:'start'});
  }

  function choose(plan:ReadyPlan) {
    setSelectedId(plan.id);
    setNights(plan.stops.map(stop => stop.nights));
    setSaved(false);
    setSaveError(false);
    go(2);
  }

  function editNight(index:number, change:number) {
    setNights(current => {
      const total = current.reduce((sum,night) => sum + night,0);
      if (current[index] + change < 1 || total + change >= maxPlanDays) return current;
      return current.map((night,position) => position === index ? night + change : night);
    });
    setSaved(false);
    setSaveError(false);
  }

  return <section className="ready-workspace" aria-labelledby="ready-plans-title">
    <h1 id="ready-plans-title" ref={heading}>خطط جاهزة</h1>
    <nav className="ready-steps" aria-label="خطوات الخطط الجاهزة">
      <ol>{steps.map((name,index) => <li key={name}>
        <button type="button" aria-current={activeStep === index ? 'step' : undefined} data-done={index < activeStep}
          disabled={index > activeStep} onClick={() => go(index)}>
          <span>{index < activeStep ? <Check aria-hidden="true" size={16}/> : cardNumber(index + 1)}</span>{name}
        </button>
      </li>)}</ol>
    </nav>
    {activeStep === 0 && <form className="panel ready-filters" onSubmit={event => {event.preventDefault();if(matches.length)go(1);}}>
      <h2>اختر رحلتك</h2>
      <fieldset><legend>نوع الرحلة</legend><div className="ready-type-choices">
        <button type="button" className="secondary" aria-pressed={type === 'all'} onClick={() => setType('all')}>كل الأنواع</button>
        {Object.entries(readyPlanTypeLabels).map(([id, label]) => <button type="button" className="secondary" key={id}
          aria-pressed={type === id} onClick={() => setType(id as ReadyPlanType)}>{label}</button>)}
      </div></fieldset>
      <div className="ready-filter-fields">
        <label><span><CalendarDays aria-hidden="true" size={18}/> شهر الرحلة</span>
          <select value={month} onChange={event => setMonth(Number(event.target.value))}>
            {monthNames.map((month,index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
        </label>
        <label><span><Clock3 aria-hidden="true" size={18}/> المدة</span>
          <select value={duration} onChange={event => setDuration(event.target.value as 'all'|ReadyDuration)}>
            <option value="all">كل المدد</option>
            {Object.entries(readyDurationLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label><span><Wallet aria-hidden="true" size={18}/> الميزانية بالريال</span>
          <MoneyInput currency="SAR" label="الميزانية بالريال" value={budgetInput} onChange={setBudgetInput}/>
        </label>
      </div>
      <div className="ready-flow-actions">
        <p role="status">عدد الخطط المطابقة: <strong>{cardNumber(matches.length)}</strong></p>
        <button type="submit" className="ready-primary" disabled={!matches.length}>اعرض المسارات</button>
      </div>
    </form>}
    {activeStep === 1 && <section className="ready-route-results" aria-label="المسارات المطابقة">
      <div className="ready-section-head"><h2>اختر المسار</h2><p role="status">عدد الخطط المطابقة: <strong>{cardNumber(matches.length)}</strong></p></div>
      {matches.some(plan=>estimateReadyPlan(plan).partial)&&<p className="notice warning">بعض المسارات فيها بنود تحتاج تسعير. راجع تفاصيلها قبل اعتماد الميزانية.</p>}
      <div className="ready-route-grid">
        {matches.map(plan => <RouteCard key={plan.id} plan={plan} month={month} budget={budget} onChoose={() => choose(plan)}/>)}
      </div>
      <button type="button" className="secondary" onClick={() => go(0)}>تعديل الاختيارات</button>
    </section>}
    {activeStep === 2 && choice && estimate && <section className="ready-route-detail" aria-label="تفاصيل المسار">
      <RouteDetails choice={choice} estimate={estimate} onNight={editNight}/>
      <div className="panel ready-flow-actions ready-detail-actions">
        <CostTotal estimate={estimate}/>
        <div><button type="button" className="secondary" onClick={() => go(1)}>ارجع للمسارات</button>
          <button type="button" className="ready-primary" onClick={() => go(3)}>راجع واحفظ في رحلتي</button></div>
      </div>
    </section>}
    {activeStep === 3 && choice && estimate && <section className="ready-review-section" aria-label="مراجعة وحفظ الخطة">
      <ReviewPlan choice={choice} estimate={estimate}/>
      {saved && <p role="status" className="ready-saved"><Check aria-hidden="true" size={20}/> أضيفت إلى رحلتي. تابع مؤشر الحفظ.</p>}
      {saveError && <p role="alert" className="notice warning">تعذّر إضافة الخطة. راجع حالة الحفظ وحاول مرة ثانية.</p>}
      {!canSave && !saved && <p className="notice">الحفظ يتطلب الاتصال بحسابك.</p>}
      <div className="ready-flow-actions">
        <button type="button" className="secondary" onClick={() => go(2)}>ارجع للتفاصيل</button>
        {saved ? <button type="button" className="ready-primary" onClick={onOpenSaved}>افتح رحلتي</button> :
          <button type="button" className="ready-primary" disabled={!canSave} onClick={() => {
            const result = onSave(choice);
            setSaved(result);
            setSaveError(!result);
          }}>احفظ في رحلتي</button>}
      </div>
    </section>}
  </section>;
}
