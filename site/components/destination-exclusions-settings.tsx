'use client';

import {useId,useState,type FormEvent} from 'react';
import {Plus,X} from 'lucide-react';
import countries from '../public/countries.json';
import cityCatalog from '../lib/place-image-city-keys.json';
import {arabicCountryName} from '../lib/country-localization';
import {
  defaultDestinationExclusions,destinationExclusion,destinationExclusionsLimit,exclusionKey,
  type DestinationExclusion,type DestinationExclusions,
} from '../lib/destination-exclusions';
import '../app/destination-exclusions.css';

const countryOptions = countries.map(({code,name})=>({code,name:arabicCountryName(code,name)}))
  .sort((a,b)=>a.name.localeCompare(b.name,'ar'));
const countryLabels = new Map(countryOptions.map(({code,name})=>[code,name]));
const cityOptions = [...new Set([...Object.values(cityCatalog).flat(),'مسقط','صلالة'])].sort((a,b)=>a.localeCompare(b,'ar'));
const labelFor = (item:DestinationExclusion) => item.kind==='city' ? item.name : countryLabels.get(item.code)??item.code;

export function DestinationExclusionsSettings({value=defaultDestinationExclusions,canSave,onChange}: {
  value?:DestinationExclusions;
  canSave:boolean;
  onChange:(next:DestinationExclusion[])=>boolean;
}) {
  const [kind,setKind] = useState<DestinationExclusion['kind']>('country');
  const [name,setName] = useState('');
  const [message,setMessage] = useState('');
  const sectionId = useId();
  const citiesId = useId();
  const atLimit = value.length>=destinationExclusionsLimit;

  function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || atLimit) return;
    const next = destinationExclusion(kind==='country' ? {kind,code:name} : {kind,name});
    if (!next) {
      setMessage(kind==='country' ? 'اختر دولة من القائمة.' : 'أدخل اسم المدينة.');
      return;
    }
    if (value.some(item=>exclusionKey(item)===exclusionKey(next))) {
      setMessage('الوجهة موجودة في القائمة.');
      return;
    }
    if (onChange([...value,next])) {
      setName('');
      setMessage('أُضيفت '+labelFor(next)+' إلى الوجهات المستبعدة.');
    }
  }

  function remove(item:DestinationExclusion) {
    if (!canSave) return;
    if (onChange(value.filter(existing=>exclusionKey(existing)!==exclusionKey(item)))) {
      setMessage('أُزيلت '+labelFor(item)+' من الوجهات المستبعدة.');
    }
  }

  return <section className="panel spaced destination-exclusions" aria-labelledby={sectionId}>
    <h2 id={sectionId}>وجهات مستبعدة</h2>
    <p>اختر المدن أو الدول اللي تبي تستبعدها من الخطط والاقتراحات الجديدة.</p>
    {value.length>0 ? <ul className="destination-exclusions-list">
      {value.map(item=><li key={exclusionKey(item)}>
        <span>{labelFor(item)} <small>{item.kind==='city'?'مدينة':'دولة'}</small></span>
        <button type="button" className="secondary" disabled={!canSave} onClick={()=>remove(item)} aria-label={'أزل '+labelFor(item)+' من الوجهات المستبعدة'}>
          <X size={18} aria-hidden="true"/> أزل
        </button>
      </li>)}
    </ul> : <p>القائمة فارغة.</p>}
    <form className="destination-exclusions-form" onSubmit={add}>
      <label>نوع الوجهة<select value={kind} disabled={!canSave} onChange={event=>{
        setKind(event.target.value==='city'?'city':'country');setName('');setMessage('');
      }}>
        <option value="country">دولة</option><option value="city">مدينة</option>
      </select></label>
      {kind==='country' ? <label>الدولة<select value={name} required disabled={!canSave || atLimit} onChange={event=>setName(event.target.value)}>
        <option value="">اختر دولة</option>
        {countryOptions.map(country=><option key={country.code} value={country.code}>{country.name}</option>)}
      </select></label> : <label>اسم المدينة<input list={citiesId} maxLength={100} required value={name} disabled={!canSave || atLimit}
        onChange={event=>setName(event.target.value)}/>
        <datalist id={citiesId}>{cityOptions.map(city=><option key={city} value={city}/>)}</datalist>
      </label>}
      <button type="submit" className="secondary" disabled={!canSave || atLimit || !name.trim()}><Plus size={18} aria-hidden="true"/> استبعد الوجهة</button>
    </form>
    {atLimit && <p>القائمة وصلت الحد الأقصى للوجهات.</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
