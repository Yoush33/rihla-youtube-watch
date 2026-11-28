import {combosImportSchema,countriesImportSchema,videosImportSchema,type CatalogImports} from './catalog-import-schema';
import {youtubeDescriptionDestinations} from './youtube-watch';

export const catalogFileNames = {
  countries:'all.json', combos:'combos.json', youtube:'youtube-candidates.json',
} as const;

function hasKey(value:unknown,key:string): value is Record<string,unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.hasOwn(value,key);
}

export function parseCatalogFile(filename:string,raw:string):CatalogImports {
  let value:unknown;
  try { value = JSON.parse(raw.replace(/^\uFEFF/,'')); }
  catch { throw new Error(filename + ' · تعذّر قراءة JSON.'); }

  if (filename === catalogFileNames.countries) {
    const parsed = countriesImportSchema.safeParse(value);
    if (!parsed.success) throw new Error(filename + ' · راجع بنية بيانات الدول وتواريخها ورموزها.');
    return {countries:parsed.data};
  }
  if (filename === catalogFileNames.combos) {
    const parsed = combosImportSchema.safeParse(hasKey(value,'combos') ? value.combos : value);
    if (!parsed.success) throw new Error(filename + ' · راجع بيانات الخطط والمدد ورموز الدول.');
    return {combos:parsed.data};
  }
  if (filename === catalogFileNames.youtube && hasKey(value,'videos')) {
    const rows = value.videos;
    const videos = Array.isArray(rows) ? rows : (typeof rows === 'object' && rows !== null ? Object.values(rows) : null);
    const withDescriptionMatches = videos?.map(video => {
      if (!hasKey(video,'description') || typeof video.description !== 'string') return video;
      const descriptionDestinations = youtubeDescriptionDestinations(video.description);
      return {...video,descriptionDestinations:descriptionDestinations.length ? descriptionDestinations : undefined};
    });
    const parsed = videosImportSchema.safeParse({updated:value.updated,videos:withDescriptionMatches});
    if (!parsed.success) throw new Error(filename + ' · راجع تاريخ اللقطة ومعرّفات المقاطع وحالاتها.');
    return {youtube:parsed.data};
  }
  throw new Error(filename + ' · اختر أحد ملفات JSON الثلاثة الموضحة.');
}
