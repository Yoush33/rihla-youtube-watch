import snapshot from '../data/youtube-candidates.json';
import {videosImportSchema,type YoutubeSnapshot} from './catalog-import-schema';
import {videoIdPattern, type YoutubeReviews, type YoutubeStatus} from './youtube-watch-schema';

const displayNames: Record<string,string> = {
  ayt:'أنطاليا', ist:'إسطنبول', tbs:'تبليسي', vkl:'فاركالا', cok:'كوتشي', goa:'غوا',
  uzn:'أوزنجول', gbl:'غابالا', kzb:'كازبيغي', bus:'باتومي', kbv:'كرابي', cnx:'شيانغ ماي', lgk:'لنكاوي', ela:'إيلا',
  baku:'باكو', bih:'البوسنة', mne:'الجبل الأسود', kul:'ماليزيا', th:'تايلند', lk:'سريلانكا', ma:'المغرب',
};
const cityAliases = {
  ayt:['Antalya'], ist:['Istanbul','إستانبول'], tbs:['Tbilisi','تبيليسي'], vkl:['Varkala','فاركلا'],
  cok:['Kochi','Cochin','كوشي'], goa:['Goa'], uzn:['Uzungöl','أوزونغول','أوزونجول'],
  gbl:['Gabala','Qabala','Qəbələ','قبالا','قبالة'], kzb:['Kazbegi','Stepantsminda','كازبيك','كازبيجي','ستيبانتسميندا'],
  bus:['Batumi'], kbv:['Krabi'], cnx:['Chiang Mai','تشيانغ ماي','تشانغ ماي'],
  lgk:['Langkawi','لانكاوي'], ela:['Ella'],
};
const countryDestinations: Record<string,string[]> = {
  TR:['ayt','ist','uzn'], GE:['tbs','kzb','bus'], IN:['vkl','cok','goa'], AZ:['baku','gbl'], BA:['bih'],
  ME:['mne'], MY:['kul','lgk'], TH:['th','kbv','cnx'], LK:['lk','ela'], MA:['ma'],
};
export const youtubeSnapshotDate = snapshot.updated;
export const countryYoutubeDestinations = (code:string) => countryDestinations[code.toUpperCase()] ?? [];
export const youtubeDestinationName = (id:string) => displayNames[id] ?? id;

function nameText(value:string) {
  return ' ' + value.normalize('NFKD').toLowerCase().replace(/[\p{M}ـ]/gu,'').replace(/ى/g,'ي')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim() + ' ';
}

const destinationNames = Object.fromEntries(Object.entries(cityAliases).map(([id, aliases]) =>
  [id,[displayNames[id],...aliases].map(nameText)]));

export function youtubeDescriptionDestinations(description:string) {
  const text = nameText(description);
  return Object.keys(destinationNames).filter(id => destinationNames[id].some(name => text.includes(name)));
}

const bundledVideos = videosImportSchema.parse(snapshot).videos;
const statusOrder:Record<YoutubeStatus,number> = {'ينفع':0,'مرشح للمراجعة':1,'ما ينفع':2};

type YoutubeVideo = YoutubeSnapshot['videos'][number];
export type YoutubeCandidate = Omit<YoutubeVideo,'status'|'duration_seconds'> & {status:YoutubeStatus;duration_seconds:number|null};
export type YoutubeScope = {kind:'destination';id:string} | {kind:'country';code:string};
export const youtubeCoverageTargets = {destination:5,country:2} as const;

function matchesDestinations(video:YoutubeVideo,destinations:readonly string[],requireDestinationName:boolean) {
  if (!requireDestinationName) return video.destinations.some(id=>destinations.includes(id));
  const title = nameText(video.title);
  return destinations.some(id=>video.descriptionDestinations?.includes(id) || destinationNames[id]?.some(name=>title.includes(name)));
}

function matchingVideos(matches:(video:YoutubeVideo)=>boolean,reviews:YoutubeReviews,source:readonly YoutubeVideo[]) {
  const unique = new Map<string,YoutubeCandidate>();
  for (const video of source) {
    const {video_id:id} = video;
    if (!videoIdPattern.test(id) || unique.has(id) || !matches(video)) continue;
    const status = Object.hasOwn(reviews,id) ? reviews[id] : video.status === 'مستبعد تلقائيًا' ? 'ما ينفع' : video.status;
    unique.set(id,{...video,status,duration_seconds:video.duration_seconds ?? null});
  }
  return [...unique.values()].sort((a,b)=>statusOrder[a.status]-statusOrder[b.status] || b.published.localeCompare(a.published));
}

export function youtubeForDestinations(destinations:readonly string[],reviews:YoutubeReviews = {},source?:YoutubeSnapshot,
  requireDestinationName = false) {
  return matchingVideos(video=>matchesDestinations(video,destinations,requireDestinationName),reviews,source?.videos ?? bundledVideos)
    .filter(video=>video.status !== 'ما ينفع');
}

function mergeSameVideo(preferred:YoutubeVideo,fallback:YoutubeVideo):YoutubeVideo {
  const sources = [preferred,fallback];
  const summary = sources.find(video=>video.summary_ar && video.summary_basis && video.summary_source) ??
    sources.find(video=>video.summary_ar);
  return {...preferred,
    title_ar:preferred.title_ar || fallback.title_ar,
    destinations:preferred.destinations.length ? preferred.destinations : fallback.destinations,
    descriptionDestinations:preferred.descriptionDestinations ?? fallback.descriptionDestinations,
    countries:preferred.countries ?? fallback.countries,
    duration_seconds:preferred.duration_seconds ?? fallback.duration_seconds,
    tips_ar:preferred.tips_ar ?? fallback.tips_ar,
    about_destination:preferred.about_destination ?? fallback.about_destination,
    summary_ar:summary?.summary_ar,summary_basis:summary?.summary_basis,summary_source:summary?.summary_source,
  };
}

function coverageVideos(source?:YoutubeSnapshot) {
  if (!source) return bundledVideos;
  const importNewer = source.updated > youtubeSnapshotDate;
  const videos = new Map(bundledVideos.map(video=>[video.video_id,video]));
  for (const imported of source.videos) {
    const known = videos.get(imported.video_id);
    videos.set(imported.video_id,known ? (importNewer ? mergeSameVideo(imported,known) : mergeSameVideo(known,imported)) : imported);
  }
  return [...videos.values()];
}

export function youtubeCoverage(scope:YoutubeScope,reviews:YoutubeReviews = {},source?:YoutubeSnapshot) {
  const code = scope.kind === 'country' ? scope.code.toUpperCase() : '';
  const destinations = scope.kind === 'destination' ? [scope.id] :
    [...countryYoutubeDestinations(code),code.toLowerCase(),'country-'+code.toLowerCase()];
  const videos = matchingVideos(video=>scope.kind === 'destination' ? matchesDestinations(video,destinations,true) :
    video.countries?.includes(code) || matchesDestinations(video,destinations,false),reviews,coverageVideos(source));
  const updated = source && source.updated > youtubeSnapshotDate ? source.updated : youtubeSnapshotDate;
  const counts = {total:videos.length,useful:0,pending:0,rejected:0,durationKnown:0,durationSeconds:0};
  for (const video of videos) {
    if (video.status === 'ينفع') counts.useful++;
    else if (video.status === 'ما ينفع') counts.rejected++;
    else counts.pending++;
    if (video.duration_seconds !== null) {
      counts.durationKnown++;
      counts.durationSeconds += video.duration_seconds;
    }
  }
  return {videos,counts,target:youtubeCoverageTargets[scope.kind],updated};
}

export type OnYoutubeReview = (id:string,status:YoutubeStatus) => boolean;

type Tip = NonNullable<YoutubeVideo['tips_ar']>['tips'][number];
type NamedPlace = {name:string;name_en?:string};
export type YoutubeTipCity = {city:string;country:string;places?:readonly NamedPlace[]};
export type YoutubeTravelTip = Tip & {videoId:string;channel:string;seconds:number};

const featuredTipTypes = new Set<Tip['type']>(['أكل','مساج','طبيعة','سكن','سعر']);

export function featuredYoutubeTips(tips:readonly YoutubeTravelTip[]) {
  const limit = 5;
  const warnings = tips.filter(tip=>tip.type === 'تحذير');
  const reservedWarnings = Math.min(2,warnings.length);
  const firstOfType = new Map<Tip['type'],YoutubeTravelTip>();
  const repeated:YoutubeTravelTip[] = [];
  for (const tip of tips) {
    if (!featuredTipTypes.has(tip.type)) continue;
    if (firstOfType.has(tip.type)) repeated.push(tip);
    else firstOfType.set(tip.type,tip);
  }
  const recommendations = [...firstOfType.values(),...repeated].slice(0,limit-reservedWarnings);
  return [...warnings.slice(0,limit-recommendations.length),...recommendations];
}

const tipCityNames:Record<string,string[]> = {
  ...destinationNames,
  baku:['باكو','Baku'].map(nameText),
  kul:['كوالالمبور','كوالا لمبور','Kuala Lumpur'].map(nameText),
};

function placeNames(value:string) {
  const primary = value.split(/\s+[–—-]\s+/u)[0];
  return [value,primary,...primary.split(/[()]/u)].map(nameText).filter(name=>name.trim());
}

export function tipMatchesPlace(tip:YoutubeTravelTip,place:NamedPlace) {
  if (!tip.place) return false;
  const aliases = [...placeNames(place.name),...placeNames(place.name_en ?? '')];
  return placeNames(tip.place).some(name=>aliases.includes(name));
}

export function youtubeTravelTips(cities:readonly YoutubeTipCity[],reviews:YoutubeReviews = {},source?:YoutubeSnapshot) {
  if (!cities.length) return [];
  const videos = coverageVideos(source).filter(video => video.tips_ar?.tips.length &&
    video.about_destination !== false && video.tips_ar.about_destination !== false);
  const byVideo = new Map<string,YoutubeTravelTip[]>();
  for (const scope of cities) {
    const code = scope.country.toUpperCase();
    const countryTags = [...countryYoutubeDestinations(code),code.toLowerCase(),'country-'+code.toLowerCase()];
    const city = nameText(scope.city);
    const id = countryTags.find(tag=>tipCityNames[tag]?.includes(city));
    const names = id ? tipCityNames[id] : [city];
    const otherCities = Object.entries(tipCityNames).filter(([tag])=>tag!==id).flatMap(([,aliases])=>aliases);
    const includesName = (value:string, candidates:string[]) => candidates.some(name=>name.trim() && value.includes(name));

    for (const video of matchingVideos(video=>video.countries?.includes(code) || matchesDestinations(video,countryTags,false),reviews,videos)) {
      const extracted = video.tips_ar;
      if (video.status === 'ما ينفع' || !extracted) continue;
      const title = nameText(video.title);
      const summary = nameText(extracted.summary ?? '');
      const ownTitle = includesName(title,names);
      const otherTitle = includesName(title,otherCities);
      const ownSummary = id && video.destinations.includes(id) && includesName(summary,names);
      const exclusivelyTagged = id && id !== 'kul' && video.destinations.includes(id) &&
        !video.destinations.some(tag=>tag!==id && tipCityNames[tag]);
      const cityVideo = ownTitle ? !otherTitle : !otherTitle && !includesName(summary,otherCities) &&
        (ownSummary || exclusivelyTagged);

      for (const tip of extracted.tips) {
        const seconds = tip.at.split(':').reduce((total,part)=>total * 60 + Number(part),0);
        const row = {...tip,seconds,videoId:video.video_id,channel:video.channel};
        const place = nameText(tip.place ?? '');
        const matchedVenue = scope.places?.some(venue=>tipMatchesPlace(row,venue));
        if (!matchedVenue && !includesName(place,names) &&
          (!cityVideo || includesName(place,otherCities))) continue;
        const group = byVideo.get(video.video_id) ?? [];
        group.push(row);
        byVideo.set(video.video_id,group);
      }
    }
  }

  // Round-robin within each priority so one long video does not occupy every slot.
  const selected = new Map<string,YoutubeTravelTip>();
  for (const warnings of [true,false]) {
    const groups = [...byVideo.values()].map(tips=>tips.filter(tip=>(tip.type === 'تحذير') === warnings));
    const length = Math.max(0,...groups.map(group=>group.length));
    for (let index=0; index<length; index++) {
      for (const group of groups) {
        const tip = group[index];
        if (!tip) continue;
        const key = nameText(tip.tip);
        if (!selected.has(key)) selected.set(key,tip);
      }
    }
  }
  return [...selected.values()];
}
