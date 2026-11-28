'use client';

import {featuredYoutubeTips, youtubeTravelTips, type YoutubeTipCity, type YoutubeTravelTip} from '../lib/youtube-watch';
import {useCatalog} from './catalog-context';
import '../app/community-tips.css';

export function useCommunityTips(cities:readonly YoutubeTipCity[]) {
  const {imports,youtubeReviews} = useCatalog();
  return youtubeTravelTips(cities,youtubeReviews,imports?.youtube);
}

export function CommunityTipList({tips}: {tips:readonly YoutubeTravelTip[]}) {
  if (!tips.length) return null;
  return <ul className="community-tip-list">{tips.map(tip =>
    <li key={tip.videoId + ':' + tip.at + ':' + tip.tip}>
      <p><strong data-warning={tip.type === 'تحذير'}>{tip.type}</strong>
        {tip.place && <> · <bdi>{tip.place}</bdi></>}{' '}{tip.tip}</p>
      <div className="community-tip-source">
        {tip.price !== '' && tip.price != null && <span>السعر المذكور · {tip.price}</span>}
        <a href={'https://www.youtube.com/watch?v=' + tip.videoId + '&t=' + tip.seconds}
          target="_blank" rel="noreferrer" aria-label={'شاهد النصيحة من ' + tip.channel + ' عند ' + tip.at}>
          شاهد عند <bdi dir="ltr">{tip.at}</bdi>
        </a>
      </div>
    </li>
  )}</ul>;
}

export function CommunityTips({tips}: {tips:readonly YoutubeTravelTip[]}) {
  const featured = featuredYoutubeTips(tips);
  return featured.length ? <>
    <p className="community-tip-note">نصايح من المقاطع، مستخرجة آليًا.</p>
    <CommunityTipList tips={featured}/>
  </> : <p className="community-tip-note">ما فيه نصايح من المقاطع لهذي الوجهة حاليًا.</p>;
}
