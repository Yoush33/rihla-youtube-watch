'use client';

import {useEffect, useState} from 'react';
import '../app/day-strip.css';
import {milesChart, milesEventName, milesGap, milesQuote, readMilesSettings, writeMilesSettings, type MilesSettings} from '../lib/miles';
import {cardNumber} from '../lib/trip-card';

export function useMilesSettings() {
  const [settings,setSettings] = useState<MilesSettings>({balance:null,prefer:false});
  useEffect(()=>{
    const load = () => setSettings(readMilesSettings());
    load();
    globalThis.addEventListener?.(milesEventName,load);
    globalThis.addEventListener?.('storage',load);
    return () => {
      globalThis.removeEventListener?.(milesEventName,load);
      globalThis.removeEventListener?.('storage',load);
    };
  },[]);
  return settings;
}

/** سطر سعر التذكرة بالأميال (ذهاب وعودة) ومقارنته برصيدك. */
export function MilesLine({country, city}: {country:string; city:string}) {
  const {balance} = useMilesSettings();
  const quote = milesQuote(country,city);
  if (!quote) return <p className="miles-line"><span>ما تنفع بأميال السعودية مباشرة.</span></p>;
  const gap = milesGap(balance,quote.reward);
  return <div className="miles-line">
    <span>بالأميال ذهاب وعودة: <strong>{cardNumber(quote.reward)}</strong> ميل (Reward) · {cardNumber(quote.rewardPlus)} (Reward+)</span>
    {gap !== null && <span data-ok={gap >= 0}>{gap >= 0 ? 'يكفيك رصيدك، يبقى ' + cardNumber(gap) + ' ميل' : 'ينقصك ' + cardNumber(-gap) + ' ميل'}</span>}
    <small>+ رسوم وضرائب كاش تحتاج تحقق · {quote.note} · <a href={milesChart.source} target="_blank" rel="noreferrer">جدول الفرسان</a></small>
  </div>;
}

/** إعدادات الأميال: الرصيد وتفضيل الأميال. تنحفظ على هذا الجهاز. */
export function MilesSettingsPanel() {
  const current = useMilesSettings();
  const [balance,setBalance] = useState('');
  useEffect(()=>{ setBalance(current.balance === null ? '' : String(current.balance)); },[current.balance]);
  return <section className="panel miles-settings" aria-labelledby="miles-settings-title">
    <h2 id="miles-settings-title">أميال الفرسان</h2>
    <label>رصيد أميالي
      <input inputMode="numeric" value={balance} placeholder="مثلًا 30000" onChange={event=>{
        const value = event.target.value.replace(/[^\d]/g,'');
        setBalance(value);
        writeMilesSettings({...current, balance:value === '' ? null : Number(value)});
      }}/>
    </label>
    <label className="miles-prefer"><input type="checkbox" checked={current.prefer}
      onChange={event=>writeMilesSettings({...current, prefer:event.target.checked})}/> أفضّل الأميال</label>
    <p className="ready-muted">الرصيد ينحفظ على هالجهاز بس. جدول الأميال من موقع السعودية، آخر فحص {milesChart.checked_date}.</p>
  </section>;
}
