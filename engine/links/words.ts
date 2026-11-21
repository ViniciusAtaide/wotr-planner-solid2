import type { CheckedData } from '../load';
import type { Guid, WeaponFighterGroup } from '../data';
import { bareNameOf, statName } from '../refusals';
import type { SharedTopic, StackClash, Topic } from './topics';

export const GROUP_WORDS: Readonly<Record<WeaponFighterGroup, string>> = {
  None: 'no weapon group',
  Axes: 'axes',
  BladesHeavy: 'heavy blades',
  BladesLight: 'light blades',
  Bows: 'bows',
  Crossbows: 'crossbows',
  Double: 'double weapons',
  Flails: 'flails',
  Hammers: 'hammers',
  Monk: 'monk weapons',
  Natural: 'natural weapons',
  Polearms: 'polearms',
  Spears: 'spears',
  Thrown: 'thrown weapons',
  Close: 'close weapons',
};

const SPELL_DESCRIPTOR_WORDS: Readonly<Record<string, string>> = {
  MindAffecting: 'mind-affecting',
  StatDebuff: 'ability-lowering',
  RestoreHP: 'healing',
  TemporaryHP: 'temporary hit point',
  VilderavnBleed: 'bleed',
  SightBased: 'sight-based',
  NegativeEmotion: 'negative emotion',
  FearImmunity: 'fear-immunity',
  ChannelPositiveHeal: 'positive channel',
  ChannelNegativeHeal: 'negative channel',
  ChannelPositiveHarm: 'positive channel',
  ChannelNegativeHarm: 'negative channel',
  AnomalyDistortion: 'anomaly',
};

export const words = (s: string): string => s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

export const descriptorWord = (d: string): string => SPELL_DESCRIPTOR_WORDS[d] ?? words(d);

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

export function linkNames(data: CheckedData, guids: readonly Guid[]): string[] {
  return [...new Set(guids.map((g) => bareNameOf(data, g)))];
}

export function sharedWords(data: CheckedData, s: SharedTopic): string {
  return `Shares ${topicWords(s.topic)} with ${linkNames(data, s.with).join(', ')}`;
}

export function stackWords(data: CheckedData, c: StackClash): string {
  return `Its ${words(c.descriptor)} bonus to ${statName(c.stat)} won't stack with ${linkNames(data, c.with).join(', ')}`;
}
