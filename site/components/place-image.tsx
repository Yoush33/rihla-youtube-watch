'use client';

import {useState,type ReactNode} from 'react';
import cities from '../lib/place-images-cities.json';
import countries from '../lib/place-images-countries.json';
import destinations from '../lib/place-images-destinations.json';
import weatherCities from '../lib/place-images-weather.json';

type PlacePhoto = {url:string;author:string;license:string;page:string;licenseUrl?:string};
type PhotoIndex = Record<string,PlacePhoto>;

function placeKey(place:string) {
  return place.normalize('NFC').toLowerCase().replace(/[\u064B-\u065F\u0670ـ]/g,'').trim().replace(/\s+/g,' ');
}

const cityPhotos = new Map<string,PlacePhoto>(Object.entries({...weatherCities,...cities,...destinations} as PhotoIndex)
  .map(([place,photo]) => [placeKey(place),photo]));
const countryPhotos = countries as PhotoIndex;

export function PlaceImage({place,kind='city',className,label,overlay,fallbackName}: {
  place:string;
  kind?:'country'|'city';
  className?:string;
  label?:ReactNode;
  overlay?:ReactNode;
  fallbackName?:string;
}) {
  const [failedUrl,setFailedUrl] = useState<string>();
  const photo = kind === 'country' ? countryPhotos[place.toUpperCase()] : cityPhotos.get(placeKey(place));
  const displayed = photo?.url && failedUrl !== photo.url ? photo : undefined;
  const title = label ?? (!displayed ? fallbackName || place : undefined);

  return <div className={['place-image',className].filter(Boolean).join(' ')} data-has-photo={!!displayed}>
    {displayed && <>
      <img className="place-image-photo" src={displayed.url} loading="lazy" decoding="async" alt="" onError={()=>setFailedUrl(displayed.url)}/>
      <a href={displayed.page} target="_blank" rel="noreferrer" className="place-image-credit"
        title={displayed.author+' · '+displayed.license} dir="auto">{displayed.author} · {displayed.license}</a>
    </>}
    {overlay && <div className="place-image-overlay">{overlay}</div>}
    {title && <div className="place-image-label">{title}</div>}
  </div>;
}
