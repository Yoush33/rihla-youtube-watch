import data from './reliability-data.json';

export type Verification = 'direct' | 'indexed' | 'needs_confirmation' | 'unresolved' | 'editorial';
export type SourceDateType = 'published' | 'updated' | 'initial_publication' | 'unknown';
export type FactSource = {
  name: string;
  url: string;
  checked: string;
  published: string;
  dateType: SourceDateType;
  access: string;
  kind: 'official' | 'operator';
  note?: string;
};
export type SourceFact = {
  title: string;
  text: string;
  source: string;
  checked: string;
  published: string;
  scope: string;
  sourceName?: string;
  sourceDateType?: SourceDateType;
  sourceNote?: string;
  verification?: Verification;
  additionalSources?: FactSource[];
  validFrom?: string | null;
  validUntil?: string | null;
};
export type EntryPolicy = {
  country: string;
  nationality: string;
  passportType: string;
  purpose: string;
  maxDays: number | null;
  maxYears?: number;
  countFromNextDay: boolean;
  validFrom: string | null;
  validUntil: string | null;
  minPassportMonths: number | null;
  headline: string;
  requirements: SourceFact[];
  caveat: string;
};
// Months are 1–12, inclusive; fromMonth > toMonth spans the year boundary.
export type HoursSeason = {
  fromMonth: number;
  toMonth: number;
  open: string;
  close: string;
  lastEntry: string;
  scope: string;
};
export type VenueFacts = {
  id: string;
  open: string;
  close: string;
  lastEntry: string;
  hoursSeasons?: HoursSeason[];
  closedDays: number[];
  holidayOpeningException?: boolean;
  closedOnHolidays?: boolean;
  booking: 'required' | 'not_required' | 'unknown';
  facts: SourceFact[];
  exceptions?: SourceFact[];
  // This verifies the reference window, never opening or availability on a visit date.
  scheduleVerified?: boolean;
  validFrom: string | null;
  validUntil: string | null;
  scope: string;
};
export type PracticalTopic = 'food' | 'safety' | 'transport' | 'payment' | 'connectivity';
export const entryPolicies = data.policies as EntryPolicy[];
export const venueFacts = data.venues as VenueFacts[];
export const practicalFacts = data.practical as (SourceFact & { country: string; city: string; topic: PracticalTopic })[];
