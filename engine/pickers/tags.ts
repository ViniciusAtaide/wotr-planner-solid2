import type { FeatureTagsComponent, Guid } from '../data';
import type { CheckedData } from '../load';

export const FEATURE_TAG_BITS = {
  Attack: 0x2,
  Damage: 0x4,
  Melee: 0x8,
  Ranged: 0x10,
  Magic: 0x20,
  Mounted: 0x40,
  Defense: 0x80,
  SavingThrows: 0x100,
  Critical: 0x200,
  Skills: 0x400,
  Metamagic: 0x800,
  Teamwork: 0x1000,
  ClassSpecific: 0x2000,
  Style: 0x4000,
  CombatManeuver: 0x8000,
} as const;

export type FeatureTag = keyof typeof FEATURE_TAG_BITS;

export const pickerComponentTypes: ReadonlySet<string> = new Set(['FeatureTagsComponent']);

const isTag = (t: string): t is FeatureTag => Object.hasOwn(FEATURE_TAG_BITS, t);

export function tagsOf(value: string | number): readonly FeatureTag[] {
  const all = Object.keys(FEATURE_TAG_BITS).filter(isTag);
  if (typeof value === 'number') return all.filter((t) => (value & FEATURE_TAG_BITS[t]) !== 0);
  return value.split(', ').filter(isTag);
}

export function featureTags(data: CheckedData, feature: Guid): readonly FeatureTag[] | undefined {
  const component = (data.blueprints.get(feature)?.Components ?? []).find(
    (c): c is FeatureTagsComponent => c.$type === 'FeatureTagsComponent',
  );
  return component === undefined ? undefined : tagsOf(component.FeatureTags);
}
