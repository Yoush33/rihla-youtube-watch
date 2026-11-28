import {findPlace} from '../lib/place-catalog';
import {placeReferences} from '../lib/place-references';
import {communityLabel} from '../lib/knowledge';
import {SourceAttribution} from './community-references';

export function PlaceRecord({id}:{id:string}){
 const p=findPlace(id);if(!p)return null;
 const refs=placeReferences(id).filter(r=>r.relation!=='place'),v=p.operations;
 return <details className="place-record"><summary>دليل المكان ومراجعه</summary>
 <p>{p.summary}</p>
 {p.visit?<p><b>مدة تخطيط تقديرية: <bdi dir="ltr">{p.visit.minMinutes}–{p.visit.maxMinutes}</bdi> دقيقة.</b> {p.visit.note}</p>:<p className="micro">مدة الزيارة غير موثقة في السجل.</p>}
 {p.categories&&<p className="micro">{p.categories.join(' · ')}</p>}
 <p className="micro">{p.cost.note}</p>
 {p.location&&p.coordinateSource?<div className="notice"><b>نقطة مرجعية للتجميع على الخريطة</b><p>{p.coordinateSource.scope}</p><p className="micro"><span dir="ltr">{p.location.lat}, {p.location.lng} · WGS84</span><br/>بيانات CC0 · تحقق {p.coordinateSource.checked}. لا تمثل مسارًا أو زمن انتقال.</p><a href={p.coordinateSource.url} target="_blank" rel="noreferrer">{p.coordinateSource.name} ↗</a></div>:<p className="micro">{p.location?'دبوس مرجعي؛ تحقق من المدخل.':'الإحداثيات غير موثقة في السجل.'}</p>}
 {v&&<details><summary>ساعات الزيارة والحجز والاستثناءات</summary><p className="micro">{v.scope}</p>{[...v.facts,...(v.exceptions||[])].map((f,i)=><div className="spaced" key={i}><b>{f.title}</b><p>{f.text}</p><p className="micro">{f.scope} · {f.verification==='direct'?'قراءة مباشرة للمرجع':f.verification==='editorial'?'اقتراح تحريري':'يحتاج تأكيدًا مباشرًا'}</p><a href={f.source} target="_blank" rel="noreferrer">{f.sourceName||'المصدر'} ↗</a><p className="micro">نشر/تحديث {f.published} · تحقق {f.checked}</p></div>)}</details>}
 <p><a href={p.source} target="_blank" rel="noreferrer">{p.sourceName} ↗</a></p><p className="micro">نشر/تحديث {p.published} · تحقق {p.checked}</p>
 {p.additionalSources?.map(r=><p className="micro" key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.name} ↗</a> · نشر/تحديث {r.published} · تحقق {r.checked}</p>)}
 {refs.length>0&&<details><summary>أدلة وتجارب تساعدك في الاستعداد</summary><p className="micro">هذه مراجع عن المدينة أو البلد؛ لا تثبت ساعات هذا المكان أو أسعار دخوله.</p>{refs.map(({card:c,relation})=><details className="knowledge-card" key={c.id}><summary>{c.title}</summary><p className="micro">{relation==='city'?'سياق المدينة':'سياق البلد'} · {communityLabel(c)}</p><p>{c.text}</p><a href={c.source} target="_blank" rel="noreferrer">المصدر الأصلي ↗</a><SourceAttribution card={c}/></details>)}</details>}
 </details>;
}
