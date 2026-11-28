import {readFile, rename, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {countryPreferredTitles, destinationQueries, placeQueries, weatherPreferredTitles} from './place-image-queries.mjs';
import {cityPlaceQueries} from './place-image-city-queries.mjs';

const api = 'https://commons.wikimedia.org/w/api.php';
const headers = {'User-Agent':'RihlaTravelGuide/1.0 (https://rihla-travel-companion.yoush3.chatgpt.site)'};
const imageProperties = {
  action:'query', format:'json', formatversion:'2', maxlag:'5', prop:'imageinfo',
  iiprop:'url|size|extmetadata', iiurlwidth:'960',
  iiextmetadatafilter:'Artist|License|LicenseShortName|LicenseUrl|UsageTerms|ObjectName|Restrictions',
};
const disallowedSubjects = /\b(?:flags?|coats? of arms|locator|maps?|floor ?plans?|drawings?|illustrations?|portraits?|headshots?|logos?|satellite|aster|diagrams?|posters?|paintings?|watercolou?rs?|visual art|lego|iss\d\w*|esa\d\w*|astronaut|petroglyphs?|meeting of the president|landmark[\w -]*hotel|cannabis walk)\b/i;
const acceptedLicenses = /^(?:Public domain|CC0(?: 1\.0)?|CC BY(?:-SA)? \d(?:\.\d)?(?: [A-Z]{2,3})?)$/i;
const entities = {amp:'&', quot:'"', apos:"'", lt:'<', gt:'>', nbsp:' ', mdash:'—', ndash:'–'};
const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve,milliseconds));

let nextApiStart = 0;
let nextImageStart = 0;
const verifiedImages = new Map();

function text(value = '') {
  return value.replace(/<br\s*\/?>/gi,' ')
    .replace(/<[^>]*>/g,'')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi,(entity,name) => {
      if (name[0] !== '#') return entities[name] ?? entity;
      const number = name[1].toLowerCase() === 'x' ? Number.parseInt(name.slice(2),16) : Number(name.slice(1));
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
    }).replace(/\s+/g,' ').trim();
}

function authorName(value = '') {
  const beforeTemplate = text(value.split(/<table[\s>]/i)[0]);
  if (beforeTemplate) return beforeTemplate;
  const user = value.match(/<a\b[^>]*title="User:[^"<>]+"[^>]*>([\s\S]*?)<\/a>/i);
  return text(user?.[1]);
}

async function request(url, method = 'GET') {
  for (let attempt = 0; attempt < 3; attempt++) {
    const isApi = url.hostname === 'commons.wikimedia.org';
    const start = Math.max(Date.now(),isApi ? nextApiStart : nextImageStart);
    if (isApi) nextApiStart = start + 600;
    else nextImageStart = start + 400;
    await sleep(Math.max(0,start - Date.now()));
    const response = await fetch(url,{headers,method,signal:AbortSignal.timeout(18000)});
    if (![429,500,502,503,504].includes(response.status) || attempt === 2) return response;
    const header = response.headers.get('retry-after') ?? '0';
    const seconds = Number(header);
    const retryDelay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
    await response.body?.cancel();
    await sleep(Math.max(Number.isFinite(retryDelay) ? retryDelay : 0, 1000 * (attempt + 1)));
  }
}

async function commons(parameters) {
  const url = new URL(api);
  url.search = new URLSearchParams({...imageProperties,...parameters});
  const response = await request(url);
  if (!response.ok) throw new Error(`Commons API HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`Commons API ${body.error.code}: ${body.error.info}`);
  return body.query?.pages ?? [];
}

function metadata(page) {
  const info = page.imageinfo?.[0];
  if (!info || info.width < 1.2 * info.height || info.thumbwidth !== 960) return;
  if (!/\.(?:jpe?g|webp|png)$/i.test(page.title)) return;
  const detail = info.extmetadata ?? {};
  if (detail.Restrictions?.value || disallowedSubjects.test(`${page.title} ${text(detail.ObjectName?.value)}`)) return;
  const license = text(detail.LicenseShortName?.value || detail.UsageTerms?.value);
  const author = authorName(detail.Artist?.value);
  if (!author || !acceptedLicenses.test(license)) return;
  const imageUrl = new URL(info.thumburl);
  if (imageUrl.protocol !== 'https:' || !['thumb.wikimedia.org','upload.wikimedia.org'].includes(imageUrl.hostname) ||
      !imageUrl.pathname.split('/').at(-1).startsWith('960px-')) return;
  if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/u.test(info.descriptionurl ?? '')) return;
  imageUrl.search = '';
  const attribution = {url:imageUrl.href, author, license, page:info.descriptionurl};
  const licenseUrl = detail.LicenseUrl?.value;
  if (typeof licenseUrl === 'string' && /^https?:\/\//i.test(licenseUrl)) attribution.licenseUrl = licenseUrl.replace(/^http:/i,'https:');
  return attribution;
}

export async function verifyPlaceImage(image) {
  const url = new URL(image.url);
  if (!verifiedImages.has(url.href)) {
    verifiedImages.set(url.href,request(url,'HEAD').then(response =>
      response.ok && /^image\/(?:jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') ?? '')).catch(() => false));
  }
  return verifiedImages.get(url.href);
}

async function firstUsable(pages, exclude = new Set()) {
  for (const page of pages) {
    const image = metadata(page);
    if (image && !exclude.has(image.page) && await verifyPlaceImage(image)) return image;
  }
}

export async function getPlaceImage(englishName, {preferredTitle, terms = [], preferTerms = false, onlyPreferred = false, exclude = new Set()} = {}) {
  if (preferredTitle) {
    const file = preferredTitle.startsWith('File:') ? preferredTitle : `File:${preferredTitle}`;
    const exact = await firstUsable(await commons({titles:file,redirects:'1'}),exclude);
    if (exact) return exact;
  }
  if (onlyPreferred) return;
  const landmark = `${englishName} landmark`;
  const searches = [...new Set(preferTerms ? [...terms,landmark,englishName] : [landmark,...terms,englishName])];
  for (const query of searches) {
    const pages = await commons({generator:'search',gsrnamespace:'6',gsrlimit:'10',gsrsearch:`${query} filetype:bitmap`});
    const image = await firstUsable(pages.sort((a,b) => a.index - b.index),exclude);
    if (image) return image;
  }
}

async function jsonFile(path) {
  return JSON.parse(await readFile(path,'utf8'));
}

async function updateImages(kind, rows, requestedKeys, refresh) {
  const file = new URL(`../lib/place-images-${kind}.json`,import.meta.url);
  const existing = await jsonFile(file).catch(error => {
    if (error.code === 'ENOENT') return {};
    throw error;
  });
  const images = {...existing};
  const work = rows.filter(([key]) => (!requestedKeys.length || requestedKeys.includes(key)) && (refresh || !images[key]));
  let cursor = 0;
  const workers = Array.from({length:3},async () => {
    while (cursor < work.length) {
      const [key,name,options] = work[cursor++];
      try {
        const image = await getPlaceImage(name,options);
        if (image) {
          images[key] = options.author ? {...image,author:options.author} : image;
          process.stdout.write(`${kind} ${key} ${image.page}\n`);
        } else {
          delete images[key];
          process.stderr.write(`${kind} ${key}: no eligible image\n`);
        }
      } catch (error) {
        process.stderr.write(`${kind} ${key}: ${error.message}\n`);
      }
    }
  });
  await Promise.all(workers);
  const ordered = Object.fromEntries(rows.filter(([key]) => images[key]).map(([key]) => [key,images[key]]));
  const pendingFile = new URL(`${file.href}.${process.pid}.tmp`);
  await writeFile(pendingFile,JSON.stringify(ordered,null,2)+'\n');
  await rename(pendingFile,file);
  process.stdout.write(`${kind}: ${Object.keys(ordered).length}/${rows.length} images\n`);
}

async function main() {
  const [kind = 'all',...flags] = process.argv.slice(2);
  const refresh = flags.includes('--refresh');
  const requestedKeys = flags.filter(flag => flag !== '--refresh');
  const catalog = await jsonFile(new URL('../lib/country-catalog.json',import.meta.url));
  const countries = catalog.map(({iso2,name_en}) => [iso2,name_en,{
    preferredTitle:countryPreferredTitles[iso2], terms:[placeQueries[iso2]?.[0]].filter(Boolean), preferTerms:true,
  }]);
  const weather = catalog.map(({iso2,weather}) => [weather.city,placeQueries[iso2]?.[1] ?? weather.city,{
    preferredTitle:weatherPreferredTitles[iso2], terms:[placeQueries[iso2]?.[2]].filter(Boolean), preferTerms:true,
  }]);
  const destinations = Object.entries(destinationQueries).map(([id,[name,preferredTitle,hint]]) => [id,name,{preferredTitle,terms:[hint]}]);
  const cities = Object.entries(cityPlaceQueries).map(([key,[name,preferredTitle,author]]) =>
    [key,name,{preferredTitle,author,onlyPreferred:true}]);
  const groups = {destinations,countries,weather,cities};
  if (kind !== 'all' && !Object.hasOwn(groups,kind)) throw new Error('Pass all, destinations, countries, weather or cities.');
  for (const group of kind === 'all' ? Object.keys(groups) : [kind]) {
    await updateImages(group,groups[group],requestedKeys,refresh);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
