import {z} from 'zod';

export const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
export const youtubeStatus = z.enum(['ينفع','مرشح للمراجعة','ما ينفع']);
export const youtubeReviewsLimit = 1000;
export const youtubeReviewsSchema = z.record(z.string().regex(videoIdPattern),youtubeStatus)
  .refine(reviews => Object.keys(reviews).length <= youtubeReviewsLimit);
export type YoutubeStatus = z.infer<typeof youtubeStatus>;
export type YoutubeReviews = z.infer<typeof youtubeReviewsSchema>;
