// P, the prerequisite view (guide §4). The game keeps a blueprint's prerequisites as a flat list of components, each
// in group All, Any or ForcedTrue; negation is a field or a component type of its own. So there is nothing to
// normalise: P only reads each component into one leaf shape that the walk, refusals, the grant index and the
// "this enables / this needs" links all share, so none of them interprets the component types on its own. One type,
// PrerequisiteCondition, carries a nested condition tree; its leaf names the tree (map ticket 20).
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
} from './data/types';

/** Whether the leaf needs what it names, or must not have it. */
export type Polarity = 'requires' | 'forbids';

/**
 * What a leaf names. Each kind keeps its component's fields under the game's names, with each reference resolved to a
 * GUID; the walk judges them. Where a component's flag inverts it (`Not`, `m_RestrictIfNot`, `NoCompanion`,
 * `Companion`), the flag becomes the leaf's polarity, and a negating type (`PrerequisiteNoFeature`) names what it
 * forbids.
 */
export type Named =
  /** A fact held (PrerequisiteFeature, PrerequisiteNoFeature, PrerequisitePlayerHasFeature). */
  | { readonly kind: 'fact'; readonly m_Feature: Guid }
  /**
   * At least `Amount` facts of a list (PrerequisiteFeaturesFromList). `IsDeity` is the component's own property: the
   * list is all deities, so one is enough and a first level with no deity yet considers it met.
   */
  | { readonly kind: 'facts'; readonly m_Features: readonly Guid[]; readonly Amount: number; readonly IsDeity: boolean }
  /**
   * At least `Level` levels of a class, counting levels ClassLevelsForPrerequisites lends (PrerequisiteClassLevel;
   * PrerequisiteNoClassLevel forbids `Level` 1).
   */
  | { readonly kind: 'classLevel'; readonly m_CharacterClass: Guid; readonly Level: number }
  /** At least `Level` levels of a class taken with an archetype (PrerequisiteNoArchetype forbids `Level` 1). */
  | {
      readonly kind: 'archetypeLevel';
      readonly m_CharacterClass: Guid;
      readonly m_Archetype: Guid;
      readonly Level: number;
    }
  /** A stat's value: permanent (PrerequisiteStatValue), or full (PrerequisiteFullStatValue, the leaf's component). */
  | { readonly kind: 'stat'; readonly Stat: StatType; readonly Value: number }
  | { readonly kind: 'characterLevel'; readonly Level: number }
  | { readonly kind: 'mythicLevel'; readonly Level: number }
  /** An AlignmentMaskType flags value, with the component's first-level and archetype exceptions. */
  | {
      readonly kind: 'alignment';
      readonly Alignment: string | number;
      readonly IngorePrerequisiteCheck: boolean;
      readonly ArchetypeAlignment: boolean;
    }
  /** Proficiency with any of the listed groups and categories. Forbidding: lacking any of them. */
  | {
      readonly kind: 'proficiency';
      readonly ArmorProficiencies: readonly ArmorProficiencyGroup[];
      readonly WeaponProficiencies: readonly WeaponCategory[];
    }
  /**
   * A spellbook of a caster type (PrerequisiteCasterType), and with a spell level (PrerequisiteCasterTypeSpellLevel,
   * whose `RequiredSpellLevel` is null for the other).
   */
  | {
      readonly kind: 'casterType';
      readonly IsArcane: boolean;
      readonly OnlySpontaneous: boolean;
      readonly RequiredSpellLevel: number | null;
    }
  | { readonly kind: 'classSpellLevel'; readonly m_CharacterClass: Guid; readonly RequiredSpellLevel: number }
  /** A parametrized feat held for a parameter (weapon category or school; spell parameters are out of v1). */
  | {
      readonly kind: 'parametrizedFeature';
      readonly m_Feature: Guid;
      readonly ParameterType: FeatureParameterType;
      readonly WeaponCategory: WeaponCategory;
      readonly SpellSchool: SpellSchool;
    }
  | { readonly kind: 'weaponSubCategory'; readonly m_Feature: Guid; readonly SubCategory: WeaponSubCategory }
  /** A selection with at least one option still open. */
  | { readonly kind: 'selectionPossible'; readonly m_ThisFeature: Guid }
  /** A pet of a type, from a held fact's AddPet. */
  | { readonly kind: 'pet'; readonly Type: PetType }
  /** Being a pet. A Build is never one. */
  | { readonly kind: 'isPet' }
  /** Being the main character. A Build always is. */
  | { readonly kind: 'mainCharacter' }
  /** Story state: always met (map ticket 21). */
  | { readonly kind: 'story' }
  /** A spell for a spell-parametrized feat; those feats are out of v1 (map ticket 22). */
  | { readonly kind: 'spellsInSpellbook'; readonly m_SpellSpecializationFeat: Guid }
  /** A nested And/Or/Not condition tree (map ticket 20). */
  | { readonly kind: 'condition'; readonly Condition: Condition };

/** A leaf: one prerequisite component, with the fields every prerequisite shares (Prerequisite.cs) under their names. */
export interface PrerequisiteLeaf {
  readonly Group: PrerequisiteGroup;
  /** Whether a progression's grant checks this leaf (LevelUpHelper.AddFeaturesFromProgression). */
  readonly CheckInProgression: boolean;
  /** Whether a waived slot under `ExceptWhiteListed` still checks it (BlueprintFeature.MeetsPrerequisites). */
  readonly IsFeatureSelectionWhiteList: boolean;
  readonly polarity: Polarity;
  readonly names: Named;
  /** The component the leaf was read from. */
  readonly component: Prerequisite;
}

/** The blueprints a reader may look at besides the one whose list it reads: IsDeity reads the listed features. */
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

/**
 * Whether a blueprint is a deity: its Groups hold FeatureGroup.Deities (PrerequisiteFeaturesFromList.cs IsDeity and
 * ConsiderFulfilled both test this).
 */
export function isDeityFeature(bp: BlueprintBase | undefined): boolean {
  return bp !== undefined && 'Groups' in bp && (bp.Groups as readonly string[]).includes('Deities');
}

/**
 * Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity: every listed feature is a deity, and there
 * is at least one.
 */
function isDeity(features: readonly Guid[], blueprints: Lookup): boolean {
  return features.length > 0 && features.every((g) => isDeityFeature(blueprints.get(g)));
}

// Each reader cites the C# method it ports; paths are under decompiled/Assembly-CSharp/Kingmaker/.
const readers: { readonly [K in Prerequisite['$type']]: Reader<Extract<Prerequisite, { $type: K }>> } = {
  // Blueprints/Classes/Prerequisites/PrerequisiteFeature.cs CheckInternal: the unit has the fact.
  PrerequisiteFeature: (c) => requires({ kind: 'fact', m_Feature: guid(c.m_Feature) }),
  // Blueprints/Classes/Prerequisites/PrerequisiteNoFeature.cs CheckInternal: the unit lacks the fact.
  PrerequisiteNoFeature: (c) => forbids({ kind: 'fact', m_Feature: guid(c.m_Feature) }),
  // Blueprints/Classes/Prerequisites/PrerequisitePlayerHasFeature.cs CheckInternal: the main character has it.
  PrerequisitePlayerHasFeature: (c) => requires({ kind: 'fact', m_Feature: guid(c.m_Feature) }),
  // Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs CheckInternal: Amount of the list, or one when
  // IsDeity, inverted by m_RestrictIfNot.
  PrerequisiteFeaturesFromList: (c, blueprints) => {
    const m_Features = c.m_Features.map(guid);
    return either(c.m_RestrictIfNot, {
      kind: 'facts',
      m_Features,
      Amount: c.Amount,
      IsDeity: isDeity(m_Features, blueprints),
    });
  },
  // Blueprints/Classes/Prerequisites/PrerequisiteClassLevel.cs CheckInternal: at least Level levels, or with Not
  // fewer.
  PrerequisiteClassLevel: (c) =>
    either(c.Not, { kind: 'classLevel', m_CharacterClass: guid(c.m_CharacterClass), Level: c.Level }),
  // Blueprints/Classes/Prerequisites/PrerequisiteNoClassLevel.cs CheckInternal: no level in the class.
  PrerequisiteNoClassLevel: (c) =>
    forbids({ kind: 'classLevel', m_CharacterClass: guid(c.m_CharacterClass), Level: 1 }),
  // Blueprints/Classes/Prerequisites/PrerequisiteArchetypeLevel.cs CheckInternal.
  PrerequisiteArchetypeLevel: (c) =>
    requires({
      kind: 'archetypeLevel',
      m_CharacterClass: guid(c.m_CharacterClass),
      m_Archetype: guid(c.m_Archetype),
      Level: c.Level,
    }),
  // Blueprints/Classes/Prerequisites/PrerequisiteNoArchetype.cs CheckInternal: the class isn't taken with it.
  PrerequisiteNoArchetype: (c) =>
    forbids({
      kind: 'archetypeLevel',
      m_CharacterClass: guid(c.m_CharacterClass),
      m_Archetype: guid(c.m_Archetype),
      Level: 1,
    }),
  // Blueprints/Classes/Prerequisites/PrerequisiteStatValue.cs CheckUnit, and
  // Designers/Mechanics/Prerequisites/PrerequisiteFullStatValue.cs CheckUnit for the full value.
  PrerequisiteStatValue: (c) => requires({ kind: 'stat', Stat: c.Stat, Value: c.Value }),
  PrerequisiteFullStatValue: (c) => requires({ kind: 'stat', Stat: c.Stat, Value: c.Value }),
  // Blueprints/Classes/Prerequisites/PrerequisiteCharacterLevel.cs and PrerequisiteMythicLevel.cs CheckInternal.
  PrerequisiteCharacterLevel: (c) => requires({ kind: 'characterLevel', Level: c.Level }),
  PrerequisiteMythicLevel: (c) => requires({ kind: 'mythicLevel', Level: c.Level }),
  // Blueprints/Classes/Prerequisites/PrerequisiteAlignment.cs CheckInternal.
  PrerequisiteAlignment: (c) =>
    requires({
      kind: 'alignment',
      Alignment: c.Alignment,
      IngorePrerequisiteCheck: c.IngorePrerequisiteCheck,
      ArchetypeAlignment: c.ArchetypeAlignment,
    }),
  // Blueprints/Classes/Prerequisites/PrerequisiteProficiency.cs and PrerequisiteNotProficient.cs CheckInternal.
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
  // Blueprints/Classes/Prerequisites/PrerequisiteCasterType.cs CheckInternal.
  PrerequisiteCasterType: (c) =>
    requires({ kind: 'casterType', IsArcane: c.IsArcane, OnlySpontaneous: false, RequiredSpellLevel: null }),
  // Blueprints/Classes/Prerequisites/PrerequisiteCasterTypeSpellLevel.cs CheckInternal, GetCasterTypeSpellLevel.
  PrerequisiteCasterTypeSpellLevel: (c) =>
    requires({
      kind: 'casterType',
      IsArcane: c.IsArcane,
      OnlySpontaneous: c.OnlySpontaneous,
      RequiredSpellLevel: c.RequiredSpellLevel,
    }),
  // Blueprints/Classes/Prerequisites/PrerequisiteClassSpellLevel.cs CheckInternal.
  PrerequisiteClassSpellLevel: (c) =>
    requires({
      kind: 'classSpellLevel',
      m_CharacterClass: guid(c.m_CharacterClass),
      RequiredSpellLevel: c.RequiredSpellLevel,
    }),
  // Blueprints/Classes/Prerequisites/PrerequisiteParametrizedFeature.cs CheckInternal, CheckFeature.
  PrerequisiteParametrizedFeature: (c) =>
    requires({
      kind: 'parametrizedFeature',
      m_Feature: guid(c.m_Feature),
      ParameterType: c.ParameterType,
      WeaponCategory: c.WeaponCategory,
      SpellSchool: c.SpellSchool,
    }),
  // Blueprints/Classes/Prerequisites/PrerequisiteParametrizedWeaponSubcategory.cs CheckInternal, CheckFeature.
  PrerequisiteParametrizedWeaponSubcategory: (c) =>
    requires({ kind: 'weaponSubCategory', m_Feature: guid(c.m_Feature), SubCategory: c.SubCategory }),
  // Blueprints/Classes/Prerequisites/PrerequisiteSelectionPossible.cs CheckInternal.
  PrerequisiteSelectionPossible: (c) => requires({ kind: 'selectionPossible', m_ThisFeature: guid(c.m_ThisFeature) }),
  // Blueprints/Classes/Prerequisites/PrerequisitePet.cs CheckInternal: a pet of the type, or with NoCompanion none.
  PrerequisitePet: (c) => either(c.NoCompanion, { kind: 'pet', Type: c.Type }),
  // Blueprints/Classes/Prerequisites/PrerequisiteIsPet.cs CheckInternal.
  PrerequisiteIsPet: (c) => either(c.Not, { kind: 'isPet' }),
  // Blueprints/Classes/Prerequisites/PrerequisiteMainCharacter.cs CheckInternal: IsMainCharacter != Companion.
  PrerequisiteMainCharacter: (c) => either(c.Companion, { kind: 'mainCharacter' }),
  // Blueprints/Classes/Prerequisites/PrerequisiteEtude.cs CheckInternal; story state is always met.
  PrerequisiteEtude: () => requires({ kind: 'story' }),
  // Blueprints/Classes/Prerequisites/PrerequisiteAnySpellsInSpellbook.cs CheckInternal.
  PrerequisiteAnySpellsInSpellbook: (c) =>
    requires({ kind: 'spellsInSpellbook', m_SpellSpecializationFeat: guid(c.m_SpellSpecializationFeat) }),
  // Blueprints/Classes/Prerequisites/PrerequisiteCondition.cs CheckInternal: the tree holds.
  PrerequisiteCondition: (c) => requires({ kind: 'condition', Condition: c.Condition }),
};

/** The prerequisite component types P reads. */
export const prerequisiteTypes: ReadonlySet<string> = new Set(Object.keys(readers));

/**
 * Parameter checks (IParamPrerequisite): components named like prerequisites that are not Prerequisites, so they
 * have no group and don't join MeetsPrerequisites. BlueprintParametrizedFeature.CanSelect runs them per parameter.
 */
export const paramPrerequisiteTypes: ReadonlySet<string> = new Set(['PrerequisiteConditionForWeaponCategory']);

/** Whether a component is a prerequisite: the game's prerequisite classes share the `Prerequisite` prefix. */
export function isPrerequisite(component: Component): boolean {
  return component.$type.startsWith('Prerequisite') && !paramPrerequisiteTypes.has(component.$type);
}

function isReadable(component: Component): component is Prerequisite {
  return prerequisiteTypes.has(component.$type);
}

/** Each lookup's blueprints' leaves, read once: the walk asks for the same lists many times. */
const leavesOf = new WeakMap<Lookup, WeakMap<BlueprintBase, readonly PrerequisiteLeaf[]>>();

/**
 * A blueprint's prerequisites as leaves, in the game's component order. Load checks guarantee every one is readable.
 * `blueprints` holds the blueprints the leaves name, for the readers that look at them (IsDeity).
 */
export function prerequisites(blueprint: BlueprintBase, blueprints: Lookup): readonly PrerequisiteLeaf[] {
  let cache = leavesOf.get(blueprints);
  if (cache === undefined) leavesOf.set(blueprints, (cache = new WeakMap()));
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

/** A parametrized feat's parameter checks (BlueprintParametrizedFeature.CanSelect, IParamPrerequisite). */
export function paramPrerequisites(blueprint: BlueprintBase): readonly PrerequisiteConditionForWeaponCategory[] {
  return blueprint.Components.filter(
    (c): c is PrerequisiteConditionForWeaponCategory => c.$type === 'PrerequisiteConditionForWeaponCategory',
  );
}

/**
 * The facts a leaf names: the fact or list it requires or forbids, and, inside a condition tree, every fact a has-fact
 * or rank condition names. The importer's grantor check and its name qualifier read this.
 */
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

/**
 * Every blueprint a leaf names that a Build gets through a grant: its facts (`namedFacts`), and the class and archetype
 * of a class-level, archetype-level or class spell-level leaf. The importer's grantor check reads this, so a leaf on a
 * class no Build can take is found like one on such a fact.
 */
export function namedBlueprints(leaf: PrerequisiteLeaf): readonly Guid[] {
  const named = namedWithLevel(leaf).map((n) => n.guid);
  // An archetype-level leaf names its class too, which `namedWithLevel` leaves to the archetype.
  return leaf.names.kind === 'archetypeLevel' ? [leaf.names.m_CharacterClass, ...named] : named;
}

/**
 * What a leaf names as a player reads it: its facts (`namedFacts`), the class of a class-level or class spell-level
 * leaf, and the archetype of an archetype-level leaf, whose class the archetype already implies. A class-level or
 * archetype-level leaf gives its level too. The importer's name qualifier reads this (build ticket 02g).
 */
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

/** Every fact a condition tree's has-fact and rank conditions name. */
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
