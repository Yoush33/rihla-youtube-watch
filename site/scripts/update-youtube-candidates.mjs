import {readFile, rename, rm, writeFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Run the same validator as the in-app importer from Node without a frontend build.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[^/]+$/.test(specifier)) {
      return next(specifier + '.ts', context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.json') && !context.importAttributes.type) {
      return next(url, {...context, importAttributes:{...context.importAttributes, type:'json'}});
    }
    return next(url, context);
  },
});

const {parseCatalogFile} = await import('../lib/catalog-import.ts');
const target = fileURLToPath(new URL('../data/youtube-candidates.json', import.meta.url));

async function readExport(input) {
  if (!input.includes('://')) return readFile(resolve(input), 'utf8');
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Expected an HTTPS export URL.');
  const response = await fetch(url, {signal:AbortSignal.timeout(25_000)})
    .catch(() => {throw new Error('Could not read the export URL.');});
  if (!response.ok) throw new Error(`Export request returned HTTP ${response.status}.`);
  return response.text();
}

const [source, option, ...rest] = process.argv.slice(2);
if (!source || (option && !['--merge','--watcher'].includes(option)) || rest.length) {
  throw new Error('Usage: node scripts/update-youtube-candidates.mjs <export file or HTTPS URL> [--merge | --watcher]');
}

const watcher = option === '--watcher';
const current = JSON.parse(await readFile(target, 'utf8'));
let raw = await readExport(source);
if (watcher) {
  const feed = JSON.parse(raw);
  if (!feed.videos || typeof feed.videos !== 'object') throw new Error('Expected videos in the watcher feed.');
  const videos = Array.isArray(feed.videos) ? feed.videos : Object.values(feed.videos);
  raw = JSON.stringify({updated:feed.updated,videos:videos.map(record=>{
    const {summary_ar,summary_basis,summary_source,...video} = record;
    if (video.url !== 'https://www.youtube.com/watch?v=' + video.video_id) throw new Error('Invalid watch URL for ' + video.video_id);
    if (summary_ar && summary_basis && summary_source) Object.assign(video,{summary_ar,summary_basis,summary_source});
    return video;
  })});
}

let snapshot = parseCatalogFile('youtube-candidates.json', raw).youtube;
if (!watcher && snapshot.updated < current.updated) throw new Error('The export is older than the checked-in snapshot.');
if (option === '--merge' || watcher) {
  const videos = new Map(current.videos.map(video => [video.video_id,video]));
  for (const video of snapshot.videos) {
    const previous = videos.get(video.video_id);
    videos.set(video.video_id, {
      ...previous, ...video,
      title_ar:video.title_ar || previous?.title_ar,
      destinations:[...new Set([...(previous?.destinations ?? []),...video.destinations])],
      descriptionDestinations:video.descriptionDestinations ?? previous?.descriptionDestinations,
      countries:video.countries ?? previous?.countries,
      duration_seconds:video.duration_seconds ?? previous?.duration_seconds ?? video.duration_seconds,
      tips_ar:video.tips_ar ?? previous?.tips_ar,
      about_destination:video.about_destination ?? previous?.about_destination,
      status: video.status === 'مرشح للمراجعة' ? previous?.status ?? video.status : video.status,
      ...(watcher && previous && {
        title:previous.title,
        title_ar:previous.title_ar,
        channel:previous.channel,
        published:previous.published,
        status:previous.status,
      }),
      ...(watcher && previous?.summary_ar && {
        summary_ar:previous.summary_ar,summary_basis:previous.summary_basis,summary_source:previous.summary_source,
      }),
    });
  }
  const updated = snapshot.updated > current.updated ? snapshot.updated : current.updated;
  snapshot = parseCatalogFile('youtube-candidates.json', JSON.stringify({updated, videos:[...videos.values()]})).youtube;
}

if (JSON.stringify(current.videos) === JSON.stringify(snapshot.videos)) snapshot.updated = current.updated;
if (JSON.stringify(current) !== JSON.stringify(snapshot)) {
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n', {flag:'wx'});
    await rename(temporary, target);
  } finally {
    await rm(temporary, {force:true});
  }
}
const durationCount = snapshot.videos.filter(video=>video.duration_seconds != null).length;
console.log(`${snapshot.videos.length} candidates · ${durationCount} with duration · ${snapshot.updated} · ${target}`);
