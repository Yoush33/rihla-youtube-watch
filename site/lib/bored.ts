import {countryPackage} from './country-package';
import type {CountryCatalog} from './country-catalog';
import {initialTripCards,tripCardsWithDefaults} from './trip-card-data';
import {newDestinations} from './trip-card-destinations';
import {costForTripDays, costNeedsReview, selectTripCardQuote} from './trip-card';
import type {TripCard, TripCards} from './trip-card-schema';
import type {BoredSettings, BoredType} from './bored-schema';
import {isDestinationExcluded,type DestinationExclusion} from './destination-exclusions';

type DestinationProfile = {
  hours: number;
  types: BoredType[];
  best: number[];
  ok: number[];
  why: string[];
  cautions: string[];
};

export const boredTypes: Record<BoredType, string> = {relax:'استجمام', nature:'طبيعة', city:'مدينة', sea:'بحر'};

// Season and journey-time estimates from the supplied prototype. Quotes and
// personal edits come from the same saved cards used in the comparison tab.
const catalog: Partial<Record<TripCard['id'], DestinationProfile>> = {
  ayt: {
    hours:6.5, types:['relax','sea','nature'], best:[4,5,6,9,10,11], ok:[3,12],
    why:['كاليتشي تجمع البلدة القديمة والساحل.'],
    cautions:['خيار الطيران المسجل فيه توقف في إسطنبول.'],
  },
  ist: {
    hours:5.5, types:['city','sea'], best:[4,5,6,9,10], ok:[3,7,8,11,12],
    why:['أورتاكوي على البوسفور، وخيار الطيران المسجل مباشر.'],
    cautions:['حمّام كاراكوي يحتاج تاكسي.'],
  },
  tbs: {
    hours:8, types:['city','relax'], best:[5,6,9,10], ok:[4,7,8,11],
    why:['حمّامات الكبريت قريبة من السكن في أبانوتوباني.'],
    cautions:['خيار الطيران المسجل فيه توقف. راجع وثيقة التأمين في دليل جورجيا.'],
  },
  vkl: {
    hours:9.5, types:['relax','sea','nature'], best:[11,12,1,2,3], ok:[10],
    why:['ممشى الجرف وخيارات الأيورفيدا والمطاعم حول السكن.'],
    cautions:['شيّك على التأشيرة الإلكترونية وتعليمات السباحة المحلية قبل السفر.'],
  },
  cok: {
    hours:15, types:['city'], best:[11,12,1,2], ok:[3,10],
    why:['جو تاون فيها مقاهي وأسواق ومطاعم.'],
    cautions:['خيار الطيران المسجل فيه انتظار طويل، والشاطئ بعيد نسبيًا عن السكن.'],
  },
  goa: {
    hours:17, types:['sea','relax'], best:[11,12,1,2,3], ok:[10],
    why:['السكن المسجل قريب من شاطئ بالوليم.'],
    cautions:['خيار الطيران المسجل نحو ١٤ ساعة، ومطار موبا يبعد نحو ٣ ساعات عن السكن.'],
  },
};

for (const destination of newDestinations) catalog[destination.id] = destination;

const seededCards = initialTripCards.groups.flatMap(group => group.trips.map(trip => ({group,trip})));

export const defaultBoredSettings: BoredSettings = {types:['relax'], days:4, budget:5000, month:12, miles:false};

export function boredTravelMonth(month: number, today: string) {
  const year = Number(today.slice(0,4)) + Number(month < Number(today.slice(5,7)));
  return year + '-' + String(month).padStart(2, '0');
}

type BoredRank = {tier:number; score:number};
export function compareBoredRanks(a: BoredRank, b: BoredRank) {
  return b.tier - a.tier || b.score - a.score;
}

export function boredResults(cards: TripCards, settings: BoredSettings, today: string,catalogData?: CountryCatalog,
  exclusions?: readonly DestinationExclusion[]) {
  const travelMonth = settings.departure && Number(settings.departure.slice(5,7)) === settings.month
    ? settings.departure.slice(0,7) : boredTravelMonth(settings.month, today);
  const nights = settings.days - 1;
  // The December price check covers four nights. The original four-day selection also uses that check.
  const outsideQuotePeriod = settings.month !== 12 || (nights !== 4 && settings.days !== 4);
  const groups = tripCardsWithDefaults(cards).groups;
  const candidates = [];
  const excluded = [];

  for (const seed of seededCards) {
    const original = seed.trip;
    if (isDestinationExcluded(original,exclusions)) continue;
    const profile = catalog[original.id];
    if (!profile) continue;
    const matching = settings.types.filter(type => profile.types.includes(type));
    const season = profile.best.includes(settings.month) ? 2 : profile.ok.includes(settings.month) ? 1 : 0;
    const country = countryPackage(original.country,catalogData)?.name_ar ?? original.country.toUpperCase();
    if (!matching.length || !season) {
      excluded.push({city:original.city, type:!matching.length, season:!season});
      continue;
    }

    const {group,trip} = selectTripCardQuote(groups,original.id,settings.days,travelMonth) ?? seed;

    const useMiles = settings.miles && trip.milesRoute === 'available' && trip.costs.milesCash.value !== null;
    const estimate = costForTripDays(trip, settings.days, useMiles ? 'miles' : 'cash');
    const over = estimate.total > settings.budget;
    const tier = estimate.partial ? 0 : over ? 1 : 2;
    const walk = ['فطور','طبيعة','مساج','عشاء'].every(kind =>
      trip.walk.some(place => place.kind.split(' · ')[0] === kind && !place.car && !place.needsLocation)
    );
    const travelPenalty = Math.max(0, profile.hours - 8) * (settings.days <= 4 ? 25 : 12);
    const routeScore = (walk ? 40 : 0) - travelPenalty;
    const withinBudgetPoints = !estimate.partial && !over ? 1000 : 0;
    const costPenalty = estimate.partial ? 0 : estimate.total / 100;
    const score = withinBudgetPoints + matching.length * 100 + season * 60 + routeScore - costPenalty;
    const offMonth = !group.start.startsWith(travelMonth) || !group.end.startsWith(travelMonth);
    const quotesNeedReview = estimate.rows.some(({key, cost}) =>
      (key === 'flight' || key === 'milesCash' || key === 'hotel' || (key === 'spa' && cost.checkedOn)) &&
      costNeedsReview(key, cost, today)
    );

    candidates.push({
      trip, group, country, profile, matching, season, estimate, tier, over, walk, offMonth, outsideQuotePeriod,
      routeScore, score, quotesNeedReview, useMiles,
    });
  }

  candidates.sort(compareBoredRanks);
  return {candidates, excluded, travelMonth};
}

export type BoredResult = ReturnType<typeof boredResults>['candidates'][number];
