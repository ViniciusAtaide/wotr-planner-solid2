import {
  placeKey,
  slotKey,
  type Ascension,
  type Build,
  type GearPlace,
  type LevelUp,
  type Pick,
  type Place,
  type SlotId,
} from '../build';
import {
  enchantmentsOf,
  guids,
  refGuid,
  type AddFeatureOnApply,
  type AddFeatureOnClassLevel,
  type ActionList,
  type AddMechanicsFeature,
  type AddSpellbookLevel,
  type Attribute,
  type Blueprint,
  type BlueprintArchetype,
  type BlueprintCharacterClass,
  type BlueprintFeatureSelection,
  type BlueprintItemArmor,
  type BlueprintParametrizedFeature,
  type BlueprintProgression,
  type BlueprintRace,
  type BlueprintRoot,
  type Component,
  type FeatureGroup,
  type IncreaseActivatableAbilityGroupSize,
  type GrantComponent,
  type Guid,
  type NoSelectionIfAlreadyHasFeature,
} from '../data';
import { blueprintRoot, type CheckedData } from '../load';
import { actionGrant, buildGrantIndex, type FieldGrantKind, type GrantIndex, type GrantParam } from '../grants';
import { namedFacts, paramPrerequisites, prerequisites } from '../prerequisites';
import {
  archetypeMeetsPrerequisites,
  classMeetsPrerequisites,
  conditionHolds,
  conditionsHold,
  hasAlignmentComponent,
  isSelectionType,
  meetsPrerequisites,
  permanentValue,
  scoresRead,
  type Context,
  type SlotChain,
} from './check';
import type { Failure, FailedRule } from './failure';
import { armorGroupInFlags, cannotWear, gearEnhancement, gearOf, misfit, wornArmorGroup } from './gear';
import { calcLevel, canAddArchetype, levelEntries } from './progression';
import { applySpellbook, classSpellbook, demand } from './spellbooks';
import { applyStats } from './stats';
import {
  ATTRIBUTES,
  isAttribute,
  isParamType,
  paramBlueprint,
  paramKey,
  paramValue,
  Unit,
  type Fact,
  type Source,
} from './unit';
import { hasSubCategory } from './weapons';

export type { Failure, FailedRule, Rule, Unmet } from './failure';

export const BANDS = [
  'Race',
  'Class',
  'RaceStat',
  'Archetype',
  'ApplyClass',
  'Heritage',
  'ReplaceSpellbook',
  'ApplySpellbook',
  'RemoveAttribute',
  'AddAttribute',
  'ApplySkillPoints',
  'Skills',
  'Background',
  'MythicAbility',
  'Deity',
  'Path',
  'Features',
  'Spells',
  'Alignment',
  'MythicAdditionalProgressions',
] as const;
export type Band = (typeof BANDS)[number];

export function bandOf(group: FeatureGroup | undefined): Band {
  switch (group) {
    case 'Deities':
      return 'Deity';
    case 'AasimarHeritage':
    case 'TieflingHeritage':
    case 'DhampirHeritage':
    case 'OreadHeritage':
    case 'KitsuneHeritage':
    case 'HalfOrcHeritage':
      return 'Heritage';
    case 'BackgroundSelection':
      return 'Background';
    case 'MythicAdditionalProgressions':
      return 'MythicAdditionalProgressions';
    case 'MythicFeat':
    case 'MythicAbility':
      return 'MythicAbility';
    case 'Domain':
    case 'SpecialistSchool':
    case 'BloodLine':
    case 'ChannelEnergy':
    case 'DruidDomain':
    case 'BlightDruidDomain':
    case 'ClericSecondaryDomain':
    case 'RangerBond':
    case 'DruidBond':
    case 'OracleCurse':
    case 'ShamanSpirit':
    case 'OracleMystery':
    case 'WarpriestBlessing':
    case 'LichSkeletalUpgrade':
      return 'Path';
    case 'ThassilonianSpellbook':
    case 'ArcaneTricksterSpellbook':
    case 'EldritchKnightSpellbook':
    case 'DragonDiscipleSpellbook':
    case 'MysticTheurgeArcaneSpellbook':
    case 'SelectMythicSpellbook':
    case 'HellknightSigniferSpellbook':
    case 'ReplaceSpellbook':
      return 'ReplaceSpellbook';
    default:
      return 'Features';
  }
}

export interface Gain {
  readonly place: Place;
  readonly fact: Guid;
  readonly param?: GrantParam;
  readonly rank: number;
  readonly source: Source;
}

export interface OpenedSlot {
  readonly id: SlotId;
  readonly source: Source;
  readonly level: number;
  readonly parent?: string;
  readonly pick?: Pick;
}

export interface GearDependent {
  readonly place: Place;
  readonly choice: 'pick' | 'class' | 'archetype';
  readonly subject: Guid;
  readonly slot?: SlotId;
  readonly items: readonly Guid[];
}

export interface Dropped {
  readonly place: Place;
  readonly fact: Guid;
  readonly gainedAt: Place;
}

export interface Walk {
  readonly gains: readonly Gain[];
  readonly failures: readonly Failure[];
  readonly slots: readonly OpenedSlot[];
  readonly gearDependent: readonly GearDependent[];
  readonly dropped: readonly Dropped[];
  readonly unit: Unit;
}

class SlotState implements SlotChain {
  picked: Guid | undefined;
  next: SlotState | undefined;
  pick: Pick | undefined;
  constructor(
    readonly id: SlotId,
    readonly selection: Guid,
    readonly source: Source,
    readonly level: number,
    readonly parent: SlotState | undefined,
  ) {}
  get key(): string {
    return slotKey(this.id);
  }
}

interface LevelState {
  readonly place: Place;
  readonly mythic: boolean;
  readonly firstLevel: boolean;
  selectedClass: Guid | undefined;
  nextClassLevel: number;
  attributePoints: number;
  readonly slots: SlotState[];
}

const sameSlot = (a: SlotId, b: SlotId) => slotKey(a) === slotKey(b);

type Owner = Fact | GearPlace | Guid;

const DEVIL_MYTHIC_CLASS = '211f49705f478b3468db6daa802452a2';
const LEGEND_CLASS = '3d420403f3e7340499931324640efe96';
const AEON_MYTHIC_CLASS = '15a85e67b7d69554cab9ed5830d0268e';
const AZATA_MYTHIC_CLASS = '9a3b2c63afa79744cbca46bea0da9a16';
const DRAGON_COMPANION = 'cf36f23d60987224696f03be70351928';
const AEON_GAZE_FEATURE = '2689d57a889951241912f4bc7d6bb77e';
const AEON_GAZE_FEATURE_EXTRA_GAZE = '9b3399bb6cea0044faa42cd61169cc29';
const AEON_GAZE_FIRST_SELECTION = '7e468a5266235454e9dcefee315ee6d5';
const AEON_GAZE_SECOND_SELECTION = '7d498e034d18ca94baea19d7edee7403';
const AEON_GAZE_THIRD_SELECTION = '0bec49f67ecb49a5826fcfefb9408a35';
const SWITCH_TO: ReadonlySet<Guid> = new Set([DEVIL_MYTHIC_CLASS, LEGEND_CLASS]);
const DEVIL_DROPS: readonly Guid[] = [DRAGON_COMPANION, AEON_GAZE_FEATURE, AEON_GAZE_FEATURE_EXTRA_GAZE];
const DEVIL_DROPPED_SELECTIONS: readonly Guid[] = [
  AEON_GAZE_FIRST_SELECTION,
  AEON_GAZE_SECOND_SELECTION,
  AEON_GAZE_THIRD_SELECTION,
];

const ON_ACTIVATE = [
  'AddFacts',
  'AddFeatureOnApply',
  'RemoveFeatureOnApply',
  'FactSinglify',
  'KensaiChosenWeapon',
  'AddFactContextActions',
  'ActivateTrigger',
  'AddParametrizedFeatures',
  'AddFeatureParametrized',
] as const satisfies readonly GrantComponent['$type'][];

const CONDITIONAL = [
  'AddFeatureOnClassLevel',
  'AddFeatureIfHasFact',
  'AddFeatureOnAlignment',
  'AddFeatureOnSkill',
  'BuffExtraEffects',
  'MonkNoArmorFeatureUnlock',
  'MonkNoArmorAndMonkWeaponFeatureUnlock',
  'HasArmorFeatureUnlock',
] as const satisfies readonly GrantComponent['$type'][];

const WORN_GRANTS = [
  'AddUnitFeatureEquipment',
  'AddUnitFactEquipment',
] as const satisfies readonly GrantComponent['$type'][];

type ActivatedGrant = Extract<GrantComponent, { $type: (typeof ON_ACTIVATE)[number] }>;
type ConditionalGrant = Extract<GrantComponent, { $type: (typeof CONDITIONAL)[number] }>;

export const appliedGrantTypes: ReadonlySet<GrantComponent['$type']> = new Set([
  ...ON_ACTIVATE,
  ...CONDITIONAL,
  ...WORN_GRANTS,
]);

export const appliedFieldGrants: ReadonlySet<FieldGrantKind> = new Set<FieldGrantKind>([
  'root',
  'classProgression',
  'classArchetype',
  'levelEntry',
  'archetypeAdd',
  'archetypeRemove',
  'selectionOption',
  'raceFeature',
  'itemEnchantment',
  'shieldPart',
  'ActivatableBuff',
]);

const isActivatedGrant = (c: Component): c is ActivatedGrant => (ON_ACTIVATE as readonly string[]).includes(c.$type);
const isConditionalGrant = (c: Component): c is ConditionalGrant =>
  (CONDITIONAL as readonly string[]).includes(c.$type);

const conditionalCache = new WeakMap<Blueprint, readonly (readonly [number, ConditionalGrant])[]>();

function conditionalGrants(bp: Blueprint | undefined): readonly (readonly [number, ConditionalGrant])[] {
  if (bp === undefined) return [];
  let list = conditionalCache.get(bp);
  if (list === undefined) {
    const found: (readonly [number, ConditionalGrant])[] = [];
    for (const [i, c] of bp.Components.entries()) if (isConditionalGrant(c)) found.push([i, c]);
    conditionalCache.set(bp, (list = found));
  }
  return list;
}

function unapplied(c: never): never {
  throw new Error(`the walk lists ${(c as Component).$type} as applied but has no case for it`);
}

export function walk(data: CheckedData, build: Build, G: GrantIndex = buildGrantIndex(data)): Walk {
  return new Walker(data, build, G).run();
}

export interface PausedWalk {
  readonly slot: OpenedSlot;
  readonly band: Band;
  readonly unit: Unit;
  judge(feature: Guid, param?: GrantParam): FailedRule | undefined;
  gearItems(feature: Guid, param?: GrantParam): readonly Guid[] | undefined;
}

class Paused {
  constructor(readonly paused: PausedWalk) {}
}

export function pauseAt(
  data: CheckedData,
  build: Build,
  slot: SlotId,
  G: GrantIndex = buildGrantIndex(data),
): PausedWalk | undefined {
  try {
    new Walker(data, build, G, slot).run();
    return undefined;
  } catch (e) {
    if (e instanceof Paused) return e.paused;
    throw e;
  }
}

class Walker {
  readonly unit: Unit;
  readonly root: BlueprintRoot;
  readonly gains: Gain[] = [];
  readonly gainFacts = new Map<Gain, Fact>();
  readonly failures: Failure[] = [];
  readonly opened: OpenedSlot[] = [];
  readonly applied = new Map<Owner, Map<string, Fact[]>>();
  readonly gearDependent: GearDependent[] = [];
  readonly gearDependentFacts = new Map<Fact, readonly Guid[]>();
  readonly dropped: Dropped[] = [];
  legendTaken = false;
  readonly aspectsOn = new Map<Guid, Guid>();
  readonly refusedAspects = new Set<Guid>();
  place: Place = { level: 0 };
  private levelState: LevelState | undefined;
  readonly picksAt = new Map<string, Pick[]>();

  constructor(
    readonly data: CheckedData,
    readonly build: Build,
    readonly G: GrantIndex,
    readonly pause?: SlotId,
  ) {
    this.unit = new Unit(data, (bp) => conditionalGrants(bp).length > 0);
    this.unit.alignment = build.alignment;
    this.unit.countGear = build.countGear === true;
    const root = blueprintRoot(data);
    if (root === undefined) throw new Error('the data holds no BlueprintRoot');
    this.root = root;
    for (const pick of build.picks) {
      const key = placeKey(pick.slot.place);
      const list = this.picksAt.get(key);
      if (list === undefined) this.picksAt.set(key, [pick]);
      else list.push(pick);
    }
  }

  run(): Walk {
    const feats = refGuid(this.root.Progression.m_FeatsProgression);
    if (feats !== undefined) this.gain(feats, undefined, { kind: 'class', from: feats });
    const ranks = this.build.ranks ?? [];
    let rank = 0;
    for (let r = 1; r < ranks.length; r++) {
      const [before, at] = [ranks[r - 1]?.level ?? 0, ranks[r]?.level ?? 0];
      if (at < before) {
        this.failures.push({
          place: { rank: r + 1 },
          choice: 'rank',
          rule: 'adr0003.rankOrder',
          found: at,
          needed: before,
        });
      }
    }
    for (const [i, level] of this.build.levels.entries()) {
      this.levelUp({ level: i + 1 }, level, false);
      while (rank < ranks.length && (ranks[rank]?.level ?? 0) <= i + 1) {
        this.levelUp({ rank: rank + 1 }, ranks[rank] as Ascension, true);
        rank++;
      }
    }
    for (; rank < ranks.length; rank++) this.levelUp({ rank: rank + 1 }, ranks[rank] as Ascension, true);
    this.refuseUnworn();
    for (const toggle of this.build.aspects ?? []) {
      if (!this.unit.hasFact(toggle) && !this.refusedAspects.has(toggle)) {
        this.fail({ choice: 'aspect', subject: toggle, rule: 'map32.notHeld' });
      }
    }
    return {
      gains: this.gains,
      failures: this.failures,
      slots: this.opened,
      gearDependent: this.gearDependent,
      dropped: this.dropped,
      unit: this.unit,
    };
  }

  gain(guid: Guid, param: GrantParam | undefined, source: Source, rankFrom?: Guid): Fact | undefined {
    if (!this.data.blueprints.has(guid)) return undefined;
    const r = this.unit.attach(guid, param, source, this.place);
    if (r.replaced !== undefined) this.loseApplied(r.replaced);
    if (r.added || r.raised) {
      this.recordGain(r.fact, source, param);
      if (r.added) this.activate(r.fact);
    }
    const rank = rankFrom === undefined ? 0 : this.unit.rank(rankFrom);
    if (rank > 0 && this.unit.setRank(r.fact, rank)) this.recordGain(r.fact, source, param);
    return r.fact;
  }

  recordGain(fact: Fact, source: Source, param: GrantParam | undefined): void {
    const gain: Gain = { place: this.place, fact: fact.blueprint, rank: fact.rank, source, ...(param && { param }) };
    this.gains.push(gain);
    this.gainFacts.set(gain, fact);
  }

  record(owner: Owner, key: string, fact: Fact | undefined): void {
    let byKey = this.applied.get(owner);
    if (byKey === undefined) this.applied.set(owner, (byKey = new Map()));
    let list = byKey.get(key);
    if (list === undefined) byKey.set(key, (list = []));
    if (fact !== undefined) list.push(fact);
  }

  appliedOf(owner: Fact, key: string): readonly Fact[] | undefined {
    return this.applied.get(owner)?.get(key);
  }

  lose(fact: Fact): Fact[] {
    if (this.unit.remove(fact) !== 'left') return [];
    return [fact, ...this.loseApplied(fact)];
  }

  loseApplied(owner: Owner): Fact[] {
    const left: Fact[] = [];
    const applied = this.applied.get(owner);
    this.applied.delete(owner);
    for (const list of applied?.values() ?? []) for (const f of list) left.push(...this.lose(f));
    return left;
  }

  descendants(fact: Fact): Fact[] {
    const out: Fact[] = [];
    const seen = new Set<Fact>();
    const visit = (f: Fact) => {
      if (seen.has(f) || !this.unit.isHeld(f)) return;
      seen.add(f);
      out.push(f);
      for (const list of this.applied.get(f)?.values() ?? []) for (const c of list) visit(c);
    };
    visit(fact);
    return out;
  }

  loseBlueprint(guid: Guid, param?: GrantParam): Fact[] {
    const fact = param === undefined ? this.unit.factsOf(guid)[0] : this.unit.factWith(guid, param);
    return fact === undefined ? [] : this.lose(fact);
  }

  activate(fact: Fact): void {
    const bp = fact.bp;
    if (bp === undefined) return;
    const from = (component: string): Source => ({ kind: 'component', from: fact.blueprint, component });
    for (const [i, c] of bp.Components.entries()) {
      if (!isActivatedGrant(c)) continue;
      switch (c.$type) {
        case 'AddFacts':
          for (const r of c.m_Facts) this.record(fact, `${i}`, this.gainRef(r, undefined, from(c.$type)));
          break;
        case 'AddFeatureOnApply':
          this.gainRef(c.m_Feature, undefined, from(c.$type));
          break;
        case 'RemoveFeatureOnApply':
          this.loseBlueprint(refGuid(c.m_Feature) ?? '');
          break;
        case 'FactSinglify': {
          for (const r of c.m_OldFacts) while (this.loseBlueprint(refGuid(r) ?? '').length > 0);
          for (const r of c.m_NewFacts) {
            if (!this.unit.hasFact(refGuid(r) ?? ''))
              this.record(fact, `${i}`, this.gainRef(r, undefined, from(c.$type)));
          }
          break;
        }
        case 'KensaiChosenWeapon':
          this.gainRef(c.m_Focus, fact.param, from(c.$type));
          break;
        case 'AddFactContextActions':
          this.runActions(c.Activated, from(c.$type));
          break;
        case 'ActivateTrigger':
          if (conditionsHold(c.Conditions, this.context())) this.runActions(c.Actions, from(c.$type));
          break;
        case 'AddParametrizedFeatures':
        case 'AddFeatureParametrized':
          break;
        default:
          unapplied(c);
      }
    }
    for (const g of this.G.grantsOf(fact.blueprint)) {
      if (g.kind === 'AddParametrizedFeatures') this.record(fact, g.kind, this.gain(g.granted, g.param, from(g.kind)));
      else if (g.kind === 'AddFeatureParametrized' && paramKey(g.param) === paramKey(fact.param)) {
        this.record(fact, g.kind, this.gain(g.granted, undefined, from(g.kind)));
      }
    }
    for (const c of bp.Components) {
      if (c.$type === 'AddSpellbookLevel')
        demand(this.unit, refGuid((c as AddSpellbookLevel).m_Spellbook) ?? '').base++;
    }
  }

  gainRef(ref: string | null, param: GrantParam | undefined, source: Source): Fact | undefined {
    const guid = refGuid(ref);
    return guid === undefined ? undefined : this.gain(guid, param, source);
  }

  runActions(list: ActionList, source: Source): void {
    for (const a of list.Actions) {
      if (a.$type === 'Conditional') {
        this.runActions(conditionsHold(a.ConditionsChecker, this.context()) ? a.IfTrue : a.IfFalse, source);
        continue;
      }
      const grant = actionGrant(a.$type, a);
      if (grant !== undefined) this.gain(grant.granted, undefined, source, grant.rankFrom);
    }
  }

  refresh(): void {
    for (let changed = true, guard = 0; changed && guard < 50; guard++) {
      changed = false;
      for (const fact of this.unit.watchedFacts()) {
        if (!this.unit.isHeld(fact)) continue;
        for (const [i, c] of conditionalGrants(fact.bp)) if (this.conditional(fact, i, c)) changed = true;
      }
    }
  }

  conditional(fact: Fact, i: number, c: ConditionalGrant): boolean {
    const u = this.unit;
    const key = `${i}`;
    const source: Source = { kind: 'component', from: fact.blueprint, component: c.$type };
    const single = (want: boolean, feature: Guid | undefined, removable: boolean): boolean => {
      const held = this.appliedOf(fact, key);
      if (want && held === undefined && feature !== undefined) {
        this.record(fact, key, this.gain(feature, undefined, source));
        return true;
      }
      if (!want && held !== undefined && removable) {
        this.applied.get(fact)?.delete(key);
        for (const f of held) this.lose(f);
        return true;
      }
      return false;
    };
    switch (c.$type) {
      case 'AddFeatureOnClassLevel': {
        const level = this.classLevelFor(c);
        return single(c.BeforeThisLevel ? level < c.Level : level >= c.Level, refGuid(c.m_Feature), true);
      }
      case 'AddFeatureIfHasFact':
        return single(u.hasFact(refGuid(c.m_CheckedFact) ?? '') !== c.Not, refGuid(c.m_Feature), false);
      case 'AddFeatureOnAlignment': {
        if (this.appliedOf(fact, key) !== undefined) return false;
        if (u.alignment === undefined || !hasAlignmentComponent(u.alignment, c.Alignment)) return false;
        this.record(fact, key, undefined);
        for (const r of c.m_Facts) this.record(fact, key, this.gainRef(r, undefined, source));
        return true;
      }
      case 'AddFeatureOnSkill': {
        if (permanentValue(u, c.StatType) < c.MinimalStat) return false;
        let changed = false;
        for (const r of c.m_Facts) {
          const guid = refGuid(r);
          if (guid === undefined || u.hasFact(guid)) continue;
          const gained = this.gain(guid, undefined, source);
          this.record(fact, key, gained);
          changed ||= gained !== undefined;
        }
        return changed;
      }
      case 'BuffExtraEffects': {
        const exception = refGuid(c.m_ExceptionFact);
        const want = u.hasFact(refGuid(c.m_CheckedBuff) ?? '') && (exception === undefined || !u.hasFact(exception));
        return single(want, refGuid(c.m_ExtraEffectBuff), true);
      }
      case 'MonkNoArmorFeatureUnlock':
        return single(!this.wornShield() && !this.wornArmor(), refGuid(c.m_NewFact), true);
      case 'MonkNoArmorAndMonkWeaponFeatureUnlock': {
        const main = u.weaponIn('MainHand');
        let want: boolean;
        if (c.IsZenArcher) {
          want = main !== undefined && c.m_BowWeaponTypes.some((r) => refGuid(r) === main.guid);
        } else if (c.IsSohei) {
          const light = !this.wornArmor() || wornArmorGroup(u, this.build.gear ?? {}) === 'Light';
          want = !this.wornShield() && light && (main?.m_IsMonk ?? true);
        } else {
          want = !this.wornShield() && !this.wornArmor() && (main?.m_IsMonk ?? true);
        }
        return single(want, refGuid(c.m_NewFact), true);
      }
      case 'HasArmorFeatureUnlock': {
        const armor = this.wornArmor();
        const type = armor === undefined ? undefined : refGuid(armor.m_Type);
        const byType =
          !c.FilterByBlueprintArmorTypes ||
          (type !== undefined && c.m_BlueprintArmorTypes.some((r) => refGuid(r) === type));
        const group = wornArmorGroup(u, this.build.gear ?? {});
        const byGroup =
          !c.FilterByArmorProficiencyGroup ||
          (armor !== undefined && armorGroupInFlags(group, c.m_ArmorProficiencyGroupEntries));
        const byShield = !c.m_DisableWhenHasShield || !this.wornShield();
        return single(byType && byGroup && byShield, refGuid(c.m_NewFact), true);
      }
      default:
        return unapplied(c);
    }
  }

  wornArmor(): BlueprintItemArmor | undefined {
    const item = this.unit.worn.get('Armor');
    const bp = item === undefined ? undefined : this.unit.bp(item);
    return bp?.$type === 'BlueprintItemArmor' ? bp : undefined;
  }

  wornShield(): boolean {
    const item = this.unit.worn.get('OffHand');
    return item !== undefined && this.unit.bp(item)?.$type === 'BlueprintItemShield';
  }

  wearGear(): void {
    const gear = this.build.gear ?? {};
    for (const [place, item] of gearOf(this.build)) {
      if (misfit(this.unit, gear, place) !== undefined) continue;
      const refusal = cannotWear(this.unit, this.unit.bp(item)!);
      const worn = this.unit.worn.get(place) === item;
      if (refusal === undefined && !worn) this.wear(place, item);
      else if (refusal !== undefined && worn) {
        this.takeOff(place, item);
        this.fail({ choice: 'gear', subject: item, ...refusal });
      }
    }
    this.unit.wornEnhancement.clear();
    for (const stat of ATTRIBUTES) {
      this.unit.wornEnhancement.set(stat, gearEnhancement(this.unit, [...this.unit.worn.values()], stat));
    }
  }

  wear(place: GearPlace, item: Guid): void {
    this.unit.worn.set(place, item);
    const bp = this.unit.bp(item);
    for (const enchantment of bp === undefined ? [] : enchantmentsOf(bp, this.data.blueprints)) {
      for (const g of this.G.grantsOf(enchantment)) {
        if (g.kind !== 'AddUnitFeatureEquipment' && g.kind !== 'AddUnitFactEquipment') continue;
        const fact = this.gain(g.granted, undefined, { kind: 'component', from: enchantment, component: g.kind });
        this.record(place, 'equipment', fact);
      }
    }
  }

  takeOff(place: GearPlace, item: Guid): void {
    if (this.unit.worn.get(place) !== item) return;
    this.unit.worn.delete(place);
    this.loseApplied(place);
  }

  refuseUnworn(): void {
    const gear = this.build.gear ?? {};
    for (const [place, item] of gearOf(this.build)) {
      if (this.unit.worn.get(place) === item) continue;
      const refusal: FailedRule = misfit(this.unit, gear, place) ??
        cannotWear(this.unit, this.unit.bp(item)!) ?? { rule: 'ItemEntity.CanBeEquippedBy' };
      this.fail({ choice: 'gear', subject: item, ...refusal });
    }
  }

  classLevelFor(a: AddFeatureOnClassLevel): number {
    const cls = refGuid(a.m_Class);
    if (cls === undefined) return this.unit.characterLevel;
    const archetypes = (a.m_Archetypes ?? []).map((r) => refGuid(r) ?? '');
    const counts = (c: Guid) => {
      if (archetypes.length === 0) return true;
      const bp = this.unit.bp(c) as BlueprintCharacterClass | undefined;
      const own = new Set((bp?.m_Archetypes ?? []).map((r) => refGuid(r)));
      if (!archetypes.every((x) => own.has(x))) return true;
      return archetypes.some((x) => this.unit.classData(c)?.archetypes.includes(x));
    };
    const levelOf = (c: Guid) => {
      const level = this.unit.classLevel(c);
      return level > 0 && counts(c) ? level : 0;
    };
    let level = levelOf(cls);
    for (const r of a.m_AdditionalClasses ?? []) level += levelOf(refGuid(r) ?? '');
    return level;
  }

  context(slot?: SlotState, owner = ''): Context {
    return {
      unit: this.unit,
      place: this.place,
      firstLevel: this.levelState?.firstLevel ?? false,
      owner,
      ...(slot && { slot }),
      selectionPossible: (selection) => this.selectionPossible(selection, slot),
    };
  }

  levelUp(place: Place, choice: LevelUp | Ascension, mythic: boolean): void {
    this.place = place;
    const firstLevel = !mythic && 'level' in place && place.level === 1;
    const state: LevelState = {
      place,
      mythic,
      firstLevel,
      selectedClass: undefined,
      nextClassLevel: 0,
      attributePoints: 0,
      slots: [],
    };
    this.levelState = state;
    const pausing = this.pause !== undefined && placeKey(this.pause.place) === placeKey(place) ? this.pause : undefined;
    const picks = this.picksAt.get(placeKey(place)) ?? [];
    const pending = new Set(pausing === undefined ? picks : picks.filter((p) => !sameSlot(p.slot, pausing)));
    for (const band of BANDS) {
      switch (band) {
        case 'Race':
          if (firstLevel) this.selectRace();
          break;
        case 'Class':
          this.selectClass(choice.class);
          break;
        case 'RaceStat':
          if (firstLevel) applyStats.raceStat(this);
          break;
        case 'Archetype':
          this.addArchetypes();
          break;
        case 'ApplyClass':
          this.applyClassMechanics();
          this.wearGear();
          break;
        case 'ApplySpellbook':
          if (state.selectedClass !== undefined) applySpellbook(this.unit, state.selectedClass, state.nextClassLevel);
          break;
        case 'AddAttribute':
          if (firstLevel) applyStats.scores(this);
          if (!mythic) applyStats.increase(this, choice as LevelUp);
          break;
        case 'Skills':
          if (!mythic) applyStats.skills(this, choice as LevelUp);
          break;
        default:
          break;
      }
      this.refresh();
      this.applyPicks(band, pending);
      const paused = pausing === undefined ? undefined : state.slots.find((s) => sameSlot(s.id, pausing));
      if (paused !== undefined && BANDS.indexOf(band) >= BANDS.indexOf(this.slotBand(paused))) {
        throw new Paused(this.pausedAt(paused, band));
      }
    }
    for (const pick of pending) this.refusePending(pick);
    this.keepAspectsOn();
    this.refresh();
    for (const slot of state.slots) {
      this.opened.push({
        id: slot.id,
        source: slot.source,
        level: slot.level,
        ...(slot.parent && { parent: slot.parent.key }),
        ...(slot.pick && { pick: slot.pick }),
      });
    }
    this.levelState = undefined;
  }

  selectRace(): void {
    const guid = this.build.race;
    if (guid === undefined) return;
    const race = this.unit.bp(guid);
    if (race?.$type !== 'BlueprintRace') {
      this.fail({ choice: 'race', subject: guid, rule: 'SelectRace.Check' });
      return;
    }
    const restricted = Object.values(this.build.classChoices ?? {}).flatMap((c) =>
      c.archetypes.filter((a) => this.restrictsRace(a, guid)),
    );
    if (restricted.length > 0) {
      this.fail({ choice: 'race', subject: guid, rule: 'BlueprintRace.GetRestrictedByArchetype', found: restricted });
    }
    this.unit.race = guid;
    this.gain(guid, undefined, { kind: 'race', from: guid });
    this.addFeaturesFromProgression(guids((race as BlueprintRace).m_Features), { kind: 'race', from: guid }, 0);
  }

  restrictsRace(archetype: Guid, race: Guid): boolean {
    const bp = this.unit.bp(archetype);
    if (bp === undefined) return false;
    return prerequisites(bp, this.unit.data.blueprints).some(
      (l) =>
        l.names.kind === 'fact' &&
        l.polarity === 'requires' &&
        this.unit.bp(l.names.m_Feature)?.$type === 'BlueprintRace' &&
        l.names.m_Feature !== race,
    );
  }

  selectClass(cls: Guid): void {
    const state = this.level;
    const bp = this.unit.bp(cls);
    if (bp?.$type !== 'BlueprintCharacterClass' || bp.IsMythic !== state.mythic) {
      const found = bp?.$type === 'BlueprintCharacterClass' ? bp.IsMythic : 'not a class';
      this.fail({ choice: 'class', subject: cls, rule: 'SelectClass.Check:IsMythic', found, needed: state.mythic });
      return;
    }
    const reads = this.unit.gearReads;
    const refusal = this.judgeClass(cls);
    if (refusal !== undefined) this.fail({ choice: 'class', subject: cls, ...refusal });
    else this.markGearDependent({ choice: 'class', subject: cls }, () => this.judgeClass(cls), reads);
    const max = this.maxCharacterLevel();
    if (!bp.IsMythic && this.unit.characterLevel + 1 > max) {
      this.fail({
        choice: 'class',
        subject: cls,
        rule: 'UnitProgressionData.MaxCharacterLevel',
        found: this.unit.characterLevel + 1,
        needed: max,
      });
    }
    if (bp.IsMythic) this.pathSwitch(cls);
    let data = this.unit.classData(cls);
    if (data === undefined) {
      data = { class: cls, level: 0, archetypes: [], spellbook: classSpellbook(this.unit, cls, []) };
      this.unit.classes.push(data);
    }
    data.level++;
    if (bp.IsMythic) {
      this.unit.mythicLevel++;
      this.unit.lastMythicClass = cls;
    } else this.unit.characterLevel++;
    state.selectedClass = cls;
    state.nextClassLevel = data.level;
    if (!bp.IsMythic && this.unit.characterLevel % 4 === 0) state.attributePoints = 1;
    const progression = refGuid(bp.m_Progression);
    if (progression !== undefined) this.gain(progression, undefined, { kind: 'class', from: cls });
  }

  maxCharacterLevel(): number {
    const legendary = this.unit
      .componentsOf<AddMechanicsFeature>('AddMechanicsFeature')
      .some((c) => c.component.m_Feature === 'LegendaryHero');
    return legendary ? 40 : 20;
  }

  keepAspectsOn(): void {
    const u = this.unit;
    const used = new Map<string, number>();
    const on = new Map<Guid, Guid>();
    for (const toggle of this.build.aspects ?? []) {
      const bp = u.bp(toggle);
      if (bp?.$type !== 'BlueprintActivatableAbility') {
        this.refuseAspect(toggle, { rule: 'map32.notAToggle' });
        continue;
      }
      if (!u.hasFact(toggle)) continue;
      if (bp.Group !== 'None') {
        const size =
          1 +
          u
            .componentsOf<IncreaseActivatableAbilityGroupSize>('IncreaseActivatableAbilityGroupSize')
            .filter((c) => c.component.Group === bp.Group).length;
        const total = (used.get(bp.Group) ?? 0) + bp.WeightInGroup;
        if (total > size) {
          this.refuseAspect(toggle, { rule: 'ActivatableAbility.TryStart', found: total, needed: size });
          continue;
        }
        used.set(bp.Group, total);
      }
      const buff = refGuid(bp.m_Buff);
      if (buff !== undefined) on.set(toggle, buff);
    }
    for (const [toggle, buff] of this.aspectsOn) {
      if (on.get(toggle) === buff) continue;
      this.loseApplied(toggle);
      this.aspectsOn.delete(toggle);
    }
    for (const [toggle, buff] of on) {
      if (this.aspectsOn.has(toggle)) continue;
      const fact = this.gain(buff, undefined, { kind: 'component', from: toggle, component: 'ActivatableBuff' });
      const owner = this.unit.factsOf(toggle)[0];
      if (owner !== undefined) this.record(owner, 'ActivatableBuff', fact);
      this.record(toggle, 'ActivatableBuff', fact);
      this.aspectsOn.set(toggle, buff);
    }
  }

  refuseAspect(toggle: Guid, refusal: FailedRule): void {
    if (!this.refusedAspects.has(toggle)) this.fail({ choice: 'aspect', subject: toggle, ...refusal });
    this.refusedAspects.add(toggle);
  }

  pathSwitch(cls: Guid): void {
    const u = this.unit;
    const bp = u.bp(cls) as BlueprintCharacterClass;
    const starting = refGuid(this.root.Progression.m_MythicStartingClass) ?? '';
    const isPath = (c: Guid) => {
      const b = u.bp(c) as BlueprintCharacterClass | undefined;
      return b?.IsMythic === true && c !== starting && !b.m_IsHigherMythic && !SWITCH_TO.has(c);
    };
    if (this.legendTaken) {
      this.fail({ choice: 'rank', subject: cls, rule: 'map31.legendEndsAscensions' });
      return;
    }
    const path = u.classes.find((c) => isPath(c.class));
    if (bp.m_IsHigherMythic && path !== undefined && u.classLevel(starting) >= 2) {
      this.dropRanks({ keepGeneral: true, startingLevel: u.mythicLevel });
      this.loseMythicSpellbooks();
    } else if (cls === DEVIL_MYTHIC_CLASS) {
      if (!u.classes.some((c) => c.class === AEON_MYTHIC_CLASS || c.class === AZATA_MYTHIC_CLASS)) {
        this.fail({
          choice: 'class',
          subject: cls,
          rule: 'map31.devilFrom',
          needed: [AEON_MYTHIC_CLASS, AZATA_MYTHIC_CLASS],
        });
      }
      this.dropNamed(DEVIL_DROPS, DEVIL_DROPPED_SELECTIONS);
    } else if (cls === LEGEND_CLASS) {
      this.dropRanks({ keepGeneral: false, startingLevel: 2 });
      this.loseMythicSpellbooks();
      this.legendTaken = true;
    }
  }

  dropRanks(opts: { readonly keepGeneral: boolean; readonly startingLevel: number }): void {
    const u = this.unit;
    const starting = refGuid(this.root.Progression.m_MythicStartingClass) ?? '';
    const dropped = (place: Place) => 'rank' in place && place.rank >= 3;
    const keep = new Set<string>();
    if (opts.keepGeneral) {
      const general = [
        this.root.SystemMechanics.m_MythicFeatSelection,
        this.root.SystemMechanics.m_MythicAbilitySelection,
      ]
        .map((r) => refGuid(r))
        .filter((g): g is Guid => g !== undefined);
      for (const slot of this.opened) {
        if (!dropped(slot.id.place) || !general.includes(slot.id.selection) || slot.pick === undefined) continue;
        const nested = this.opened.find((s) => s.parent === slotKey(slot.id) && s.pick !== undefined);
        const kept = u.bp(slot.pick.feature)?.$type === 'BlueprintFeatureSelection' ? nested?.pick : slot.pick;
        if (kept !== undefined) keep.add(`${kept.feature}|${paramKey(kept.param)}`);
      }
    }
    for (const g of [...this.gains].reverse()) {
      if (!dropped(g.place) || g.source.kind === 'component' || keep.has(`${g.fact}|${paramKey(g.param)}`)) continue;
      const fact = this.gainFacts.get(g);
      if (fact !== undefined) this.recordDropped(this.lose(fact));
    }
    for (const c of u.classes.slice()) {
      const b = u.bp(c.class) as BlueprintCharacterClass;
      if (!b.IsMythic || c.class === starting) continue;
      u.classes.splice(u.classes.indexOf(c), 1);
      const progression = refGuid(b.m_Progression);
      if (progression !== undefined) u.progressions.delete(progression);
    }
    const start = u.classData(starting);
    if (start !== undefined) start.level = opts.startingLevel;
    u.mythicLevel = opts.startingLevel;
    const startingProgression = refGuid((u.bp(starting) as BlueprintCharacterClass | undefined)?.m_Progression);
    if (startingProgression !== undefined) u.progressionData(startingProgression).level = opts.startingLevel;
  }

  recordDropped(left: readonly Fact[]): void {
    for (const f of left) this.dropped.push({ place: this.place, fact: f.blueprint, gainedAt: f.place });
  }

  dropNamed(features: readonly Guid[], selections: readonly Guid[]): void {
    const u = this.unit;
    const picked = this.opened
      .filter((s) => selections.includes(s.id.selection) && s.pick !== undefined)
      .map((s) => s.pick as Pick);
    const targets = [...features, ...selections].map((fact) => ({ fact, param: undefined as GrantParam | undefined }));
    targets.push(...picked.map((p) => ({ fact: p.feature, param: p.param })));
    for (const t of targets) {
      for (let f = u.factWith(t.fact, t.param); f !== undefined; f = u.factWith(t.fact, t.param)) {
        this.recordDropped(this.lose(f));
      }
    }
  }

  loseMythicSpellbooks(): void {
    for (const data of this.unit.spellbooks.values()) {
      data.merged = false;
      data.mythic = 0;
    }
  }

  judgeClass(cls: Guid): FailedRule | undefined {
    const archetypes = this.build.classChoices?.[cls]?.archetypes ?? [];
    const ignoreAlignment = archetypes.some((a) => {
      const bp = this.unit.bp(a);
      return (
        bp !== undefined &&
        prerequisites(bp, this.unit.data.blueprints).some(
          (l) => l.names.kind === 'alignment' && l.names.ArchetypeAlignment,
        )
      );
    });
    const j = classMeetsPrerequisites(cls, this.context(undefined, cls), ignoreAlignment);
    return j.ok ? undefined : { rule: 'BlueprintCharacterClass.MeetsPrerequisites', unmet: j.unmet };
  }

  addArchetypes(): void {
    const state = this.level;
    const cls = state.selectedClass;
    if (cls === undefined || state.nextClassLevel !== 1) return;
    const bp = this.unit.bp(cls) as BlueprintCharacterClass;
    const progression = this.unit.progression(refGuid(bp.m_Progression) ?? '');
    const data = this.unit.classData(cls);
    if (progression === undefined || data === undefined) return;
    for (const archetype of this.build.classChoices?.[cls]?.archetypes ?? []) {
      const a = this.unit.bp(archetype) as BlueprintArchetype | undefined;
      const refuse = (refusal: FailedRule) => this.fail({ choice: 'archetype', subject: archetype, ...refusal });
      if (a?.$type !== 'BlueprintArchetype' || !bp.m_Archetypes.some((r) => refGuid(r) === archetype)) {
        refuse({ rule: 'AddArchetype.Check' });
        continue;
      }
      if (data.level > minFeatureLevel(a) || !canAddArchetype(this.unit, progression, data.archetypes, archetype)) {
        refuse({ rule: 'UnitProgressionData.CanAddArchetype' });
        continue;
      }
      const judged = (): FailedRule | undefined => {
        const j = archetypeMeetsPrerequisites(a, this.context(undefined, archetype));
        return j.ok ? undefined : { rule: 'BlueprintArchetype.MeetsPrerequisites', unmet: j.unmet };
      };
      const reads = this.unit.gearReads;
      const refusal = judged();
      if (refusal !== undefined) {
        refuse(refusal);
        continue;
      }
      this.markGearDependent({ choice: 'archetype', subject: archetype }, judged, reads);
      data.archetypes.push(archetype);
      data.spellbook = classSpellbook(this.unit, cls, data.archetypes);
      this.unit.progressionData(progression.guid).archetypes.push(archetype);
    }
  }

  applyClassMechanics(): void {
    const state = this.level;
    const cls = state.selectedClass;
    if (cls === undefined) return;
    const bp = this.unit.bp(cls) as BlueprintCharacterClass;
    const data = this.unit.classData(cls);
    const replacing = (data?.archetypes ?? [])
      .map((a) => this.unit.bp(a) as BlueprintArchetype)
      .find((a) => a.ReplaceClassSkills);
    for (const skill of replacing?.ClassSkills ?? bp.ClassSkills) this.unit.classSkills.add(skill);
    for (const fact of Array.from(this.unit.facts())) {
      const p = this.unit.progression(fact.blueprint);
      if (p !== undefined) this.updateProgression(p);
    }
  }

  updateProgression(p: BlueprintProgression): void {
    const state = this.level;
    const data = this.unit.progressionData(p.guid);
    let old = data.level;
    const next = calcLevel(this.unit, p);
    data.level = next;
    const exclusive = refGuid(p.m_ExclusiveProgression);
    if (old >= next || (exclusive !== undefined && exclusive !== state.selectedClass)) return;
    if (!p.GiveFeaturesForPreviousLevels) old = next - 1;
    const entries = levelEntries(this.unit, p, data.archetypes);
    for (let i = old + 1; i <= next; i++) {
      const entry = entries.find((e) => e.Level === i);
      if (entry !== undefined) {
        this.addFeaturesFromProgression(entry.features, { kind: 'progression', from: p.guid, level: i }, i);
      }
    }
  }

  addFeaturesFromProgression(features: readonly Guid[], source: Source, level: number): void {
    for (const guid of features) {
      const bp = this.unit.bp(guid);
      if (bp === undefined || !('Ranks' in bp)) continue;
      if (!meetsPrerequisites(bp, this.context(undefined, guid), { fromProgression: true }).ok) continue;
      if (isSelectionType(bp.$type) && (!this.prohibited(guid) || this.obligatory(guid))) {
        this.addSelection(undefined, source, guid, level);
      }
      this.gain(guid, undefined, source);
      if (bp.$type === 'BlueprintProgression') this.updateProgression(bp);
    }
  }

  addSelection(parent: SlotState | undefined, source: Source, selection: Guid, level: number): SlotState {
    const state = this.level;
    const index = state.slots.filter((s) => s.selection === selection).length;
    const slot = new SlotState({ place: this.place, selection, index }, selection, source, level, parent);
    state.slots.push(slot);
    return slot;
  }

  prohibited(selection: Guid): boolean {
    const bp = this.unit.bp(selection);
    if (bp?.$type !== 'BlueprintFeatureSelection') return false;
    const c = bp.Components.find((x) => x.$type === 'NoSelectionIfAlreadyHasFeature') as
      | NoSelectionIfAlreadyHasFeature
      | undefined;
    if (c === undefined) return false;
    if (c.AnyFeatureFromSelection && bp.m_AllFeatures.some((r) => this.unit.hasFact(refGuid(r) ?? ''))) return true;
    return c.m_Features.some((r) => this.unit.hasFact(refGuid(r) ?? ''));
  }

  obligatory(selection: Guid): boolean {
    const bp = this.unit.bp(selection);
    return bp?.$type === 'BlueprintFeatureSelection' && bp.Obligatory;
  }

  selectionWaives(selection: Guid): boolean {
    const bp = this.unit.bp(selection);
    if (bp?.$type !== 'BlueprintFeatureSelection') return false;
    if (bp.IgnorePrerequisites) return true;
    if (selection !== refGuid(this.root.SystemMechanics.m_BasicFeatSelection)) return false;
    return this.unit
      .componentsOf<AddMechanicsFeature>('AddMechanicsFeature')
      .some((c) => c.component.m_Feature === 'TricksterIgnoreFeatPrerequisites');
  }

  slotWaives(slot: SlotState): boolean {
    for (let s: SlotState | undefined = slot; s !== undefined; s = s.parent) {
      if (this.selectionWaives(s.selection)) return true;
    }
    return false;
  }

  canSelect(slot: SlotState, feature: Guid, depth = 0): FailedRule | undefined {
    const u = this.unit;
    const selection = u.bp(slot.selection);
    const bp = u.bp(feature);
    if (selection?.$type !== 'BlueprintFeatureSelection' || bp === undefined || !('Ranks' in bp)) {
      return { rule: 'BlueprintFeatureSelection.CanSelect:selection', ...(selection && { found: selection.$type }) };
    }
    if (!selection.m_AllFeatures.some((r) => refGuid(r) === feature)) {
      return { rule: 'BlueprintFeatureSelection.CanSelect:m_AllFeatures' };
    }
    const waived = this.slotWaives(slot);
    const whiteListed = selection.ExceptWhiteListed && waived;
    if (whiteListed || !waived) {
      const j = meetsPrerequisites(bp, this.context(slot, feature), {
        fromProgression: false,
        onlyWhiteListed: whiteListed,
      });
      if (!j.ok) return { rule: 'BlueprintFeatureSelection.CanSelect:MeetsPrerequisites', unmet: j.unmet };
    }
    const rank = u.rank(feature);
    if (!isSelectionType(bp.$type) && rank >= bp.Ranks) {
      return { rule: 'BlueprintFeatureSelection.CanSelect:Ranks', found: rank, needed: bp.Ranks };
    }
    if ((selection.Mode === 'OnlyNew' && rank > 0) || (selection.Mode === 'OnlyRankUp' && rank <= 0)) {
      return { rule: 'BlueprintFeatureSelection.CanSelect:Mode', found: rank, needed: selection.Mode };
    }
    if (depth < 2 && bp.$type === 'BlueprintFeatureSelection' && !this.canSelectAny(slot, feature, depth + 1)) {
      return { rule: 'NestedFeatureSelectionUtils.AllNestedFeaturesUnavailable' };
    }
    return undefined;
  }

  canSelectAny(slot: SlotState, selection: Guid, depth: number): boolean {
    const bp = this.unit.bp(selection);
    if (bp?.$type !== 'BlueprintFeatureSelection') return true;
    const nested = new SlotState(slot.id, selection, slot.source, slot.level, slot);
    return bp.m_AllFeatures.some((r) => this.canSelect(nested, refGuid(r) ?? '', depth) === undefined);
  }

  selectionPossible(selection: Guid, slot: SlotState | undefined): boolean {
    const bp = this.unit.bp(selection);
    if (bp?.$type !== 'BlueprintFeatureSelection') return false;
    return bp.m_AllFeatures.some((r) => {
      const g = refGuid(r) ?? '';
      const option = this.unit.bp(g);
      if (option === undefined || !('Ranks' in option) || this.unit.hasFact(g)) return false;
      return bp.IgnorePrerequisites || meetsPrerequisites(option, this.context(slot, g), { fromProgression: false }).ok;
    });
  }

  canSelectParam(slot: SlotState, feat: BlueprintParametrizedFeature, param: GrantParam): FailedRule | undefined {
    const u = this.unit;
    const type = feat.ParameterType;
    const value = isParamType(type) ? paramValue(param, type) : undefined;
    if (value === undefined) return { rule: 'BlueprintParametrizedFeature.CanSelect:Items' };
    const blueprint = type === 'Custom' || type === 'FeatureSelection' ? paramValue(param, type) : undefined;
    if (blueprint !== undefined) {
      const variants = (feat.BlueprintParameterVariants ?? []).map((r) => refGuid(r));
      if (!variants.includes(blueprint)) return { rule: 'BlueprintParametrizedFeature.CanSelect:Items' };
    }
    if (type === 'SpellSchool' && value === 'None')
      return { rule: 'BlueprintParametrizedFeature.CanSelect:SpellSchool' };
    if (u.factWith(feat.guid, param) !== undefined) return { rule: 'BlueprintParametrizedFeature.CanSelect:held' };
    const prerequisite = refGuid(feat.m_Prerequisite);
    if (prerequisite !== undefined && u.factWith(prerequisite, param) === undefined && !this.slotWaives(slot)) {
      return { rule: 'BlueprintParametrizedFeature.CanSelect:m_Prerequisite', needed: prerequisite };
    }
    const category = paramValue(param, 'WeaponCategory');
    if (category !== undefined) {
      if (feat.RequireProficiency && !u.weaponProficiencies().has(category)) {
        return { rule: 'BlueprintParametrizedFeature.CanSelect:RequireProficiency', needed: category };
      }
      if (hasSubCategory(category, 'Disabled')) {
        return { rule: 'BlueprintParametrizedFeature.CanSelect:Disabled', found: category };
      }
      for (const c of paramPrerequisites(feat)) {
        if (feat.ParameterType !== 'WeaponCategory' || !c.m_WeaponCategories.includes(category)) continue;
        if (!conditionHolds(c.m_Condition, this.context(slot, feat.guid))) {
          return { rule: 'BlueprintParametrizedFeature.CanSelect:IParamPrerequisite', found: category };
        }
      }
    }
    const paramFeature = blueprint === undefined ? undefined : u.bp(blueprint);
    if (paramFeature !== undefined && feat.HasNoSuchFeature && u.hasFact(paramFeature.guid)) {
      return { rule: 'BlueprintParametrizedFeature.CanSelect:HasNoSuchFeature' };
    }
    if (
      paramFeature !== undefined &&
      'Ranks' in paramFeature &&
      !this.slotWaives(slot) &&
      !feat.IgnoreParameterFeaturePrerequisites
    ) {
      const j = meetsPrerequisites(paramFeature, this.context(slot, paramFeature.guid), { fromProgression: false });
      if (!j.ok) return { rule: 'BlueprintParametrizedFeature.CanSelect:MeetsPrerequisites', unmet: j.unmet };
    }
    return undefined;
  }

  applyPicks(band: Band, pending: Set<Pick>): void {
    const state = this.level;
    const bandIndex = BANDS.indexOf(band);
    for (let progress = true; progress;) {
      progress = false;
      for (const pick of pending) {
        const slot = state.slots.find((s) => sameSlot(s.id, pick.slot));
        if (slot === undefined || slot.pick !== undefined) continue;
        if (BANDS.indexOf(this.slotBand(slot)) > bandIndex) continue;
        if (this.tryPick(slot, pick)) {
          pending.delete(pick);
          progress = true;
          this.refresh();
        }
      }
    }
  }

  slotBand(slot: SlotState): Band {
    const selection = this.unit.bp(slot.selection);
    return bandOf(
      selection?.$type === 'BlueprintFeatureSelectMythicSpellbook'
        ? 'SelectMythicSpellbook'
        : (selection as BlueprintFeatureSelection | undefined)?.Group,
    );
  }

  pausedAt(slot: SlotState, band: Band): PausedWalk {
    const asPick = (feature: Guid, param?: GrantParam): Pick => ({ slot: slot.id, feature, ...(param && { param }) });
    return {
      slot: { id: slot.id, source: slot.source, level: slot.level, ...(slot.parent && { parent: slot.parent.key }) },
      band,
      unit: this.unit,
      judge: (feature, param) => this.judgePick(slot, asPick(feature, param)),
      gearItems: (feature, param) => {
        const pick = asPick(feature, param);
        const reads = this.unit.gearReads;
        if (this.judgePick(slot, pick) !== undefined) return undefined;
        return this.markGearDependent(
          { choice: 'pick', subject: feature, slot: slot.id },
          () => this.judgePick(slot, pick),
          reads,
        );
      },
    };
  }

  readonly refusals = new Map<Pick, FailedRule>();

  tryPick(slot: SlotState, pick: Pick): boolean {
    const reads = this.unit.gearReads;
    const refusal = this.judgePick(slot, pick);
    if (refusal !== undefined) {
      this.refusals.set(pick, refusal);
      return false;
    }
    const items = this.markGearDependent(
      { choice: 'pick', subject: pick.feature, slot: pick.slot },
      () => this.judgePick(slot, pick),
      reads,
    );
    const fact = this.applyPick(slot, pick);
    if (items !== undefined && fact !== undefined) this.gearDependentFacts.set(fact, items);
    return true;
  }

  markGearDependent(
    what: Omit<GearDependent, 'place' | 'items'>,
    judge: () => FailedRule | undefined,
    readsBefore: number,
  ): readonly Guid[] | undefined {
    if (!this.unit.countGear) return undefined;
    const aside = this.gearAside();
    if (aside.size === 0 && this.unit.gearReads === readsBefore) return undefined;
    const refusal = this.unit.withoutGear(new Set(aside.keys()), judge);
    if (refusal === undefined) return undefined;
    const items = new Set<Guid>();
    for (const { leaf } of refusal.unmet ?? []) {
      if (leaf.names.kind === 'stat') {
        for (const stat of scoresRead(this.unit, leaf.names.Stat)) {
          const item = isAttribute(stat) ? this.countedItem(stat) : undefined;
          if (item !== undefined) items.add(item);
        }
      }
      const named = new Set(namedFacts(leaf));
      for (const [fact, its] of aside) if (named.has(fact.blueprint)) for (const i of its) items.add(i);
    }
    const marked = [...items];
    this.gearDependent.push({ place: this.place, ...what, items: marked });
    return marked;
  }

  gearAside(): Map<Fact, readonly Guid[]> {
    const aside = new Map<Fact, readonly Guid[]>();
    for (const [fact, items] of this.gearDependentFacts) {
      for (const f of this.descendants(fact)) if (!aside.has(f)) aside.set(f, items);
    }
    return aside;
  }

  countedItem(stat: Attribute): Guid | undefined {
    const best = this.unit.wornEnhancement.get(stat) ?? 0;
    if (best <= 0) return undefined;
    return [...this.unit.worn.values()].find((item) => gearEnhancement(this.unit, [item], stat) === best);
  }

  judgePick(slot: SlotState, pick: Pick): FailedRule | undefined {
    if (this.unit.bp(slot.selection)?.$type === 'BlueprintFeatureSelectMythicSpellbook') {
      return this.canSelectMythicSpellbook(slot, pick);
    }
    const outer = this.canSelect(slot, pick.feature);
    if (outer !== undefined || pick.param === undefined) return outer;
    const feat = this.unit.bp(pick.feature);
    if (feat?.$type !== 'BlueprintParametrizedFeature') return { rule: 'BlueprintParametrizedFeature.CanSelect:Items' };
    const nested = new SlotState(slot.id, feat.guid, slot.source, slot.level, slot);
    return this.canSelectParam(nested, feat, pick.param);
  }

  canSelectMythicSpellbook(slot: SlotState, pick: Pick): FailedRule | undefined {
    const selection = this.unit.bp(slot.selection);
    if (selection?.$type !== 'BlueprintFeatureSelectMythicSpellbook' || pick.feature !== selection.guid) {
      return { rule: 'BlueprintFeatureSelectMythicSpellbook.CanSelect:Items' };
    }
    const spellbook = paramBlueprint(pick.param);
    if (spellbook === undefined) return undefined;
    if (!this.unit.spellbooks.has(spellbook)) {
      return { rule: 'BlueprintFeatureSelectMythicSpellbook.CanSelect:spellbook', needed: spellbook };
    }
    if (!selection.m_AllowedSpellbooks.some((r) => refGuid(r) === spellbook)) {
      return { rule: 'BlueprintFeatureSelectMythicSpellbook.CanSelect:m_AllowedSpellbooks', found: spellbook };
    }
    return undefined;
  }

  applyPick(slot: SlotState, pick: Pick): Fact | undefined {
    const u = this.unit;
    const bp = u.bp(pick.feature);
    if (bp === undefined) return undefined;
    const selection = u.bp(slot.selection);
    const waived = this.slotWaives(slot);
    const nestedSelection =
      bp.$type === 'BlueprintFeatureSelectMythicSpellbook' || !isSelectionType(bp.$type) ? undefined : bp.guid;
    let next: SlotState | undefined;
    if (nestedSelection !== undefined) next = this.addSelection(slot, slot.source, nestedSelection, slot.level);
    slot.pick = pick;
    slot.picked = pick.feature;
    slot.next = next;
    const source: Source = { kind: 'pick', slot: slot.key };
    let fact: Fact | undefined;
    if (bp.$type === 'BlueprintParametrizedFeature') {
      if (next !== undefined && pick.param !== undefined) {
        next.pick = pick;
        next.picked = pick.feature;
        fact = this.gain(pick.feature, pick.param, { kind: 'pick', slot: next.key });
        if (fact !== undefined) fact.ignorePrerequisites ||= waived;
      }
    } else if (nestedSelection === undefined || bp.$type === 'BlueprintFeatureSelection') {
      fact = this.gain(pick.feature, pick.param, source);
      if (fact !== undefined)
        fact.ignorePrerequisites ||=
          waived || (selection?.$type === 'BlueprintFeatureSelection' && selection.IgnorePrerequisites);
    }
    if (bp.$type === 'BlueprintProgression') this.updateProgression(bp);
    const cls = this.level.selectedClass;
    const classData = cls === undefined ? undefined : u.classData(cls);
    if (classData !== undefined && bp.$type === 'BlueprintFeatureReplaceSpellbook') {
      classData.spellbook = refGuid(bp.m_Spellbook);
    } else if (classData !== undefined && bp.$type === 'BlueprintFeatureSelectMythicSpellbook') {
      const spellbook = paramBlueprint(pick.param);
      if (spellbook !== undefined) {
        classData.spellbook = spellbook;
        demand(u, spellbook).merged = true;
      }
    }
    const paramProgression = u.progression(paramBlueprint(pick.param) ?? '');
    if (paramProgression !== undefined && bp.Components.some((c) => c.$type === 'AddFeatureParametrized')) {
      this.updateProgression(paramProgression);
    }
    const onApply = (feature: Guid, depth: number) => {
      if (depth > 10) return;
      for (const c of u.bp(feature)?.Components ?? []) {
        if (c.$type !== 'AddFeatureOnApply') continue;
        const g = refGuid((c as AddFeatureOnApply).m_Feature) ?? '';
        const p = u.progression(g);
        if (p !== undefined) this.updateProgression(p);
        onApply(g, depth + 1);
      }
    };
    onApply(pick.feature, 0);
    return fact;
  }

  refusePending(pick: Pick): void {
    const state = this.level;
    const slot = state.slots.find((s) => sameSlot(s.id, pick.slot));
    const refuse = (refusal: FailedRule) =>
      this.fail({ choice: 'pick', subject: pick.feature, slot: pick.slot, ...refusal });
    if (slot === undefined) return refuse({ rule: 'LevelUpState.AddSelection' });
    if (slot.pick !== undefined) return refuse({ rule: 'SelectFeature.Check:filled' });
    const refusal = this.refusals.get(pick) ?? this.judgePick(slot, pick);
    if (refusal === undefined) throw new Error(`the walk never judged the pick in ${slot.key}`);
    refuse(refusal);
  }

  get level(): LevelState {
    return this.levelState as LevelState;
  }

  fail(failure: Omit<Failure, 'place'>): void {
    this.failures.push({ place: this.place, ...failure });
  }
}

function minFeatureLevel(a: BlueprintArchetype): number {
  if (a.RemoveSpellbook || a.m_ReplaceSpellbook !== null) return 1;
  const levels = [...a.AddFeatures, ...a.RemoveFeatures].map((e) => e.Level);
  return levels.length === 0 ? 0 : Math.min(...levels);
}
