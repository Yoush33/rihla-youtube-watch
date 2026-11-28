import {communityKnowledge,communityChecked,communityComparisons} from '../lib/community-knowledge';
import {communityLabel,topics,type KnowledgeCard} from '../lib/knowledge';

export function SourceAttribution({card}:{card:KnowledgeCard}){
 const a=card.attribution;
 if(!a)return null;
 return <div className="micro community-attribution"><p>{a.author}{card.sourcePublished?' · نُشر '+card.sourcePublished:''}<br/>قرأنا المصدر: {card.checked} · {a.changes}</p>{a.license&&<p>هذه الخلاصة متاحة برخصة <a href={a.licenseUrl} target="_blank" rel="noreferrer">{a.license}</a>. <a href={a.historyUrl} target="_blank" rel="noreferrer">المساهمون وسجل التعديلات ↗</a></p>}</div>;
}

export function CommunityReferences({code}:{code:string}){
 const cards=communityKnowledge.filter(c=>c.code===code&&!c.archived);
 if(!cards.length)return null;
 return <section className="panel spaced" aria-label="أدلة السفر وتجارب المسافرين"><span className="eyebrow">مراجع مجتمعية · قراءة المصادر {communityChecked}</span><h2>أدلة السفر وتجارب المسافرين</h2><p>{cards.length} خلاصة عربية من Wikivoyage ونقاشين على Reddit. الدليل الجماعي يساعدك في اختيار الأماكن، والتجارب الفردية تكشف تفاصيل تستحق الاستعداد لها. متطلبات الدخول تبقى مرتبطة بالمصادر الرسمية.</p><div className="info-grid">{(['guide','experience'] as const).map(kind=><div key={kind}><h3>{kind==='guide'?'دليل Wikivoyage':'كلام المسافرين على Reddit'}</h3>{cards.filter(c=>c.communityKind===kind).map(c=><details key={c.id} className="knowledge-card"><summary>{c.title}</summary><p className="micro">{topics[c.topic]} · {communityLabel(c)}</p><p>{c.text}</p><a href={c.source} target="_blank" rel="noreferrer">اقرأ {kind==='guide'?'الدليل الأصلي':'النقاش الأصلي'} ↗</a><SourceAttribution card={c}/></details>)}</div>)}</div>{communityComparisons.map(item=><details key={item.title} className="spaced"><summary>{item.title}</summary><p>{item.text}</p><div className="actions">{item.sources.map((s,i)=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{i===0?'رحلة الشهر':'رحلة الأيام العشرة'} · {s.published} ↗</a>)}</div></details>)}<p className="micro">الخلاصات محفوظة ويمكن البحث عنها في المستودع وسؤال المستشار المجاني عنها. تاريخ القراءة لا يعني تحديث المصدر في اليوم نفسه. لا نتابع تغييرات النقاشات تلقائيًا.</p></section>;
}
