'use client';
import {useEffect,useRef,useState} from 'react';
import type * as L from 'leaflet';
import type {FeatureCollection} from 'geojson';
import 'leaflet/dist/leaflet.css';
import type {Country,WorldMemory,CountryMemory} from '../lib/world';
const color=(m?:CountryMemory)=>m?.visited&&m.planned?'#7560ad':m?.visited?'#087c76':m?.planned?'#d98325':'#d7e3e5';
export function CountryMap({countries,memories,selected,onSelect}:{countries:Country[];memories:WorldMemory;selected:string;onSelect:(s:string)=>void}){
 const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layers=useRef<{code:string;layer:L.Path}[]>([]),choose=useRef(onSelect),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);choose.current=onSelect;
 useEffect(()=>{let disposed=false;const abort=new AbortController();let observer:ResizeObserver|undefined;setError('');setLoaded(false);
 Promise.all([import('leaflet'),fetch('/world.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<FeatureCollection>;})]).then(([leaf,geo])=>{
  if(disposed||!host.current)return;const m=leaf.map(host.current,{zoomControl:false,scrollWheelZoom:false,minZoom:0,maxZoom:7,zoomSnap:.25,maxBounds:[[-85,-190],[85,190]],maxBoundsViscosity:.8}).fitBounds([[-60,-180],[83,180]]);map.current=m;leaf.control.zoom({zoomInTitle:'تكبير العالم',zoomOutTitle:'تصغير العالم'}).addTo(m);
  m.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> · <a href="https://github.com/mledoze/countries" target="_blank" rel="noopener">world-countries (ODbL)</a>');
  const used=new Set<string>();const attach=(code:string,layer:L.Path)=>{const c=countries.find(c=>c.code===code);if(!c)return;used.add(code);layers.current.push({code,layer});const text=document.createElement('span');text.textContent=c.name;layer.bindTooltip(text,{direction:'top'}).on('click',()=>choose.current(code));};
  leaf.geoJSON(geo,{style:{color:'#fff',weight:.7,fillColor:'#d7e3e5',fillOpacity:1},onEachFeature:(f,l)=>attach(f.properties?.code,l as L.Path)}).addTo(m);
  countries.filter(c=>!used.has(c.code)).forEach(c=>attach(c.code,leaf.circleMarker([c.lat,c.lng],{radius:5,color:'#fff',weight:1,fillColor:'#d7e3e5',fillOpacity:1}).addTo(m)));
  observer=new ResizeObserver(()=>m.invalidateSize());observer.observe(host.current);setLoaded(true);
 }).catch(e=>{if(!disposed&&e.name!=='AbortError')setError('تعذّر تحميل رسم العالم. البحث والقائمة وحفظ الدول ما زالت متاحة.');});
 return()=>{disposed=true;abort.abort();observer?.disconnect();map.current?.remove();map.current=null;layers.current=[];};
 },[countries,retry]);
 useEffect(()=>{if(!loaded)return;layers.current.forEach(({code,layer})=>layer.setStyle({fillColor:color(memories[code]),color:code===selected?'#182f3c':'#fff',weight:code===selected?2.5:.7,fillOpacity:1}));},[selected,memories,loaded]);
 return <div className="world-map-wrap"><div className="world-map-tools"><span>اضغط دولة لفتح دليلها</span><button className="secondary" disabled={!loaded} onClick={()=>map.current?.fitBounds([[-60,-180],[83,180]])}>العالم كاملًا</button><button className="secondary" disabled={!loaded||!selected} onClick={()=>{const c=countries.find(c=>c.code===selected);if(c)map.current?.setView([c.lat,c.lng],5);}}>قرّب الدولة</button></div>{!loaded&&!error&&<p role="status">جارٍ تحميل الخريطة…</p>}{error&&<p role="alert">{error} <button className="secondary" onClick={()=>setRetry(x=>x+1)}>حاول مجددًا</button></p>}<div ref={host} className="world-canvas" aria-label="خريطة العالم؛ يمكنك أيضًا اختيار أي دولة من البحث والقائمة"/><div className="world-legend"><span><i style={{background:color({visited:true} as CountryMemory)}}/> زرتها</span><span><i style={{background:color({planned:true} as CountryMemory)}}/> أبي أزورها</span><span><i style={{background:'#7560ad'}}/> زرتها وبأرجع لها</span></div></div>;
}
