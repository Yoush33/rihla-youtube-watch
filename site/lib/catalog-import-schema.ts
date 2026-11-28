import {z} from 'zod';
import {videoIdPattern,youtubeStatus} from './youtube-watch-schema';

const text = z.string().trim().min(1).max(500);
const date = z.string().date();
const countryCode = z.string().regex(/^[A-Z]{2}$/);
const unique = (values: string[]) => new Set(values).size === values.length;
const officialUrl = z.string().max(1200).refine(value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
});
const summaryPoints = z.preprocess(value => {
  if (value === null || (Array.isArray(value) && value.length === 0)) return undefined;
  if (typeof value !== 'string') return value;
  const points = value.split(/\r?\n/).map(line=>line.trim().replace(/^(?:[-•*]\s*|[0-9٠-٩۰-۹]+[.)-]\s*)/u,'')).filter(Boolean);
  return points.length ? points : undefined;
},z.array(text).min(1).max(5).refine(unique).optional());

const videoTip = z.object({
  type:z.enum(['أكل','سكن','مساج','طبيعة','تنقل','سعر','تحذير','عام']),
  tip:z.string().trim().min(1).max(1500),
  place:z.string().trim().max(300).nullish(),
  price:z.union([z.string().trim().max(300),z.number().finite()]).nullish(),
  at:z.string().trim().regex(/^(?:\d{1,2}:[0-5]\d|\d{1,4}):[0-5]\d$/),
});

const videoTips = z.object({
  about_destination:z.boolean().optional(),
  summary:z.string().trim().max(3000).optional().catch(undefined),
  verdict:z.string().trim().max(1500).optional().catch(undefined),
  // A malformed tip must not discard valid tips or the video's metadata.
  tips:z.array(z.unknown()).max(100).transform(rows => rows.flatMap(row => {
    const parsed = videoTip.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  })),
});

const sourcedStrings = z.object({value:z.array(text).max(40),source:text});
const weatherMonth = z.object({
  month:z.number().int().min(1).max(12), name:text,
  tmax:z.number().min(-90).max(65), tmin:z.number().min(-100).max(65),
  rain_mm:z.number().min(0).max(10000),
  fit:z.enum(['ممتاز','مقبول','غير مناسب']),
}).refine(month => month.tmin <= month.tmax);

const country = z.object({
  iso2:countryCode, name_ar:text, region_rihla:text, updated:date,
  static:z.object({
    capital:sourcedStrings, currencies:sourcedStrings, languages:sourcedStrings,
    calling_code:z.object({value:text.nullable(),source:text}),
  }),
  visa_saudi_passport:z.object({
    value:text, source:text, checked:date, status:text, official:officialUrl.nullable(),
  }),
  public_holidays:z.object({
    value:z.array(z.object({date,name:text})).max(250),source:text,checked:date,
  }),
  weather:z.object({
    city:text, lat:z.number().min(-90).max(90), lon:z.number().min(-180).max(180),
    source:text, months:z.array(weatherMonth).max(12).refine(rows => unique(rows.map(row=>String(row.month)))),
  }),
  manual:z.array(z.object({
    topic:text, value:z.string().trim().min(1).max(1700), source:text, checked:date,
    status:text, url:officialUrl.optional(),
  })).max(30),
});

const combo = z.object({
  id:z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/), name:text, countries:z.array(countryCode).min(1).max(12).refine(unique),
  days:z.string().regex(/^([1-9]|[12][0-9]|30)(?:[–-]([1-9]|[12][0-9]|30))?$/).refine(value => {
    const [min,max = min] = value.split(/[–-]/).map(Number);
    return max >= min;
  }),
  route:z.array(text).min(1).max(30), links:z.array(text).max(30),
  fly:text, best:z.array(text).max(12), watch:text,
});

const video = z.object({
  video_id:z.string().regex(videoIdPattern), title:text, title_ar:z.string().trim().max(500).optional(),
  published:date, channel:text,
  destinations:z.array(z.string().regex(/^[a-z][a-z0-9-]{0,31}$/)).max(40),
  descriptionDestinations:z.array(z.string().regex(/^[a-z][a-z0-9-]{0,31}$/)).max(40).optional(),
  countries:z.array(countryCode).max(70).refine(unique).optional(),
  minutes:z.number().positive().max(1440).nullable().optional(),
  duration_seconds:z.number().int().min(1).max(86400).nullable().optional(),
  summary_ar:summaryPoints,
  summary_basis:z.enum(['description','frame','transcript','visual']).optional(),
  summary_source:officialUrl.optional(),
  tips_ar:videoTips.nullish().catch(undefined),
  about_destination:z.boolean().optional(),
  status:youtubeStatus.or(z.literal('مستبعد تلقائيًا')),
}).transform(({minutes,...video}) => {
  if (minutes !== undefined && minutes !== null) {
    video.duration_seconds = Math.max(1,Math.round(minutes * 60));
  }
  return video;
});

export const countriesImportSchema = z.array(country).min(1).max(250).refine(rows => unique(rows.map(row=>row.iso2)));
export const combosImportSchema = z.array(combo).max(200).refine(rows => unique(rows.map(row=>row.id)));
export const videosImportSchema = z.object({
  updated:date,
  videos:z.array(video).max(5000).refine(rows => unique(rows.map(row=>row.video_id))),
});

export const catalogImportsSchema = z.object({
  countries:countriesImportSchema.optional(), combos:combosImportSchema.optional(), youtube:videosImportSchema.optional(),
});
export type CatalogImports = z.infer<typeof catalogImportsSchema>;
export type CountryCatalogRecord = z.infer<typeof country>;
export type TravelCombo = z.infer<typeof combo>;
export type YoutubeSnapshot = z.infer<typeof videosImportSchema>;
