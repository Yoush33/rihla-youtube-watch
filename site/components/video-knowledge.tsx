'use client';

import {useEffect, useState} from 'react';
import {countryCatalogCodes} from '../lib/country-catalog';
import {countryName} from '../lib/country-planning';
import {topics, type KnowledgeCard} from '../lib/knowledge';
import {tripCardIdSchema} from '../lib/trip-card-schema';
import {cardNumber} from '../lib/trip-card';
import {videoLink, type VideoEvidence} from '../lib/video-evidence';
import {profiles} from '../lib/world';
import {youtubeDestinationName} from '../lib/youtube-watch';
import {useCatalog} from './catalog-context';
import {YoutubeWatch} from './youtube-watch';

export function VideoEvidenceView({card}:{card:KnowledgeCard}) {
  const {video}=card;
  if (!video) return null;
  return <div className="video-evidence">
    <p className="micro">{video.publisher}</p>
    <a href={videoLink(video)} target="_blank" rel="noreferrer">
      {video.start===null ? 'افتح الفيديو المرتبط' : 'افتح الفيديو عند التوقيت المذكور'}
    </a>
  </div>;
}

const emptyVideoReference:VideoEvidence={url:'',publisher:'',basis:'description',start:null,end:null,duration:null};

export function VideoEvidenceFields({value,onChange}: {value?:VideoEvidence; onChange:(v?:VideoEvidence) => void}) {
  return <fieldset className="video-fields">
    <legend>فيديو مرجعي للمعلومة</legend>
    <label className="checkline"><input type="checkbox" checked={!!value}
      onChange={event=>onChange(event.target.checked ? emptyVideoReference : undefined)}/> أرفق مرجع فيديو</label>
    {value && <>
      <label>رابط الفيديو<input required type="url" value={value.url}
        onChange={event=>onChange({...emptyVideoReference,url:event.target.value,publisher:value.publisher})}/></label>
      <label>اسم الناشر<input required minLength={2} maxLength={180} value={value.publisher}
        onChange={event=>onChange({...value,publisher:event.target.value})}/></label>
    </>}
  </fieldset>;
}

export function YoutubeCoverageDirectory() {
  const [selected,setSelected]=useState('');
  const {countries}=useCatalog();
  const countryOptions=countryCatalogCodes.map(code=>({code,name:countries.get(code)?.name_ar??countryName(code)}))
    .sort((first,second)=>first.name.localeCompare(second.name,'ar'));
  const destinationOptions=tripCardIdSchema.options.map(id=>({id,name:youtubeDestinationName(id)}))
    .sort((first,second)=>first.name.localeCompare(second.name,'ar'));
  const [kind,id]=selected.split(':');
  return <details className="panel spaced youtube-coverage-directory">
    <summary>تغطية مقاطع يوتيوب ومجموع ساعاتها</summary>
    <label>الدولة أو الوجهة<select value={selected} onChange={event=>setSelected(event.target.value)}>
      <option value="">اختر الدولة أو الوجهة</option>
      <optgroup label="الدول الـ٧٠">{countryOptions.map(country=><option key={country.code} value={'country:'+country.code}>{country.name}</option>)}</optgroup>
      <optgroup label="الوجهات الـ١٤">{destinationOptions.map(destination=><option key={destination.id} value={'destination:'+destination.id}>{destination.name}</option>)}</optgroup>
    </select></label>
    {id && (kind==='country' ? <YoutubeWatch key={selected} country={id} showCoverage/> : <YoutubeWatch key={selected} destination={id} showCoverage/>)}
  </details>;
}

type Result={cards:KnowledgeCard[];total:number};
const pageSize=30;

export function VideoKnowledge({country}: {country?:string}) {
  const [open,setOpen]=useState(false);
  const [code,setCode]=useState(country||'');
  const [query,setQuery]=useState('');
  const [offset,setOffset]=useState(0);
  const [retry,setRetry]=useState(0);
  const [result,setResult]=useState<Result>();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const requestedCountry=country??code;

  useEffect(()=>{
    if (!open) return;
    const abort=new AbortController();
    setBusy(true);
    setError('');
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({video:'1',country:requestedCountry,q:query,offset:String(offset)});
      fetch('/api/knowledge?'+params,{signal:abort.signal})
        .then(async response=>{
          if (!response.ok) throw Error('تعذّر تحميل المراجع');
          const page=await response.json() as Result;
          if (!abort.signal.aborted) setResult(page);
        })
        .catch(()=>{if (!abort.signal.aborted) setError('تعذّر تحميل المراجع. حاول مرة ثانية.');})
        .finally(()=>{if (!abort.signal.aborted) setBusy(false);});
    },150);
    return ()=>{clearTimeout(timer);abort.abort();};
  },[open,requestedCountry,query,offset,retry]);

  return <details className="panel spaced video-knowledge" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>المراجع المرتبطة بفيديو</summary>
    {open && <>
      {!country && <label>دولة المرجع<select value={code} onChange={event=>{setCode(event.target.value);setOffset(0);}}>
        <option value="">كل الدول</option>
        {Object.keys(profiles).sort((first,second)=>countryName(first).localeCompare(countryName(second),'ar'))
          .map(code=><option key={code} value={code}>{countryName(code)}</option>)}
      </select></label>}
      <label>ابحث في المراجع<input type="search" value={query} onChange={event=>{setQuery(event.target.value);setOffset(0);}}/></label>
      {error && <><p role="alert">{error}</p><button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>حاول مرة ثانية</button></>}
      {busy ? <p role="status">جارٍ تحميل المراجع…</p> : !error && <div className="knowledge-results">
        {result?.cards.length ? result.cards.map(card=><article className="knowledge-card" key={card.id}>
          <span className="eyebrow">{countryName(card.code)} · {topics[card.topic]}{card.status==='personal' && ' · إضافة شخصية'}</span>
          <h3>{card.title}</h3>
          <p className="research-answer">{card.text}</p>
          <VideoEvidenceView card={card}/>
          <p className="micro">تاريخ المرجع {card.checked||'غير مسجّل'}</p>
          {card.source && <a href={card.source} target="_blank" rel="noreferrer">مصدر الخلاصة</a>}
        </article>) : <p>ما فيه مراجع مطابقة.</p>}
      </div>}
      {result && result.total > pageSize && <div className="actions">
        <button type="button" className="secondary" disabled={busy||offset===0} onClick={()=>setOffset(Math.max(0,offset-pageSize))}>السابق</button>
        <span>{cardNumber(offset+1)}–{cardNumber(Math.min(offset+pageSize,result.total))} من {cardNumber(result.total)}</span>
        <button type="button" className="secondary" disabled={busy||offset+pageSize>=result.total} onClick={()=>setOffset(offset+pageSize)}>التالي</button>
      </div>}
    </>}
  </details>;
}
