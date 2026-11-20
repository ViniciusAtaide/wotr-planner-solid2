import {
  refGuid,
  type ArmorProficiencyGroup,
  type BlueprintBase,
  type Component,
  type Condition,
  type FeatureParameterType,
  type Guid,
  type PetType,
  type Prerequisite,
  type PrerequisiteConditionForWeaponCategory,
  type PrerequisiteGroup,
  type SpellSchool,
  type StatType,
  type WeaponCategory,
  type WeaponSubCategory,
  isPrerequisite,
  paramPrerequisiteTypes,
} from '../data';

export type Polarity = 'requires' | 'forbids';

export type Named =
  | { readonly kind: 'fact'; readonly m_Feature: Guid }
  | { readonly kind: 'facts'; readonly m_Features: readonly Guid[]; readonly Amount: number; readonly IsDeity: boolean }
  | { readonly kind: 'classLevel'; readonly m_CharacterClass: Guid; readonly Level: number }
  | {
      readonly kind: 'archetypeLevel';
      readonly m_CharacterClass: Guid;
      readonly m_Archetype: Guid;
      readonly Level: number;
    }
  | { readonly kind: 'stat'; readonly Stat: StatType; readonly Value: number }
  | { readonly kind: 'characterLevel'; readonly Level: number }
  | { readonly kind: 'mythicLevel'; readonly Level: number }
  | {
      readonly kind: 'alignment';
      readonly Alignment: string | number;
      readonly IngorePrerequisiteCheck: boolean;
      readonly ArchetypeAlignment: boolean;
    }
  | {
      readonly kind: 'proficiency';
      readonly ArmorProficiencies: readonly ArmorProficiencyGroup[];
      readonly WeaponProficiencies: readonly WeaponCategory[];
    }
  | {
      readonly kind: 'casterType';
      readonly IsArcane: boolean;
      readonly OnlySpontaneous: boolean;
      readonly RequiredSpellLevel: number | null;
    }
  | { readonly kind: 'classSpellLevel'; readonly m_CharacterClass: Guid; readonly RequiredSpellLevel: number }
  | {
      readonly kind: 'parametrizedFeature';
      readonly m_Feature: Guid;
      readonly ParameterType: FeatureParameterType;
      readonly WeaponCategory: WeaponCategory;
      readonly SpellSchool: SpellSchool;
    }
  | { readonly kind: 'weaponSubCategory'; readonly m_Feature: Guid; readonly SubCategory: WeaponSubCategory }
  | { readonly kind: 'selectionPossible'; readonly m_ThisFeature: Guid }
  | { readonly kind: 'pet'; readonly Type: PetType }
  | { readonly kind: 'isPet' }
  | { readonly kind: 'mainCharacter' }
  | { readonly kind: 'story' }
  | { readonly kind: 'spellsInSpellbook'; readonly m_SpellSpecializationFeat: Guid }
  | { readonly kind: 'condition'; readonly Condition: Condition };

export interface PrerequisiteLeaf {
  readonly Group: PrerequisiteGroup;
  readonly CheckInProgression: boolean;
  readonly IsFeatureSelectionWhiteList: boolean;
  readonly polarity: Polarity;
  readonly names: Named;
  readonly component: Prerequisite;
}

export interface Lookup {
  get(guid: Guid): BlueprintBase | undefined;
}

type Read = Pick<PrerequisiteLeaf, 'polarity' | 'names'>;
type Reader<T extends Prerequisite> = (c: T, blueprints: Lookup) => Read;

function guid(ref: string): Guid {
  const g = refGuid(ref);
  if (g === undefined) throw new Error(`not a blueprint reference: ${ref}`);
  return g;
}

const requires = (names: Named): Read => ({ polarity: 'requires', names });
const forbids = (names: Named): Read => ({ polarity: 'forbids', names });
const either = (forbid: boolean, names: Named): Read => (forbid ? forbids(names) : requires(names));

export function isDeityFeature(bp: BlueprintBase | undefined): boolean {
  return bp !== undefined && 'Groups' in bp && (bp.Groups as readonly string[]).includes('Deities');
}

function isDeity(features: readonly Guid[], blueprints: Lookup): boolean {
  return features.length > 0 && features.every((g) => isDeityFeature(blueprints.get(g)));
}

const readers: { readonly [K in Prerequisite['$type']]: Reader<Extract<Prerequisite, { $type: K }>> } = {
  PrerequisiteFeature: (c) => requires({ kind: 'fact', m_Feature: guid(c.m_Feature) }),
  PrerequisiteNoFeature: (c) => forbids({ kind: 'fact', m_Feature: guid(c.m_Feature) }),
  PrerequisitePlayerHasFeature: (c) => requires({ kind: 'fact', m_Feature: guid(c.m_Feature) }),
  PrerequisiteFeaturesFromList: (c, blueprints) => {
    const m_Features = c.m_Features.map(guid);
    return either(c.m_RestrictIfNot, {
      kind: 'facts',
      m_Features,
      Amount: c.Amount,
      IsDeity: isDeity(m_Features, blueprints),
    });
  },
  PrerequisiteClassLevel: (c) =>
    either(c.Not, { kind: 'classLevel', m_CharacterClass: guid(c.m_CharacterClass), Level: c.Level }),
  PrerequisiteNoClassLevel: (c) =>
    forbids({ kind: 'classLevel', m_CharacterClass: guid(c.m_CharacterClass), Level: 1 }),
  PrerequisiteArchetypeLevel: (c) =>
    requires({
      kind: 'archetypeLevel',
      m_CharacterClass: guid(c.m_CharacterClass),
      m_Archetype: guid(c.m_Archetype),
      Level: c.Level,
    }),
  PrerequisiteNoArchetype: (c) =>
    forbids({
      kind: 'archetypeLevel',
      m_CharacterClass: guid(c.m_CharacterClass),
      m_Archetype: guid(c.m_Archetype),
      Level: 1,
    }),
  PrerequisiteStatValue: (c) => requires({ kind: 'stat', Stat: c.Stat, Value: c.Value }),
  PrerequisiteFullStatValue: (c) => requires({ kind: 'stat', Stat: c.Stat, Value: c.Value }),
  PrerequisiteCharacterLevel: (c) => requires({ kind: 'characterLevel', Level: c.Level }),
  PrerequisiteMythicLevel: (c) => requires({ kind: 'mythicLevel', Level: c.Level }),
  PrerequisiteAlignment: (c) =>
    requires({
      kind: 'alignment',
      Alignment: c.Alignment,
      IngorePrerequisiteCheck: c.IngorePrerequisiteCheck,
      ArchetypeAlignment: c.ArchetypeAlignment,
    }),
  PrerequisiteProficiency: (c) =>
    requires({
      kind: 'proficiency',
      ArmorProficiencies: c.ArmorProficiencies ?? [],
      WeaponProficiencies: c.WeaponProficiencies ?? [],
    }),
  PrerequisiteNotProficient: (c) =>
    forbids({
      kind: 'proficiency',
      ArmorProficiencies: c.ArmorProficiencies ?? [],
      WeaponProficiencies: c.WeaponProficiencies ?? [],
    }),
  PrerequisiteCasterType: (c) =>
    requires({ kind: 'casterType', IsArcane: c.IsArcane, OnlySpontaneous: false, RequiredSpellLevel: null }),
  PrerequisiteCasterTypeSpellLevel: (c) =>
    requires({
      kind: 'casterType',
      IsArcane: c.IsArcane,
      OnlySpontaneous: c.OnlySpontaneous,
      RequiredSpellLevel: c.RequiredSpellLevel,
    }),
  PrerequisiteClassSpellLevel: (c) =>
    requires({
      kind: 'classSpellLevel',
      m_CharacterClass: guid(c.m_CharacterClass),
      RequiredSpellLevel: c.RequiredSpellLevel,
    }),
  PrerequisiteParametrizedFeature: (c) =>
    requires({
      kind: 'parametrizedFeature',
      m_Feature: guid(c.m_Feature),
      ParameterType: c.ParameterType,
      WeaponCategory: c.WeaponCategory,
      SpellSchool: c.SpellSchool,
    }),
  PrerequisiteParametrizedWeaponSubcategory: (c) =>
    requires({ kind: 'weaponSubCategory', m_Feature: guid(c.m_Feature), SubCategory: c.SubCategory }),
  PrerequisiteSelectionPossible: (c) => requires({ kind: 'selectionPossible', m_ThisFeature: guid(c.m_ThisFeature) }),
  PrerequisitePet: (c) => either(c.NoCompanion, { kind: 'pet', Type: c.Type }),
  PrerequisiteIsPet: (c) => either(c.Not, { kind: 'isPet' }),
  PrerequisiteMainCharacter: (c) => either(c.Companion, { kind: 'mainCharacter' }),
  PrerequisiteEtude: () => requires({ kind: 'story' }),
  PrerequisiteAnySpellsInSpellbook: (c) =>
    requires({ kind: 'spellsInSpellbook', m_SpellSpecializationFeat: guid(c.m_SpellSpecializationFeat) }),
  PrerequisiteCondition: (c) => requires({ kind: 'condition', Condition: c.Condition }),
};

export const prerequisiteTypes: ReadonlySet<string> = new Set(Object.keys(readers));

export { isPrerequisite, paramPrerequisiteTypes };

function isReadable(component: Component): component is Prerequisite {
  return prerequisiteTypes.has(component.$type);
}

const leavesByLookup = new WeakMap<Lookup, WeakMap<BlueprintBase, readonly PrerequisiteLeaf[]>>();

export function prerequisites(blueprint: BlueprintBase, blueprints: Lookup): readonly PrerequisiteLeaf[] {
  let cache = leavesByLookup.get(blueprints);
  if (cache === undefined) leavesByLookup.set(blueprints, (cache = new WeakMap()));
  let leaves = cache.get(blueprint);
  if (leaves === undefined) cache.set(blueprint, (leaves = readLeaves(blueprint, blueprints)));
  return leaves;
}

function readLeaves(blueprint: BlueprintBase, blueprints: Lookup): readonly PrerequisiteLeaf[] {
  const leaves: PrerequisiteLeaf[] = [];
  for (const component of blueprint.Components) {
    if (!isPrerequisite(component)) continue;
    if (!isReadable(component)) throw new Error(`${blueprint.assetName}: P can't read ${component.$type}`);
    const read = readers[component.$type] as Reader<typeof component>;
    leaves.push({
      Group: component.Group,
      CheckInProgression: component.CheckInProgression,
      IsFeatureSelectionWhiteList: component.IsFeatureSelectionWhiteList,
      component,
      ...read(component, blueprints),
    });
  }
  return leaves;
}

export function paramPrerequisites(blueprint: BlueprintBase): readonly PrerequisiteConditionForWeaponCategory[] {
  return blueprint.Components.filter(
    (c): c is PrerequisiteConditionForWeaponCategory => c.$type === 'PrerequisiteConditionForWeaponCategory',
  );
}

export function namedFacts(leaf: PrerequisiteLeaf): readonly Guid[] {
  const { names } = leaf;
  switch (names.kind) {
    case 'fact':
    case 'parametrizedFeature':
    case 'weaponSubCategory':
      return [names.m_Feature];
    case 'selectionPossible':
      return [names.m_ThisFeature];
    case 'facts':
      return names.m_Features;
    case 'condition':
      return conditionFacts(names.Condition);
    default:
      return [];
  }
}

export function namedBlueprints(leaf: PrerequisiteLeaf): readonly Guid[] {
  const named = namedWithLevel(leaf).map((n) => n.guid);
  return leaf.names.kind === 'archetypeLevel' ? [leaf.names.m_CharacterClass, ...named] : named;
}

export function namedWithLevel(leaf: PrerequisiteLeaf): readonly { readonly guid: Guid; readonly level?: number }[] {
  const { names } = leaf;
  switch (names.kind) {
    case 'classLevel':
      return [{ guid: names.m_CharacterClass, level: names.Level }];
    case 'archetypeLevel':
      return [{ guid: names.m_Archetype, level: names.Level }];
    case 'classSpellLevel':
      return [{ guid: names.m_CharacterClass }];
    default:
      return namedFacts(leaf).map((guid) => ({ guid }));
  }
}

export function conditionFacts(tree: Condition): Guid[] {
  switch (tree.$type) {
    case 'OrAndLogic':
      return tree.ConditionsChecker.Conditions.flatMap(conditionFacts);
    case 'ContextConditionHasFact':
    case 'HasFact':
      return [guid(tree.m_Fact)];
    case 'ContextConditionBuffRank':
      return tree.Fact === null ? [] : [guid(tree.Fact)];
    default:
      return [];
  }
}
