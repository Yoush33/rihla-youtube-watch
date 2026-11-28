'use client';

import {useEffect,useState} from 'react';
import {fallsInTrip,guideSections,loadCountryGuide,tripCalendarAlerts,type CountryGuide,type GuideFact,type GuideSection} from '../lib/country-guide';
import {todayInRiyadh} from '../lib/trip-card';
import '../app/country-guide.css';

const tabs=Object.keys(guideSections) as GuideSection[];
const number=new Intl.NumberFormat('ar-SA');
const monthName=new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{month:'long',year:'numeric',timeZone:'UTC'});
const usualMonth=new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{month:'long',timeZone:'UTC'});
const week=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

function useGuide(code:string) {
  const [result,setResult]=useState<{code:string;guide?:CountryGuide}>();
  useEffect(()=>{
    let mounted=true;
    loadCountryGuide(code).then(guide=>{if(mounted)setResult({code,guide});})
      .catch(()=>{if(mounted)setResult({code});});
    return ()=>{mounted=false;};
  },[code]);
  return result?.code===code ? result : undefined;
}

function noticeScope(fact:GuideFact) {
  if (fact.scope) return fact.scope;
  if (fact.regional) return 'مناسبة محلية في بعض المناطق';
  const details=fact.value.split(' · ').slice(1).filter(part=>!part.includes('يعتمد على رؤية الهلال'));
  return details.join(' · ');
}

function CalendarWarnings({guide,start,end}:{guide:CountryGuide;start:string;end:string}) {
  const matches=tripCalendarAlerts(guide,start,end);
  if(!matches.length)return null;
  return <div className="notice warning" aria-label="تنبيهات تواريخ السفر">{matches.map((fact,i)=>
    <p key={i}>{fact.provisional || fact.tentative ? 'قد يصادف' : 'يصادف'} {fact.label}{noticeScope(fact) && <> · {noticeScope(fact)}</>}{fact.provisional ? ' (يعتمد على رؤية الهلال)' : fact.tentative ? ' (تقويم مبدئي)' : ''} · {fact.impact && fact.impact !== 'غير مؤكد' ? fact.impact : 'أثر المناسبة على الزحمة والأسعار غير مؤكد.'} <a href={fact.impactSource || fact.source} target="_blank" rel="noreferrer">المصدر</a></p>)}</div>;
}

export function DestinationCalendarAlert({code,start,end}:{code:string;start:string;end:string}) {
  const result=useGuide(code);
  return result?.guide ? <CalendarWarnings guide={result.guide} start={start} end={end}/> : null;
}

function Facts({facts}:{facts:GuideFact[]}) {
  return <dl className="guide-facts">{facts.map((fact,index)=><div key={index}>
    <dt>{fact.label}</dt><dd>{fact.value}</dd>
    {(fact.scope || fact.regional) && <dd>النطاق · {fact.scope || 'بعض المناطق'} {fact.scopeSource && <a href={fact.scopeSource} target="_blank" rel="noreferrer">مصدر النطاق</a>}</dd>}
    {fact.status==='estimate' && <dd className="guide-source">تقديري</dd>}
    {fact.status==='recommendation' && <dd className="guide-source">اقتراح تخطيط</dd>}
    {fact.month && !fact.date && <dd>{fact.year ? 'الشهر التقريبي' : 'الشهر المعتاد'} · {usualMonth.format(new Date(Date.UTC(2026,fact.month-1,1)))} {fact.year && number.format(fact.year)}</dd>}
    {fact.date && <dd><bdi>{fact.date}</bdi>{fact.end && fact.end!==fact.date && <> إلى <bdi>{fact.end}</bdi></>}</dd>}
    {fact.impact && <dd>أثرها على المسافر · {fact.impact} {fact.impactSource && <a href={fact.impactSource} rel="noreferrer" target="_blank">مصدر الأثر</a>}</dd>}
    <dd className="guide-source"><a href={fact.source} target="_blank" rel="noreferrer">المصدر</a>{fact.lawSource && <> · <a href={fact.lawSource} target="_blank" rel="noreferrer">النص الحكومي للعطلة</a></>}{fact.fxSource && <> · <a href={fact.fxSource} target="_blank" rel="noreferrer">سعر الصرف</a></>} · آخر تحقق <bdi>{fact.checked}</bdi></dd>
  </div>)}</dl>;
}

function GuideCalendar({guide,initial}:{guide:CountryGuide;initial:string}) {
  const [month,setMonth]=useState(initial);
  const [selected,setSelected]=useState('');
  const anchor=new Date(month+'-01T00:00:00Z');
  const next=(delta:number)=>new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+delta,1)).toISOString().slice(0,7);
  const days=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+1,0)).getUTCDate();
  const dayDate=(day:number)=>month+'-'+String(day).padStart(2,'0');
  const rows=[...guide.sections.holidays,...guide.sections.peak,...guide.sections.events];
  const records=rows.filter(fact=>fallsInTrip(fact,dayDate(1),dayDate(days)));
  function change(value:string){if(/^\d{4}-\d{2}$/.test(value)){setMonth(value);setSelected('');}}
  const appliesOnDay=(fact:GuideFact,day:string)=>Boolean(fact.date || fact.peak) && fallsInTrip(fact,day,day);
  const shown=selected?records.filter(fact=>appliesOnDay(fact,selected)):records;
  return <section className="guide-calendar" aria-label="تقويم الأعياد والمواسم والفعاليات">
    <div className="guide-month"><button type="button" className="secondary" aria-label="الشهر السابق" onClick={()=>change(next(-1))}>السابق</button>
      <label>{monthName.format(anchor)}<input type="month" aria-label="انتقل إلى شهر" value={month} onChange={e=>change(e.target.value)}/></label>
      <button type="button" className="secondary" aria-label="الشهر التالي" onClick={()=>change(next(1))}>التالي</button></div>
    <div className="guide-days">{week.map(day=><small key={day}>{day}</small>)}
      {Array.from({length:anchor.getUTCDay()},(_,i)=><span key={'blank'+i}/>)}
      {Array.from({length:days},(_,i)=>{const date=dayDate(i+1);const matches=records.filter(f=>appliesOnDay(f,date));
        return <button key={date} type="button" className="secondary" data-marked={!!matches.length} aria-pressed={selected===date}
          aria-label={date+(matches.length?' · '+matches.map(f=>f.label).join('، '):'')} onClick={()=>setSelected(old=>old===date?'':date)}>{number.format(i+1)}</button>;})}</div>
    {selected && <button type="button" className="secondary" onClick={()=>setSelected('')}>عرض الشهر كاملًا</button>}
    {shown.length ? <Facts facts={shown}/> : <p>ما فيه مناسبات مسجّلة لهذه الفترة.</p>}
  </section>;
}

export function CountryGuidePanel({code,month,start,end}:{code:string;month:number;start?:string;end?:string}) {
  const result=useGuide(code);
  const [tab,setTab]=useState<GuideSection>('entry');
  const prefix='country-guide-'+code+'-';
  useEffect(()=>{
    const target=tabs.find(key=>window.location.hash==='#'+prefix+key);
    if (target) setTab(target);
  },[prefix]);
  const today=todayInRiyadh();
  const initial=start?.slice(0,7) || (Number(today.slice(0,4))+Number(month<Number(today.slice(5,7))))+'-'+String(month).padStart(2,'0');
  return <section className="panel country-data-block guide-panel"><h2>دليل الدولة</h2>
    {!result ? <p role="status">جارٍ تحميل الدليل…</p> : !result.guide ? <p>تعذّر تحميل الدليل.</p> : <>
    {start && end && <CalendarWarnings guide={result.guide} start={start} end={end}/>}
    <div className="guide-tabs" role="tablist" aria-label="أقسام دليل الدولة">{tabs.map((key,index)=>
      <button key={key} type="button" role="tab" aria-selected={tab===key} tabIndex={tab===key?0:-1}
        id={prefix+key} aria-controls={prefix+'panel'} onClick={()=>setTab(key)} onKeyDown={e=>{
          const position=e.key==='ArrowLeft' ? (index+1)%tabs.length : e.key==='ArrowRight' ? (index+tabs.length-1)%tabs.length :
            e.key==='Home'?0:e.key==='End'?tabs.length-1:-1;
          if(position>=0){e.preventDefault();setTab(tabs[position]);document.getElementById(prefix+tabs[position])?.focus();}
        }}>{guideSections[key]}</button>)}</div>
    <div role="tabpanel" id={prefix+'panel'} aria-labelledby={prefix+tab}>
      {(['holidays','peak','events'] as GuideSection[]).includes(tab) && <GuideCalendar key={initial} guide={result.guide} initial={initial}/>}
      {tab==='holidays' || tab==='peak' || tab==='events' ? <details><summary>كل السجلات والملاحظات · {guideSections[tab]}</summary><Facts facts={result.guide.sections[tab]}/></details> : <Facts facts={result.guide.sections[tab]}/>}
    </div>
    <p className="guide-source"><a href="/guide-verification.csv" download>تنزيل جدول التحقق للدول الـ٧٠</a></p></>}
  </section>;
}
