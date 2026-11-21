import type { CheckedData } from '../load';
import type {
  Attribute,
  Component,
  DamageEnergyType,
  Guid,
  ModifierDescriptor,
  SpellDescriptorWrapper,
  SpellSchool,
  StatType,
  WeaponCategory,
  WeaponFighterGroup,
} from '../data';
import { spellDescriptors } from './descriptors';
import type { GrantParam } from '../grants';

export type Topic =
  | { readonly kind: 'ability'; readonly stat: Attribute }
  | { readonly kind: 'weapon'; readonly category: WeaponCategory }
  | { readonly kind: 'school'; readonly school: SpellSchool }
  | { readonly kind: 'group'; readonly group: WeaponFighterGroup }
  | { readonly kind: 'energy'; readonly energy: DamageEnergyType }
  | { readonly kind: 'descriptor'; readonly descriptor: LinkedDescriptor };

export type LinkedDescriptor =
  | 'Fear'
  | 'MindAffecting'
  | 'Compulsion'
  | 'Charm'
  | 'Emotion'
  | 'Poison'
  | 'Disease'
  | 'Death'
  | 'Sleep'
  | 'Paralysis'
  | 'Curse';

export const LINKED_DESCRIPTORS: ReadonlySet<string> = new Set<LinkedDescriptor>([
  'Fear',
  'MindAffecting',
  'Compulsion',
  'Charm',
  'Emotion',
  'Poison',
  'Disease',
  'Death',
  'Sleep',
  'Paralysis',
  'Curse',
]);

const ENERGY_DESCRIPTORS: Readonly<Record<string, DamageEnergyType>> = {
  Fire: 'Fire',
  Cold: 'Cold',
  Acid: 'Acid',
  Electricity: 'Electricity',
  Sonic: 'Sonic',
};

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
  switch (t.kind) {
    case 'ability':
      return `ability ${t.stat}`;
    case 'weapon':
      return `weapon ${t.category}`;
    case 'school':
      return `school ${t.school}`;
    case 'group':
      return `group ${t.group}`;
    case 'energy':
      return `energy ${t.energy}`;
    case 'descriptor':
      return `descriptor ${t.descriptor}`;
  }
}

function descriptorTopics(wrapper: SpellDescriptorWrapper): Topic[] {
  return spellDescriptors(wrapper).flatMap((d): Topic[] => {
    const energy = ENERGY_DESCRIPTORS[d];
    if (energy !== undefined) return [{ kind: 'energy', energy }];
    return LINKED_DESCRIPTORS.has(d) ? [{ kind: 'descriptor', descriptor: d as LinkedDescriptor }] : [];
  });
}

const energyTopic = (energy: DamageEnergyType): Topic[] => [{ kind: 'energy', energy }];

const groupsByData = new WeakMap<CheckedData, ReadonlyMap<WeaponCategory, readonly WeaponFighterGroup[]>>();

export function weaponGroupsOf(data: CheckedData, category: WeaponCategory): readonly WeaponFighterGroup[] {
  let byCategory = groupsByData.get(data);
  if (byCategory === undefined) {
    const built = new Map<WeaponCategory, Set<WeaponFighterGroup>>();
    for (const bp of data.blueprints.values()) {
      if (bp.$type !== 'BlueprintWeaponType' || typeof bp.m_FighterGroupFlags !== 'string') continue;
      const groups = built.get(bp.Category) ?? new Set();
      for (const g of bp.m_FighterGroupFlags.split(', ')) if (g !== '') groups.add(g as WeaponFighterGroup);
      built.set(bp.Category, groups);
    }
    byCategory = new Map([...built].map(([c, g]) => [c, [...g].sort()]));
    groupsByData.set(data, byCategory);
  }
  return byCategory.get(category) ?? [];
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
    case 'WeaponGroupAttackBonus':
    case 'WeaponGroupDamageBonus':
      return any.WeaponGroup === 'None' ? [] : [{ kind: 'group', group: any.WeaponGroup as WeaponFighterGroup }];
    case 'WeaponTypeDamageStatReplacement':
      return [{ kind: 'weapon', category: any.Category as WeaponCategory }, ...ability(any.Stat as StatType)];
    case 'SavingThrowBonusAgainstSchool':
    case 'IncreaseSpellSchoolDC':
    case 'IncreaseSpellSchoolCasterLevel':
      return [{ kind: 'school', school: any.School as SpellSchool }];
    case 'AddDamageResistanceEnergy':
    case 'AddEnergyImmunity':
    case 'AddEnergyVulnerability':
      return energyTopic(any.Type as DamageEnergyType);
    case 'AddEnergyDamageImmunity':
      return energyTopic(any.EnergyType as DamageEnergyType);
    case 'SavingThrowBonusAgainstDescriptor':
    case 'DraconicBloodlineArcana':
      return descriptorTopics(any.SpellDescriptor as SpellDescriptorWrapper);
    case 'BuffDescriptorImmunity':
    case 'SpellImmunityToSpellDescriptor':
    case 'IncreaseSpellDescriptorDC':
    case 'IncreaseSpellDescriptorCasterLevel':
      return descriptorTopics(any.Descriptor as SpellDescriptorWrapper);
    default:
      return [];
  }
}

function paramTopics(data: CheckedData, param: GrantParam | undefined): Topic[] {
  if (param === undefined) return [];
  if ('WeaponCategory' in param)
    return [
      { kind: 'weapon', category: param.WeaponCategory },
      ...weaponGroupsOf(data, param.WeaponCategory).map((group): Topic => ({ kind: 'group', group })),
    ];
  if ('SpellSchool' in param) return [{ kind: 'school', school: param.SpellSchool }];
  if ('StatType' in param) return ability(param.StatType);
  return [];
}

export function topicsOf(data: CheckedData, guid: Guid, param?: GrantParam): Topic[] {
  const bp = data.blueprints.get(guid);
  const all = [...(bp?.Components ?? []).flatMap(componentTopics), ...paramTopics(data, param)];
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
