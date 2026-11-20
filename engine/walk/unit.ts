// The character the walk builds: the parts of the game's UnitDescriptor that the level-up rules read and write. It
// keeps the game's own model (UnitLogic/UnitProgressionData.cs, UnitLogic/FeatureCollection.cs, ClassData,
// ProgressionData), so each rule ported onto it reads the same state its C# method reads.
import type { Alignment, GearPlace, Place } from '../build';
import { weaponType } from '../data/items';
import type { CheckedData } from '../data/load';
import {
  refGuid,
  type AddBackgroundArmorProficiency,
  type AddBackgroundClassSkill,
  type AddBackgroundWeaponProficiency,
  type AddClassSkill,
  type AddContextStatBonus,
  type AddProficiencies,
  type AddStatBonus,
  type AddStatBonusIfHasFact,
  type Attribute,
  type Blueprint,
  type BlueprintArchetype,
  type BlueprintCharacterClass,
  type BlueprintProgression,
  type BlueprintStatProgression,
  type BlueprintWeaponType,
  type Component,
  type ContextRankConfig,
  type FeatureParameterType,
  type Guid,
  type RankedContextValue,
  type ReplaceStatBaseAttribute,
  type SpellSchool,
  type StatType,
  type WeaponCategory,
} from '../data/types';
import type { GrantParam } from '../grants';
import type { SpellbookData } from './spellbooks';

/** What put a fact on the character (Feature.SetSource), for the record the walk keeps. */
export type Source =
  /** SelectRace.Apply: the race and its features. */
  | { readonly kind: 'race'; readonly from: Guid }
  /** UnitProgressionData.AddClassLevel: a class's progression. */
  | { readonly kind: 'class'; readonly from: Guid }
  /** LevelUpHelper.AddFeaturesFromProgression: a progression's level entry. */
  | { readonly kind: 'progression'; readonly from: Guid; readonly level: number }
  /** SelectFeature.Apply: a pick, in its slot. */
  | { readonly kind: 'pick'; readonly slot: string }
  /** A held fact's grant component (AddFacts and its kin), named by G's kind. */
  | { readonly kind: 'component'; readonly from: Guid; readonly component: string };

export interface Fact {
  readonly blueprint: Guid;
  /** The blueprint itself (EntityFact.Blueprint), held so the walk needn't look it up. */
  readonly bp: Blueprint | undefined;
  readonly param?: GrantParam;
  /** Feature.Rank: raised by gaining the fact again, up to the blueprint's Ranks (Feature.AddRank). */
  rank: number;
  readonly source: Source;
  /** Where it was first gained. */
  readonly place: Place;
  /** Feature.IgnorePrerequisites: picked in a waived slot (SelectFeature.Apply). */
  ignorePrerequisites: boolean;
}

/** UnitLogic/ClassData.cs: one class's level and archetypes. */
export interface ClassData {
  readonly class: Guid;
  level: number;
  readonly archetypes: Guid[];
  /** ClassData.Spellbook: the class's, unless an archetype or a ReplaceSpellbook pick changes it. */
  spellbook?: Guid | undefined;
}

/** UnitLogic/ProgressionData.cs: a held progression's level and the archetypes merged into it. */
export interface ProgressionData {
  level: number;
  readonly archetypes: Guid[];
}

/** The parameter as one comparable string (FeatureParam equality); '' for none. */
export function paramKey(param: GrantParam | undefined): string {
  return param === undefined ? '' : JSON.stringify(param);
}

/** FeatureParam.Blueprint: the blueprint a parameter names (a spellbook, a selection's option), if any. */
export function paramBlueprint(param: GrantParam | undefined): Guid | undefined {
  return param !== undefined && 'Blueprint' in param ? param.Blueprint : undefined;
}

/**
 * The FeatureParam field each ParameterType a Build can pick fills (BlueprintParametrizedFeature.ExtractSelectionItems);
 * the spell types are out of v1 (map ticket 22).
 */
const PARAM_FIELD = {
  WeaponCategory: 'WeaponCategory',
  SpellSchool: 'SpellSchool',
  Skill: 'StatType',
  Custom: 'Blueprint',
  FeatureSelection: 'Blueprint',
} as const satisfies Partial<Record<FeatureParameterType, string>>;

/** A ParameterType a Build can pick a parameter for. */
export type ParamType = keyof typeof PARAM_FIELD;

interface ParamValues {
  readonly WeaponCategory: WeaponCategory;
  readonly SpellSchool: SpellSchool;
  readonly Skill: StatType;
  readonly Custom: Guid;
  readonly FeatureSelection: Guid;
}

export function isParamType(type: FeatureParameterType): type is ParamType {
  return Object.hasOwn(PARAM_FIELD, type);
}

/** The value a parameter sets in the FeatureParam field that a ParameterType uses, if it sets one. */
export function paramValue<T extends ParamType>(param: GrantParam | undefined, type: T): ParamValues[T] | undefined {
  const field = PARAM_FIELD[type];
  if (param === undefined || !(field in param)) return undefined;
  return (param as Readonly<Record<string, unknown>>)[field] as ParamValues[T];
}

export const ATTRIBUTES: readonly Attribute[] = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
];

/** EntitySystem/Stats/CharacterStats.cs constructor: each skill's base attribute. */
export const SKILL_ATTRIBUTE: Readonly<Partial<Record<StatType, Attribute>>> = {
  SkillMobility: 'Dexterity',
  SkillPerception: 'Wisdom',
  SkillThievery: 'Dexterity',
  SkillAthletics: 'Strength',
  SkillPersuasion: 'Charisma',
  SkillLoreNature: 'Wisdom',
  SkillKnowledgeArcana: 'Intelligence',
  SkillLoreReligion: 'Wisdom',
  SkillKnowledgeWorld: 'Intelligence',
  SkillStealth: 'Dexterity',
  SkillUseMagicDevice: 'Charisma',
};

export function isAttribute(stat: StatType): stat is Attribute {
  return (ATTRIBUTES as readonly string[]).includes(stat);
}

export function isSkill(stat: StatType): boolean {
  return SKILL_ATTRIBUTE[stat] !== undefined;
}

/**
 * How a blueprint's fact attaches while one is held (EntityFactsManager.Add, through its collection's
 * PrepareFactForAttach). FeatureCollection: a parametrized feat holds one fact per parameter (`perParam`); any other
 * feature is one fact whose rank gaining it again raises (`one`; Feature.AddRank, capped at Ranks).
 * AbilityCollection and ActivatableAbilityCollection: each grant is a fact of its own (`separate`).
 * UnitLogic/Buffs/BuffCollection.cs PrepareFactForAttach, by the buff's Stacking: Stack is a fact of its own, Replace
 * removes the held buff first (Manager.Remove, so what it gave goes with it), and Prolong, Ignore, Poison and Summ keep
 * the held buff (`one`: a Build's buffs are permanent, so their durations don't matter).
 */
export function stackingOf(bp: Blueprint | undefined): 'separate' | 'perParam' | 'replace' | 'one' {
  switch (bp?.$type) {
    case 'BlueprintAbility':
    case 'BlueprintActivatableAbility':
      return 'separate';
    case 'BlueprintParametrizedFeature':
      return 'perParam';
    case 'BlueprintBuff':
      return bp.Stacking === 'Stack' ? 'separate' : bp.Stacking === 'Replace' ? 'replace' : 'one';
    default:
      return 'one';
  }
}

export class Unit {
  readonly data: CheckedData;
  /** UnitProgressionData.CharacterLevel and MythicLevel. */
  characterLevel = 0;
  mythicLevel = 0;
  race: Guid | undefined;
  alignment: Alignment | undefined;
  /** ClassData, in the order each class was first taken. */
  readonly classes: ClassData[] = [];
  readonly progressions = new Map<Guid, ProgressionData>();
  /** UnitDescriptor.Spellbooks: each spellbook's level counters (engine/walk/spellbooks.ts). */
  readonly spellbooks = new Map<Guid, SpellbookData>();
  /** UnitProgressionData.LastMythicClass. */
  lastMythicClass: Guid | undefined;
  /** UnitBody: the Gear the character wears now (engine/walk/gear.ts). */
  readonly worn = new Map<GearPlace, Guid>();
  /** The worn Gear's Enhancement bonus to each ability score, the largest per score. */
  readonly wornEnhancement = new Map<Attribute, number>();
  /** ADR 0002's opt-in: the worn Gear's Enhancement bonuses count in the permanent value. */
  countGear = false;
  /**
   * How many times a permanent value has counted a worn item's Enhancement bonus. A judgement that counted none would
   * judge the same without the Gear (Walker.markGearDependent).
   */
  gearReads = 0;
  /** FeatureCollection: each blueprint's facts; more than one only for a parametrized feat's parameters. */
  private readonly byBlueprint = new Map<Guid, Fact[]>();
  /** Every held fact, set aside or not (EntityFactsManager's list). */
  private readonly heldFacts = new Set<Fact>();
  /** `byBlueprint`, for the blueprints `watched` admits only, in the same order: the facts the walk re-judges. */
  private readonly watchedByBlueprint = new Map<Guid, Fact[]>();
  /** Facts set aside while a pick is judged without the Gear (`withoutGear`): read as not held. */
  private hidden: ReadonlySet<Fact> = new Set();
  /** Stat base values: ability scores (StatsDistribution, SpendAttributePoint) and skill ranks (SpendSkillPoint). */
  readonly base = new Map<StatType, number>();
  /** Racial modifiers that aren't a held fact's component: SelectRaceStat's +2. */
  readonly raceStat = new Map<Attribute, number>();
  /** CharacterStats.AddClassSkill: skills made class skills by a class (ApplyClassMechanics.ApplyClassSkills). */
  readonly classSkills = new Set<StatType>();
  /** Skill points spent so far (LevelUpHelper.GetSpentSkillPoints). */
  spentSkillPoints = 0;
  /** Bumped on every attach and detach, so what is read from the held facts is cached until they change. */
  private version = 0;
  private readonly cache = new Map<string, { readonly version: number; readonly value: unknown }>();

  /**
   * `watched` says which blueprints' facts `watchedFacts` lists: the walk's conditional grants (Walker.refresh), so it
   * needn't scan every held fact after every change.
   */
  constructor(
    data: CheckedData,
    private readonly watched: (bp: Blueprint) => boolean = () => false,
  ) {
    this.data = data;
  }

  private cached<T>(key: string, compute: () => T): T {
    const hit = this.cache.get(key);
    if (hit?.version === this.version) return hit.value as T;
    const value = compute();
    this.cache.set(key, { version: this.version, value });
    return value;
  }

  /** Every held fact's components of one type, each with its fact: the components that are on (OnTurnOn). */
  componentsOf<T extends Component>(type: T['$type']): readonly { readonly fact: Fact; readonly component: T }[] {
    return this.cached(`components:${type}`, () => {
      const out: { fact: Fact; component: T }[] = [];
      for (const fact of this.facts()) {
        for (const c of fact.bp?.Components ?? []) {
          if (c.$type === type) out.push({ fact, component: c as T });
        }
      }
      return out;
    });
  }

  bp(guid: Guid): Blueprint | undefined {
    return this.data.blueprints.get(guid);
  }

  /** A blueprint's held facts, without those set aside. */
  private held(guid: Guid): readonly Fact[] {
    const list = this.byBlueprint.get(guid) ?? [];
    return this.hidden.size === 0 ? list : list.filter((f) => !this.hidden.has(f));
  }

  /** FeatureCollection.GetRank: the first fact's rank, 0 when not held. */
  rank(guid: Guid): number {
    return this.held(guid)[0]?.rank ?? 0;
  }

  /** EntityFactsManager.HasFact. */
  hasFact(guid: Guid): boolean {
    return this.held(guid).length > 0;
  }

  /** The fact of a blueprint at a parameter (a parametrized feat's one parameter). */
  factWith(guid: Guid, param: GrantParam | undefined): Fact | undefined {
    const key = paramKey(param);
    return this.held(guid).find((f) => paramKey(f.param) === key);
  }

  factsOf(guid: Guid): readonly Fact[] {
    return this.held(guid);
  }

  *facts(): Generator<Fact> {
    if (this.hidden.size === 0) {
      for (const list of this.byBlueprint.values()) for (const f of list) yield f;
      return;
    }
    for (const list of this.byBlueprint.values()) for (const f of list) if (!this.hidden.has(f)) yield f;
  }

  /** The held facts of the blueprints `watched` admits, in `facts` order: a snapshot. */
  watchedFacts(): Fact[] {
    const out: Fact[] = [];
    for (const list of this.watchedByBlueprint.values()) for (const f of list) if (!this.hidden.has(f)) out.push(f);
    return out;
  }

  /** Whether this very fact is still held: EntityFactsManager's list holds it. */
  isHeld(fact: Fact): boolean {
    return this.heldFacts.has(fact);
  }

  /**
   * EntityFactsManager.Add, through its collection's PrepareFactForAttach (`stackingOf`). Returns the fact, whether it
   * is new, and the held fact a Replace buff removed, if it left: the walk takes away what that one gave
   * (Walker.gain). The rank didn't move when the fact is neither new nor raised.
   */
  attach(
    guid: Guid,
    param: GrantParam | undefined,
    source: Source,
    place: Place,
  ): { fact: Fact; added: boolean; raised: boolean; replaced: Fact | undefined } {
    const bp = this.bp(guid);
    const stacking = stackingOf(bp);
    let replaced: Fact | undefined;
    if (stacking === 'replace') {
      const held = this.byBlueprint.get(guid)?.[0];
      if (held !== undefined && this.remove(held) === 'left') replaced = held;
    }
    const list = this.byBlueprint.get(guid) ?? [];
    const existing =
      stacking === 'separate'
        ? undefined
        : stacking === 'perParam'
          ? list.find((f) => paramKey(f.param) === paramKey(param))
          : list[0];
    this.version++;
    if (existing !== undefined) {
      const cap = bp !== undefined && 'Ranks' in bp ? bp.Ranks : 1;
      if (existing.rank >= cap) return { fact: existing, added: false, raised: false, replaced };
      existing.rank++;
      return { fact: existing, added: false, raised: true, replaced };
    }
    const fact: Fact = { blueprint: guid, bp, rank: 1, source, place, ignorePrerequisites: false };
    if (param !== undefined) Object.assign(fact, { param });
    list.push(fact);
    this.byBlueprint.set(guid, list);
    if (bp !== undefined && this.watched(bp)) this.watchedByBlueprint.set(guid, list);
    this.heldFacts.add(fact);
    return { fact, added: true, raised: false, replaced };
  }

  /**
   * UnitLogic/Feature.cs SetRank: the rank, clamped to 1 and the blueprint's Ranks (the fact reapplies, as on any rank
   * change). Says whether it moved.
   */
  setRank(fact: Fact, rank: number): boolean {
    const bp = this.bp(fact.blueprint);
    const cap = bp !== undefined && 'Ranks' in bp ? bp.Ranks : 1;
    const next = Math.min(Math.max(rank, 1), cap);
    if (next === fact.rank) return false;
    this.version++;
    fact.rank = next;
    return true;
  }

  /**
   * EntityFactsManager.Remove of one fact, through FeatureCollection.PrepareFactForDetach: a fact no longer held is
   * left alone; a rank above 1 drops by one; otherwise the fact goes. Says which happened. The walk removes through
   * `Walker.lose`, which also takes away what the fact's components gave.
   */
  remove(fact: Fact): 'left' | 'rank' | 'none' {
    const list = this.byBlueprint.get(fact.blueprint);
    if (list === undefined || !this.heldFacts.has(fact)) return 'none';
    this.version++;
    if (fact.rank >= 2) {
      fact.rank--;
      return 'rank';
    }
    list.splice(list.indexOf(fact), 1);
    this.heldFacts.delete(fact);
    if (list.length === 0) {
      this.byBlueprint.delete(fact.blueprint);
      this.watchedByBlueprint.delete(fact.blueprint);
    }
    return 'left';
  }

  /**
   * Runs `judge` as though the Gear didn't count and the `aside` facts weren't held: how ADR 0002's marking asks
   * whether a choice needs the Gear (Walker.markGearDependent). Nothing changes for good.
   */
  withoutGear<T>(aside: ReadonlySet<Fact>, judge: () => T): T {
    const [countGear, hidden] = [this.countGear, this.hidden];
    this.countGear = false;
    this.hidden = aside;
    this.version++;
    try {
      return judge();
    } finally {
      this.countGear = countGear;
      this.hidden = hidden;
      this.version++;
    }
  }

  /** The weapon type of the weapon in a hand (UnitBody's HandSlot), or undefined for an empty hand or a shield. */
  weaponIn(hand: 'MainHand' | 'OffHand'): BlueprintWeaponType | undefined {
    const item = this.worn.get(hand);
    const bp = item === undefined ? undefined : this.bp(item);
    return bp?.$type === 'BlueprintItemWeapon' ? weaponType(bp, this.data.blueprints) : undefined;
  }

  // Classes.

  classData(cls: Guid): ClassData | undefined {
    return this.classes.find((c) => c.class === cls);
  }

  /** UnitProgressionData.GetClassLevel. */
  classLevel(cls: Guid): number {
    return this.classData(cls)?.level ?? 0;
  }

  /** UnitProgressionData.SureProgressionData. */
  progressionData(guid: Guid): ProgressionData {
    let data = this.progressions.get(guid);
    if (data === undefined) this.progressions.set(guid, (data = { level: 0, archetypes: [] }));
    return data;
  }

  // Stats.

  /**
   * ModifiableValueAttributeStat.CalculatePermanentValue: the base score plus the permanent modifiers, which are the
   * racial ones and a worn item's Enhancement (ModifiableValue.Modifier.IsPermanent), the latter only under the Gear
   * opt-in. The racial modifiers are the held facts' Racial AddStatBonus, AddStatBonusIfHasFact and
   * AddContextStatBonus, and SelectRaceStat's.
   */
  permanent(stat: Attribute): number {
    let value = this.base.get(stat) ?? 10;
    value += this.raceStat.get(stat) ?? 0;
    // An item's Enhancement bonus is permanent (Modifier.IsPermanent), but counts only under the opt-in (ADR 0002).
    if (this.countGear) {
      const bonus = this.wornEnhancement.get(stat) ?? 0;
      if (bonus !== 0) this.gearReads++;
      value += bonus;
    }
    for (const { fact, component: b } of this.componentsOf<AddStatBonus>('AddStatBonus')) {
      // UnitLogic/FactLogic/AddStatBonus.cs OnTurnOn: Value scaled by the fact's rank.
      if (b.Stat === stat && b.Descriptor === 'Racial') value += b.Value * fact.rank;
    }
    for (const { fact, component: b } of this.componentsOf<AddStatBonusIfHasFact>('AddStatBonusIfHasFact')) {
      // Designers/Mechanics/Buffs/AddStatBonusIfHasFact.cs ShouldApplyBonus, Update.
      if (b.Stat !== stat || b.Descriptor !== 'Racial') continue;
      const held = b.m_CheckedFacts.map((r) => this.hasFact(refGuid(r) ?? ''));
      const has = b.RequireAllFacts ? held.every(Boolean) : held.some(Boolean);
      if (has !== b.InvertCondition) value += this.contextValue(fact, b.Value);
    }
    for (const { fact, component: b } of this.componentsOf<AddContextStatBonus>('AddContextStatBonus')) {
      // UnitLogic/FactLogic/AddContextStatBonus.cs OnTurnOn: Value × Multiplier, at least Minimal when HasMinimal.
      if (b.Stat !== stat) continue;
      const bonus = this.contextValue(fact, b.Value) * b.Multiplier;
      value += b.HasMinimal ? Math.max(bonus, b.Minimal) : bonus;
    }
    return value;
  }

  /**
   * UnitLogic/Mechanics/ContextValue.cs Calculate, for the two kinds a kept Racial bonus uses: a constant (Simple), or
   * the rank of the fact's ContextRankConfig of the same AbilityRankType (Rank, through MechanicsContext's indexer).
   */
  private contextValue(fact: Fact, value: RankedContextValue): number {
    if (value.ValueType === 'Simple') return value.Value;
    if (value.ValueType !== 'Rank') return 0;
    const config = fact.bp?.Components.find(
      (c): c is ContextRankConfig =>
        c.$type === 'ContextRankConfig' && (c as ContextRankConfig).m_Type === value.ValueRank,
    );
    return config === undefined ? 0 : this.rankOf(config);
  }

  /**
   * UnitLogic/Mechanics/Components/ContextRankConfig.cs GetValue for the two kept base types: ClassLevel, the listed
   * classes' levels (or every other class's, with m_ExceptClasses), and FeatureList; then ApplyProgression and
   * ApplyMinMax.
   */
  rankOf(c: ContextRankConfig): number {
    let base: number;
    if (c.m_BaseValueType === 'FeatureList') {
      // GetBaseValue, FeatureList: one for each listed feature the character holds.
      base = c.m_FeatureList.filter((r) => this.hasFact(refGuid(r) ?? '')).length;
    } else {
      const listed = new Set(c.m_Class.map((r) => refGuid(r)));
      base = this.classes.filter((d) => listed.has(d.class) !== c.m_ExceptClasses).reduce((sum, d) => sum + d.level, 0);
    }
    let value = applyProgression(c, base);
    if (c.m_UseMin) value = Math.max(value, c.m_Min);
    if (c.m_UseMax) value = Math.min(value, c.m_Max);
    return value;
  }

  /** ModifiableValueAttributeStat.Bonus, on the permanent value: value / 2 − 5. */
  modifier(stat: Attribute): number {
    return Math.floor(this.permanent(stat) / 2) - 5;
  }

  /**
   * ModifiableValueSkill.CalculateBaseValue: the ranks, plus 3 for a class skill with a rank, plus the base
   * attribute's bonus.
   */
  skillBase(skill: StatType): number {
    const ranks = this.base.get(skill) ?? 0;
    const attribute = this.skillAttribute(skill);
    const classBonus = this.isClassSkill(skill) && ranks > 0 ? 3 : 0;
    return ranks + classBonus + (attribute === undefined ? 0 : this.modifier(attribute));
  }

  /**
   * ModifiableValueSkill.BaseAttribute: the skill's own attribute, or the one a held ReplaceStatBaseAttribute names
   * (ReplaceBaseAttribute, CheckAttribute), only when its bonus is higher under ReplaceIfHigher.
   */
  skillAttribute(skill: StatType): Attribute | undefined {
    const own = SKILL_ATTRIBUTE[skill];
    const replace = this.componentsOf<ReplaceStatBaseAttribute>('ReplaceStatBaseAttribute').find(
      (c) => c.component.TargetStat === skill,
    )?.component;
    if (replace === undefined || own === undefined) return own;
    const other = replace.BaseAttributeReplacement;
    if (!replace.ReplaceIfHigher) return other;
    return this.modifier(own) < this.modifier(other) ? other : own;
  }

  /**
   * ModifiableValueSkill.ClassSkill: a class made it one (ApplyClassMechanics.ApplyClassSkills), or a held fact's
   * AddClassSkill (ClassSkillRetain) or AddBackgroundClassSkill (BackgroundSkillSource) does.
   */
  isClassSkill(skill: StatType): boolean {
    if (this.classSkills.has(skill)) return true;
    return (
      this.componentsOf<AddClassSkill>('AddClassSkill').some((c) => c.component.Skill === skill) ||
      this.componentsOf<AddBackgroundClassSkill>('AddBackgroundClassSkill').some((c) => c.component.Skill === skill)
    );
  }

  /**
   * UnitLogic/UnitProficiency.cs: the weapon categories a character starts proficient with (its m_WeaponProficiencies
   * initializer), plus each held fact's AddProficiencies (for its race only, when restricted),
   * AddBackgroundWeaponProficiency and KensaiChosenWeapon (OnActivate: the chosen weapon's own category).
   */
  weaponProficiencies(): ReadonlySet<string> {
    return this.cached('weapons', () => {
      const out = new Set<string>(['UnarmedStrike', 'Bite', 'Claw', 'Gore', 'Touch', 'Ray']);
      for (const { component: c } of this.componentsOf<AddProficiencies>('AddProficiencies')) {
        if (this.raceAllows(c)) for (const w of c.WeaponProficiencies ?? []) out.add(w);
      }
      const background = this.componentsOf<AddBackgroundWeaponProficiency>('AddBackgroundWeaponProficiency');
      for (const { component: c } of background) out.add(c.Proficiency);
      for (const { fact } of this.componentsOf('KensaiChosenWeapon')) {
        const weapon = paramValue(fact.param, 'WeaponCategory');
        if (weapon !== undefined) out.add(weapon);
      }
      return out;
    });
  }

  /** UnitLogic/UnitProficiency.cs: `None` to start with, plus AddProficiencies and AddBackgroundArmorProficiency. */
  armorProficiencies(): ReadonlySet<string> {
    return this.cached('armor', () => {
      const out = new Set<string>(['None']);
      for (const { component: c } of this.componentsOf<AddProficiencies>('AddProficiencies')) {
        if (this.raceAllows(c)) for (const a of c.ArmorProficiencies ?? []) out.add(a);
      }
      const background = this.componentsOf<AddBackgroundArmorProficiency>('AddBackgroundArmorProficiency');
      for (const { component: c } of background) out.add(c.Proficiency);
      return out;
    });
  }

  /** AddProficiencies.OnTurnOn: no restriction, or the character's race. */
  private raceAllows(c: AddProficiencies): boolean {
    const race = refGuid(c.m_RaceRestriction);
    return race === undefined || race === this.race;
  }

  /**
   * ApplyClassMechanics.ApplyBaseStats: each class adds its table's value at its level, from the first archetype that
   * replaces the table, else the class's own (ClassData.BaseAttackBonus and the saves).
   */
  tableStat(field: 'm_BaseAttackBonus' | 'm_FortitudeSave' | 'm_ReflexSave' | 'm_WillSave'): number {
    let total = 0;
    for (const c of this.classes) {
      const cls = this.bp(c.class) as BlueprintCharacterClass | undefined;
      if (cls === undefined) continue;
      const replaced = c.archetypes
        .map((a) => (this.bp(a) as BlueprintArchetype | undefined)?.[field])
        .find((r) => r !== null && r !== undefined);
      const table = this.bp(refGuid(replaced ?? cls[field]) ?? '') as BlueprintStatProgression | undefined;
      total += table?.Bonuses[c.level] ?? 0;
    }
    return total;
  }

  /** A held progression blueprint, when `guid` names one. */
  progression(guid: Guid): BlueprintProgression | undefined {
    const bp = this.bp(guid);
    return bp?.$type === 'BlueprintProgression' ? bp : undefined;
  }
}

/** UnitLogic/Mechanics/Components/ContextRankConfig.cs ApplyProgression (C# integer division truncates). */
export function applyProgression(c: ContextRankConfig, value: number): number {
  const div = (a: number, b: number) => Math.trunc(a / b);
  const step = c.m_StepLevel;
  switch (c.m_Progression) {
    case 'AsIs':
      return value;
    case 'Div2':
      return div(value, 2);
    case 'OnePlusDiv2':
      return 1 + div(value - 1, 2);
    case 'StartPlusDivStep':
      return 1 + Math.max(div(value - c.m_StartLevel, step), 0);
    case 'DivStep':
      return div(value, step);
    case 'OnePlusDivStep':
      return 1 + Math.max(div(value, step), 0);
    case 'MultiplyByModifier':
      return value * step;
    case 'HalfMore':
      return value + div(value, 2);
    case 'BonusValue':
      return value + step;
    case 'DelayedStartPlusDivStep':
      return value < c.m_StartLevel ? 0 : 1 + Math.max(div(value - c.m_StartLevel, step), 0);
    case 'StartPlusDoubleDivStep':
      return 1 + 2 * Math.max(div(value - c.m_StartLevel, step), 0);
    case 'Div2PlusStep':
      return div(value, 2) + step;
    case 'Custom':
      return (
        c.m_CustomProgression.find((p) => value <= p.BaseValue)?.ProgressionValue ??
        c.m_CustomProgression.at(-1)?.ProgressionValue ??
        0
      );
    case 'DoublePlusBonusValue':
      return value * 2 + step;
    case 'SquaredValue':
      return value * value;
  }
}
