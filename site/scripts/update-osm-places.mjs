import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {promisify} from 'node:util';

const radius = 5_000;
const walkRadius = 1_500;
const categories = ['breakfast','lunch','coffee','dinner','spa','nature','landmarks','shopping'];
const overpassEndpoints = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const swissEndpoint = 'https://overpass.osm.ch/api/interpreter';
const userAgent = 'Rihla/1.0 (https://rihla-travel-companion.yoush3.chatgpt.site)';
const curl = promisify(execFile);
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));

const filters = [
  '["amenity"~"^(restaurant|cafe|marketplace)$"]',
  '["shop"~"^(bakery|mall|massage)$"]',
  '["leisure"~"^(park|spa|beach_resort)$"]',
  '["natural"="beach"]',
  '["tourism"~"^(viewpoint|attraction|museum)$"]',
  '["healthcare"="massage"]',
];

function bbox({lat,lon}, meters = radius) {
  const latitudeDelta = meters / 110_500;
  const longitudeDelta = meters / (110_500 * Math.cos(lat * Math.PI / 180));
  return [lat-latitudeDelta,lon-longitudeDelta,lat+latitudeDelta,lon+longitudeDelta].map(n=>n.toFixed(6)).join(',');
}

export function overpassVenueQuery(pinOrPins) {
  const pins = Array.isArray(pinOrPins) ? pinOrPins : [pinOrPins];
  return `[out:json][timeout:30];(${pins.flatMap(pin=>filters.map(filter=>`nwr["name"]${filter}(${bbox(pin)});`)).join('')});out center;`;
}

export function distanceMeters(a,b) {
  const radians = degrees => degrees * Math.PI / 180;
  const lat = radians(b.lat-a.lat);
  const lon = radians(b.lon-a.lon);
  const arc = Math.sin(lat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lon / 2) ** 2;
  return 6_371_008.8 * 2 * Math.atan2(Math.sqrt(arc),Math.sqrt(1-arc));
}

const clean = value => value.normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const english = value => typeof value === 'string' && /\p{Script=Latin}/u.test(value) && !/[^\p{Script=Latin}\p{M}\p{N}\p{P}\p{Z}\p{S}]/u.test(value);
const point = element => ({lat:element.lat ?? element.center?.lat,lon:element.lon ?? element.center?.lon});
const isPoint = ({lat,lon}) => Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180;
const osmLink = element => `https://www.openstreetmap.org/${element.type}/${element.id}`;
const osmPin = value => /^https:\/\/(?:www\.)?openstreetmap\.org\/(?:node|way|relation)\/\d+\/?$/u.test(value);
const mapPin = ({lat,lon}) => `https://www.google.com/maps/search/?${new URLSearchParams({api:'1',query:`${lat},${lon}`})}`;

function venueCategories(tags) {
  const {amenity, shop, leisure, natural, tourism, healthcare} = tags;
  const matches = [];
  if (amenity==='cafe' || shop==='bakery' || /\b(?:breakfast|brunch)\b/i.test(tags.cuisine ?? '')) matches.push('breakfast');
  if (amenity==='restaurant') matches.push('lunch','dinner');
  if (amenity==='cafe') matches.push('coffee');
  if (shop==='massage' || leisure==='spa' || healthcare==='massage') matches.push('spa');
  if (leisure==='park' || leisure==='beach_resort' || natural==='beach' || tourism==='viewpoint') matches.push('nature');
  if (tourism==='attraction' || tourism==='museum') matches.push('landmarks');
  if (amenity==='marketplace' || shop==='mall') matches.push('shopping');
  return matches;
}

function note(category) {
  if (category==='shopping') return 'تأكد من مواعيد السوق؛ المشتريات حسب اختيارك.';
  if (category==='spa') return 'اسأل عن سعر الجلسة والتوافر قبل الزيارة.';
  if (category==='nature' || category==='landmarks') return 'تحقق من رسوم الدخول وساعات الزيارة.';
  return 'راجع القائمة والأسعار وساعات العمل.';
}

export function selectOsmVenues(elements,pin,oldPlaces = []) {
  const candidates = elements.flatMap(element => {
    const tags = element.tags ?? {};
    const name = (tags['name:ar'] ?? tags.name ?? '').trim();
    const coordinates = point(element);
    if (!name || name.length>200 || !isPoint(coordinates) || tags.disused==='yes' || tags.abandoned==='yes' || tags.opening_hours==='closed') return [];
    const distance = distanceMeters(pin,coordinates);
    if (distance > radius) return [];
    const nameEn = tags['name:en'] ?? (english(tags.name) ? tags.name : undefined);
    return [{name,nameEn,coordinates,distance,source:osmLink(element),categories:venueCategories(tags)}];
  }).sort((a,b)=>a.distance-b.distance || a.source.localeCompare(b.source));

  return categories.flatMap(category => {
    const used = new Set();
    return candidates.filter(candidate => {
      const normalized = clean(candidate.nameEn ?? candidate.name);
      if (!candidate.categories.includes(category) || used.has(normalized)) return false;
      used.add(normalized);
      return true;
    }).slice(0,5).map(({name,nameEn,coordinates,distance,source}) => {
      const previous = oldPlaces.find(place => place.category===category && place.price?.amount!=null && !place.price.estimated &&
        (place.osm_url===source || clean(place.name_en ?? place.name)===clean(nameEn ?? name)));
      return {name, ...(nameEn ? {name_en:nameEn.slice(0,200)} : {}), category, latitude:coordinates.lat, longitude:coordinates.lon,
        distance_meters:Math.ceil(distance), walk_minutes:distance<=walkRadius ? Math.ceil(distance / 80) : null,
        price_note:previous?.price_note ?? note(category), maps:mapPin(coordinates), osm_url:source,
        ...(previous ? {price:previous.price} : {})};
    });
  });
}

async function query(endpoint, data) {
  const args = ['--silent','--show-error','--max-time','37','--fail','--user-agent',userAgent];
  if (endpoint===swissEndpoint) args.push('--get');
  const result = await curl('curl',[...args,'--data-urlencode',`data=${data}\n`,endpoint],{maxBuffer:30 * 1024 * 1024})
    .then(({stdout})=>JSON.parse(stdout),error=>{throw new Error(error.stderr?.trim() || `curl exit ${error.code}`);});
  if (result.remark || !Array.isArray(result.elements)) throw new Error(result.remark ?? 'Invalid Overpass result');
  return result.elements;
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file,'utf8')); }
  catch(error) { if (fallback!==undefined && error.code==='ENOENT') return fallback; throw error; }
}

async function saveJson(file,value) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary,JSON.stringify(value,null,2)+'\n');
  await rename(temporary,file);
}

async function cachedVenues(jobs, cache, endpoint) {
  const data = overpassVenueQuery(jobs.map(({pin})=>pin));
  const stamp = createHash('sha256').update(data).digest('hex');
  const file = join(cache,`${stamp}.json`);
  const cached = await readJson(file,null);
  if (Array.isArray(cached) && cached.every(item=>typeof item.type==='string')) return cached;
  const choices = endpoint ? [endpoint] : [...(jobs.every(job=>job.country==='CH') ? [swissEndpoint] : []),...overpassEndpoints];
  const errors = [];
  for (const service of choices) {
    try {
      const result = await query(service,data);
      await saveJson(file,result);
      return result;
    } catch(error) { errors.push(`${new URL(service).hostname} ${error.message}`); }
  }
  throw new Error(errors.join(' · '));
}

function stopPin(stop,preset) {
  if (preset && isPoint(preset) && typeof preset.source==='string' && /^https?:\/\//.test(preset.source)) return preset;
  const {latitude:lat,longitude:lon,osm_url,coordinate_source} = stop.hotel;
  if (isPoint({lat,lon}) && (osm_url || coordinate_source)) return {lat,lon,source:osm_url ?? coordinate_source};
}

function usePin(stop,pin) {
  if (pin.hotel) {
    stop.hotel = {name:pin.hotel, name_en:pin.hotel, night_price:{amount:null,source:'سكن مقترح جديد؛ لا يوجد سعر مفحوص له.',
      checked_date:null,estimated:false}, maps:mapPin(pin)};
  } else if (english(stop.hotel.name)) stop.hotel.name_en = stop.hotel.name;
  stop.hotel.latitude=pin.lat;
  stop.hotel.longitude=pin.lon;
  if (osmPin(pin.source)) stop.hotel.osm_url=pin.source;
  else stop.hotel.coordinate_source=pin.source;
  stop.hotel.maps=mapPin(pin);
}

async function main(args) {
  const flags = Object.fromEntries(args.map(argument => {
    const [flag,...parts] = argument.split('=');
    return [flag,parts.join('=')];
  }));
  const input = flags['--input'] || 'lib/plans.json';
  const output = flags['--output'] || input;
  const cache = flags['--cache'] || '/tmp/rihla-osm-venue-cache';
  const endpoint = flags['--endpoint'];
  const batchSize = Math.min(5,Math.max(1,Number(flags['--batch']) || 4));
  const pins = flags['--pins'] ? await readJson(flags['--pins']) : {};
  const chosen = new Set((flags['--ids'] ?? '').split(',').filter(Boolean));
  const plans = await readJson(input);
  await mkdir(cache,{recursive:true});
  const jobs = new Map();
  for (const plan of plans) {
    if (chosen.size && !chosen.has(plan.id)) continue;
    for (const [index,stop] of plan.stops.entries()) {
      // Retain previously fetched records when an endpoint is temporarily unavailable.
      const previous = stop.places;
      stop.places=previous.filter(place=>place.osm_url && isPoint({lat:place.latitude,lon:place.longitude}));
      const pin = stopPin(stop,pins[`${plan.id}:${index}`] ?? (plan.stops.length===1 ? pins[plan.id] : undefined));
      if (!pin) {
        if (!english(stop.hotel.name_en ?? stop.hotel.name)) delete stop.hotel.maps;
        console.log(`${plan.id}:${index} · missing lodging coordinates`);
        continue;
      }
      const samePin = stop.hotel.latitude===pin.lat && stop.hotel.longitude===pin.lon;
      usePin(stop,pin);
      if (Object.hasOwn(flags,'--missing-only') && samePin && stop.places.length) continue;
      const key = `${pin.lat},${pin.lon}`;
      const job = jobs.get(key) ?? {pin,country:stop.country ?? plan.country,stops:[]};
      job.stops.push({plan,stop,index,previous});
      jobs.set(key,job);
    }
  }
  await saveJson(output,plans);
  if (Object.hasOwn(flags,'--pins-only')) return;
  const locations = [...jobs.values()];
  for (let cursor=0; cursor<locations.length; cursor+=batchSize) {
    const group = locations.slice(cursor,cursor+batchSize);
    try {
      const elements = await cachedVenues(group,cache,endpoint);
      for (const {pin,stops} of group) for (const {plan,stop,index,previous} of stops) {
        stop.places=selectOsmVenues(elements,pin,previous);
        if (stop.places.length && !plan.sources.some(source=>source.url==='https://www.openstreetmap.org/copyright')) {
          plan.sources.push({label:'OpenStreetMap · الأماكن حول السكن عبر Overpass',url:'https://www.openstreetmap.org/copyright'});
        }
        console.log(`${plan.id}:${index} · ${stop.places.length} places`);
      }
    } catch(error) {
      console.error(`${group.flatMap(job=>job.stops.map(({plan,index})=>`${plan.id}:${index}`)).join(', ')} · ${error.message}`);
    }
    await saveJson(output,plans);
    await wait(1_000);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) await main(process.argv.slice(2));
