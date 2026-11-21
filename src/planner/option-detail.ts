import { createContext } from 'solid-js';
import type { Guid } from '~engine/data';
import { NO_SUMMARY, summaryLabels, summaryText, writtenSummary, type Label } from '~engine/describe';
import type { GrantIndex } from '~engine/grants';
import { sharedWords, stackWords, type Synergy } from '~engine/links';
import type { CheckedData } from '~engine/load';

export interface OptionSummary {
  readonly text: string | undefined;
  readonly written: boolean;
  readonly labels: readonly Label[];
}

const summaries = new WeakMap<CheckedData, Map<Guid, OptionSummary>>();

export function summaryFor(data: CheckedData, G: GrantIndex, guid: Guid): OptionSummary {
  let known = summaries.get(data);
  if (known === undefined) summaries.set(data, (known = new Map()));
  const cached = known.get(guid);
  if (cached !== undefined) return cached;
  const text = summaryText(data, guid, G);
  const made: OptionSummary = {
    text: text === NO_SUMMARY ? undefined : text,
    written: writtenSummary(data, guid) !== undefined,
    labels: summaryLabels(data, guid, G),
  };
  known.set(guid, made);
  return made;
}

export function synergyLines(data: CheckedData, synergy: Synergy | undefined): readonly string[] {
  return (synergy?.shared ?? []).map((s) => sharedWords(data, s));
}

export function clashLines(data: CheckedData, synergy: Synergy | undefined): readonly string[] {
  return (synergy?.wontStack ?? []).map((c) => stackWords(data, c));
}

export interface OptionDetail {
  readonly name: string;
  readonly closed: boolean;
  readonly current: boolean;
  readonly summary: OptionSummary | undefined;
  readonly links: readonly string[];
  readonly warnings: readonly string[];
  readonly refusal: readonly string[];
  readonly gear?: string | undefined;
}

export interface DetailHub {
  readonly resolve: (find: (key: string) => OptionDetail | undefined) => void;
  readonly point: (key: string | undefined) => void;
}

export const OptionDetails = createContext<DetailHub | null>(null);
