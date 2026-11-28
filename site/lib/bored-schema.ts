import {z} from 'zod';
import {tripCardIdSchema} from './trip-card-schema';

export const boredTypeSchema = z.enum(['relax', 'nature', 'city', 'sea']);

export function safeBoredLink(value: string) {
  if (!value || value.length > 1000) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const settings = z.object({
  types: z.array(boredTypeSchema).max(4).refine(types => new Set(types).size === types.length),
  days: z.number().int().min(1).max(30),
  budget: z.number().positive().max(1e9),
  month: z.number().int().min(1).max(12),
  miles: z.boolean(),
  departure: z.string().date().or(z.literal('')).optional(),
});

export const boredSchema = z.object({
  settings,
  links: z.record(tripCardIdSchema, z.array(z.string().refine(safeBoredLink)).max(30)),
});

export type BoredType = z.infer<typeof boredTypeSchema>;
export type BoredSettings = z.infer<typeof settings>;
export type BoredData = z.infer<typeof boredSchema>;
