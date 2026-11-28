import {arrivalKnowledge} from '../lib/arrival-knowledge';
export function ArrivalGuide({code}:{code:string}){
 const cards=arrivalKnowledge.filter(c=>c.code===code);if(!cards.length)return null;
 return <section className="panel spaced arrival-guide"><span className="eyebrow">مرجع عملي للوصول</span><h2>{code==='MY'?'الوصول إلى كوالالمبور':'الوصول إلى تبليسي'}</h2><p>هذه المراجع تخص المدينة والمرافق المسماة فقط؛ لا تمثل كل مناطق الدولة. يستخدمها أيضًا المستشار المجاني عند سؤالك عن هذه المدينة.</p>{cards.map(c=><details key={c.id}><summary>{c.title.split(' · ')[1]}</summary><p>{c.text}</p><a href={c.source} target="_blank" rel="noreferrer">{c.sourceName} ↗</a><p className="micro">التحقق: <time>{c.checked}</time> · نشر المصدر: {c.sourcePublished} · مرجع محفوظ، لا بيانات حية</p></details>)}</section>;
}
