"use client";
import {requestPlans,saveLatestPlan,PlanSyncError,type PlanSaveState} from '../lib/plan-sync';
import {PriceWatchDesk} from '../components/price-watch';
import {PrebookingReview} from '../components/prebooking-review';
import {updateTripData,commitDataChange} from '../lib/trip-update';
import {BackupDialog} from '../components/backup-dialog';
import {TripDetails} from '../components/trip-details';
import {MoneyInput} from '../components/money-input';
import {restoreTripCopies} from '../lib/backup';
import {TripCardWorkspace,type TripCardSelection} from '../components/trip-card';
import {BoredWorkspace} from '../components/bored-workspace';
import {SavedReadyPlanCard} from '../components/saved-ready-plan';
import {estimateReadyPlan,type ReadyPlanChoice} from '../lib/ready-plan-calculations';
import {copyReadyPlanSnapshot,readyTravelMonth,saveReadyPlanSnapshot,type SavedReadyPlan} from '../lib/ready-plan-saved';
import {dateText,shiftCardDate,todayInRiyadh} from '../lib/trip-card';
import {defaultBoredSettings} from '../lib/bored';
import {useLocalYoutubeReviews} from '../hooks/use-local-youtube-reviews';
import {tripCardsWithDefaults} from '../lib/trip-card-data';
import type {TripCard,TripCardGroup} from '../lib/trip-card-schema';
import {WorkspaceNavigation,TripNavigation,workspaceFor} from '../components/workspace-navigation';
import {JourneyWorkspace} from '../components/journey-workspace';
import {CountryPreparationList} from '../components/country-package';
import {CountriesWorkspace} from '../components/countries-workspace';
import {catalogWithImports,recommendedCountryForMonth} from '../lib/country-catalog';
import {CatalogContext} from '../components/catalog-context';
import {CatalogImportPanel} from '../components/catalog-import-panel';
import {YoutubeCoverageDirectory} from '../components/video-knowledge';
import {DestinationExclusionsSettings} from '../components/destination-exclusions-settings';
import {MilesSettingsPanel} from '../components/miles-line';
import {isRouteExcluded} from '../lib/destination-exclusions';
import {ResearchDesk} from '../components/research-desk';
import {countryFor,budgetScenario} from '../lib/journey-insights';
import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState,useMemo} from 'react';
import {Compass,Plus,Cloud,Settings,Route} from 'lucide-react';
import {destinations,events} from '../lib/travel';
import {type Trip,type Data,normalizeData,newActivity,planSchemaVersion} from '../lib/planning';
import {Ideas,Spending,PrintSheet} from '../components/trip-workspace';
import {TripCalendar} from '../components/destination-advice';
import {tripWindow} from '../lib/advice';
import {PriceProviders} from '../components/price-providers';
import {TripMap} from '../components/trip-map';
import {allDestinations,generateCountryPlan} from '../lib/country-planning';
import {CountryWizard} from '../components/country-tools';
import {TripDesk,GroupWallet,PackingList,BookingDesk} from '../components/travel-desk';
import {BudgetLab,OfflinePack} from '../components/journey-decisions';
import {PlacePlanner} from '../components/place-planner';
import {IdeaOrganizer} from '../components/idea-organizer';
const ReadyPlansWorkspace=lazy(()=>import('../components/ready-plans-workspace').then(module=>({default:module.ReadyPlansWorkspace})));
const blank=(id:string):Trip=>({id,name:'رحلة جديدة',origin:'',date:'',month:'',mode:'dates',days:'',travelers:'',budget:'',currency:'',nationality:'',level:'متوسط',pace:'متوازن',interests:[],selected:'',compare:[],costs:{},plans:{}});
const initial:Data={schemaVersion:planSchemaVersion,activeId:'first',trips:[blank('first')]};
const costRows=[['stay','السكن / غرفة / ليلة'],['food','الطعام / شخص / يوم'],['transport','التنقل / شخص / يوم'],['activities','الأنشطة / شخص / يوم'],['flight','الطيران ذهابًا وعودة / شخص']];
const num=(x:string)=>Number(x)||0;
const fmt=(x:number)=>new Intl.NumberFormat('ar',{maximumFractionDigits:3}).format(x);
const bounds=tripWindow;
function costs(t:Trip,id:string){const b=budgetScenario(t,id);return {...b,rows:b.rows.map((r,i)=>({...r,label:costRows[i][1],known:r.valid})),invalid:b.rows.some(r=>r.known&&!r.valid)};}
export default function Page(){const [data,setData]=useState<Data>(initial),[countryCode,setCountryCode]=useState(''),[tab,setTab]=useState('bored'),[status,setStatus]=useState('جارٍ تحميل رحلاتك…'),[ready,setReady]=useState(false),[enabled,setEnabled]=useState(false),[saveBlocked,setSaveBlocked]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[loadRetry,setLoadRetry]=useState(0),[signInNeeded,setSignInNeeded]=useState(false),[notice,setNotice]=useState('');const [wizardCode,setWizardCode]=useState('');const openWizard=(code:string)=>{setWizardCode(code);navigate('wizard');};const sync=useRef<PlanSaveState|null>(null);const revision=useRef(0),last=useRef(''),queue=useRef(Promise.resolve()),blocked=useRef(false),snapshot=useRef(data);useLayoutEffect(()=>{snapshot.current=data;},[data]);
const catalogs=useMemo(()=>({countries:catalogWithImports(data.catalogImports?.countries),imports:data.catalogImports}),[data.catalogImports]);
const t=data.trips.find(x=>x.id===data.activeId)||data.trips[0],d=allDestinations.find(x=>x.id===t.selected),[start,end]=bounds(t);const matching=events.filter(e=>(d&&countryFor(e.destination)===countryFor(d.id))&&start&&e.start<=end&&e.end>=start);
const commit=(change:(current:Data)=>Data)=>{const current=snapshot.current;const next=commitDataChange(current,change,{enabled,blocked:blocked.current,revision:revision.current});snapshot.current=next;setData(next);};
const changeData=(change:(current:Data)=>Data)=>{try{commit(change);return true;}catch(e){setNotice((e as Error).message);return false;}};
const youtube=useLocalYoutubeReviews(data.youtubeReviews);
const update=(patch:Partial<Trip>)=>changeData(current=>updateTripData(current,t.id,patch,revision.current));
useEffect(()=>{
 const params=new URLSearchParams(window.location.search);
 const code=(params.get('country')||'').toUpperCase();
 const view=params.get('view');
 if(/^[A-Z]{2}$/.test(code)){setCountryCode(code);setTab('countries');}
 else if(view==='trip-card'||view==='settings'||view==='plan'||view==='countries'||view==='ready-plans'||view==='ready-trip')setTab(view);
},[]);
const saveCardSummary=(group:TripCardGroup,card:TripCard,budget:number,summary:string,days:number)=>{
 const id=crypto.randomUUID();
 const trip:Trip={...blank(id),name:(card.city+(card.neighborhood?' — '+card.neighborhood:'')+' · '+group.start).slice(0,200),origin:'الرياض',date:group.start,days:String(days),travelers:'1',budget:String(budget),currency:'SAR',nationality:'SA',selected:'country-'+card.country.toUpperCase(),tripCardSummary:summary};
 return changeData(current=>({...current,activeId:id,trips:[...current.trips,trip]}));
};

useEffect(()=>{
 let active=true;setReady(false);setEnabled(false);setError('');setStatus('جارٍ تحميل رحلاتك…');
 requestPlans().then(v=>{if(!active)return;const next=v.data?normalizeData(v.data):initial;setData(next);snapshot.current=next;last.current=JSON.stringify(v.data||initial);revision.current=v.revision;sync.current={revision:v.revision,saved:last.current};setEnabled(true);setSignInNeeded(false);setStatus('الحفظ التلقائي جاهز');}).catch(e=>{if(active){setError(e.message);setSignInNeeded(e instanceof PlanSyncError&&e.status===401);setStatus('تعذّر الاتصال برحلاتك');}}).finally(()=>{if(active)setReady(true);});
 return()=>{active=false;};
},[loadRetry]);
useEffect(()=>{
 const state=sync.current;if(!ready||!enabled||blocked.current||!state||state.needsRetry)return;
 if(JSON.stringify(data)===state.saved&&!state.pending)return;setStatus('تغييرات تنتظر الحفظ…');
 const timer=setTimeout(()=>{queue.current=queue.current.then(async()=>{
  if(blocked.current||state.needsRetry)return;
  if(JSON.stringify(snapshot.current)===state.saved&&!state.pending)return;
  setStatus('جارٍ الحفظ…');
  try{await saveLatestPlan(state,()=>JSON.stringify(snapshot.current));setError('');setSignInNeeded(false);setStatus(JSON.stringify(snapshot.current)===state.saved?'حُفظت جميع التغييرات':'تغييرات تنتظر الحفظ…');}
  catch(e){if(e instanceof PlanSyncError&&e.blocked){blocked.current=true;setSaveBlocked(true);}setSignInNeeded(e instanceof PlanSyncError&&e.status===401);setError((e as Error).message);setStatus('لم يُؤكد الحفظ — تعديلاتك باقية هنا');}
  finally{revision.current=state.revision;last.current=state.saved;}
 });},800);return()=>clearTimeout(timer);
},[data,ready,enabled,retry]);
useEffect(()=>{const fn=(e:BeforeUnloadEvent)=>{if(enabled&&JSON.stringify(snapshot.current)!==last.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn);},[enabled]);
useEffect(()=>{const mc=(document as any).modelContext;if(!mc?.registerTool)return;const lifecycle=new AbortController();Promise.resolve(mc.registerTool({name:'read_travel_plan',description:'Read current trip and itinerary without changing or booking anything.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('No arguments accepted');return snapshot.current.trips.find(x=>x.id===snapshot.current.activeId);}}, {signal:lifecycle.signal})).catch(()=>{});return()=>lifecycle.abort();},[]);
const exportData=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(youtube.exportData(snapshot.current),null,2)],{type:'application/json'}));a.href=url;a.download='rihla-plans.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const [cardSelection,setCardSelection]=useState<TripCardSelection>();
const [cardCountry,setCardCountry]=useState('');
const [browsedMonth,setBrowsedMonth]=useState<number>();
const [guideMonth,setGuideMonth]=useState<number>();
const [guideDates,setGuideDates]=useState<{start:string;end:string}>();
const [prepChoice,setPrepChoice]=useState('');
const [advisorOpen,setAdvisorOpen]=useState(false);
const cardVisit=useRef(0);
const navigate=(next:string)=>{
 setTab(next);
 setNotice('');
 window.scrollTo(0,0);
};
const openMonthlyCountry=()=>{
 setCountryCode('');
 setGuideMonth(undefined);
 setGuideDates(undefined);
 navigate('countries');
};
const openBoredCard=(groupId:string,tripId:TripCard['id'],estimate:NonNullable<TripCardSelection['estimate']>)=>{
 const card=tripCardsWithDefaults(snapshot.current.tripCards).groups.find(group=>group.id===groupId)?.trips.find(item=>item.id===tripId);
 setCardCountry(card?.country.toUpperCase()??'');
 setCardSelection({groupId,tripId,estimate,nonce:++cardVisit.current});
 navigate('trip-card');
};
const workspace=workspaceFor(tab);
const activeCountry=countryFor(t.selected);
const countryMonth=guideMonth??browsedMonth??data.bored?.settings.month??defaultBoredSettings.month;
const recommendedCountry=useMemo(()=>recommendedCountryForMonth(countryMonth,catalogs.countries,data.excludedDestinations),[countryMonth,catalogs.countries,data.excludedDestinations]);
const guideCountry=countryCode||recommendedCountry;
const tripMatchesGuide=!!activeCountry&&activeCountry===guideCountry&&t.mode==='dates';
const prepCountry=prepChoice||cardCountry||activeCountry;
const openCountry=(code:string,month?:number,departure?:string,days?:number)=>{
 setCountryCode(code.toUpperCase());
 setGuideMonth(month);
 setGuideDates(departure && days ? {start:departure,end:shiftCardDate(departure,days-1)} : undefined);
 navigate('countries');
};
const openGuide=(id:string)=>{const code=countryFor(id)||id;if(/^[a-z]{2}$/i.test(code))openCountry(code);};
const openAdvisor=()=>{
 setAdvisorOpen(true);
 requestAnimationFrame(()=>document.getElementById('workspace-advisor')?.focus());
};
const addReadyTrip=(saved:SavedReadyPlan)=>{
 const id=crypto.randomUUID(), selectedId='country-'+saved.plan.country;
 const selected=allDestinations.some(destination=>destination.id===selectedId)?selectedId:'';
 const draftDays=saved.plan.stops.flatMap((stop,stopIndex)=>Array.from({length:saved.nights[stopIndex]},(_,index)=>{
  const day=stop.day_plan[index];
  const arrival=index===0&&stopIndex>0?'يوم انتقال إلى '+stop.city+'. راجع توقيت النقل.\n':'';
  return {title:(stop.city+' · '+(day?.rest?'راحة':'يوم '+(index+1))).slice(0,200),
   notes:(arrival+(day?['صباحًا '+day.morning,'ظهرًا '+day.noon,'مساءً '+day.evening].join('\n'):'وقت مرن لاستكشاف المدينة.')).slice(0,2800),activities:[]};
 }));
 const lastStop=saved.plan.stops[saved.plan.stops.length-1];
 const draft=[...draftDays,{title:('المغادرة من '+lastStop.city).slice(0,200),notes:'راجع وقت تسجيل الخروج والانتقال إلى المطار.',activities:[]}];
 const tripName=saved.start_date?(saved.plan.title+' · '+dateText(saved.start_date)).slice(0,200):saved.plan.title;
 const trip:Trip={...blank(id),name:tripName,origin:'الرياض',date:saved.start_date??'',
  month:readyTravelMonth(saved.month,saved.start_date??saved.created_on),mode:saved.start_date?'dates':'flexible',
  days:String(estimateReadyPlan(saved.plan,saved.nights).days),travelers:'1',budget:String(saved.budget),currency:'SAR',nationality:'SA',
  selected,plans:selected?{[selected]:draft}:{},readyPlan:saved};
 return changeData(current=>({...current,activeId:id,trips:[...current.trips,trip]}));
};
const saveReadyChoice=(choice:ReadyPlanChoice)=>{
 if(isRouteExcluded(choice.plan,snapshot.current.excludedDestinations)){
  setNotice('هذه الخطة تشمل وجهة مستبعدة. راجع الإعدادات.');return false;
 }
 try {return addReadyTrip(saveReadyPlanSnapshot(choice,todayInRiyadh()));}
 catch {setNotice('تعذر حفظ الخطة. راجع عدد الليالي واختيارات الرحلة.');return false;}
};
const duplicateReadyTrip=(date:string)=>{
 if(!t.readyPlan)return false;
 try {
  if (!addReadyTrip(copyReadyPlanSnapshot(t.readyPlan,date,todayInRiyadh())))return false;
  navigate('ready-trip');setNotice('أضيفت نسخة مستقلة بالتاريخ الجديد. تابع مؤشر الحفظ.');return true;
 } catch {setNotice('اختر تاريخ بداية صالحًا ومختلفًا عن التاريخ الحالي.');return false;}
};
const selectSavedTrip=(id:string)=>{
 setPrepChoice('');setCardCountry('');
 const next=snapshot.current.trips.find(trip=>trip.id===id);
 if(next&&changeData(current=>({...current,activeId:id}))) {
  if(next.readyPlan)navigate('ready-trip');
  else if(tab==='ready-trip')navigate('desk');
 }
};
const restore=(backup:Data,ids:string[],world:boolean)=>{if(!enabled||blocked.current)return 'استعد الحفظ أولًا قبل الاستعادة.';try{commit(current=>restoreTripCopies(current,backup,ids,world,revision.current));youtube.importReviews(backup.youtubeReviews);navigate('desk');setNotice('أضفنا نسخًا مستقلة؛ رحلاتك السابقة محفوظة.');}catch(e){return (e as Error).message;}};
const budget=d?costs(t,d.id):null,plan=d?t.plans[d.id]||[]:[];
const changeCost=(key:string,value:string)=>update({costs:{...t.costs,[t.selected]:{...t.costs[t.selected],[key]:value}}});
const generate=()=>{if(!d||!num(t.days)||!num(t.travelers)||!t.currency||!num(t.budget)){setNotice('اختر وجهة وأدخل المدة والمسافرين والميزانية والعملة.');return;}if(plan.length&&!confirm('استبدال الخطة الحالية؟ ستُستبدل تعديلاتك.'))return;if(d.id.startsWith('country-')){try{const p=generateCountryPlan(d.id.slice(8),t,t.countryCities||[]);update({plans:{...t.plans,[d.id]:p}});setNotice('أُعيد توزيع الأيام. راجع الانتقالات والتكاليف.');}catch(e){setNotice((e as Error).message);}return;}const list=[...d.activities].sort((a,b)=>Number(t.interests.includes(b.tag))-Number(t.interests.includes(a.tag)));const b=costs(t,d.id),light=t.pace==='هادئ'||b.complete&&b.high>num(t.budget);const p=Array.from({length:num(t.days)},(_,i)=>{if(i===0&&num(t.days)>1)return {title:'الوصول والراحة',notes:'اترك وقتًا للنقل وتسجيل الدخول؛ عدّل اليوم وفق موعد الوصول.'};if(i===num(t.days)-1&&num(t.days)>1)return {title:'وقت مرن والمغادرة',notes:'تحقق من موعد تسجيل الخروج، واترك هامشًا للوصول إلى المطار.'};const a=list[Math.max(0,i-1)];return {title:a?.name||'يوم مرن حسب اهتماماتك',notes:(a?a.area+' · '+a.tag+'\n':'')+(light?'نشاط رئيسي واحد مع وقت للراحة.':'نشاط رئيسي ووقت لتجربة قريبة أو استراحة.')+'\nتحقق من التذاكر وساعات العمل والطقس قبل التثبيت.'};});update({plans:{...t.plans,[d.id]:p.map(day=>{const activity=list.find(a=>a.name===day.title);return {...day,activities:activity?[{...newActivity(),title:activity.name,place:activity.area,url:d.source,priority:'essential' as const}]:[]};})}});setNotice(b.complete?'خطة مرنة؛ راجع تكاليفها الفعلية قبل الحجز.':'أُنشئت الخطة حسب اهتماماتك. ملاءمتها المالية غير مؤكدة حتى إدخال تكاليف البنود.');};
return <CatalogContext.Provider value={{...catalogs,youtubeReviews:youtube.reviews,onYoutubeReview:youtube.review}}>
<header className="rihla-header">
 <a className="brand" href="/" onClick={event=>{event.preventDefault();navigate('bored');}}><Compass size={34}/><b>رِحلة</b></a>
 <WorkspaceNavigation workspace={workspace} onChange={view=>view==='countries'&&tab!=='countries'?openMonthlyCountry():navigate(view==='trip-card'&&t.readyPlan?'ready-trip':view)}/>
 <div className="header-controls">
  <span className="save-status" role="status"><Cloud size={18} aria-hidden="true"/>{status}</span>
  <button type="button" className="secondary settings-trigger" aria-label="الإعدادات" aria-current={tab==='settings'?'page':undefined} onClick={()=>navigate('settings')}><Settings size={19} aria-hidden="true"/><span>الإعدادات</span></button>
 </div>
</header>
<main className={tab==='plan'?'planner-shell':undefined}>
{error&&<div role="alert" className="notice warning">{error} {signInNeeded&&enabled&&<a href="/signin-with-chatgpt?return_to=/" target="_blank" rel="noreferrer">جدّد الدخول في نافذة أخرى</a>} {enabled?(saveBlocked?<button className="secondary" onClick={()=>location.reload()}>بعد تنزيل نسخة، أعد تحميل الصفحة</button>:<button className="secondary" onClick={()=>{if(sync.current)sync.current.needsRetry=false;setRetry(x=>x+1);}}>أعد محاولة الحفظ</button>):<><a href="/signin-with-chatgpt?return_to=/" target="_top">تسجيل الدخول</a> <button className="secondary" onClick={()=>setLoadRetry(x=>x+1)}>أعد الاتصال برحلاتي</button></>}</div>}
 <div className="workspace workspace-wide"><section className="content">
 {workspace==='trip'&&<TripNavigation view={tab} hasReadyPlan={!!t.readyPlan} onChange={navigate}/>}
 {notice&&<div className="notice" role="status">{notice}</div>}
 {youtube.notice&&<div className="notice warning" role="status">{youtube.notice}</div>}
 {workspace==='trip'&&tab!=='trip-card'&&<>
  <div className="trip-context-bar">
   <label className="saved-trip-control">رحلاتي المحفوظة <select disabled={!enabled||saveBlocked} value={data.activeId} onChange={event=>selectSavedTrip(event.target.value)}>{data.trips.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   <button type="button" className="secondary" disabled={!enabled||saveBlocked||data.trips.length>=50} onClick={()=>{const item=blank(crypto.randomUUID());if(changeData(current=>({...current,activeId:item.id,trips:[...current.trips,item]}))){setPrepChoice('');navigate('desk');}}}><Plus size={16}/> رحلة جديدة</button>
   {tab!=='wizard'&&<TripDetails key={t.id} t={t} update={update} enabled={enabled&&!saveBlocked} onNotice={setNotice} onSuggest={()=>navigate('bored')}/>}
  </div>
  {matching.length>0&&<div className="notice warning">{t.mode==='flexible'?'داخل الشهر المحتمل: ':'تتقاطع فترتك مع: '}{matching.map(event=>(destinations.find(city=>city.id===event.destination)?.country||'')+': '+event.name).join('، ')}. قد تتأثر الأسعار والتوافر.</div>}
 </>}
 {!d&&['budget','plan','ideas','map','organize'].includes(tab)&&<div className="empty"><Compass size={32}/><h2>اختر وجهة عشان تكمّل التخطيط</h2><button type="button" onClick={()=>navigate('bored')}>وين أروح؟</button><button type="button" className="secondary" onClick={openMonthlyCountry}>اختر دولة</button></div>}

 {tab==='bored'&&<>
  <a href="/?view=ready-plans" className="panel ready-plans-entry" onClick={event=>{event.preventDefault();navigate('ready-plans');}}>
   <Route size={24} aria-hidden="true"/><span><strong>خطط جاهزة</strong><small>اختر مسارًا، عدّل لياليه، واحفظه في رحلتي.</small></span>
  </a>
  <BoredWorkspace cards={data.tripCards} saved={data.bored} canSave={enabled&&!saveBlocked} exclusions={data.excludedDestinations}
   tripDate={t.mode==='dates'?t.date:undefined} monthOverride={browsedMonth} onMonthChange={setBrowsedMonth}
   save={change=>changeData(current=>({...current,bored:change(current.bored??{settings:defaultBoredSettings,links:{}})}))}
   openCard={openBoredCard} openCountry={openCountry} openAdvisor={openAdvisor} youtubeReviews={youtube.reviews} onYoutubeReview={youtube.review}/>
  {advisorOpen&&<section id="workspace-advisor" className="panel workspace-advisor" tabIndex={-1} aria-labelledby="workspace-advisor-title">
   <div className="advisor-section-head"><h2 id="workspace-advisor-title">اسأل مستشاري</h2><button type="button" className="secondary" onClick={()=>setAdvisorOpen(false)}>إغلاق</button></div>
   {advisorOpen&&ready&&<ResearchDesk key={t.id} t={t} data={data} update={update} onPlan={openWizard} onGuide={openGuide} navigate={navigate} canResearch={enabled&&!error&&(status==='حُفظت جميع التغييرات'||status==='الحفظ التلقائي جاهز')}/>}
  </section>}
 </>}
 {tab==='ready-plans'&&<Suspense fallback={<p role="status">جارٍ تحميل الخطط الجاهزة…</p>}><ReadyPlansWorkspace initialMonth={browsedMonth??data.bored?.settings.month}
  initialBudget={data.bored?.settings.budget} cards={data.tripCards} exclusions={data.excludedDestinations} canSave={enabled&&!saveBlocked}
  onSave={saveReadyChoice} onOpenSaved={()=>navigate('ready-trip')}/></Suspense>}
 {tab==='ready-trip'&&(t.readyPlan?<SavedReadyPlanCard key={t.id} saved={t.readyPlan} canSave={enabled&&!saveBlocked}
  onCheck={checked=>update({readyPlan:{...t.readyPlan!,checked}})} onCopy={duplicateReadyTrip}
  onDays={days=>update({readyPlan:{...t.readyPlan!,days}})}/>:ready?
  <div className="empty"><h2>اختر خطة عشان تحفظها في رحلتي</h2><button type="button" onClick={()=>navigate('ready-plans')}>تصفح الخطط الجاهزة</button></div>:
  <p role="status">جارٍ تحميل رحلاتك…</p>)}
 {tab==='trip-card'&&<TripCardWorkspace key={cardSelection?.nonce} selection={cardSelection} cards={tripCardsWithDefaults(data.tripCards)} canSave={enabled&&!saveBlocked}
  updateCards={change=>changeData(current=>({...current,tripCards:change(tripCardsWithDefaults(current.tripCards))}))}
  saveSummary={saveCardSummary} openSaved={()=>navigate('desk')} openCountry={openCountry} youtubeReviews={youtube.reviews} onYoutubeReview={youtube.review}/>}
 {tab==='settings'&&<section className="workspace-settings" aria-labelledby="settings-title">
  <h1 id="settings-title">الإعدادات</h1>
  <MilesSettingsPanel/>
  <DestinationExclusionsSettings value={data.excludedDestinations} canSave={enabled&&!saveBlocked}
   onChange={excludedDestinations=>changeData(current=>({...current,excludedDestinations}))}/>
  <CatalogImportPanel canSave={enabled&&!saveBlocked} onImport={imports=>changeData(current=>({...current,catalogImports:{...current.catalogImports,...imports}}))}/>
  <YoutubeCoverageDirectory/>
  <BackupDialog data={data} canSave={enabled&&!saveBlocked} onExport={exportData} onRestore={restore}/>
 </section>}
{tab==='desk'&&ready&&<>{t.readyPlan&&<article className="panel spaced">
 <div className="section-head"><h2>{t.readyPlan.plan.title}</h2><button type="button" className="secondary" onClick={()=>navigate('ready-trip')}>افتح الخطة المحفوظة</button></div>
 </article>}{t.tripCardSummary&&<article className="panel trip-card-saved">
 <div className="section-head"><h2>ملخص بطاقة السفرة</h2><button type="button" className="secondary" onClick={()=>navigate('trip-card')}>افتح بطاقة السفرة</button></div>
 <pre>{t.tripCardSummary}</pre>
</article>}<TripDesk t={t} navigate={navigate}/></>}
{tab==='split'&&ready&&<GroupWallet key={t.id} t={t} update={update} navigate={navigate}/>}
{tab==='packing'&&ready&&<PackingList key={t.id} t={t} update={update}/>}
{tab==='bookings'&&ready&&<BookingDesk key={t.id} t={t} update={update}/>}
{tab==='organize'&&d&&ready&&<IdeaOrganizer key={t.id+d.id} t={t} d={d} update={update} navigate={navigate}/>}
{tab==='offline'&&<OfflinePack t={t}/>}
{tab==='places'&&(d?<PlacePlanner canSave={enabled&&!saveBlocked} key={t.id+d.id} t={t} d={d} update={update} navigate={navigate}/>:<div className="empty">اختر دولة أو مدينة أولًا. <button onClick={()=>navigate('bored')}>اختر وجهتي</button></div>)}
{tab==='budget'&&d&&budget&&<><div className="section-head"><h2>ميزانية {d.name}</h2><span>تقديراتك، بافتراضات واضحة</span></div><div className="notice">لا توجد أسعار حديثة موثوقة لرحلتك. أدخل نطاقات من عروض تتحقق منها. العملة: {t.currency||'اخترها من التفاصيل'}. لا يوجد تحويل عملات آلي.</div><div className="budget-summary"><span>{budget.complete&&!budget.invalid?'إجمالي الرحلة التقديري':'مجموع البنود المدخلة فقط'}</span><strong>{fmt(budget.low)} – {fmt(budget.high)} <small>{t.currency}</small></strong><span>{num(t.days)} أيام · {Math.max(0,num(t.days)-1)} ليالٍ · {num(t.travelers)} مسافرين · سكن {t.level}</span>{budget.complete&&!budget.invalid&&num(t.budget)>0?<b>{budget.high>num(t.budget)?'الحد الأعلى يتجاوز ميزانيتك بـ '+fmt(budget.high-num(t.budget)):'النطاق المدخل ضمن ميزانيتك'}</b>:<b>لا يمكن الحكم على كفاية الميزانية قبل اكتمال البنود</b>}</div><div className="panel"><label className="field">عدد الغرف<input type="number" min="1" max="30" value={t.costs[d.id]?.rooms||''} onChange={e=>{if(e.target.value===''||Number.isInteger(num(e.target.value))&&num(e.target.value)>=1&&num(e.target.value)<=30)changeCost('rooms',e.target.value);}}/></label><div className="cost-head"><span>البند</span><span>الحد الأدنى</span><span>الحد الأعلى</span></div>{costRows.map(([key,label])=><div className="cost-row" key={key}><span>{label}</span>{['Low','High'].map((suffix,i)=><MoneyInput key={suffix} label={label+(i?' الحد الأعلى':' الحد الأدنى')} currency={t.currency} placeholder="غير متوفر" value={t.costs[d.id]?.[key+suffix]??''} onChange={value=>changeCost(key+suffix,value)}/>)}</div>)}{budget.invalid&&<p role="alert" className="error">راجع دقة مبالغك حسب العملة، وأكمل الحدود بحيث لا يقل الأعلى عن الأدنى.</p>}<label className="field">مصادر عروضك وتاريخ مراجعتها<textarea maxLength={200} placeholder="رابط العرض، تاريخ التحقق، الضرائب المشمولة…" value={t.costs[d.id]?.source||''} onChange={e=>changeCost('source',e.target.value)}/></label><p className="micro">السكن = سعر الغرفة × الغرف × (الأيام − ١). الطعام والتنقل والأنشطة = اليومي × المسافرين × الأيام. الطيران = الذهاب والعودة × المسافرين. أدخل الضرائب ضمن الأسعار. الرسوم الإضافية المسجلة أدناه تُضاف مرة واحدة للمجموعة؛ أي رسوم أو مشتريات غير مسجلة خارج المجموع. الصفر يعني عدم وجود تكلفة والفراغ يعني أنها مجهولة.</p></div><div className="panel spaced"><h3>توزيع الحد الأعلى</h3>{budget.rows.map(r=><div className="bar-row" key={r.key}><span>{r.label.split('/')[0]}</span><div className="bar-track"><div style={{width:budget.high>0?`${r.high/budget.high*100}%`:'0%'}}/></div><span>{r.known?fmt(r.high):'—'}</span></div>)}</div><BudgetLab key={t.id+d.id} t={t} update={update}/><Spending t={t} d={d} update={update}/></>}
{tab==='plan'&&d&&<JourneyWorkspace canSave={enabled&&!saveBlocked} key={t.id+d.id} t={t} d={d} update={update} generate={generate} notice={setNotice} navigate={navigate}/>}
{tab==='map'&&d&&<TripMap key={t.id+d.id} t={t} d={d} update={update}/>}
{tab==='ideas'&&d&&<Ideas key={t.id+d.id} t={t} d={d} update={update}/>}
{tab==='countries'&&<CountriesWorkspace code={guideCountry} travelMonth={countryMonth} tripStart={guideDates?.start || (tripMatchesGuide?start:undefined)} tripEnd={guideDates?.end || (tripMatchesGuide?end:undefined)}
 memories={data.world??{}} canSave={enabled&&!saveBlocked} updateMemory={(code,memory)=>{changeData(current=>({...current,world:{...current.world,[code]:memory}}));}}
 onCountry={setCountryCode} onPlan={openWizard} exclusions={data.excludedDestinations} youtubeReviews={youtube.reviews} onYoutubeReview={youtube.review}/>}
{tab==='wizard'&&wizardCode&&<CountryWizard key={wizardCode} code={wizardCode} current={t} exclusions={data.excludedDestinations} onCancel={()=>navigate('countries')} onCreate={trip=>{
 if(isRouteExcluded({country:wizardCode,stops:trip.countryCities?.map(city=>({city}))},snapshot.current.excludedDestinations)){setNotice('هذه الرحلة تشمل وجهة مستبعدة. راجع الإعدادات.');return;}
 if(data.trips.length>=50){setNotice('وصلت إلى حد ٥٠ رحلة محفوظة.');return;}
 if(!changeData(current=>({...current,activeId:trip.id,trips:[...current.trips,trip],world:{...current.world,[wizardCode]:{visited:false,month:'',notes:'',...current.world?.[wizardCode],planned:true}}})))return;
 setPrepChoice('');navigate('plan');setNotice('أُنشئت رحلة مستقلة. تابع حالة الحفظ أعلى الصفحة.');
}}/>}
{tab==='review'&&ready&&<PrebookingReview key={t.id+t.selected} t={t} update={update} navigate={navigate}/>}
{tab==='prep'&&<section className="panel workspace-prep">
 <h1>قبل ما تطلع</h1>
 <label>الدولة <select value={catalogs.countries.has(prepCountry)?prepCountry:''} onChange={event=>setPrepChoice(event.target.value)}>
  <option value="">اختر دولة</option>
  {[...catalogs.countries.values()].sort((a,b)=>a.name_ar.localeCompare(b.name_ar,'ar')).map(country=><option key={country.iso2} value={country.iso2}>{country.name_ar}</option>)}
 </select></label>
 {catalogs.countries.has(prepCountry)?<CountryPreparationList code={prepCountry}/>:<p>اختر دولة عشان تظهر لك قائمة التجهيز.</p>}
</section>}
{tab==='prices'&&<><PriceWatchDesk key={t.id+t.selected} t={t} update={update} canSave={enabled&&!saveBlocked}/><details className="spaced"><summary>خيارات المزوّدين غير المربوطة</summary><PriceProviders/></details></>}
{tab==='calendar'&&<TripCalendar t={t} select={id=>update({selected:id})}/>}
<footer>رِحلة للتخطيط. راجع الأسعار ومتطلبات الدخول من مصادرها قبل الحجز.</footer></section></div></main><PrintSheet t={t} d={d} budget={budget}/></CatalogContext.Provider>;
}
