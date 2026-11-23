import type { Alignment, GearPlace, Place } from '../build';
import {
  weaponType,
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
} from '../data';
import type { CheckedData } from '../load';
import type { GrantParam } from '../grants';
import type { SpellbookData } from './spellbooks';

export type Source =
  | { readonly kind: 'race'; readonly from: Guid }
  | { readonly kind: 'class'; readonly from: Guid }
  | { readonly kind: 'progression'; readonly from: Guid; readonly level: number }
  | { readonly kind: 'pick'; readonly slot: string }
  | { readonly kind: 'component'; readonly from: Guid; readonly component: string };

export interface Fact {
  readonly blueprint: Guid;
  readonly bp: Blueprint | undefined;
  readonly param?: GrantParam;
  rank: number;
  readonly source: Source;
  readonly place: Place;
  ignorePrerequisites: boolean;
}

export interface ClassData {
  readonly class: Guid;
  level: number;
  readonly archetypes: Guid[];
  spellbook?: Guid | undefined;
}

export interface ProgressionData {
  level: number;
  readonly archetypes: Guid[];
}

export function paramKey(param: GrantParam | undefined): string {
  return param === undefined ? '' : JSON.stringify(param);
}

export function paramBlueprint(param: GrantParam | undefined): Guid | undefined {
  return param !== undefined && 'Blueprint' in param ? param.Blueprint : undefined;
}

const PARAM_FIELD = {
  WeaponCategory: 'WeaponCategory',
  SpellSchool: 'SpellSchool',
  Skill: 'StatType',
  Custom: 'Blueprint',
  FeatureSelection: 'Blueprint',
} as const satisfies Partial<Record<FeatureParameterType, string>>;

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

export function paramValue<T extends ParamType>(param: GrantParam | undefined, type: T): ParamValues[T] | undefined {
  const field = PARAM_FIELD[type];
  if (param === undefined || !Object.hasOwn(param, field)) return undefined;
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
  characterLevel = 0;
  mythicLevel = 0;
  race: Guid | undefined;
  alignment: Alignment | undefined;
  readonly classes: ClassData[] = [];
  readonly progressions = new Map<Guid, ProgressionData>();
  readonly spellbooks = new Map<Guid, SpellbookData>();
  lastMythicClass: Guid | undefined;
  readonly worn = new Map<GearPlace, Guid>();
  readonly wornEnhancement = new Map<Attribute, number>();
  countGear = false;
  gearReads = 0;
  private readonly byBlueprint = new Map<Guid, Fact[]>();
  private readonly heldFacts = new Set<Fact>();
  private readonly watchedByBlueprint = new Map<Guid, Fact[]>();
  private setAside: ReadonlySet<Fact> = new Set();
  readonly base = new Map<StatType, number>();
  readonly raceStat = new Map<Attribute, number>();
  readonly classSkills = new Set<StatType>();
  spentSkillPoints = 0;
  private version = 0;
  private readonly cache = new Map<string, { readonly version: number; readonly value: unknown }>();

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

  private held(guid: Guid): readonly Fact[] {
    const list = this.byBlueprint.get(guid) ?? [];
    return this.setAside.size === 0 ? list : list.filter((f) => !this.setAside.has(f));
  }

  rank(guid: Guid): number {
    return this.held(guid)[0]?.rank ?? 0;
  }

  hasFact(guid: Guid): boolean {
    return this.held(guid).length > 0;
  }

  factWith(guid: Guid, param: GrantParam | undefined): Fact | undefined {
    const key = paramKey(param);
    return this.held(guid).find((f) => paramKey(f.param) === key);
  }

  factsOf(guid: Guid): readonly Fact[] {
    return this.held(guid);
  }

  *facts(): Generator<Fact> {
    if (this.setAside.size === 0) {
      for (const list of this.byBlueprint.values()) for (const f of list) yield f;
      return;
    }
    for (const list of this.byBlueprint.values()) for (const f of list) if (!this.setAside.has(f)) yield f;
  }

  watchedFacts(): Fact[] {
    const out: Fact[] = [];
    for (const list of this.watchedByBlueprint.values()) for (const f of list) if (!this.setAside.has(f)) out.push(f);
    return out;
  }

  isHeld(fact: Fact): boolean {
    return this.heldFacts.has(fact);
  }

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

  setRank(fact: Fact, rank: number): boolean {
    const bp = this.bp(fact.blueprint);
    const cap = bp !== undefined && 'Ranks' in bp ? bp.Ranks : 1;
    const next = Math.min(Math.max(rank, 1), cap);
    if (next === fact.rank) return false;
    this.version++;
    fact.rank = next;
    return true;
  }

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

  withoutGear<T>(aside: ReadonlySet<Fact>, judge: () => T): T {
    const [countGear, setAside] = [this.countGear, this.setAside];
    this.countGear = false;
    this.setAside = aside;
    this.version++;
    try {
      return judge();
    } finally {
      this.countGear = countGear;
      this.setAside = setAside;
      this.version++;
    }
  }

  weaponIn(hand: 'MainHand' | 'OffHand'): BlueprintWeaponType | undefined {
    const item = this.worn.get(hand);
    const bp = item === undefined ? undefined : this.bp(item);
    return bp?.$type === 'BlueprintItemWeapon' ? weaponType(bp, this.data.blueprints) : undefined;
  }

  classData(cls: Guid): ClassData | undefined {
    return this.classes.find((c) => c.class === cls);
  }

  classLevel(cls: Guid): number {
    return this.classData(cls)?.level ?? 0;
  }

  progressionData(guid: Guid): ProgressionData {
    let data = this.progressions.get(guid);
    if (data === undefined) this.progressions.set(guid, (data = { level: 0, archetypes: [] }));
    return data;
  }

  permanent(stat: Attribute): number {
    let value = this.base.get(stat) ?? 10;
    value += this.raceStat.get(stat) ?? 0;
    if (this.countGear) {
      const bonus = this.wornEnhancement.get(stat) ?? 0;
      if (bonus !== 0) this.gearReads++;
      value += bonus;
    }
    for (const { fact, component: b } of this.componentsOf<AddStatBonus>('AddStatBonus')) {
      if (b.Stat === stat && b.Descriptor === 'Racial') value += b.Value * fact.rank;
    }
    for (const { fact, component: b } of this.componentsOf<AddStatBonusIfHasFact>('AddStatBonusIfHasFact')) {
      if (b.Stat !== stat || b.Descriptor !== 'Racial') continue;
      const held = b.m_CheckedFacts.map((r) => this.hasFact(refGuid(r) ?? ''));
      const has = b.RequireAllFacts ? held.every(Boolean) : held.some(Boolean);
      if (has !== b.InvertCondition) value += this.contextValue(fact, b.Value);
    }
    for (const { fact, component: b } of this.componentsOf<AddContextStatBonus>('AddContextStatBonus')) {
      if (b.Stat !== stat) continue;
      const bonus = this.contextValue(fact, b.Value) * b.Multiplier;
      value += b.HasMinimal ? Math.max(bonus, b.Minimal) : bonus;
    }
    return value;
  }

  private contextValue(fact: Fact, value: RankedContextValue): number {
    if (value.ValueType === 'Simple') return value.Value;
    if (value.ValueType !== 'Rank') return 0;
    const config = fact.bp?.Components.find(
      (c): c is ContextRankConfig =>
        c.$type === 'ContextRankConfig' && (c as ContextRankConfig).m_Type === value.ValueRank,
    );
    return config === undefined ? 0 : this.rankOf(config);
  }

  rankOf(c: ContextRankConfig): number {
    let base: number;
    if (c.m_BaseValueType === 'FeatureList') {
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

  modifier(stat: Attribute): number {
    return Math.floor(this.permanent(stat) / 2) - 5;
  }

  skillBase(skill: StatType): number {
    const ranks = this.base.get(skill) ?? 0;
    const attribute = this.skillAttribute(skill);
    const classBonus = this.isClassSkill(skill) && ranks > 0 ? 3 : 0;
    return ranks + classBonus + (attribute === undefined ? 0 : this.modifier(attribute));
  }

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

  isClassSkill(skill: StatType): boolean {
    if (this.classSkills.has(skill)) return true;
    return (
      this.componentsOf<AddClassSkill>('AddClassSkill').some((c) => c.component.Skill === skill) ||
      this.componentsOf<AddBackgroundClassSkill>('AddBackgroundClassSkill').some((c) => c.component.Skill === skill)
    );
  }

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

  private raceAllows(c: AddProficiencies): boolean {
    const race = refGuid(c.m_RaceRestriction);
    return race === undefined || race === this.race;
  }

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

  progression(guid: Guid): BlueprintProgression | undefined {
    const bp = this.bp(guid);
    return bp?.$type === 'BlueprintProgression' ? bp : undefined;
  }
}

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
