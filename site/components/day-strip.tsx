'use client';

import {useEffect, useMemo, useState, type FormEvent} from 'react';
import {ArrowDown, ArrowLeftRight, ArrowUp, BedDouble, CalendarPlus, Compass, MapPin, PlaneLanding, PlaneTakeoff, Plus, Trash2} from 'lucide-react';
import '../app/day-strip.css';
import {formatArabicDuration} from '../lib/arabic-duration';
import {fallsInTrip, guideSections, loadCountryGuide, type GuideFact} from '../lib/country-guide';
import {cityWithCountry} from '../lib/place-label';
import type {ReadyPlan} from '../lib/ready-plan-schema';
import {cardMoney, cardNumber, dateText} from '../lib/trip-card';
import {arrivalTime, dayKindLabels, daySlots, dayTotal, newItemId, scheduleDay, shiftDate, tripDays,
  type DayItem, type DayKind, type DayList, type DaySlot, type TripDay} from '../lib/trip-days';

const toMinutes = (time:string) => { const [h,m] = time.split(':').map(Number); return h * 60 + m; };

const kindIcons:Record<DayKind,typeof Compass> = {arrival:PlaneLanding, explore:Compass, move:ArrowLeftRight, rest:BedDouble, departure:PlaneTakeoff};

export type AddToDay = (dayIndex:number, item:Omit<DayItem,'id'>) => void;

/** قائمة منسدلة صغيرة: أضف هذا العنصر لليوم X. */
export function AddToDayButton({days, onAdd, item, label = 'أضف لليوم'}: {
  days:readonly TripDay[]; onAdd:AddToDay; item:Omit<DayItem,'id'>; label?:string;
}) {
  const [day,setDay] = useState('');
  return <span className="add-to-day">
    <select aria-label={label + ': ' + item.name} value={day} onChange={event=>{
      const index = Number(event.target.value);
      if (event.target.value !== '' && Number.isInteger(index)) onAdd(index,item);
      setDay('');
    }}>
      <option value="">{label}…</option>
      {days.map(entry=><option key={entry.index} value={entry.index}>اليوم {cardNumber(entry.index + 1)} · {entry.city}</option>)}
    </select>
  </span>;
}

function DayEditor({day, items, editable, startDate, startAt, onChange}: {
  day:TripDay; items:DayItem[]; editable:boolean; startDate?:string; startAt?:number; onChange:(items:DayItem[])=>void;
}) {
  const [name,setName] = useState('');
  const [slot,setSlot] = useState<DaySlot>('morning');
  const [price,setPrice] = useState('');
  const scheduled = scheduleDay(items,startAt);
  const {total,partial} = dayTotal(day,items);

  function move(id:string, change:number) {
    const order = scheduled.map(entry=>entry.item);
    const at = order.findIndex(item=>item.id === id);
    const to = at + change;
    if (at < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(at,1);
    // النقل لفترة ثانية إذا عدّى حدود فترته
    const neighbour = next[Math.min(to,next.length - 1)];
    next.splice(to,0,{...moved, slot:neighbour && neighbour.slot !== moved.slot ? neighbour.slot : moved.slot});
    onChange(next);
  }

  function add(event:FormEvent) {
    event.preventDefault();
    const text = name.trim();
    if (!text) return;
    const amount = price.trim() === '' ? null : Number(price);
    onChange([...items,{id:newItemId('c'), slot, kind:'place', name:text.slice(0,300),
      price:amount !== null && Number.isFinite(amount) && amount >= 0 ? amount : null, walk:null}]);
    setName('');
    setPrice('');
  }

  return <div className="day-editor">
    <div className="day-editor-head">
      <h4>اليوم {cardNumber(day.index + 1)} · {cityWithCountry(day.city,day.country)}{startDate ? ' · ' + dateText(shiftDate(startDate,day.index)) : ''}</h4>
      <span className="day-total">{partial ? 'مجموع البنود المعروفة ' : 'مجموع اليوم '}<b>{cardMoney(total)}</b></span>
    </div>
    <p className="day-cost-parts">
      {day.hotelNight !== null ? 'السكن ' + cardMoney(day.hotelNight) : day.kind === 'departure' ? 'بدون ليلة سكن' : 'السكن يحتاج تسعير'}
      {' · '}{day.daily !== null ? 'المصروف ' + cardMoney(day.daily) : 'المصروف يحتاج تسعير'}
    </p>
    {scheduled.length ? <ol className="day-items">
      {scheduled.map(({item,eta},position)=><li key={item.id} data-kind={item.kind}>
        <span className="day-eta" title="وقت الوصول المتوقع">{eta}</span>
        <div className="day-item-body">
          <small>{daySlots[item.slot]}{item.kind === 'event' ? ' · فعالية' : ''}</small>
          <strong>{item.name}</strong>
          <span className="day-item-meta">
            {item.walk !== null && <span>مشي {formatArabicDuration(item.walk)} من السكن</span>}
            {item.kind !== 'note' && (editable ?
              <label>السعر <input inputMode="decimal" value={item.price ?? ''} placeholder="يحتاج تسعير" onChange={event=>{
                const value = event.target.value.trim();
                const amount = value === '' ? null : Number(value);
                if (amount === null || (Number.isFinite(amount) && amount >= 0))
                  onChange(items.map(other=>other.id === item.id ? {...other,price:amount} : other));
              }}/> ر.س</label> :
              <span>{item.price === null ? 'يحتاج تسعير' : cardMoney(item.price)}</span>)}
            {item.maps && <a href={item.maps} target="_blank" rel="noreferrer"><MapPin size={14} aria-hidden="true"/> الخريطة</a>}
          </span>
        </div>
        {editable && <span className="day-item-actions">
          <button type="button" className="secondary" aria-label={'قدّم ' + item.name} disabled={position === 0} onClick={()=>move(item.id,-1)}><ArrowUp size={16} aria-hidden="true"/></button>
          <button type="button" className="secondary" aria-label={'أخّر ' + item.name} disabled={position === scheduled.length - 1} onClick={()=>move(item.id,1)}><ArrowDown size={16} aria-hidden="true"/></button>
          <button type="button" className="secondary" aria-label={'احذف ' + item.name} onClick={()=>onChange(items.filter(other=>other.id !== item.id))}><Trash2 size={16} aria-hidden="true"/></button>
        </span>}
      </li>)}
    </ol> : <p className="ready-muted">وقت مرن، ما فيه شي مسجّل لهاليوم.</p>}
    {editable && <form className="day-add" onSubmit={add}>
      <input aria-label="شي جديد لليوم" placeholder="أضف مطعم أو نشاط أو ملاحظة" value={name} onChange={event=>setName(event.target.value)} maxLength={300}/>
      <select aria-label="الفترة" value={slot} onChange={event=>setSlot(event.target.value as DaySlot)}>
        {(Object.keys(daySlots) as DaySlot[]).map(key=><option key={key} value={key}>{daySlots[key]}</option>)}
      </select>
      <input aria-label="السعر بالريال" inputMode="decimal" placeholder="السعر (اختياري)" value={price} onChange={event=>setPrice(event.target.value)}/>
      <button type="submit" disabled={!name.trim()}><Plus size={16} aria-hidden="true"/> أضف</button>
    </form>}
  </div>;
}

/** الأيام كدواير في صف أفقي، والضغط على دائرة يفتح تفاصيل اليوم تحتها. */
export function DayStrip({plan, nights, days, onChange, editable, startDate, departTime}: {
  plan:ReadyPlan; nights:number[]; days:DayList; onChange?:(days:DayList)=>void; editable:boolean;
  startDate?:string; departTime?:string;
}) {
  const list = useMemo(()=>tripDays(plan,nights),[plan,nights]);
  const [open,setOpen] = useState(0);
  const selected = list[Math.min(open,list.length - 1)];
  const arrival = startDate && departTime && plan.arrival_hours !== null ?
    arrivalTime(startDate,departTime,plan.arrival_hours,plan.stops[0].country ?? plan.country) : null;
  const tripTotal = list.reduce((sum,day)=>sum + dayTotal(day,days[day.index] ?? []).total,0);
  const anyPartial = list.some(day=>dayTotal(day,days[day.index] ?? []).partial);

  return <section className="day-strip" aria-label="جدول الأيام">
    <div className="day-strip-head">
      <h3>جدول الأيام</h3>
      <span>{anyPartial ? 'مجموع الأيام المعروف ' : 'مجموع الأيام '}<b>{cardMoney(tripTotal)}</b> <small>(بدون الطيران)</small></span>
    </div>
    {arrival && <p className="day-arrival"><PlaneLanding size={18} aria-hidden="true"/>
      الإقلاع من الرياض {departTime} · الوصول المتوقع <b>{arrival.time}</b> بتوقيت {cityWithCountry(plan.stops[0].city,plan.stops[0].country ?? plan.country)}
      {arrival.date !== startDate ? ' (' + dateText(arrival.date) + ')' : ''}</p>}
    <ol className="day-circles" role="tablist" aria-label="الأيام">
      {list.map(day=>{
        const Icon = kindIcons[day.kind];
        return <li key={day.index} role="presentation">
          <button type="button" role="tab" aria-selected={day.index === selected.index} data-kind={day.kind}
            onClick={()=>setOpen(day.index)} aria-label={'اليوم ' + (day.index + 1) + ' · ' + dayKindLabels[day.kind] + ' · ' + day.city}>
            <Icon size={18} aria-hidden="true"/>
            <b>{cardNumber(day.index + 1)}</b>
            <small>{startDate ? shiftDate(startDate,day.index).slice(5).replace('-','/') : dayKindLabels[day.kind]}</small>
          </button>
          <span className="day-circle-city">{day.city}</span>
        </li>;
      })}
    </ol>
    {selected && <DayEditor key={selected.index} day={selected} items={days[selected.index] ?? []} editable={editable && !!onChange}
      startDate={startDate} startAt={selected.kind === 'arrival' && arrival && arrival.date === startDate ? toMinutes(arrival.time) : undefined}
      onChange={items=>onChange?.(list.map(day=>day.index === selected.index ? items : days[day.index] ?? []))}/>}
  </section>;
}

type TripEvent = GuideFact & {country:string; section:'holidays'|'peak'|'events'};

/** فعاليات وأعياد ومواسم تصادف تاريخ الرحلة، من دليل الدولة. */
export function TripEvents({plan, nights, startDate, days, onAdd}: {
  plan:ReadyPlan; nights:number[]; startDate?:string; days:readonly TripDay[]; onAdd?:AddToDay;
}) {
  const codes = useMemo(()=>[...new Set(plan.stops.map(stop=>stop.country ?? plan.country))],[plan]);
  const [events,setEvents] = useState<TripEvent[]|null>(null);
  const end = startDate ? shiftDate(startDate,nights.reduce((sum,value)=>sum + value,0)) : '';

  useEffect(()=>{
    let live = true;
    if (!startDate) return;
    Promise.all(codes.map(code=>loadCountryGuide(code).then(guide=>(['holidays','peak','events'] as const).flatMap(section=>
      guide.sections[section].filter(fact=>fallsInTrip(fact,startDate,end)).map(fact=>({...fact,country:code,section}))))
      .catch(()=>[] as TripEvent[])))
      .then(lists=>{ if (live) setEvents(lists.flat()); });
    return ()=>{ live = false; };
  },[codes,startDate,end]);

  if (!startDate) return <section className="trip-events"><h3>فعاليات وقت سفرتك</h3>
    <p className="ready-muted">اختر تاريخ بداية الرحلة عشان نطلع لك الفعاليات والأعياد اللي تصادفها.</p></section>;
  return <section className="trip-events" aria-label="فعاليات وقت سفرتك">
    <h3><CalendarPlus size={20} aria-hidden="true"/> فعاليات وقت سفرتك</h3>
    {events === null ? <p role="status">جارٍ البحث في دليل الدولة…</p> : events.length === 0 ?
      <p className="ready-muted">ما لقينا فعاليات أو أعياد مسجلة بين {dateText(startDate)} و{dateText(end)}.</p> :
      <ul>{events.map((event,index)=>{
        const when = event.date ? dateText(event.date) + (event.end && event.end !== event.date ? ' إلى ' + dateText(event.end) : '') : 'خلال الشهر';
        const dayIndex = event.date && event.date >= startDate ? Math.round((Date.parse(event.date) - Date.parse(startDate)) / 86400000) : null;
        return <li key={event.label + index}>
          <div>
            <small>{guideSections[event.section]} · {when}</small>
            <strong>{event.label}</strong>
            <span>{event.value}</span>
            {event.impact && <span className="trip-event-impact">{event.impact}</span>}
            {event.source?.startsWith('http') && <a href={event.source} target="_blank" rel="noreferrer">المصدر</a>}
          </div>
          {onAdd && event.section === 'events' && <AddToDayButton days={dayIndex !== null && days[dayIndex] ? [days[dayIndex], ...days.filter(day=>day.index !== dayIndex)] : days}
            onAdd={onAdd} item={{slot:'evening', kind:'event', name:event.label, price:null, walk:null}}/>}
        </li>;
      })}</ul>}
  </section>;
}
