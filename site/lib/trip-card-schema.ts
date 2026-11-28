import {z} from 'zod';

const cardDate = z.string().date();
export const tripCardIdSchema = z.enum(['ayt', 'ist', 'tbs', 'vkl', 'cok', 'goa', 'uzn', 'gbl', 'kzb', 'bus', 'kbv', 'cnx', 'lgk', 'ela']);
const countryId = z.enum(['tr', 'ge', 'in', 'az', 'th', 'my', 'lk']);
const tripCardCostKey = z.enum(['flight', 'milesCash', 'milesCount', 'hotel', 'daily', 'spa', 'taxi', 'visa']);
const money = z.number().min(0).max(1e9);
const countryChecks = z.array(z.number().int().min(0).max(6)).max(7).optional();
const amount = z.object({
  value: money.nullable(),
  source: z.string().max(260),
  checkedOn: cardDate.nullable(),
  estimated: z.boolean(),
  review: z.boolean().optional(),
});
const walk = z.object({
  kind: z.string().max(60),
  description: z.string().max(420),
  query: z.string().min(1).max(180),
  minutes: z.string().max(40),
  car: z.boolean(),
  needsLocation: z.boolean().optional(),
  rating: z.enum(['yes', 'no']).optional(),
});
const tripCard = z.object({
  id: tripCardIdSchema,
  country: countryId,
  city: z.string().max(80),
  neighborhood: z.string().max(160),
  hotel: z.string().max(180),
  hotelNotes: z.string().max(240),
  milesRoute: z.enum(['available', 'unavailable', 'unknown']),
  routeNote: z.string().max(240),
  mode: z.enum(['cash', 'miles']),
  costs: z.object({
    flight: amount,
    milesCash: amount,
    milesCount: amount.refine(cost => cost.value === null || Number.isInteger(cost.value)),
    hotel: amount,
    daily: amount,
    spa: amount,
    taxi: amount,
    visa: amount,
  }),
  walk: z.array(walk).min(4).max(12),
  checklist: z.array(z.object({text: z.string().max(260), done: z.boolean()})).min(1).max(12),
  events: z.string().max(600),
  post: z.object({
    actual: money.optional(),
    estimate: z.number().min(0).max(1e11).optional(),
    incomplete: z.boolean().optional(),
    returnAgain: z.enum(['yes', 'no']).optional(),
  }),
});
const group = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(48),
  name: z.string().min(1).max(80),
  start: cardDate,
  end: cardDate,
  historical: z.boolean(),
  trips: z.array(tripCard).min(2).max(3),
}).refine(g => {
  const days = (Date.parse(g.end) - Date.parse(g.start)) / 86_400_000;
  return days >= 0 && days < 30 && new Set(g.trips.map(t => t.id)).size === g.trips.length;
});
export const maxTripCardGroups = 103;

export const tripCardsSchema = z.object({
  budget: money.positive(),
  groups: z.array(group).min(2).max(maxTripCardGroups).refine(groups => new Set(groups.map(g => g.id)).size === groups.length),
  countryDone: z.object({tr:countryChecks, ge:countryChecks, in:countryChecks, az:countryChecks, th:countryChecks, my:countryChecks, lk:countryChecks}),
});
export const tripCardSummarySchema = z.string().min(1).max(40000);

export type TripCards = z.infer<typeof tripCardsSchema>;
export type TripCardGroup = z.infer<typeof group>;
export type TripCard = z.infer<typeof tripCard>;
export type TripCardCost = z.infer<typeof amount>;
export type TripCardCostKey = z.infer<typeof tripCardCostKey>;
