import {MapPin, MapPinned} from 'lucide-react';
import {useState} from 'react';
import {readyCityMap, readyCityMapParts, readyHotelMap, readyPlaceMap, verifiedReadyPlaces} from '../lib/ready-plan-maps';
import type {ReadyPlan} from '../lib/ready-plan-schema';
import {cardNumber} from '../lib/trip-card';

export function ReadyRouteMaps({stops,className,sourcePlanId}: {stops:ReadyPlan['stops']; className?:string; sourcePlanId?:string}) {
  const [catalogStops,setCatalogStops] = useState<ReadyPlan['stops']>();
  const [loading,setLoading] = useState(false);
  const [loadFailed,setLoadFailed] = useState(false);
  const resolvedStops = stops.map((stop,index) => {
    const reference = catalogStops?.[index];
    if (verifiedReadyPlaces(stop).length || !reference || stop.city !== reference.city || stop.hotel.latitude === undefined ||
      stop.hotel.longitude === undefined || stop.hotel.latitude !== reference.hotel.latitude || stop.hotel.longitude !== reference.hotel.longitude) return stop;
    return {...stop,places:reference.places};
  });
  const maps = resolvedStops.map(stop => ({stop,city:readyCityMap(stop),hotel:readyHotelMap(stop)})).filter(map => map.city || map.hotel);
  if (!maps.length) return null;
  return <details className={className} onToggle={async event=>{
    if (!event.currentTarget.open || !sourcePlanId || catalogStops || loading) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const {readyPlans} = await import('../lib/ready-plans');
      setCatalogStops(readyPlans.find(plan=>plan.id===sourcePlanId)?.stops ?? []);
    } catch {
      setLoadFailed(true);
    } finally { setLoading(false); }
  }}>
    <summary><MapPinned aria-hidden="true" size={20}/> عرض على الخريطة</summary>
    {loading && <p role="status">جارٍ تحميل الأماكن…</p>}
    {loadFailed && <p role="status">تعذّر تحميل أماكن الخطة. أغلق الخريطة وافتحها للمحاولة مرة ثانية.</p>}
    <ul>{maps.map(({stop,city,hotel},index) => <li key={stop.city + index}>
      {city && <a className="ready-map-link" href={city} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" size={18}/> أماكن {stop.city} على Google Maps</a>}
      {readyCityMapParts(stop).map((url,part)=><a className="ready-map-link" key={url} href={url} target="_blank" rel="noreferrer">خريطة الجوال · جزء {cardNumber(part+1)}</a>)}
      <ul>
        {hotel && <li><a href={hotel} target="_blank" rel="noreferrer">{stop.hotel.name}</a>
          {stop.hotel.osm_url && <> · <a href={stop.hotel.osm_url} target="_blank" rel="noreferrer">المصدر: OpenStreetMap</a></>}
        </li>}
        {[...new Map(verifiedReadyPlaces(stop).map(place=>[place.osm_url,place])).values()].map(place => <li key={place.osm_url}>
          <a href={readyPlaceMap(place)} target="_blank" rel="noreferrer">{place.name}</a>
          {' · '}<a href={place.osm_url} target="_blank" rel="noreferrer">المصدر: OpenStreetMap</a>
        </li>)}
      </ul>
    </li>)}</ul>
  </details>;
}
