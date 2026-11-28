import {z} from 'zod';

export const readyPlanTypeSchema = z.enum(['relax','nature','city','sea','multi']);
export const readyCategorySchema = z.enum(['breakfast','lunch','coffee','dinner','spa','nature','landmarks','shopping']);
const countryCode = z.string().regex(/^[A-Z]{2}$/);
export const readyMonthSchema = z.number().int().min(1).max(12);
export const readyNightSchema = z.number().int().min(1).max(29);
export const readyBudgetSchema = z.number().positive().max(1_000_000_000);
export const readyDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().startsWith(value);
});
const description = z.string().min(1).max(1200);
const name = z.string().min(1).max(200);
const webUrl = z.string().max(2000).url().refine(value => {
  try {
    const url = new URL(value);
    return ['https:','http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
});
const minutes = z.number().min(0).max(1440).nullable();
const hours = z.number().min(0).max(168).nullable();
const coordinates = {
  latitude:z.number().min(-90).max(90).optional(),
  longitude:z.number().min(-180).max(180).optional(),
};
const osmUrl = webUrl.refine(value => /^https:\/\/(?:www\.)?openstreetmap\.org\/(?:node|way|relation)\/\d+\/?$/.test(value));

export const readyPriceSchema = z.object({
  amount:z.number().min(0).max(1_000_000_000).nullable(),
  source:description,
  checked_date:readyDateSchema.nullable(),
  estimated:z.boolean(),
  url:webUrl.optional(),
  label:name.optional(),
});
const stopSchema = z.object({
  city:name,
  nights:readyNightSchema,
  country:countryCode.optional(),
  base_area:name,
  summary:description,
  image_key:name.optional(),
  hotel:z.object({name,night_price:readyPriceSchema,maps:webUrl.optional(),name_en:name.optional(),...coordinates,
    osm_url:osmUrl.optional(),coordinate_source:webUrl.optional()}),
  places:z.array(z.object({name,category:readyCategorySchema,walk_minutes:minutes,travel_minutes:minutes.optional(),
    price_note:description,price:readyPriceSchema.optional(),maps:webUrl,name_en:name.optional(),...coordinates,
    osm_url:osmUrl.optional(),distance_meters:z.number().min(0).max(5000).optional()})).max(40),
  day_plan:z.array(z.object({morning:description,noon:description,evening:description,rest:z.boolean().optional()})).min(1).max(29),
});

export const readyPlanSchema = z.object({
  id:z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  title:name,
  country:countryCode,
  countries:z.array(countryCode).min(1).max(10).optional(),
  type:z.array(readyPlanTypeSchema).min(1).max(5),
  months_best:z.array(readyMonthSchema).max(12),
  months_ok:z.array(readyMonthSchema).max(12),
  arrival_hours:hours,
  arrival_note:description.optional(),
  stops:z.array(stopSchema).min(1).max(12),
  transfers:z.array(z.object({from:name,to:name,mode:name,hours,price:readyPriceSchema})).max(20),
  cost_estimate:z.object({flight:readyPriceSchema,daily:readyPriceSchema,extras:z.array(readyPriceSchema).max(20).optional()}),
  checked_date:readyDateSchema.nullable(),
  sources:z.array(z.object({label:description,url:webUrl.optional()})).min(1).max(30),
}).refine(plan => plan.stops.reduce((nights,stop) => nights + stop.nights,0) <= 29, {path:['stops'],message:'مدة الخطة تتجاوز ٣٠ يومًا'});

export type ReadyPlan = z.infer<typeof readyPlanSchema>;
export type ReadyPrice = z.infer<typeof readyPriceSchema>;
export type ReadyPlanType = z.infer<typeof readyPlanTypeSchema>;
export type ReadyCategory = z.infer<typeof readyCategorySchema>;
