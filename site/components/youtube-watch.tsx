'use client';

import {useState} from 'react';
import '../app/youtube-coverage.css';
import {useCatalog} from './catalog-context';
import {formatArabicDuration} from '../lib/arabic-duration';
import {cardNumber} from '../lib/trip-card';
import {youtubeCoverage, type OnYoutubeReview, type YoutubeCandidate} from '../lib/youtube-watch';
import type {YoutubeReviews} from '../lib/youtube-watch-schema';

const clockNumber = new Intl.NumberFormat('ar-SA',{minimumIntegerDigits:2,useGrouping:false});
const visibleCount = 3;
const summaryLimit = 5;
const voteChoices = ['ينفع','ما ينفع'] as const;
const videoUrl = (video:YoutubeCandidate) => 'https://www.youtube.com/watch?v=' + video.video_id;

function playbackTime(seconds:number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const parts = hours ? [hours,minutes,seconds % 60] : [minutes,seconds % 60];
  return parts.map(value=>clockNumber.format(value)).join(':');
}

function YoutubePlayer({video}: {video:YoutubeCandidate}) {
  const [playing,setPlaying] = useState(false);
  return <div className="youtube-watch-player">
    {playing ? <iframe
      src={'https://www.youtube-nocookie.com/embed/' + video.video_id}
      title={video.title_ar || video.title}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="encrypted-media; picture-in-picture; fullscreen"
      loading="lazy"
      allowFullScreen
    /> : <button type="button" className="secondary" onClick={() => setPlaying(true)}>حمّل مشغّل يوتيوب</button>}
    <a href={videoUrl(video)} target="_blank" rel="noreferrer">افتح المقطع على يوتيوب</a>
  </div>;
}

function VideoList({videos,onReview}: {videos:YoutubeCandidate[]; onReview?:OnYoutubeReview}) {
  return <ul className="youtube-watch-list">
    {videos.map(video => {
      const title=video.title_ar || video.title;
      return <li key={video.video_id}>
        <div className="youtube-watch-title"><p dir="auto"><strong>{title}</strong></p><span>{video.status}</span></div>
        {title.trim() !== video.title.trim() && <small dir="auto">{video.title}</small>}
        <small>{video.channel} · <bdi>{video.published}</bdi>
          {video.duration_seconds !== null && <> · المدة <time dateTime={'PT' + video.duration_seconds + 'S'}>
            <bdi dir="ltr">{playbackTime(video.duration_seconds)}</bdi>
          </time></>}
        </small>
        <YoutubePlayer video={video}/>
        <div role="group" aria-label={'تقييم ' + title} className="youtube-watch-reactions">
          {voteChoices.map(status => <button key={status} type="button" className="secondary" aria-pressed={video.status === status}
            disabled={!onReview} onClick={() => onReview?.(video.video_id,status)}>{status}</button>)}
        </div>
      </li>;
    })}
  </ul>;
}

function usefulSummaries(videos:YoutubeCandidate[]) {
  const useful = videos.filter(video => video.status === 'ينفع' && video.summary_ar?.length);
  const selected = new Map<string,YoutubeCandidate>();
  for (let index = 0; index < summaryLimit && selected.size < summaryLimit; index++) {
    for (const video of useful) {
      const summary = video.summary_ar?.[index]?.trim();
      if (summary && !selected.has(summary)) selected.set(summary,video);
      if (selected.size === summaryLimit) break;
    }
  }
  return [...selected];
}

const summaryBasis = {
  description:'وصف الناشر',
  frame:'لقطات من المقطع',
  transcript:'نص المقطع',
  visual:'محتوى المقطع',
};

function CoverageMetrics({coverage}:{coverage:ReturnType<typeof youtubeCoverage>}) {
  const {counts,target}=coverage;
  return <>
    <dl className="youtube-coverage-metrics">
      <div><dt>المقاطع المجموعة</dt><dd>{cardNumber(counts.total)}</dd></div>
      <div data-status="useful"><dt>ينفع</dt><dd>{cardNumber(counts.useful)}</dd></div>
      <div data-status="pending"><dt>مرشح للمراجعة</dt><dd>{cardNumber(counts.pending)}</dd></div>
      <div data-status="rejected"><dt>ما ينفع</dt><dd>{cardNumber(counts.rejected)}</dd></div>
    </dl>
    <p className="youtube-coverage-duration"><strong>مجموع مدة المقاطع</strong>{' · '}
      {counts.durationKnown > 0
        ? (counts.durationSeconds < 60 ? 'أقل من دقيقة' : formatArabicDuration(counts.durationSeconds / 60))
        : (counts.total > 0 ? 'بانتظار بيانات المدد' : '٠ ساعة')}
      {counts.durationKnown > 0 && counts.durationKnown < counts.total &&
        <small> المدد المسجّلة لـ {cardNumber(counts.durationKnown)} من {cardNumber(counts.total)} مقطع</small>}
    </p>
    <div className="youtube-coverage-progress">
      <p><strong>هدف المقاطع المفيدة</strong><span aria-live="polite">{cardNumber(counts.useful)} من {cardNumber(target)}</span></p>
      <progress aria-label="هدف المقاطع المفيدة" max={target} value={Math.min(target,counts.useful)}/>
    </div>
  </>;
}

function VideoSummaries({videos}:{videos:YoutubeCandidate[]}) {
  const summary = usefulSummaries(videos);
  return <div className="youtube-coverage-summaries">
      <h3>أهم الخلاصات</h3>
      {summary.length ? <ul>{summary.map(([text,video]) => <li key={text}>
        <p>{text}</p>
        <small>{video.summary_basis && <>{summaryBasis[video.summary_basis]} · </>}
          <a href={video.summary_source || videoUrl(video)} target="_blank" rel="noreferrer">{video.title_ar || video.title}</a>
        </small>
      </li>)}</ul> : <p className="youtube-watch-source">ما فيه خلاصات عربية مرفقة بالمقاطع اللي حالتها «ينفع».</p>}
  </div>;
}

type YoutubeWatchProps = ({country:string; destination?:never} | {country?:never; destination:string}) & {
  reviews?:YoutubeReviews;
  onReview?:OnYoutubeReview;
  showCoverage?:boolean;
};

export function YoutubeWatch({country,destination,reviews,onReview,showCoverage=false}: YoutubeWatchProps) {
  const [expanded,setExpanded]=useState(false);
  const {imports,youtubeReviews,onYoutubeReview}=useCatalog();
  const scope=country===undefined ? {kind:'destination' as const,id:destination} : {kind:'country' as const,code:country};
  const coverage=youtubeCoverage(scope,reviews??youtubeReviews,imports?.youtube);
  const selectReview=onReview??onYoutubeReview;
  const listed = coverage.videos.filter(video=>video.status !== 'ما ينفع');
  const rejected = coverage.videos.filter(video=>video.status === 'ما ينفع');

  return <div className="youtube-watch">
    <p className="youtube-watch-source">مقاطع من يوتيوب · لقطة <bdi>{coverage.updated}</bdi></p>
    {showCoverage && <CoverageMetrics coverage={coverage}/>}
    <VideoSummaries videos={coverage.videos}/>
    {listed.length ? <VideoList videos={listed.slice(0,expanded ? undefined : visibleCount)} onReview={selectReview}/> :
      <p className="youtube-watch-source">ما فيه مقاطع مفيدة أو مرشحة للمراجعة.</p>}
    {listed.length > visibleCount && <button type="button" className="secondary" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      {expanded ? 'اعرض أول ٣ مقاطع' : 'اعرض باقي المقاطع'}
    </button>}
    {rejected.length > 0 && <details className="youtube-watch-rejected">
      <summary>المقاطع اللي ما تنفع{showCoverage && ' · ' + cardNumber(rejected.length)}</summary>
      <VideoList videos={rejected} onReview={selectReview}/>
    </details>}
  </div>;
}
