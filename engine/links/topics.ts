import type { CheckedData } from '../load';
import type { Attribute, Component, Guid, ModifierDescriptor, SpellSchool, StatType, WeaponCategory } from '../data';
import type { GrantParam } from '../grants';

export type Topic =
  | { readonly kind: 'ability'; readonly stat: Attribute }
  | { readonly kind: 'weapon'; readonly category: WeaponCategory }
  | { readonly kind: 'school'; readonly school: SpellSchool };

export interface StatBonus {
  readonly stat: StatType;
  readonly descriptor: ModifierDescriptor;
}

const ATTRIBUTES: ReadonlySet<string> = new Set([
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
]);

const AVERAGE_SCORE = 10;

export const STACKING_DESCRIPTORS: ReadonlySet<string> = new Set([
  'None',
  'Racial',
  'Dodge',
  'UntypedStackable',
  'Feat',
  'Penalty',
  'ArmorFocus',
  'Focus',
  'NegativeEnergyPenalty',
  'NaturalArmor',
  'DLC3_Stackable',
]);

export function stackable(descriptor: ModifierDescriptor): boolean {
  return STACKING_DESCRIPTORS.has(descriptor);
}

export function topicKey(t: Topic): string {
  return t.kind === 'ability'
    ? `ability ${t.stat}`
    : t.kind === 'weapon'
      ? `weapon ${t.category}`
      : `school ${t.school}`;
}

const ability = (stat: StatType | Attribute | undefined): Topic[] =>
  stat !== undefined && ATTRIBUTES.has(stat) ? [{ kind: 'ability', stat: stat as Attribute }] : [];

function componentTopics(c: Component): Topic[] {
  const any = c as Component & Record<string, unknown>;
  switch (c.$type) {
    case 'AddStatBonus':
    case 'AddStatBonusIfHasFact':
    case 'AddContextStatBonus':
      return ability(any.Stat as StatType);
    case 'PrerequisiteStatValue':
    case 'PrerequisiteFullStatValue':
      return (any.Value as number) > AVERAGE_SCORE ? ability(any.Stat as StatType) : [];
    case 'ReplaceStatBaseAttribute':
      return [...ability(any.TargetStat as StatType), ...ability(any.BaseAttributeReplacement as Attribute)];
    case 'PrerequisiteParametrizedFeature':
      if (any.ParameterType === 'WeaponCategory')
        return [{ kind: 'weapon', category: any.WeaponCategory as WeaponCategory }];
      if (any.ParameterType === 'SpellSchool') return [{ kind: 'school', school: any.SpellSchool as SpellSchool }];
      return [];
    case 'PrerequisiteConditionForWeaponCategory':
      return (any.m_WeaponCategories as readonly WeaponCategory[]).map((category) => ({ kind: 'weapon', category }));
    case 'AddProficiencies':
      return ((any.WeaponProficiencies as readonly WeaponCategory[] | null) ?? []).map((category) => ({
        kind: 'weapon',
        category,
      }));
    case 'AddBackgroundWeaponProficiency':
      return [{ kind: 'weapon', category: any.Proficiency as WeaponCategory }];
    default:
      return [];
  }
}

function paramTopics(param: GrantParam | undefined): Topic[] {
  if (param === undefined) return [];
  if ('WeaponCategory' in param) return [{ kind: 'weapon', category: param.WeaponCategory }];
  if ('SpellSchool' in param) return [{ kind: 'school', school: param.SpellSchool }];
  if ('StatType' in param) return ability(param.StatType);
  return [];
}

export function topicsOf(data: CheckedData, guid: Guid, param?: GrantParam): Topic[] {
  const bp = data.blueprints.get(guid);
  const all = [...(bp?.Components ?? []).flatMap(componentTopics), ...paramTopics(param)];
  const seen = new Set<string>();
  return all.filter((t) => {
    const key = topicKey(t);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function bonusesOf(data: CheckedData, guid: Guid): StatBonus[] {
  const bp = data.blueprints.get(guid);
  return (bp?.Components ?? []).flatMap((c): StatBonus[] => {
    if (c.$type !== 'AddStatBonus' && c.$type !== 'AddStatBonusIfHasFact' && c.$type !== 'AddContextStatBonus')
      return [];
    const any = c as Component & { readonly Stat: StatType; readonly Descriptor: ModifierDescriptor };
    return [{ stat: any.Stat, descriptor: any.Descriptor }];
  });
}

export interface SharedTopic {
  readonly topic: Topic;
  readonly with: readonly Guid[];
}

export interface StackClash {
  readonly stat: StatType;
  readonly descriptor: ModifierDescriptor;
  readonly with: readonly Guid[];
}

export interface Synergy {
  readonly shared: readonly SharedTopic[];
  readonly wontStack: readonly StackClash[];
}

export interface HeldFact {
  readonly blueprint: Guid;
  readonly param?: GrantParam;
}

export interface HeldIndex {
  readonly byTopic: ReadonlyMap<string, readonly Guid[]>;
  readonly byBonus: ReadonlyMap<string, readonly Guid[]>;
}

const bonusKey = (b: StatBonus) => `${b.stat} ${b.descriptor}`;

export function heldIndex(data: CheckedData, held: readonly HeldFact[]): HeldIndex {
  const byTopic = new Map<string, Guid[]>();
  const byBonus = new Map<string, Guid[]>();
  const add = (m: Map<string, Guid[]>, key: string, g: Guid) => {
    const list = m.get(key) ?? [];
    if (!list.includes(g)) list.push(g);
    m.set(key, list);
  };
  for (const h of held) {
    for (const t of topicsOf(data, h.blueprint, h.param)) add(byTopic, topicKey(t), h.blueprint);
    for (const b of bonusesOf(data, h.blueprint)) if (!stackable(b.descriptor)) add(byBonus, bonusKey(b), h.blueprint);
  }
  return { byTopic, byBonus };
}

export function synergyOf(
  data: CheckedData,
  index: HeldIndex,
  option: { readonly feature: Guid; readonly param?: GrantParam },
): Synergy {
  const others = (list: readonly Guid[] | undefined) => (list ?? []).filter((g) => g !== option.feature);
  const shared = topicsOf(data, option.feature, option.param).flatMap((topic): SharedTopic[] => {
    const by = others(index.byTopic.get(topicKey(topic)));
    return by.length === 0 ? [] : [{ topic, with: by }];
  });
  const wontStack = bonusesOf(data, option.feature)
    .filter((b) => !stackable(b.descriptor))
    .flatMap((b): StackClash[] => {
      const by = others(index.byBonus.get(bonusKey(b)));
      return by.length === 0 ? [] : [{ stat: b.stat, descriptor: b.descriptor, with: by }];
    });
  return { shared, wontStack };
}
