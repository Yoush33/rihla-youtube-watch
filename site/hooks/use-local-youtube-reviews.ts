'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import type {Data} from '../lib/planning';
import {localYoutubeReviewsKey,mergeYoutubeReviews,readLocalYoutubeReviews,withLocalYoutubeReviews} from '../lib/local-youtube-reviews';
import {videoIdPattern,youtubeReviewsLimit,youtubeStatus,type YoutubeReviews,type YoutubeStatus} from '../lib/youtube-watch-schema';

const fullMessage = 'وصلت إلى حد تقييمات المقاطع المحفوظة.';
const storageMessage = 'تعذّر حفظ التقييمات في المتصفح. تقدر تصدّرها مع بيانات رحلتك من هذه الصفحة.';

export function useLocalYoutubeReviews(legacyReviews?:YoutubeReviews) {
  const [local,setLocal] = useState<YoutubeReviews>({});
  const [notice,setNotice] = useState('');
  const current = useRef<YoutubeReviews>({});
  const pending = useRef<YoutubeReviews>({});

  const readCurrent = useCallback(()=>{
    try { return mergeYoutubeReviews(pending.current,readLocalYoutubeReviews(window.localStorage)); }
    catch { return current.current; }
  },[]);

  useEffect(()=>{
    function refresh(event?:StorageEvent) {
      if (event && event.key!==localYoutubeReviewsKey && event.key!==null) return;
      const next = readCurrent();
      current.current = next;
      setLocal(next);
    }
    refresh();
    window.addEventListener('storage',refresh);
    return ()=>window.removeEventListener('storage',refresh);
  },[readCurrent]);

  function persist(next:YoutubeReviews,changes:YoutubeReviews) {
    try {
      window.localStorage.setItem(localYoutubeReviewsKey,JSON.stringify(next));
      pending.current = {};
      setNotice('');
    } catch {
      pending.current = mergeYoutubeReviews(changes,pending.current);
      setNotice(storageMessage);
    }
    current.current = next;
    setLocal(next);
  }

  function review(id:string,status:YoutubeStatus) {
    if (!videoIdPattern.test(id) || !youtubeStatus.safeParse(status).success) return false;
    const browser = readCurrent();
    const existing = mergeYoutubeReviews(browser,legacyReviews);
    if (!Object.hasOwn(existing,id) && Object.keys(existing).length>=youtubeReviewsLimit) {
      setNotice(fullMessage);
      return false;
    }
    persist({...browser,[id]:status},{[id]:status});
    return true;
  }

  function importReviews(incoming?:YoutubeReviews) {
    const browser = readCurrent();
    const existing = mergeYoutubeReviews(browser,legacyReviews);
    const additions = Object.entries(incoming??{}).filter(([id])=>!Object.hasOwn(existing,id));
    const accepted = additions.slice(0,youtubeReviewsLimit-Object.keys(existing).length);
    if (accepted.length) {
      const changes = Object.fromEntries(accepted);
      persist({...browser,...changes},changes);
    }
    if (accepted.length<additions.length) setNotice(fullMessage);
  }

  return {
    reviews:mergeYoutubeReviews(local,legacyReviews),
    review,
    importReviews,
    exportData:(data:Data)=>withLocalYoutubeReviews(data,readCurrent()),
    notice,
  };
}
