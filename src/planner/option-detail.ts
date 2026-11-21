import { createContext } from 'solid-js';
import type { Guid } from '~engine/data';
import {
  descriptorWord,
  GROUP_WORDS,
  NO_SUMMARY,
  summaryLabels,
  summaryText,
  words,
  writtenSummary,
  type Label,
} from '~engine/describe';
import type { GrantIndex } from '~engine/grants';
import type { SharedTopic, StackClash, Synergy, Topic } from '~engine/links';
import type { CheckedData } from '~engine/load';
import { listNames, statName } from '~engine/refusals';

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

export function topicWords(t: Topic): string {
  switch (t.kind) {
    case 'ability':
      return statName(t.stat);
    case 'school':
      return `${t.school} spells`;
    case 'weapon':
      return words(t.category).replace(/^./, (c) => c.toUpperCase());
    case 'group':
      return GROUP_WORDS[t.group];
    case 'energy':
      return words(t.energy);
    case 'descriptor':
      return `${descriptorWord(t.descriptor)} effects`;
  }
}

export function sharedWords(data: CheckedData, s: SharedTopic): string {
  return `Shares ${topicWords(s.topic)} with ${listNames(data, s.with).join(', ')}`;
}

export function stackWords(data: CheckedData, c: StackClash): string {
  const kind = words(c.descriptor);
  return `Its ${kind} bonus to ${statName(c.stat)} won't stack with ${listNames(data, c.with).join(', ')}`;
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
