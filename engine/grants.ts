// G, the grant index (guide §4): the one place that answers "which places grant this fact, and what does this entry
// grant?". It is built once from checked data, over every kind of grant the planner holds. Like P, it reads through
// two complete tables: one keyed by every blueprint type, for the grants a blueprint's own fields make, and one keyed
// by every grant component type. Who holds a fact in a Build is the walk's record, not G's (build ticket 03).
import { enchantmentsOf } from './data/items';
import { blueprintRoot, type CheckedData } from './data/load';
import {
  guids,
  isShown,
  kindOf,
  progressionRootFields,
  refGuid,
  type ActionList,
  type Blueprint,
  type Component,
  type GrantAction,
  type GrantComponent,
  type Guid,
  type HasArmorFeatureUnlock,
  type MonkNoArmorAndMonkWeaponFeatureUnlock,
  type MonkNoArmorFeatureUnlock,
  type ParametrizedFeatureGrant,
  type Ref,
  type SpellSchool,
  type StatType,
  type WeaponCategory,
} from './data/types';

/**
 * The grant kinds a blueprint's own fields make (`blueprintReaders`), as against its grant components. The coverage
 * check (engine/areas.test.ts) holds the walk to applying each, as it does for `grantTypes`.
 */
export const fieldGrantKinds = [
  'root',
  'classProgression',
  'classArchetype',
  'levelEntry',
  'archetypeAdd',
  'archetypeRemove',
  'selectionOption',
  'raceFeature',
  'ActivatableBuff',
  'itemEnchantment',
  'shieldPart',
] as const satisfies readonly GrantKind[];

export type FieldGrantKind = (typeof fieldGrantKinds)[number];

/**
 * How a grantor gives a fact. A grant component's kind is its type, and a grant action's its action type. The
 * others are planner names, each documented below with the game's field or component part it stands for: `root`,
 * `classProgression`, `classArchetype`, `levelEntry`, `archetypeAdd`, `archetypeRemove`, `selectionOption`,
 * `raceFeature`, `FactSinglifyRemove`, `GearUnlock`, `ActivatableBuff`, `itemEnchantment` and `shieldPart`.
 */
export type GrantKind =
  /**
   * BlueprintRoot's ProgressionRoot: every character's character-level feats, and the classes and races on offer. Also
   * `m_DefaultPlayerCharacter`, the unit every main character is made from, whose AddFacts a Build holds (map 28).
   */
  | 'root'
  /** BlueprintCharacterClass.m_Progression: a class's progression, held from its first level. */
  | 'classProgression'
  /** BlueprintCharacterClass.m_Archetypes: an archetype the class can be taken with (a Class choice, not a fact). */
  | 'classArchetype'
  /** BlueprintProgression.LevelEntries: granted at `level` of the progression. */
  | 'levelEntry'
  /** BlueprintArchetype.AddFeatures: granted at `level` of the class taken with the archetype. */
  | 'archetypeAdd'
  /** BlueprintArchetype.RemoveFeatures: removed, not granted, at `level`. */
  | 'archetypeRemove'
  /** BlueprintFeatureSelection.m_AllFeatures: an option of the selection's slot. */
  | 'selectionOption'
  /** BlueprintRace.m_Features: granted at level 0 with the race (SelectRace.Apply). */
  | 'raceFeature'
  | 'AddFacts'
  /** AddFeatureOnClassLevel: held from `level` of the component's class (before it, with `BeforeThisLevel`). */
  | 'AddFeatureOnClassLevel'
  | 'AddFeatureIfHasFact'
  | 'AddFeatureOnApply'
  /** AddFeatureOnAlignment: held while the character's alignment has the component's axis. */
  | 'AddFeatureOnAlignment'
  /** AddFeatureOnSkill: held once a stat's permanent value reaches the component's minimum. */
  | 'AddFeatureOnSkill'
  /** AddParametrizedFeatures: a parametrized feat held at a set parameter, which the grant carries. */
  | 'AddParametrizedFeatures'
  /**
   * AddFeatureParametrized: an option of a `FeatureSelection` parametrized feat, held when the feat is taken with it as
   * its parameter, which the grant carries.
   */
  | 'AddFeatureParametrized'
  /** FactSinglify.m_NewFacts: held, one copy each, once the grantor is first gained. */
  | 'FactSinglify'
  /** FactSinglify.m_OldFacts: removed, not granted, when the grantor is first gained. */
  | 'FactSinglifyRemove'
  /**
   * KensaiChosenWeapon: a parametrized feat held at the grantor's own weapon category, which the Build's pick of the
   * grantor sets, so the grant carries no parameter.
   */
  | 'KensaiChosenWeapon'
  /** AddFactContextActions: a ContextActionAddFeature, possibly under Conditional trees, run when the fact is gained. */
  | 'ContextActionAddFeature'
  /** ActivateTrigger and AddFactContextActions: an AddFact action. */
  | 'AddFact'
  /** AddFactContextActions: a permanent ContextActionApplyBuff of a buff that is a Grant carrier (map ticket 23). */
  | 'ContextActionApplyBuff'
  /**
   * A choice-carrying ability's AbilityApplyFact (map tickets 24 and 26): an option of a pick made through the ability,
   * a daily choice, not part of a Build (map tickets 24 and 26).
   */
  | 'AbilityApplyFact'
  /** MonkNoArmorFeatureUnlock, MonkNoArmorAndMonkWeaponFeatureUnlock, HasArmorFeatureUnlock: held while the Gear fits. */
  | 'GearUnlock'
  /** BuffExtraEffects: the extra buff, held while the checked buff is on (a Shifter aspect a Build keeps on). */
  | 'BuffExtraEffects'
  /** BlueprintActivatableAbility.m_Buff: the buff a toggled ability applies while on. */
  | 'ActivatableBuff'
  /** RemoveFeatureOnApply: removes the fact, once, when the grantor is gained. */
  | 'RemoveFeatureOnApply'
  /**
   * An item's enchantments: its own `m_Enchantments` and its weapon or armour type's (BlueprintItem.CollectEnchantments),
   * held while the item is worn.
   */
  | 'itemEnchantment'
  /** BlueprintItemShield: its armour half and bash weapon, worn with it (BlueprintItemShield.CollectEnchantments). */
  | 'shieldPart'
  /** AddUnitFeatureEquipment, AddUnitFactEquipment: a fact the wielder holds while the enchanted item is worn. */
  | 'AddUnitFeatureEquipment'
  | 'AddUnitFactEquipment';

/**
 * The parameter a parametrized feat is held at (Kingmaker/UnitLogic/FeatureParam.cs), in the one field the feat's
 * `ParameterType` uses.
 */
export type GrantParam =
  | { readonly WeaponCategory: WeaponCategory }
  | { readonly SpellSchool: SpellSchool }
  | { readonly StatType: StatType }
  | { readonly Blueprint: Guid };

export interface Grant {
  readonly grantor: Guid;
  readonly granted: Guid;
  readonly kind: GrantKind;
  /**
   * The level, for level entries and archetype adds and removes, and the class level an AddFeatureOnClassLevel grants
   * from (none when it grants only before that level).
   */
  readonly level?: number;
  /** The parameter, for a grant of a parametrized feat at one parameter, or of a parametrized feat's option. */
  readonly param?: GrantParam;
}

/** Kinds that take a fact away instead of giving it. */
const REMOVES: ReadonlySet<GrantKind> = new Set(['archetypeRemove', 'RemoveFeatureOnApply', 'FactSinglifyRemove']);

/** Whether a grant takes its fact away instead of giving it. */
export function removes(grant: Grant): boolean {
  return REMOVES.has(grant.kind);
}

export interface GrantIndex {
  /** Every place that grants `fact`, removals excluded. */
  grantorsOf(fact: Guid): readonly Grant[];
  /** Everything `entry` grants or removes. */
  grantsOf(entry: Guid): readonly Grant[];
  /**
   * The selections whose slots `entry` opens: the selections it grants (each opens a slot when held), and, for a
   * selection, its options that are themselves selections (each opens a nested slot at the same level when picked).
   */
  slotsOpenedBy(entry: Guid): readonly Guid[];
  /**
   * The grantors above `fact` in `within` (by default, what a Build can reach from the root), breadth first: each once,
   * at the fewest grant steps up, with the nearest grant level on its path. The climb goes on past every grantor
   * except those `stopAt` admits, which it returns without climbing above.
   */
  climb(fact: Guid, stopAt: (grantor: Guid) => boolean, within?: ReadonlySet<Guid>): readonly Climbed[];
  /**
   * For a fact a player never sees (`isShown`: nameless or hidden), its nearest shown grantors that a Build can reach,
   * grouped by kind: a grantor's first FeatureGroup (`Deities`, `BloodLine`…), else its blueprint type. Grantors that
   * aren't shown are climbed through. Refusals word such a prerequisite from this ("Needs a deity that allows it",
   * map ticket 19).
   */
  namedGrantorsByKind(fact: Guid): ReadonlyMap<string, readonly Guid[]>;
}

/** One grantor a climb finds (`GrantIndex.climb`). */
export interface Climbed {
  readonly grantor: Guid;
  /** Grant steps up from the fact. */
  readonly depth: number;
  /** The nearest grant level on the path from the fact, when a grant on it carries one. */
  readonly level: number | undefined;
}

/**
 * The parameter of one AddParametrizedFeatures entry (UnitLogic/FactLogic/AddParametrizedFeatures.cs FeatureData.Param):
 * by the feat's `ParameterType`, an object for `Custom`, `FeatureSelection` and the spell types. Undefined when the feat
 * isn't held or the object is unset.
 */
function paramOf(entry: ParametrizedFeatureGrant, feat: Blueprint | undefined): GrantParam | undefined {
  if (feat?.$type !== 'BlueprintParametrizedFeature') return undefined;
  switch (feat.ParameterType) {
    case 'WeaponCategory':
      return { WeaponCategory: entry.ParamWeaponCategory };
    case 'SpellSchool':
      return { SpellSchool: entry.ParamSpellSchool };
    case 'Skill':
      return { StatType: entry.Stat };
    default: {
      const guid = refGuid(entry.ParamObject);
      return guid === undefined ? undefined : { Blueprint: guid };
    }
  }
}

/** Where a reader puts one blueprint's grants, with what readers look up. */
interface Grants {
  readonly bp: Blueprint;
  readonly blueprints: CheckedData['blueprints'];
  /** A grant of every fact `refs` names, at `level` when given. */
  add(refs: readonly (Ref | null)[] | null | undefined, kind: GrantKind, level?: number): void;
  /** One grant of `granted`, at `param` when given. */
  addAt(granted: Guid, kind: GrantKind, param: GrantParam | undefined): void;
}

type Reader<T> = (value: T, out: Grants) => void;
type Typed<K extends Blueprint['$type']> = Extract<Blueprint, { readonly $type: K }>;

/** For a type whose own fields grant nothing; its components still may. */
const nothing: Reader<unknown> = () => {};

/** The worn places' item types: every item type `kindOf` lists that `blueprintReaders` doesn't name. */
type WornItemType = Extract<Blueprint['$type'], `BlueprintItemEquipment${string}`>;

// Each reader cites what it reads; paths are under decompiled/Assembly-CSharp/Kingmaker/.

/** Blueprints/Items/BlueprintItem.cs CollectEnchantments (items.ts): its weapon or armour type's and its own. */
const typedItem: Reader<Typed<'BlueprintItemWeapon' | 'BlueprintItemArmor'>> = (bp, out) => {
  for (const g of enchantmentsOf(bp, out.blueprints)) out.addAt(g, 'itemEnchantment', undefined);
};

/** Blueprints/Items/BlueprintItem.cs CollectEnchantments, for a worn place's item: its own enchantments. */
const wornItem: Reader<Typed<WornItemType>> = (bp, out) => out.add(bp.m_Enchantments, 'itemEnchantment');

/** What each blueprint type's own fields grant. A worn place's item type is read by `wornItem`, through `kindOf`. */
const blueprintReaders: { readonly [K in Exclude<Blueprint['$type'], WornItemType>]: Reader<Typed<K>> } = {
  // What every character starts from or is offered: UnitLogic/UnitProgressionData.cs UnitProgressionData (the feats
  // progression); Blueprints/Root/ProgressionRoot.cs AvailableCharacterClasses and AvailableCharacterMythics (the
  // classes and Mythic classes on offer); UnitLogic/Class/LevelUp/Actions/SelectRace.cs's races, which
  // UI/MVVM/_VM/CharGen/Phases/Race/CharGenRacePhaseVM.cs CharGenRacePhaseVM offers; UnitProgressionData.cs
  // AddClassLevel (the Mythic starting class) and LevelUpController.cs Commit and GetEffectiveLevel (the Legend
  // stand-in and Legend); FeatureSelectionState.cs HasLevelupPlan and AddClassLevels.cs PerformSelections (the deity and
  // basic feat selections); and Game.cs LoadNewGame, which makes the main character from m_DefaultPlayerCharacter
  // (map 28).
  BlueprintRoot: (bp, out) => {
    for (const field of progressionRootFields) out.add([bp.Progression[field]].flat(), 'root');
    out.add([bp.m_DefaultPlayerCharacter], 'root');
  },
  // UnitLogic/Class/LevelUp/Actions/ApplyClassMechanics.cs Apply: its progression; Actions/AddArchetype.cs Check: the
  // archetypes it can be taken with.
  BlueprintCharacterClass: (bp, out) => {
    out.add([bp.m_Progression], 'classProgression');
    out.add(bp.m_Archetypes, 'classArchetype');
  },
  // UnitLogic/Class/LevelUp/Actions/LevelUpHelper.cs UpdateProgression: each level entry's features, at its level.
  BlueprintProgression: (bp, out) => {
    for (const e of bp.LevelEntries) out.add(e.m_Features, 'levelEntry', e.Level);
  },
  // UnitLogic/ProgressionData.cs CalculateLevelEntries: AddFeatures and RemoveFeatures, each at its level.
  BlueprintArchetype: (bp, out) => {
    for (const e of bp.AddFeatures) out.add(e.m_Features, 'archetypeAdd', e.Level);
    for (const e of bp.RemoveFeatures) out.add(e.m_Features, 'archetypeRemove', e.Level);
  },
  // Blueprints/Classes/Selection/BlueprintFeatureSelection.cs CanSelect: m_AllFeatures, the options of its slot.
  BlueprintFeatureSelection: (bp, out) => out.add(bp.m_AllFeatures, 'selectionOption'),
  // UnitLogic/Class/LevelUp/Actions/SelectRace.cs Apply: the race's features, at level 0.
  BlueprintRace: (bp, out) => out.add(bp.m_Features, 'raceFeature'),
  // UnitLogic/ActivatableAbilities/ActivatableAbility.cs ReapplyBuff: m_Buff, the buff applied while the toggle is on.
  BlueprintActivatableAbility: (bp, out) => out.add([bp.m_Buff], 'ActivatableBuff'),
  BlueprintItemWeapon: typedItem,
  BlueprintItemArmor: typedItem,
  // Blueprints/Items/Shields/BlueprintItemShield.cs CollectEnchantments: its armour half and bash weapon.
  BlueprintItemShield: (bp, out) => out.add([bp.m_ArmorComponent, bp.m_WeaponComponent], 'shieldPart'),
  // These grant only through their components.
  BlueprintFeature: nothing,
  // Its options are granted by its AddFeatureParametrized component.
  BlueprintParametrizedFeature: nothing,
  // A spellbook is advanced or joined, not held.
  BlueprintFeatureReplaceSpellbook: nothing,
  BlueprintFeatureSelectMythicSpellbook: nothing,
  BlueprintBuff: nothing,
  BlueprintAbility: nothing,
  BlueprintUnit: nothing,
  BlueprintEquipmentEnchantment: nothing,
  BlueprintWeaponEnchantment: nothing,
  BlueprintArmorEnchantment: nothing,
  // Rule data, read by the walk.
  BlueprintStatProgression: nothing,
  BlueprintSpellsTable: nothing,
  BlueprintSpellbook: nothing,
  BlueprintMythicsSettings: nothing,
  // A type's enchantments count through the item made of it (`typedItem`).
  BlueprintWeaponType: nothing,
  BlueprintArmorType: nothing,
  BlueprintShieldType: nothing,
};

/** Designers/Mechanics/Buffs/<type>.cs: m_NewFact, held while the Gear meets the component's condition. */
const gearUnlock: Reader<MonkNoArmorFeatureUnlock | MonkNoArmorAndMonkWeaponFeatureUnlock | HasArmorFeatureUnlock> = (
  c,
  out,
) => out.add([c.m_NewFact], 'GearUnlock');

/** What each grant component gives or takes away. */
const componentReaders: { readonly [K in GrantComponent['$type']]: Reader<Extract<GrantComponent, { $type: K }>> } = {
  // UnitLogic/FactLogic/AddFacts.cs UpdateFacts.
  AddFacts: (c, out) => out.add(c.m_Facts, 'AddFacts'),
  // Designers/Mechanics/Facts/AddFeatureOnClassLevel.cs Apply: held from Level, or below it with BeforeThisLevel.
  AddFeatureOnClassLevel: (c, out) =>
    out.add([c.m_Feature], 'AddFeatureOnClassLevel', c.BeforeThisLevel ? undefined : c.Level),
  // Designers/Mechanics/Facts/AddFeatureIfHasFact.cs Apply.
  AddFeatureIfHasFact: (c, out) => out.add([c.m_Feature], 'AddFeatureIfHasFact'),
  // Designers/Mechanics/Facts/AddFeatureOnApply.cs OnActivate.
  AddFeatureOnApply: (c, out) => out.add([c.m_Feature], 'AddFeatureOnApply'),
  // Designers/Mechanics/Facts/RemoveFeatureOnApply.cs OnActivate: a removal.
  RemoveFeatureOnApply: (c, out) => out.add([c.m_Feature], 'RemoveFeatureOnApply'),
  // Designers/Mechanics/Facts/AddFeatureOnAlignment.cs OnActivate.
  AddFeatureOnAlignment: (c, out) => out.add(c.m_Facts, 'AddFeatureOnAlignment'),
  // Designers/Mechanics/Facts/AddFeatureOnSkill.cs OnActivate.
  AddFeatureOnSkill: (c, out) => out.add(c.m_Facts, 'AddFeatureOnSkill'),
  // UnitLogic/FactLogic/AddParametrizedFeatures.cs OnActivate: each feat at its entry's parameter (`paramOf`).
  AddParametrizedFeatures: (c, out) => {
    for (const entry of c.m_Features) {
      const granted = refGuid(entry.m_Feature);
      if (granted !== undefined)
        out.addAt(granted, 'AddParametrizedFeatures', paramOf(entry, out.blueprints.get(granted)));
    }
  },
  // Designers/Mechanics/Facts/AddFeatureParametrized.cs OnActivate: the option the feat is taken with, which is the
  // feat's own parameter; Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs ExtractSelectionItems: the
  // options are its BlueprintParameterVariants.
  AddFeatureParametrized: (_c, out) => {
    if (out.bp.$type !== 'BlueprintParametrizedFeature') return;
    for (const granted of guids(out.bp.BlueprintParameterVariants))
      out.addAt(granted, 'AddFeatureParametrized', { Blueprint: granted });
  },
  // Designers/Mechanics/Facts/FactSinglify.cs OnActivate: the old facts go, the new ones are held.
  FactSinglify: (c, out) => {
    out.add(c.m_OldFacts, 'FactSinglifyRemove');
    out.add(c.m_NewFacts, 'FactSinglify');
  },
  // Designers/Mechanics/Facts/KensaiChosenWeapon.cs OnActivate.
  KensaiChosenWeapon: (c, out) => out.add([c.m_Focus], 'KensaiChosenWeapon'),
  // UnitLogic/Mechanics/Components/AddFactContextActions.cs OnActivate: Activated.
  AddFactContextActions: (c, out) => actionGrants(c.Activated, out),
  // Designers/EventConditionActionSystem/Events/ActivateTrigger.cs Trigger: Actions.
  ActivateTrigger: (c, out) => actionGrants(c.Actions, out),
  // Designers/Mechanics/Facts/BuffExtraEffects.cs CheckAndReapply.
  BuffExtraEffects: (c, out) => out.add([c.m_ExtraEffectBuff], 'BuffExtraEffects'),
  // UnitLogic/Abilities/AbilityData.cs GetConversions: each of m_Facts is an option of the ability, which
  // AbilityApplyFact.cs Apply then gives.
  AbilityApplyFact: (c, out) => out.add(c.m_Facts, 'AbilityApplyFact'),
  MonkNoArmorFeatureUnlock: gearUnlock,
  MonkNoArmorAndMonkWeaponFeatureUnlock: gearUnlock,
  HasArmorFeatureUnlock: gearUnlock,
  // Designers/Mechanics/EquipmentEnchants/AddUnitFeatureEquipment.cs OnActivate.
  AddUnitFeatureEquipment: (c, out) => out.add([c.m_Feature], 'AddUnitFeatureEquipment'),
  // Designers/Mechanics/EquipmentEnchants/AddUnitFactEquipment.cs OnActivate.
  AddUnitFactEquipment: (c, out) => out.add([c.m_Blueprint], 'AddUnitFactEquipment'),
};

/** The grant component types G reads: every member of `GrantComponent`. */
export const grantTypes: ReadonlySet<GrantComponent['$type']> = new Set(
  Object.keys(componentReaders) as GrantComponent['$type'][],
);

/** Whether G reads a component as a grant. */
export function isGrant(component: Component): component is GrantComponent {
  return grantTypes.has(component.$type as GrantComponent['$type']);
}

function grantsFrom(bp: Blueprint, blueprints: CheckedData['blueprints']): Grant[] {
  const grants: Grant[] = [];
  const out: Grants = {
    bp,
    blueprints,
    add(refs, kind, level) {
      for (const granted of guids(refs))
        grants.push({ grantor: bp.guid, granted, kind, ...(level === undefined ? {} : { level }) });
    },
    addAt(granted, kind, param) {
      grants.push({ grantor: bp.guid, granted, kind, ...(param && { param }) });
    },
  };
  if (kindOf[bp.$type] === 'items' && !Object.hasOwn(blueprintReaders, bp.$type))
    wornItem(bp as Typed<WornItemType>, out);
  else (blueprintReaders[bp.$type as keyof typeof blueprintReaders] as Reader<Blueprint>)(bp, out);
  for (const c of bp.Components) if (isGrant(c)) (componentReaders[c.$type] as Reader<GrantComponent>)(c, out);
  return grants;
}

/** The action types that grant (map ticket 23), each with the field that names what it grants. */
const GRANT_ACTION_FIELDS = {
  // UnitLogic/Mechanics/Actions/ContextActionAddFeature.cs RunAction.
  ContextActionAddFeature: 'm_PermanentFeature',
  // Designers/EventConditionActionSystem/Actions/AddFact.cs RunAction.
  AddFact: 'm_Fact',
  // UnitLogic/Mechanics/Actions/ContextActionApplyBuff.cs RunAction.
  ContextActionApplyBuff: 'm_Buff',
} as const satisfies { readonly [K in Exclude<GrantAction['$type'], 'Conditional'>]: string };

/** What a grant action gives (`actionGrant`). */
export interface ActionGrant {
  readonly granted: Guid;
  /**
   * A ContextActionAddFeature's m_SetRankFrom: the feature whose rank the granted one takes, when that is held
   * (UnitLogic/Mechanics/Actions/ContextActionAddFeature.cs RunAction, Feature.SetRank).
   */
  readonly rankFrom?: Guid;
}

/**
 * Whether an action grants a fact, and which: G's one answer, which the importer's allowlist also asks to decide which
 * actions it keeps. `type` is the action's class name and `action` its fields, as kept or as the dump has them. A
 * ContextActionApplyBuff grants for good only when Permanent (ContextActionApplyBuff.cs RunAction gives any other buff
 * a duration).
 */
export function actionGrant(type: string, action: object): ActionGrant | undefined {
  if (!Object.hasOwn(GRANT_ACTION_FIELDS, type)) return undefined;
  const fields = action as Readonly<Record<string, unknown>>;
  if (type === 'ContextActionApplyBuff' && fields.Permanent !== true) return undefined;
  const granted = refGuid(fields[GRANT_ACTION_FIELDS[type as keyof typeof GRANT_ACTION_FIELDS]]);
  if (granted === undefined) return undefined;
  const rankFrom = type === 'ContextActionAddFeature' ? refGuid(fields.m_SetRankFrom) : undefined;
  return { granted, ...(rankFrom !== undefined && { rankFrom }) };
}

/**
 * The grants in an action list, in both branches of its Conditional trees (Designers/EventConditionActionSystem/
 * Actions/Conditional.cs RunAction; the walk judges their conditions).
 */
function actionGrants(list: ActionList, out: Grants): void {
  for (const a of list.Actions) {
    if (a.$type === 'Conditional') {
      actionGrants(a.IfTrue, out);
      actionGrants(a.IfFalse, out);
      continue;
    }
    const grant = actionGrant(a.$type, a);
    if (grant !== undefined) out.addAt(grant.granted, a.$type, undefined);
  }
}

/**
 * Every blueprint a Build can come to hold or choose: what G reaches from BlueprintRoot through grants, options and
 * archetypes. Prerequisites matter only on these.
 */
export function reachableFromRoot(data: Pick<CheckedData, 'blueprints'>, G: GrantIndex): Set<Guid> {
  const root = blueprintRoot(data);
  return reach(G, root === undefined ? [] : [root.guid]);
}

/**
 * Every blueprint a Build can come to hold through its Gear: what G reaches from the items the data holds (the sourced
 * ones, map ticket 12), through their enchantments and the facts those give.
 */
export function reachableFromGear(data: Pick<CheckedData, 'blueprints'>, G: GrantIndex): Set<Guid> {
  return reach(
    G,
    [...data.blueprints.values()].filter((b) => kindOf[b.$type] === 'items').map((b) => b.guid),
  );
}

/** What G's grants reach from `start`, removals left out. */
function reach(G: GrantIndex, start: readonly Guid[]): Set<Guid> {
  const seen = new Set<Guid>(start);
  const queue = [...seen];
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    for (const g of G.grantsOf(next)) {
      if (REMOVES.has(g.kind) || seen.has(g.granted)) continue;
      seen.add(g.granted);
      queue.push(g.granted);
    }
  }
  return seen;
}

/** A grantor's kind, as `namedGrantorsByKind` groups them: its first FeatureGroup, else its blueprint type. */
export function grantorKind(bp: Blueprint | undefined): string {
  const groups = (bp as { Groups?: readonly string[] } | undefined)?.Groups;
  return groups?.find((g) => g !== 'None') ?? bp?.$type ?? 'unknown';
}

const SELECTION_TYPES: ReadonlySet<string> = new Set([
  'BlueprintFeatureSelection',
  'BlueprintFeatureSelectMythicSpellbook',
]);

export function buildGrantIndex(data: Pick<CheckedData, 'blueprints'>): GrantIndex {
  const byGrantor = new Map<Guid, Grant[]>();
  const byGranted = new Map<Guid, Grant[]>();
  for (const bp of data.blueprints.values()) {
    const grants = grantsFrom(bp, data.blueprints);
    if (grants.length === 0) continue;
    byGrantor.set(bp.guid, grants);
    for (const g of grants) {
      if (REMOVES.has(g.kind)) continue;
      let list = byGranted.get(g.granted);
      if (list === undefined) byGranted.set(g.granted, (list = []));
      list.push(g);
    }
  }

  const isSelection = (guid: Guid) => SELECTION_TYPES.has(data.blueprints.get(guid)?.$type ?? '');
  const shown = (guid: Guid) => {
    const bp = data.blueprints.get(guid);
    return bp !== undefined && isShown(bp);
  };

  let fromRoot: Set<Guid> | undefined;
  const index: GrantIndex = {
    grantorsOf: (fact) => byGranted.get(fact) ?? [],
    grantsOf: (entry) => byGrantor.get(entry) ?? [],
    slotsOpenedBy(entry) {
      const grants = byGrantor.get(entry) ?? [];
      return [...new Set(grants.filter((g) => !REMOVES.has(g.kind) && isSelection(g.granted)).map((g) => g.granted))];
    },
    climb(fact, stopAt, within) {
      const reachable = within ?? (fromRoot ??= reachableFromRoot(data, index));
      const found: Climbed[] = [];
      const seen = new Set<Guid>([fact]);
      let frontier: { guid: Guid; level: number | undefined }[] = [{ guid: fact, level: undefined }];
      for (let depth = 1; frontier.length > 0; depth++) {
        const next: typeof frontier = [];
        for (const { guid, level } of frontier) {
          for (const g of byGranted.get(guid) ?? []) {
            if (seen.has(g.grantor) || !reachable.has(g.grantor)) continue;
            seen.add(g.grantor);
            const at = level ?? g.level;
            found.push({ grantor: g.grantor, depth, level: at });
            if (!stopAt(g.grantor)) next.push({ guid: g.grantor, level: at });
          }
        }
        frontier = next;
      }
      return found;
    },
    namedGrantorsByKind(fact) {
      const groups = new Map<string, Guid[]>();
      for (const { grantor } of index.climb(fact, shown)) {
        if (!shown(grantor)) continue;
        const kind = grantorKind(data.blueprints.get(grantor));
        let list = groups.get(kind);
        if (list === undefined) groups.set(kind, (list = []));
        list.push(grantor);
      }
      return groups;
    },
  };
  return index;
}
