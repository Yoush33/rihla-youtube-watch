'use client';

import {useState,type FormEvent} from 'react';
import {CalendarDays, CircleCheck, Copy, MapPin} from 'lucide-react';
import {useCatalog} from './catalog-context';
import {PlaceImage} from './place-image';
import {ReadyPriceSource} from './ready-price-source';
import {ReadyRouteMaps} from './ready-route-maps';
import {countryPackage, countryPreparation} from '../lib/country-package';
import {estimateReadyPlan, readyPlanRoute} from '../lib/ready-plan-calculations';
import {readyTravelMonth,type SavedReadyPlan} from '../lib/ready-plan-saved';
import {cardMoney,cardYear,dateText,shiftCardDate,tripDaysText} from '../lib/trip-card';
import {monthNames} from '../lib/world';
import '../app/saved-ready-plan.css';
import {DayStrip, TripEvents} from './day-strip';
import {MilesLine} from './miles-line';
import {cityWithCountry} from '../lib/place-label';
import {defaultDayItems, newItemId, tripDays, type DayList} from '../lib/trip-days';

export function SavedReadyPlanCard({saved,canSave,onCheck,onCopy,onDays}: {
  saved:SavedReadyPlan;
  canSave:boolean;
  onCheck:(checked:string[])=>boolean;
  onCopy:(date:string)=>boolean;
  onDays?:(days:DayList)=>boolean;
}) {
  const {countries} = useCatalog();
  const [copyOpen,setCopyOpen] = useState(false);
  const [date,setDate] = useState('');
  const {plan,nights} = saved;
  const estimate = estimateReadyPlan(plan,nights,saved.budget);
  const days = saved.days ?? defaultDayItems(plan,nights);
  const list = tripDays(plan,nights);
  const first = plan.stops[0];
  const last = plan.stops[plan.stops.length-1];
  const travelMonth = readyTravelMonth(saved.month,saved.created_on);
  const countryCodes = [...new Set([plan.country,...(plan.countries??[])])];
  const knownPrice = estimate.lines.some(row=>row.total!==null);
  const period = saved.start_date ? dateText(saved.start_date)+' إلى '+dateText(shiftCardDate(saved.start_date,estimate.nights)) :
    monthNames[saved.month-1]+' '+cardYear(Number(travelMonth.slice(0,4)));

  function duplicate(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (date && date!==saved.start_date && onCopy(date)) {
      setDate('');
      setCopyOpen(false);
    }
  }

  function check(key:string,selected:boolean) {
    onCheck(selected?[...new Set([...saved.checked,key])]:saved.checked.filter(item=>item!==key));
  }

  return <section className="saved-ready-plan" aria-labelledby="saved-ready-title">
    <h1 id="saved-ready-title">الخطة المحفوظة</h1>
    <article className="panel saved-ready-cover">
      <PlaceImage kind="city" place={first.image_key??first.city} fallbackName={first.city} className="saved-ready-photo"
        label={<><h2>{plan.title}</h2><p>{cityWithCountry(first.city,first.country ?? plan.country)}</p></>}/>
      <div className="saved-ready-overview">
        <div className="saved-ready-period"><CalendarDays size={19} aria-hidden="true"/><span>{period} · {tripDaysText(estimate.days)}</span></div>
        <p className="saved-ready-route"><MapPin size={19} aria-hidden="true"/>{readyPlanRoute(plan,nights)}</p>
        <div className="saved-ready-total">
          {estimate.partial ? <strong className="saved-ready-needs-price">تحتاج تسعير</strong> :
            <div><small>المجموع التقديري</small><strong>{cardMoney(estimate.total)}</strong></div>}
          {estimate.remaining!==null&&<div data-over={estimate.remaining<0}>
            <small>{estimate.remaining<0?'يتجاوز بـ':'يبقى'}</small>
            <b>{cardMoney(Math.abs(estimate.remaining))}</b>
          </div>}
        </div>
        {saved.start_date&&<p className="notice warning">شيّك على الأسعار وإتاحة السكن للتاريخ الجديد.</p>}
        <p>تبدأ رحلتك من <b>{cityWithCountry(first.city,first.country ?? plan.country)}</b> وتنتهي في <b>{cityWithCountry(last.city,last.country ?? plan.country)}</b>.</p>
        <MilesLine country={first.country ?? plan.country} city={first.city}/>
        <details>
          <summary>بنود التقدير ومصادرها</summary>
          <ul className="saved-ready-costs">{estimate.lines.map(({label,total,price},index)=><li key={label+'-'+index}>
            <div><b>{label}</b><span>{total===null?'تحتاج تسعير':cardMoney(total)}</span></div>
            <ReadyPriceSource price={price}/>
          </li>)}</ul>
          {estimate.partial&&knownPrice&&<p>مجموع البنود المعروفة · <strong>{cardMoney(estimate.total)}</strong></p>}
        </details>
        <ReadyRouteMaps stops={plan.stops} sourcePlanId={plan.id}/>
      </div>
    </article>
    <article className="panel">
      <DayStrip plan={plan} nights={nights} days={days} editable={canSave && !!onDays} onChange={value=>onDays?.(value)}
        startDate={saved.start_date} departTime={saved.depart_time}/>
    </article>
    <article className="panel">
      <TripEvents plan={plan} nights={nights} startDate={saved.start_date} days={list}
        onAdd={canSave && onDays ? (index,item)=>onDays(list.map(day=>day.index === index ? [...(days[day.index] ?? []),{...item,id:newItemId('a')}] : days[day.index] ?? [])) : undefined}/>
    </article>
    <article className="panel saved-ready-prep" aria-labelledby="ready-prep-title">
      <h2 id="ready-prep-title"><CircleCheck size={23} aria-hidden="true"/> قبل ما تطلع</h2>
      {countryCodes.map(code=>{
        const items=countryPreparation(code,countries);
        return <div key={code} className="saved-ready-prep-country">
          {countryCodes.length>1&&<h3>{countryPackage(code,countries)?.name_ar??code}</h3>}
          {items.length?<ul>{items.map(item=>{
            const key=code+':'+item.label;
            return <li key={key}>
              <label><input type="checkbox" checked={saved.checked.includes(key)} disabled={!canSave}
                onChange={event=>check(key,event.target.checked)}/><span><b>{item.label}</b> {item.value}</span></label>
              {item.url&&<a href={item.url} target="_blank" rel="noreferrer">راجع المصدر</a>}
            </li>;
          })}</ul>:<p>راجع متطلبات الدخول ووثائق السفر قبل الحجز.</p>}
        </div>;
      })}
    </article>
    <article className="panel saved-ready-copy">
      <button type="button" className="secondary" aria-expanded={copyOpen} disabled={!canSave} onClick={()=>setCopyOpen(value=>!value)}>
        <Copy size={17} aria-hidden="true"/> نفس الرحلة بتاريخ جديد</button>
      {copyOpen&&<form onSubmit={duplicate}>
        <label>تاريخ بداية الرحلة<input type="date" value={date} onChange={event=>setDate(event.target.value)} required/></label>
        <button type="submit" disabled={!date||date===saved.start_date}>احفظ نسخة بتاريخ جديد</button>
      </form>}
    </article>
  </section>;
}
