'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {displayCalendarDate,type Trip} from '../lib/planning';
import type {Destination} from '../lib/travel';
import {countryCenter,countryStops} from '../lib/country-planning';
import {cityCenters} from '../lib/geo';
import {DailyPlanner,Ideas} from './trip-workspace';
import {BookingDesk} from './travel-desk';
import {MapCanvas,mapDayColor} from './trip-map';
import {BrowserAdvisor,type AdvisorPlanner} from './browser-advisor';
import {PlaceLibrary} from './place-library';
import {RouteReview} from './route-review';
import {PlanComposer} from './plan-composer';
import {MessageSquare,Map,CalendarDays,MapPin,Plus,ArrowRight,BookOpen} from 'lucide-react';

type Props={t:Trip;d:Destination;update:(patch:Partial<Trip>)=>void|boolean;generate:()=>void;notice:(s:string)=>void;navigate:(tab:string)=>void;canSave:boolean};
export function JourneyWorkspace({t,d,update,generate,notice,navigate,canSave}:Props){
 const days=t.plans[d.id]||[],[requestedDay,setRequestedDay]=useState(0),[selectedId,setSelectedId]=useState(''),[mobileView,setMobileView]=useState<'list'|'map'|'assistant'>('list'),[overview,setOverview]=useState(true),[section,setSection]=useState<'plan'|'ideas'|'bookings'|'library'|'catalog'>('plan');
 const [planner,setPlanner]=useState<AdvisorPlanner>({ready:false,arrange:async()=>{throw Error('شغّل النموذج المحلي أولًا.');}});
 const scope=useId(),selectionRef=useRef<HTMLParagraphElement>(null),focusPin=useRef(false),dayIndex=Math.max(0,Math.min(requestedDay,days.length-1));
 const entries=useMemo(()=>days.flatMap((day,i)=>(day.activities||[]).map((a,j)=>({a,day:i,order:j}))),[days]);
 const visible=useMemo(()=>overview?entries:entries.filter(e=>e.day===dayIndex),[entries,overview,dayIndex]);
 const selected=entries.find(e=>e.a.id===selectedId),missing=visible.filter(e=>!e.a.location),countryCode=d.id.startsWith('country-')?d.id.slice(8):'',stops=countryCode?countryStops(countryCode):[],selectedStops=(t.countryCities||[]).filter(s=>stops.includes(s));
 useEffect(()=>setRequestedDay(n=>Math.max(0,Math.min(n,days.length-1))),[days.length]);
 useEffect(()=>{if(!selectedId)return;if(!selected)setSelectedId('');else if(selected.day!==dayIndex)setRequestedDay(selected.day);},[selectedId,selected?.day,dayIndex]);
 useEffect(()=>{if(focusPin.current&&selected){focusPin.current=false;selectionRef.current?.focus({preventScroll:true});selectionRef.current?.scrollIntoView({block:'nearest'});}},[selectedId,mobileView,selected?.a.id]);
 function selectDay(i:number){setSelectedId('');setRequestedDay(i);setOverview(false);setSection('plan');setMobileView('list');}
 function selectActivity(id:string,fromMap=false){const item=entries.find(e=>e.a.id===id);if(!item)return;setSelectedId(id);setRequestedDay(item.day);setOverview(false);setSection('plan');setMobileView(fromMap||!item.a.location?'list':'map');if(fromMap){focusPin.current=true;requestAnimationFrame(()=>selectionRef.current?.focus({preventScroll:true}));}}
 function editLocation(title?:string){navigate('map');notice(title?'اختر «'+title+'» وحدد موقعه ثم احفظه.':'اختر نشاطًا وحدد موقعه ثم احفظه.');}
 function openLibrary(){setSection('library');setMobileView('list');}
 return <section className="trip-studio" aria-label={'مساحة تخطيط الرحلة في '+d.name}>
  <div className="studio-topbar"><div><span className="eyebrow">رِحلة / مساحة التخطيط</span><h2>كل تفاصيل {d.name} أمامك</h2></div><div className="actions"><button className="secondary" onClick={()=>{setSection('catalog');setMobileView('list');}}><BookOpen size={16}/> أماكن من المراجع</button><button className="secondary" onClick={()=>navigate('prices')}>تسعير الطيران والسكن</button><button className="secondary" onClick={()=>navigate('review')}>راجع قبل الحجز</button></div></div>
  <div className="studio-mobile-tabs" aria-label="لوحات التخطيط">{([['list','الأيام',CalendarDays],['map','الخريطة',Map],['assistant','المساعد',MessageSquare]] as const).map(([view,label,Icon])=><button key={view} aria-pressed={mobileView===view} aria-controls={scope+'-'+view} onClick={()=>setMobileView(view)}><Icon size={17}/>{label}</button>)}</div>
  <div className="studio-body" data-mobile-view={mobileView}>
   <aside id={scope+'-assistant'} className="studio-assistant studio-pane" aria-label="مساعد الرحلة"><div className="studio-pane-heading"><MessageSquare size={19}/><h3>مساعد رِحلة</h3><span>مجاني</span></div><BrowserAdvisor compact t={t} update={update} canSave={canSave} navigate={navigate} onOpenPlanner={openLibrary} onPlannerChange={setPlanner} onViewPlan={()=>{setSection('plan');setOverview(true);setMobileView('list');}}/></aside>
   <section id={scope+'-list'} className="studio-itinerary studio-pane" aria-label="أيام الرحلة وتعديلها">
    <div className="studio-tabs" aria-label="أدوات الرحلة">{([['plan','الجدول'],['ideas','أفكاري'],['bookings','حجوزاتي']] as const).map(([id,label])=><button key={id} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</div>
    {section==='plan'&&<>
     <div className="studio-day-tabs" aria-label="أيام الخطة"><button aria-pressed={overview} onClick={()=>{setOverview(true);setSelectedId('');}}>نظرة عامة</button>{days.map((_,i)=><button key={i} aria-pressed={!overview&&dayIndex===i} onClick={()=>selectDay(i)}>اليوم {i+1}</button>)}</div>
     {overview?<div className="studio-overview"><div className="studio-overview-heading"><div><h3>رحلتك، يومًا بيوم</h3><p>{days.length} أيام · {entries.length} أنشطة · {entries.filter(e=>e.a.location).length} مواقع محددة</p></div><MapPin size={21}/></div>
      {!days.length&&<div className="empty"><p>ابدأ بأماكن من المراجع أو أضف يومًا فارغًا.</p><button onClick={openLibrary}>اختر الأماكن</button></div>}
      {days.map((day,i)=><button className="studio-day-card" key={i} onClick={()=>selectDay(i)} style={{borderInlineStartColor:mapDayColor(i)}}><span className="studio-day-number" style={{background:mapDayColor(i)}}>{i+1}</span><span><b>{day.title||'اليوم '+(i+1)}</b><small>{t.mode==='dates'&&t.date?displayCalendarDate(t.date,i):'الموعد غير محدد'}</small><span className="studio-day-route">{(day.activities||[]).map(a=>a.title||'نشاط دون اسم').join(' ← ')||'يوم مرن — أضف ما يناسبك'}</span></span><ArrowRight size={16}/></button>)}
      <button className="studio-add-day" disabled={!canSave||days.length>=30} onClick={()=>update({days:String(days.length+1),plans:{...t.plans,[d.id]:[...days,{title:'يوم مرن',notes:'',activities:[]}]}})}><Plus size={16}/> أضف يومًا</button>
      {!!stops.length&&<details className="studio-stops"><summary>مناطق الاقتراح · {selectedStops.join(' ← ')||'اختر المدن'}</summary><p className="micro">تستخدم في إعادة إنشاء الاقتراح؛ لا تغيّر أيامك الحالية بمجرد اختيارها.</p><div className="chips">{stops.map(name=><button key={name} className="chip" aria-pressed={selectedStops.includes(name)} disabled={!canSave||!selectedStops.includes(name)&&selectedStops.length>=3} onClick={()=>update({countryCities:selectedStops.includes(name)?selectedStops.filter(x=>x!==name):[...selectedStops,name]})}>{name}</button>)}</div><button className="secondary" disabled={!canSave} onClick={generate}>إعادة إنشاء الاقتراح</button></details>}
     </div>:<div className="studio-day-editor">
      {selected&&<div className="studio-selection"><p ref={selectionRef} tabIndex={-1}><b>النشاط المحدد: {selected.a.title||'دون اسم'}</b><span>اليوم {selected.day+1} · {selected.a.location?'موقع محفوظ؛ راجع المدخل':'الموقع غير محدد'}</span></p><button className="quiet" onClick={()=>setSelectedId('')}>إلغاء التحديد</button></div>}
      <DailyPlanner t={t} d={d} update={update} generate={generate} notice={notice} dayIndex={dayIndex} selectedActivityId={selectedId} onActivitySelect={id=>selectActivity(id)} onDayChange={selectDay}/>
     </div>}
    </>}
    {section==='ideas'&&<div className="studio-inner"><Ideas t={t} d={d} update={update}/></div>}
    {section==='bookings'&&<div className="studio-inner"><BookingDesk t={t} update={update}/></div>}
    {section==='catalog'&&<div className="studio-inner"><PlaceLibrary t={t} update={update} canSave={canSave} onDraft={openLibrary}/></div>}
    {section==='library'&&<div className="studio-inner"><button className="quiet" onClick={()=>setSection('plan')}>العودة إلى الأيام</button><PlanComposer t={t} update={update} canSave={canSave} modelReady={planner.ready} arrange={planner.arrange} navigate={tab=>{if(tab==='plan'){setSection('plan');setOverview(true);}else navigate(tab);}}/></div>}
   </section>
   <aside id={scope+'-map'} className="studio-map studio-pane" aria-label="خريطة مرتبطة بأيام الرحلة"><div className="studio-map-toolbar"><div><h3>{overview?'خريطة الرحلة':'خريطة اليوم '+(dayIndex+1)}</h3><span>{visible.length-missing.length} من {visible.length} أنشطة لها مواقع</span></div><button className="secondary" onClick={()=>{setOverview(!overview);setSelectedId('');}}>{overview?'اعرض يومًا واحدًا':'كل أيام الرحلة'}</button></div>
    <MapCanvas entries={visible} draft={null} center={cityCenters[d.id]||countryCenter(d.id)} zoom={countryCode?5:12} allowPick={false} selectedId={selectedId} viewKey={t.id+':'+d.id+':'+(overview?'all':dayIndex)+':'+visible.map(e=>e.a.location?JSON.stringify(e.a.location):'').join('|')} onPick={()=>{}} onSelect={id=>selectActivity(id,true)}/>
    <div className="studio-map-footer">{!overview&&<RouteReview t={t} day={dayIndex} update={update} canSave={canSave}/>}<p>الخطوط المتقطعة تربط الأنشطة مباشرة؛ ليست طرقًا أو أوقات تنقل.</p>{overview&&<div className="studio-map-legend">{days.map((_,i)=><button key={i} onClick={()=>selectDay(i)}><span style={{background:mapDayColor(i)}}/>اليوم {i+1}</button>)}</div>}{!visible.length&&<p>ستظهر هنا الأماكن التي لها إحداثيات بعد إضافتها إلى خطتك.</p>}{missing.length>0&&<details><summary>{missing.length} أنشطة تحتاج موقعًا</summary>{missing.map(e=><div className="studio-missing" key={e.a.id}><span>{e.a.title||'نشاط دون اسم'}</span><button className="quiet" onClick={()=>editLocation(e.a.title)}>حدد موقعه</button></div>)}</details>}<button className="quiet" onClick={()=>editLocation()}>تحرير مواقع الأنشطة</button></div>
   </aside>
  </div>
 </section>;
}
