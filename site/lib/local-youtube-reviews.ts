import type {Data} from './planning';
import {youtubeReviewsLimit,youtubeReviewsSchema,type YoutubeReviews} from './youtube-watch-schema';

export const localYoutubeReviewsKey = 'rihla.youtube-reviews.v1';

export function readLocalYoutubeReviews(storage:Pick<Storage,'getItem'>):YoutubeReviews {
  const raw = storage.getItem(localYoutubeReviewsKey);
  if (!raw) return {};
  try {
    const parsed = youtubeReviewsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function mergeYoutubeReviews(preferred:YoutubeReviews,fallback?:YoutubeReviews):YoutubeReviews {
  const result = {...preferred};
  let count = Object.keys(result).length;
  for (const [id,status] of Object.entries(fallback??{})) {
    if (count>=youtubeReviewsLimit) break;
    if (Object.hasOwn(result,id)) continue;
    result[id] = status;
    count++;
  }
  return result;
}

export function withLocalYoutubeReviews(data:Data,local:YoutubeReviews):Data {
  if (!Object.keys(local).length) return data;
  const youtubeReviews = mergeYoutubeReviews(local,data.youtubeReviews);
  return {...data,youtubeReviews};
}
