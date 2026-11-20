// W, the walk (guide §4): the single judge of legality. One pass over a Build, level-up by level-up, each in the
// game's band order (UnitLogic/Class/LevelUp/Actions/LevelUpActionPriority.cs), with Mythic ranks at their Rank levels
// (ADR 0003). It records every fact the character holds with its source and place, every slot it opens with its pick,
// and every choice that fails.
//
// Paths in citations are under decompiled/Assembly-CSharp/Kingmaker/ at WrathDecompiled 6ce4a6b; the level-up actions
// are in UnitLogic/Class/LevelUp/Actions/.
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
import { enchantmentsOf } from '../data/items';
import { blueprintRoot, type CheckedData } from '../data/load';
import {
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
} from '../data/types';
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

/** LevelUpActionPriority, in order: the bands a level-up applies its choices in. */
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

/** SelectFeature.CalculatePriority: a pick's band, from its slot's selection's Group. */
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

/** A fact gained, or raised a rank, at a place: what the gold builds compare against. */
export interface Gain {
  readonly place: Place;
  readonly fact: Guid;
  readonly param?: GrantParam;
  /** The rank reached. */
  readonly rank: number;
  readonly source: Source;
}

/** A slot the walk opened (LevelUpState.AddSelection), with what fills it. */
export interface OpenedSlot {
  readonly id: SlotId;
  readonly source: Source;
  /** FeatureSelectionState.Level: the granting progression's level. */
  readonly level: number;
  /** The slot this one is nested in. */
  readonly parent?: string;
  readonly pick?: Pick;
}

/**
 * A choice allowed only because the Build's Gear counts (ADR 0002's opt-in): a pick, a class level or an archetype
 * whose prerequisites fail without the worn Gear's Enhancement bonuses, or that rests on such a pick. The items are
 * the worn ones whose bonus it needs: each raises a score a failing stat prerequisite reads, or is an item of the
 * gear-dependent pick it rests on.
 */
export interface GearDependent {
  readonly place: Place;
  readonly choice: 'pick' | 'class' | 'archetype';
  /** The picked feature, the class or the archetype. */
  readonly subject: Guid;
  readonly slot?: SlotId;
  readonly items: readonly Guid[];
}

/** A fact a path switch took away (map 31). It counted from where it was gained until the switch. */
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
  /** The character after the whole Build: who holds what, from where (G's Build-aware half). */
  readonly unit: Unit;
}

/** FeatureSelectionState: a slot during its level-up. */
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

/** LevelUpState: one level-up's counters and open slots. */
interface LevelState {
  readonly place: Place;
  readonly mythic: boolean;
  /** LevelUpState.IsFirstCharacterLevel. */
  readonly firstLevel: boolean;
  selectedClass: Guid | undefined;
  /** LevelUpState.NextClassLevel. */
  nextClassLevel: number;
  /** LevelUpState.AttributePoints. */
  attributePoints: number;
  readonly slots: SlotState[];
}

const sameSlot = (a: SlotId, b: SlotId) => slotKey(a) === slotKey(b);

/** What applies facts and takes them away when it goes (`Walker.applied`): a held fact, a Gear place, or a toggle. */
type Owner = Fact | GearPlace | Guid;

// The path switches' classes and what map 31 has Devil drop.
const DEVIL = '211f49705f478b3468db6daa802452a2'; // DevilMythicClass
const LEGEND = '3d420403f3e7340499931324640efe96'; // LegendClass
const AEON = '15a85e67b7d69554cab9ed5830d0268e'; // AeonMythicClass
const AZATA = '9a3b2c63afa79744cbca46bea0da9a16'; // AzataMythicClass
/** The switch classes, beside Gold Dragon and Swarm That Walks (m_IsHigherMythic). */
const SWITCH_TO: ReadonlySet<Guid> = new Set([DEVIL, LEGEND]);
/** devil.ron dropped_features: azata/dragon-companion, aeon/enforcing-gaze-extra-gaze; and the gaze feature itself. */
const DEVIL_DROPS: readonly Guid[] = [
  'cf36f23d60987224696f03be70351928', // DragonCompanion
  '2689d57a889951241912f4bc7d6bb77e', // AeonGazeFeature
  '9b3399bb6cea0044faa42cd61169cc29', // AeonGazeFeatureExtraGaze
];
/** devil.ron dropped_selections: aeon/enforcing-gaze, -2 and -3. */
const DEVIL_DROPPED_SELECTIONS: readonly Guid[] = [
  '7e468a5266235454e9dcefee315ee6d5', // AeonGazeFirstSelection
  '7d498e034d18ca94baea19d7edee7403', // AeonGazeSecondSelection
  '0bec49f67ecb49a5826fcfefb9408a35', // AeonGazeThirdSelection
];

/** The grant components the walk runs when their fact is gained (`activate`). */
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

/** The grant components the walk re-judges while their condition can change (`refresh`). */
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

/** The equipment grants the walk holds while their item is worn (`wear`). */
const WORN_GRANTS = [
  'AddUnitFeatureEquipment',
  'AddUnitFactEquipment',
] as const satisfies readonly GrantComponent['$type'][];

type ActivatedGrant = Extract<GrantComponent, { $type: (typeof ON_ACTIVATE)[number] }>;
type ConditionalGrant = Extract<GrantComponent, { $type: (typeof CONDITIONAL)[number] }>;

/**
 * The grant component types the walk applies. Every type G reads (`grantTypes`) is one of these or is listed, with the
 * module that applies it, in engine/areas.ts.
 */
export const appliedGrantTypes: ReadonlySet<GrantComponent['$type']> = new Set([
  ...ON_ACTIVATE,
  ...CONDITIONAL,
  ...WORN_GRANTS,
]);

/**
 * The grants a blueprint's own fields make (G's `fieldGrantKinds`) that the walk applies. Every such kind is one of
 * these or is listed in engine/areas.ts.
 */
export const appliedFieldGrants: ReadonlySet<FieldGrantKind> = new Set<FieldGrantKind>([
  // `start`: the feats progression; the classes, Mythic classes and races on offer are the Build's own choices.
  'root',
  // `selectClass` and `addArchetypes`: a class's progression, and the archetypes it can be taken with.
  'classProgression',
  'classArchetype',
  // progression.ts `levelEntries` (ProgressionData.CalculateLevelEntries) merges these.
  'levelEntry',
  'archetypeAdd',
  'archetypeRemove',
  // `canSelect`: a selection's options.
  'selectionOption',
  // `selectRace`: the race's features.
  'raceFeature',
  // items.ts `enchantmentsOf`, read by `wear`: a worn item's enchantments, and a shield's armour half and bash weapon.
  'itemEnchantment',
  'shieldPart',
  // `keepAspectsOn`: the buff an aspect kept on applies (map 32).
  'ActivatableBuff',
]);

const isActivatedGrant = (c: Component): c is ActivatedGrant => (ON_ACTIVATE as readonly string[]).includes(c.$type);
const isConditionalGrant = (c: Component): c is ConditionalGrant =>
  (CONDITIONAL as readonly string[]).includes(c.$type);

const conditionalCache = new WeakMap<Blueprint, readonly (readonly [number, ConditionalGrant])[]>();

/** A blueprint's conditional grants, each with its component index: read once per blueprint. */
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

/** For a switch's default: the walk lists a grant type it has no case for. */
function unapplied(c: never): never {
  throw new Error(`the walk lists ${(c as Component).$type} as applied but has no case for it`);
}

/** Walks a Build through the game's level-up rules. `G` defaults to a new index over `data`. */
export function walk(data: CheckedData, build: Build, G: GrantIndex = buildGrantIndex(data)): Walk {
  return new Walker(data, build, G).run();
}

/**
 * The walk paused at one slot (build ticket 04): run to the end of the slot's band at its place, with the band's other
 * picks applied as the walk applies them and only the slot's own pick withdrawn; later bands don't count. Judging
 * only reads the paused walk, so every candidate is judged on the same character.
 */
export interface PausedWalk {
  /** The slot, open and empty. */
  readonly slot: OpenedSlot;
  /** The band the slot's pick is judged in (SelectFeature.CalculatePriority). */
  readonly band: Band;
  /** The character at the pause. */
  readonly unit: Unit;
  /** SelectFeature.Check for an option in the slot: undefined when the game allows it. */
  judge(feature: Guid, param?: GrantParam): FailedRule | undefined;
  /** ADR 0002: the worn items an allowed option needs, under the Gear opt-in; undefined when it needs none. */
  gearItems(feature: Guid, param?: GrantParam): readonly Guid[] | undefined;
}

/** Thrown to stop the walk at its pause point. */
class Paused {
  constructor(readonly paused: PausedWalk) {}
}

/** Pauses the walk of `build` at `slot`; undefined when the slot never opens. */
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
  /** The fact each gain gained or raised, so a switch takes away that very fact. */
  readonly gainFacts = new Map<Gain, Fact>();
  readonly failures: Failure[] = [];
  readonly opened: OpenedSlot[] = [];
  /**
   * What each owner applied, to take away when it goes, by key: a held fact's grant components (each component's
   * Data.AppliedFact or AppliedFacts, keyed by the component's index, or by G's kind for the grants applied through
   * G); the item worn in a Gear place (its AddUnitFeatureEquipment and AddUnitFactEquipment facts, under `equipment`);
   * and an aspect kept on, by its toggle (its buff, under `ActivatableBuff`).
   */
  readonly applied = new Map<Owner, Map<string, Fact[]>>();
  readonly gearDependent: GearDependent[] = [];
  /** The facts of the gear-dependent picks, each with the items it needs (ADR 0002). */
  readonly gearDependentFacts = new Map<Fact, readonly Guid[]>();
  /** What a path switch took away (map 31): the switch's place, the fact, and where it was gained. */
  readonly dropped: Dropped[] = [];
  /** Legend ends the ascensions (map 31). */
  legendTaken = false;
  /** Each aspect kept on now, by its toggle, with the buff the toggle applies (map 32); `applied` holds its fact. */
  readonly aspectsOn = new Map<Guid, Guid>();
  readonly refusedAspects = new Set<Guid>();
  place: Place = { level: 0 };
  /** The level-up under way, which `level` reads. */
  private levelState: LevelState | undefined;
  /** The Build's picks by place key, in Build order. */
  readonly picksAt = new Map<string, Pick[]>();

  constructor(
    readonly data: CheckedData,
    readonly build: Build,
    readonly G: GrantIndex,
    /** The slot to pause at (`pauseAt`). */
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
    // UnitProgressionData's constructor: every character holds the root's FeatsProgression.
    const feats = refGuid(this.root.Progression.m_FeatsProgression);
    if (feats !== undefined) this.gain(feats, undefined, { kind: 'class', from: feats });
    const ranks = this.build.ranks ?? [];
    let rank = 0;
    for (let r = 1; r < ranks.length; r++) {
      const [before, at] = [ranks[r - 1]?.level ?? 0, ranks[r]?.level ?? 0];
      // ADR 0003: ranks come in rank order, each at or after the one before.
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
    // Ranks placed after the Build's last level come after it, in rank order.
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

  // ---- facts -------------------------------------------------------------------------------------------------

  /**
   * FeatureCollection.AddFact, then the new fact's grant components (EntityFact.Activate). With `rankFrom`, the fact
   * then takes that feature's rank, when it is held: UnitLogic/Mechanics/Actions/ContextActionAddFeature.cs RunAction
   * (m_SetRankFrom, Feature.SetRank).
   */
  gain(guid: Guid, param: GrantParam | undefined, source: Source, rankFrom?: Guid): Fact | undefined {
    if (!this.data.blueprints.has(guid)) return undefined;
    const r = this.unit.attach(guid, param, source, this.place);
    // A Replace buff's held fact went (Unit.attach), and what it gave goes with it; the grant that gave the old one no
    // longer holds it.
    if (r.replaced !== undefined) this.loseApplied(r.replaced);
    if (r.added || r.raised) {
      this.recordGain(r.fact, source, param);
      if (r.added) this.activate(r.fact);
    }
    const rank = rankFrom === undefined ? 0 : this.unit.rank(rankFrom);
    if (rank > 0 && this.unit.setRank(r.fact, rank)) this.recordGain(r.fact, source, param);
    return r.fact;
  }

  /** Records that a fact was gained or raised a rank here (`gains`), and which fact it was (`gainFacts`). */
  recordGain(fact: Fact, source: Source, param: GrantParam | undefined): void {
    const gain: Gain = { place: this.place, fact: fact.blueprint, rank: fact.rank, source, ...(param && { param }) };
    this.gains.push(gain);
    this.gainFacts.set(gain, fact);
  }

  /**
   * Records that `owner` (by its component's index or G's kind, or its key) has applied `fact`, to take it away when
   * `owner` goes. A component that ran but applied nothing is recorded too, so a conditional one doesn't run again.
   */
  record(owner: Owner, key: string, fact: Fact | undefined): void {
    let byKey = this.applied.get(owner);
    if (byKey === undefined) this.applied.set(owner, (byKey = new Map()));
    let list = byKey.get(key);
    if (list === undefined) byKey.set(key, (list = []));
    if (fact !== undefined) list.push(fact);
  }

  /** What `owner`'s component (by index, or G's kind) applied, if it has run. */
  appliedOf(owner: Fact, key: string): readonly Fact[] | undefined {
    return this.applied.get(owner)?.get(key);
  }

  /**
   * EntityFactsManager.Remove of one fact (Unit.remove). When the fact leaves, each of its grant components'
   * OnDeactivate takes away what it applied: AddFacts.OnDeactivate (Clear), AddFeatureIfHasFact,
   * AddFeatureOnClassLevel, AddFeatureParametrized, AddUnitFeatureEquipment and AddUnitFactEquipment (AppliedFact),
   * AddFeatureOnAlignment, AddFeatureOnSkill, AddParametrizedFeatures and FactSinglify (AppliedFacts), BuffExtraEffects
   * and the Gear unlocks (their buff or fact), and ActivatableAbility's buff. AddFeatureOnApply, KensaiChosenWeapon,
   * AddFactContextActions and ActivateTrigger have no such method: what they gave stays. A rank dropped leaves the fact
   * and its grants (Feature.RemoveRank reapplies them). Returns every fact that left, this one first.
   */
  lose(fact: Fact): Fact[] {
    if (this.unit.remove(fact) !== 'left') return [];
    return [fact, ...this.loseApplied(fact)];
  }

  /** Takes away everything `owner` applied (`lose`), as it goes. Returns every fact that left. */
  loseApplied(owner: Owner): Fact[] {
    const left: Fact[] = [];
    const applied = this.applied.get(owner);
    this.applied.delete(owner);
    for (const list of applied?.values() ?? []) for (const f of list) left.push(...this.lose(f));
    return left;
  }

  /** `fact` while held, then what it applied that is still held, and so on down: depth first, each once. */
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

  /** `lose` for the first held fact of a blueprint (UnitHelper.RemoveFact by blueprint). */
  loseBlueprint(guid: Guid, param?: GrantParam): Fact[] {
    const fact = param === undefined ? this.unit.factsOf(guid)[0] : this.unit.factWith(guid, param);
    return fact === undefined ? [] : this.lose(fact);
  }

  /**
   * The grant components a fact runs when it is gained (each component's OnActivate or OnFactActivate). The
   * conditional ones (AddFeatureOnClassLevel and its kin) are judged in `refresh`.
   */
  activate(fact: Fact): void {
    const bp = fact.bp;
    if (bp === undefined) return;
    const from = (component: string): Source => ({ kind: 'component', from: fact.blueprint, component });
    for (const [i, c] of bp.Components.entries()) {
      if (!isActivatedGrant(c)) continue;
      switch (c.$type) {
        case 'AddFacts':
          // UnitLogic/FactLogic/AddFacts.cs UpdateFacts, into AppliedFacts. No written blueprint sets
          // HasDifficultyRequirements.
          for (const r of c.m_Facts) this.record(fact, `${i}`, this.gainRef(r, undefined, from(c.$type)));
          break;
        case 'AddFeatureOnApply':
          // Designers/Mechanics/Facts/AddFeatureOnApply.cs OnActivate: once, for good.
          this.gainRef(c.m_Feature, undefined, from(c.$type));
          break;
        case 'RemoveFeatureOnApply':
          // Designers/Mechanics/Facts/RemoveFeatureOnApply.cs OnActivate: UnitHelper.RemoveFact by blueprint.
          this.loseBlueprint(refGuid(c.m_Feature) ?? '');
          break;
        case 'FactSinglify': {
          // Designers/Mechanics/Facts/FactSinglify.cs OnActivate: the old facts go, one copy of each new one stays,
          // into AppliedFacts.
          for (const r of c.m_OldFacts) while (this.loseBlueprint(refGuid(r) ?? '').length > 0);
          for (const r of c.m_NewFacts) {
            if (!this.unit.hasFact(refGuid(r) ?? ''))
              this.record(fact, `${i}`, this.gainRef(r, undefined, from(c.$type)));
          }
          break;
        }
        case 'KensaiChosenWeapon':
          // Designers/Mechanics/Facts/KensaiChosenWeapon.cs OnActivate: the focus feat at this fact's own weapon.
          this.gainRef(c.m_Focus, fact.param, from(c.$type));
          break;
        case 'AddFactContextActions':
          // UnitLogic/Mechanics/Components/AddFactContextActions.cs OnActivate: runs Activated.
          this.runActions(c.Activated, from(c.$type));
          break;
        case 'ActivateTrigger':
          // Designers/EventConditionActionSystem/Events/ActivateTrigger.cs Trigger: Actions when Conditions hold.
          if (conditionsHold(c.Conditions, this.context())) this.runActions(c.Actions, from(c.$type));
          break;
        case 'AddParametrizedFeatures':
        case 'AddFeatureParametrized':
          // Below, through G, which reads each grant's parameter.
          break;
        default:
          unapplied(c);
      }
    }
    // UnitLogic/FactLogic/AddParametrizedFeatures.cs OnActivate (into AppliedFeatures) and
    // Designers/Mechanics/Facts/AddFeatureParametrized.cs OnActivate (AppliedFact), through G, which reads each grant's
    // parameter.
    for (const g of this.G.grantsOf(fact.blueprint)) {
      if (g.kind === 'AddParametrizedFeatures') this.record(fact, g.kind, this.gain(g.granted, g.param, from(g.kind)));
      else if (g.kind === 'AddFeatureParametrized' && paramKey(g.param) === paramKey(fact.param)) {
        this.record(fact, g.kind, this.gain(g.granted, undefined, from(g.kind)));
      }
    }
    // Designers/Mechanics/Facts/AddSpellbookLevel.cs OnActivate: one more base level in its spellbook, once.
    for (const c of bp.Components) {
      if (c.$type === 'AddSpellbookLevel')
        demand(this.unit, refGuid((c as AddSpellbookLevel).m_Spellbook) ?? '').base++;
    }
  }

  gainRef(ref: string | null, param: GrantParam | undefined, source: Source): Fact | undefined {
    const guid = refGuid(ref);
    return guid === undefined ? undefined : this.gain(guid, param, source);
  }

  /**
   * An action list's grant actions (map ticket 23), through its Conditional trees
   * (Designers/EventConditionActionSystem/Actions/Conditional.cs RunAction). Which actions grant, and what, is G's one
   * answer (`actionGrant`): a ContextActionApplyBuff grants only when Permanent, and a ContextActionAddFeature's
   * feature takes its m_SetRankFrom feature's rank (`gain`).
   */
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

  /**
   * The grants that hold while a condition does, re-judged until nothing changes: AddFeatureOnClassLevel (from a
   * class level, or below it), AddFeatureIfHasFact, AddFeatureOnAlignment, AddFeatureOnSkill, BuffExtraEffects and the
   * Gear unlocks. The game re-runs each on the event its condition reads (a level gained, a fact added, an item
   * equipped); the walk runs them all after every change that can move one. Each keeps what it applied, as its
   * component's Data does, and applies again only once that is cleared.
   */
  refresh(): void {
    for (let changed = true, guard = 0; changed && guard < 50; guard++) {
      changed = false;
      for (const fact of this.unit.watchedFacts()) {
        // a snapshot: gaining facts adds to the map, and losing one may take others
        if (!this.unit.isHeld(fact)) continue;
        for (const [i, c] of conditionalGrants(fact.bp)) if (this.conditional(fact, i, c)) changed = true;
      }
    }
  }

  /**
   * One conditional grant, re-judged: applies what it should hold and hasn't applied, and takes away what it applied
   * once it should no longer hold, where its component does. Says whether anything changed.
   */
  conditional(fact: Fact, i: number, c: ConditionalGrant): boolean {
    const u = this.unit;
    const key = `${i}`;
    const source: Source = { kind: 'component', from: fact.blueprint, component: c.$type };
    // The one-fact components: whether it should hold, the fact, and whether it is taken away once it shouldn't.
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
        // Designers/Mechanics/Facts/AddFeatureOnClassLevel.cs Apply and IsFeatureShouldBeApplied, with
        // Designers/Mechanics/Facts/ReplaceCasterLevelOfAbility.cs CalculateClassLevel and CheckArchetype.
        const level = this.classLevelFor(c);
        return single(c.BeforeThisLevel ? level < c.Level : level >= c.Level, refGuid(c.m_Feature), true);
      }
      case 'AddFeatureIfHasFact':
        // Designers/Mechanics/Facts/AddFeatureIfHasFact.cs Apply: adds once the condition holds; only OnDeactivate
        // takes it away.
        return single(u.hasFact(refGuid(c.m_CheckedFact) ?? '') !== c.Not, refGuid(c.m_Feature), false);
      case 'AddFeatureOnAlignment': {
        // Designers/Mechanics/Facts/AddFeatureOnAlignment.cs OnActivate: every listed fact, into AppliedFacts, while
        // the alignment has the component. A Build's alignment never changes (HandleAlignmentChange).
        if (this.appliedOf(fact, key) !== undefined) return false;
        if (u.alignment === undefined || !hasAlignmentComponent(u.alignment, c.Alignment)) return false;
        this.record(fact, key, undefined);
        for (const r of c.m_Facts) this.record(fact, key, this.gainRef(r, undefined, source));
        return true;
      }
      case 'AddFeatureOnSkill': {
        // Designers/Mechanics/Facts/AddFeatureOnSkill.cs OnActivate and HandleUnitGainLevel: once the stat's permanent
        // value reaches the minimum, each listed fact not held, into AppliedFacts.
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
        // Designers/Mechanics/Facts/BuffExtraEffects.cs CheckAndReapply (no kept component sets the list),
        // ExceptionFact, and HandleBuffDidRemoved.
        const exception = refGuid(c.m_ExceptionFact);
        const want = u.hasFact(refGuid(c.m_CheckedBuff) ?? '') && (exception === undefined || !u.hasFact(exception));
        return single(want, refGuid(c.m_ExtraEffectBuff), true);
      }
      case 'MonkNoArmorFeatureUnlock':
        // Designers/Mechanics/Buffs/MonkNoArmorFeatureUnlock.cs CheckEligibility: no shield and no body armour.
        return single(!this.wornShield() && !this.wornArmor(), refGuid(c.m_NewFact), true);
      case 'MonkNoArmorAndMonkWeaponFeatureUnlock': {
        // Designers/Mechanics/Buffs/MonkNoArmorAndMonkWeaponFeatureUnlock.cs CheckEligibility.
        const main = u.weaponIn('MainHand');
        let want: boolean;
        if (c.IsZenArcher) {
          // The main hand holds one of the bow types (RapidShotBuff, the in-play exception, is never on in a Build).
          want = main !== undefined && c.m_BowWeaponTypes.some((r) => refGuid(r) === main.guid);
        } else if (c.IsSohei) {
          // Light or no armour, no shield and a monk weapon. UnitPartWeaponTraining.IsSuitableWeapon's other weapons
          // aren't read: stricter than the game.
          const light = !this.wornArmor() || wornArmorGroup(u, this.build.gear ?? {}) === 'Light';
          want = !this.wornShield() && light && (main?.m_IsMonk ?? true);
        } else {
          // An empty main hand is the unarmed strike, a monk weapon (UnitBody.EmptyHandWeapon).
          want = !this.wornShield() && !this.wornArmor() && (main?.m_IsMonk ?? true);
        }
        return single(want, refGuid(c.m_NewFact), true);
      }
      case 'HasArmorFeatureUnlock': {
        // Designers/Mechanics/Buffs/HasArmorFeatureUnlock.cs CheckEligibility, with RestrictionsHelper.CheckArmor
        // (the body armour's type, or its group as ItemEntityArmor.ArmorType reads it, mithral included).
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

  // ---- Gear ------------------------------------------------------------------------------------------------

  /** RestrictionsHelper.CheckHasArmor: body armour worn, whose type is armour. */
  wornArmor(): BlueprintItemArmor | undefined {
    const item = this.unit.worn.get('Armor');
    const bp = item === undefined ? undefined : this.unit.bp(item);
    return bp?.$type === 'BlueprintItemArmor' ? bp : undefined;
  }

  /** HandSlot.HasShield, for the off hand. */
  wornShield(): boolean {
    const item = this.unit.worn.get('OffHand');
    return item !== undefined && this.unit.bp(item)?.$type === 'BlueprintItemShield';
  }

  /**
   * The Build's Gear at this level-up: an item goes on once the character can wear it (ItemEntity.CanBeEquippedBy)
   * and comes off, refused, if it no longer can. A worn item's enchantments hold their AddUnitFeatureEquipment and
   * AddUnitFactEquipment facts (G's itemEnchantment and shieldPart grants).
   */
  wearGear(): void {
    const gear = this.build.gear ?? {};
    for (const [place, item] of gearOf(this.build)) {
      // `misfit` refuses an item the data doesn't hold.
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

  /**
   * ItemEntity.OnDidEquipped: the item's enchantments activate, and each AddUnitFeatureEquipment or
   * AddUnitFactEquipment gives the wielder its fact (its OnActivate, into AppliedFact).
   */
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

  /** ItemEntity.OnWillUnequip: each equipment grant's OnDeactivate removes the fact it gave, and what that fact gave. */
  takeOff(place: GearPlace, item: Guid): void {
    if (this.unit.worn.get(place) !== item) return;
    this.unit.worn.delete(place);
    this.loseApplied(place);
  }

  /** The Gear the Build never got to wear, with why, judged on the finished character. */
  refuseUnworn(): void {
    const gear = this.build.gear ?? {};
    for (const [place, item] of gearOf(this.build)) {
      if (this.unit.worn.get(place) === item) continue;
      // `misfit` refuses an item the data doesn't hold.
      const refusal: FailedRule = misfit(this.unit, gear, place) ??
        cannotWear(this.unit, this.unit.bp(item)!) ?? { rule: 'ItemEntity.CanBeEquippedBy' };
      this.fail({ choice: 'gear', subject: item, ...refusal });
    }
  }

  /** ReplaceCasterLevelOfAbility.CalculateClassLevel: the character level without a class, else the listed classes'. */
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
    // A class not taken adds nothing, whether it counts or not.
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

  // ---- level-ups ---------------------------------------------------------------------------------------------

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

  /** SelectRace.Check and Apply: the race, its fact, and its features at level 0. */
  selectRace(): void {
    const guid = this.build.race;
    if (guid === undefined) return;
    const race = this.unit.bp(guid);
    if (race?.$type !== 'BlueprintRace') {
      this.fail({ choice: 'race', subject: guid, rule: 'SelectRace.Check' });
      return;
    }
    // BlueprintRace.GetRestrictedByArchetype: an archetype whose PrerequisiteFeature names another race.
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

  /** BlueprintRace.GetRestrictedByArchetype: the archetype requires (PrerequisiteFeature) a race other than this. */
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

  /** SelectClass.Check and Apply, with UnitProgressionData.AddClassLevel. */
  selectClass(cls: Guid): void {
    const state = this.level;
    const bp = this.unit.bp(cls);
    if (bp?.$type !== 'BlueprintCharacterClass' || bp.IsMythic !== state.mythic) {
      // SelectClass.Check: a Mythic rank's class is Mythic, a character level's isn't.
      const found = bp?.$type === 'BlueprintCharacterClass' ? bp.IsMythic : 'not a class';
      this.fail({ choice: 'class', subject: cls, rule: 'SelectClass.Check:IsMythic', found, needed: state.mythic });
      return;
    }
    const reads = this.unit.gearReads;
    const refusal = this.judgeClass(cls);
    if (refusal !== undefined) this.fail({ choice: 'class', subject: cls, ...refusal });
    else this.markGearDependent({ choice: 'class', subject: cls }, () => this.judgeClass(cls), reads);
    // UnitProgressionData.MaxCharacterLevel: 20, or 40 with the LegendaryHero flag (CanLevelUpNormal).
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
    // UnitProgressionData.AddClassLevel. A refused class still takes its level, so the rest of the Build is judged.
    let data = this.unit.classData(cls);
    if (data === undefined) {
      // UnitLogic/ClassData.cs constructor: the class's own spellbook.
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

  /** UnitProgressionData.MaxCharacterLevel: 40 while a held fact sets LegendaryHero (AddMechanicsFeature), else 20. */
  maxCharacterLevel(): number {
    const legendary = this.unit
      .componentsOf<AddMechanicsFeature>('AddMechanicsFeature')
      .some((c) => c.component.m_Feature === 'LegendaryHero');
    return legendary ? 40 : 20;
  }

  // ---- aspects kept on (map ticket 32) -----------------------------------------------------------------------

  /**
   * The Build's aspects kept on, judged at the end of each level-up, in the Build's order: a held toggle goes on when
   * its group has room (ActivatableAbility.TryStart: the group's WeightInGroup total, this toggle's included, within
   * UnitPartActivatableAbility.GetGroupSize, which is 1 plus each held IncreaseActivatableAbilityGroupSize for the
   * group; the None group has no limit). An on toggle holds its buff (ActivatableAbility.ReapplyBuff, G's
   * ActivatableBuff); a toggle that no longer fits is refused and its buff goes.
   */
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
    // ActivatableAbility.OnTurnOff (or the toggle gone): the buff it applied goes, with what the buff gave.
    for (const [toggle, buff] of this.aspectsOn) {
      if (on.get(toggle) === buff) continue;
      this.loseApplied(toggle);
      this.aspectsOn.delete(toggle);
    }
    for (const [toggle, buff] of on) {
      if (this.aspectsOn.has(toggle)) continue;
      const fact = this.gain(buff, undefined, { kind: 'component', from: toggle, component: 'ActivatableBuff' });
      // The toggle's own deactivation takes its buff away too (ActivatableAbility.OnDeactivate).
      const owner = this.unit.factsOf(toggle)[0];
      if (owner !== undefined) this.record(owner, 'ActivatableBuff', fact);
      this.record(toggle, 'ActivatableBuff', fact);
      this.aspectsOn.set(toggle, buff);
    }
  }

  /** Refuses an aspect the Build keeps on, once: it stays refused for the rest of the Build. */
  refuseAspect(toggle: Guid, refusal: FailedRule): void {
    if (!this.refusedAspects.has(toggle)) this.fail({ choice: 'aspect', subject: toggle, ...refusal });
    this.refusedAspects.add(toggle);
  }

  // ---- path switches (map ticket 31) -------------------------------------------------------------------------

  /**
   * A path switch, applied as the switch class's level is added. Each takes away Mythic grants and picks gained at
   * ranks 3 and up; those still counted until now, and are recorded as dropped here.
   * - Gold Dragon and Swarm That Walks (m_IsHigherMythic): UnitProgressionData.AddClassLevel calls
   *   ReplaceAllMythicLevelsWithMythicHeroLevels when a path is held (IsSuitableProgression). It removes every Mythic
   *   level after rank 2 (RemoveMythicLevel, which drops the facts those levels gave), re-adds the Mythic Feat and
   *   Mythic Ability picks (GetMythicSelectionsData, where a pick that is itself a selection gives back its nested
   *   pick), and refills the ranks with Mythic Hero levels (AddFakeLevel).
   * - Devil and Legend run through story actions (RemoveMythicLevels) whose counts sit in dialogue blueprints the data
   *   doesn't hold, so they follow map 31's sources: Legend keeps only ranks 1–2 (GameFAQs other-mythic-paths.txt,
   *   Rust legend.ron kept_through_rank 2) and ends the ascensions; Devil keeps ranks 1–7 but drops the Azata's dragon
   *   and the Aeon's gazes (Rust devil.ron dropped_features, dropped_selections; GameFAQs other-mythic-paths.txt),
   *   and is open only from the Aeon or the Azata (devil.ron from; the data's DevilMythicClass condition requires the
   *   same in its DLC branch).
   * - Gold Dragon, Swarm and Legend lose the Mythic spellbook; Devil keeps it, no longer advancing (GameFAQs
   *   mythic-paths.txt).
   */
  pathSwitch(cls: Guid): void {
    const u = this.unit;
    const bp = u.bp(cls) as BlueprintCharacterClass;
    const starting = refGuid(this.root.Progression.m_MythicStartingClass) ?? '';
    const isPath = (c: Guid) => {
      const b = u.bp(c) as BlueprintCharacterClass | undefined;
      return b?.IsMythic === true && c !== starting && !b.m_IsHigherMythic && !SWITCH_TO.has(c);
    };
    if (this.legendTaken) {
      // Map 31: GameFAQs, legend.ron.
      this.fail({ choice: 'rank', subject: cls, rule: 'map31.legendEndsAscensions' });
      return;
    }
    const path = u.classes.find((c) => isPath(c.class));
    if (bp.m_IsHigherMythic && path !== undefined && u.classLevel(starting) >= 2) {
      this.dropRanks({ keepGeneral: true, startingLevel: u.mythicLevel });
      this.loseMythicSpellbooks();
    } else if (cls === DEVIL) {
      if (!u.classes.some((c) => c.class === AEON || c.class === AZATA)) {
        this.fail({ choice: 'class', subject: cls, rule: 'map31.devilFrom', needed: [AEON, AZATA] });
      }
      this.dropNamed(DEVIL_DROPS, DEVIL_DROPPED_SELECTIONS);
    } else if (cls === LEGEND) {
      this.dropRanks({ keepGeneral: false, startingLevel: 2 });
      this.loseMythicSpellbooks();
      this.legendTaken = true;
    }
  }

  /**
   * RemoveMythicLevel down to rank 2: every Mythic class but the starting one leaves, and what ranks 3 and up gave goes,
   * except, when `keepGeneral`, the Mythic Feat and Mythic Ability picks (GetMythicSelectionsData) and what they
   * hold. The starting class then stands at `startingLevel` (AddFakeLevel, which grants nothing).
   */
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
        // A pick that is itself a selection gives back its nested pick instead (GetMythicSelectionsData).
        const nested = this.opened.find((s) => s.parent === slotKey(slot.id) && s.pick !== undefined);
        const kept = u.bp(slot.pick.feature)?.$type === 'BlueprintFeatureSelection' ? nested?.pick : slot.pick;
        if (kept !== undefined) keep.add(`${kept.feature}|${paramKey(kept.param)}`);
      }
    }
    // RemoveMythicLevel takes away what each level gave. A component's grant goes with the fact that gave it
    // (`lose`), not with the level it came at.
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

  /** Records the facts a switch took away (map 31), each with where it was first gained. */
  recordDropped(left: readonly Fact[]): void {
    for (const f of left) this.dropped.push({ place: this.place, fact: f.blueprint, gainedAt: f.place });
  }

  /** Devil's named drops: the features, and the picks in the slots of the selections (map 31, devil.ron). */
  dropNamed(features: readonly Guid[], selections: readonly Guid[]): void {
    const u = this.unit;
    const picked = this.opened
      .filter((s) => selections.includes(s.id.selection) && s.pick !== undefined)
      .map((s) => s.pick as Pick);
    const targets = [...features, ...selections].map((fact) => ({ fact, param: undefined as GrantParam | undefined }));
    targets.push(...picked.map((p) => ({ fact: p.feature, param: p.param })));
    for (const t of targets) {
      // Every rank of it, and what it gave.
      for (let f = u.factWith(t.fact, t.param); f !== undefined; f = u.factWith(t.fact, t.param)) {
        this.recordDropped(this.lose(f));
      }
    }
  }

  /** GameFAQs mythic-paths.txt: the Mythic spellbook goes, a merged one's Mythic levels included. */
  loseMythicSpellbooks(): void {
    for (const data of this.unit.spellbooks.values()) {
      data.merged = false;
      data.mythic = 0;
    }
  }

  /**
   * SelectClass.Check: the class's prerequisites, where the first archetype's own alignment prerequisite stands in
   * for the class's (BlueprintArchetype.MeetsPrerequisites' hasPrerequisiteAlignment, which the class screen passes
   * as ignoreAlignment).
   */
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

  /** AddArchetype.Check and Apply, at the class's first level (UnitProgressionData.CanAddArchetype). */
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
        // AddArchetype.Check: one of the class's m_Archetypes.
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
      // ClassData.AddArchetype: an archetype removes or replaces the class's spellbook.
      data.spellbook = classSpellbook(this.unit, cls, data.archetypes);
      this.unit.progressionData(progression.guid).archetypes.push(archetype);
    }
  }

  /** ApplyClassMechanics.Apply: class skills, then every held progression (ApplyProgressions). */
  applyClassMechanics(): void {
    const state = this.level;
    const cls = state.selectedClass;
    if (cls === undefined) return;
    const bp = this.unit.bp(cls) as BlueprintCharacterClass;
    const data = this.unit.classData(cls);
    // ApplyClassSkills: the first archetype that replaces them, else the class's.
    const replacing = (data?.archetypes ?? [])
      .map((a) => this.unit.bp(a) as BlueprintArchetype)
      .find((a) => a.ReplaceClassSkills);
    for (const skill of replacing?.ClassSkills ?? bp.ClassSkills) this.unit.classSkills.add(skill);
    for (const fact of Array.from(this.unit.facts())) {
      // ToList: a snapshot, as ApplyProgressions takes
      const p = this.unit.progression(fact.blueprint);
      if (p !== undefined) this.updateProgression(p);
    }
  }

  /** LevelUpHelper.UpdateProgression. */
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

  /** LevelUpHelper.AddFeaturesFromProgression. */
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

  // ---- slots and picks ---------------------------------------------------------------------------------------

  /** LevelUpState.AddSelection: the index counts this selection's slots opened earlier in the level-up. */
  addSelection(parent: SlotState | undefined, source: Source, selection: Guid, level: number): SlotState {
    const state = this.level;
    const index = state.slots.filter((s) => s.selection === selection).length;
    const slot = new SlotState({ place: this.place, selection, index }, selection, source, level, parent);
    state.slots.push(slot);
    return slot;
  }

  /** BlueprintFeatureSelection.IsSelectionProhibited (NoSelectionIfAlreadyHasFeature). */
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

  /**
   * BlueprintFeatureSelection.IsIgnorePrerequisites: the field, or, for the root's BasicFeatSelection, the main
   * character's TricksterIgnoreFeatPrerequisites flag (AddMechanicsFeature on a held fact).
   */
  selectionWaives(selection: Guid): boolean {
    const bp = this.unit.bp(selection);
    if (bp?.$type !== 'BlueprintFeatureSelection') return false;
    if (bp.IgnorePrerequisites) return true;
    if (selection !== refGuid(this.root.SystemMechanics.m_BasicFeatSelection)) return false;
    return this.unit
      .componentsOf<AddMechanicsFeature>('AddMechanicsFeature')
      .some((c) => c.component.m_Feature === 'TricksterIgnoreFeatPrerequisites');
  }

  /** FeatureSelectionState.IgnorePrerequisites: this slot's or any parent slot's selection waives. */
  slotWaives(slot: SlotState): boolean {
    for (let s: SlotState | undefined = slot; s !== undefined; s = s.parent) {
      if (this.selectionWaives(s.selection)) return true;
    }
    return false;
  }

  /** BlueprintFeatureSelection.CanSelect, for a pick of `feature` in `slot`: undefined when the game allows it. */
  canSelect(slot: SlotState, feature: Guid, depth = 0): FailedRule | undefined {
    const u = this.unit;
    const selection = u.bp(slot.selection);
    const bp = u.bp(feature);
    if (selection?.$type !== 'BlueprintFeatureSelection' || bp === undefined || !('Ranks' in bp)) {
      // A parametrized feat's slot takes its parameter (`judgePick`), and only a feature selection takes a feature.
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
    // NestedFeatureSelectionUtils.AllNestedFeaturesUnavailable: a picked selection must leave something to pick.
    if (depth < 2 && bp.$type === 'BlueprintFeatureSelection' && !this.canSelectAny(slot, feature, depth + 1)) {
      return { rule: 'NestedFeatureSelectionUtils.AllNestedFeaturesUnavailable' };
    }
    return undefined;
  }

  /** FeatureSelectionExtensions.CanSelectAny, judged in the outer slot as the game does. */
  canSelectAny(slot: SlotState, selection: Guid, depth: number): boolean {
    const bp = this.unit.bp(selection);
    if (bp?.$type !== 'BlueprintFeatureSelection') return true;
    const nested = new SlotState(slot.id, selection, slot.source, slot.level, slot);
    return bp.m_AllFeatures.some((r) => this.canSelect(nested, refGuid(r) ?? '', depth) === undefined);
  }

  /** PrerequisiteSelectionPossible: an option not held whose prerequisites hold (or the selection waives them). */
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

  /**
   * Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs CanSelect, for the parameter of a parametrized feat:
   * undefined when the game allows it.
   */
  canSelectParam(slot: SlotState, feat: BlueprintParametrizedFeature, param: GrantParam): FailedRule | undefined {
    const u = this.unit;
    const type = feat.ParameterType;
    // Items: the parameter is one of the feat's.
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
      // WeaponCategoryExtension.HasSubCategory: no parameter of the Disabled subcategory.
      if (hasSubCategory(category, 'Disabled')) {
        return { rule: 'BlueprintParametrizedFeature.CanSelect:Disabled', found: category };
      }
      // IParamPrerequisite: PrerequisiteConditionForWeaponCategory.CanBeSelected, its condition for its categories.
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

  /**
   * The band's picks: each pick whose slot is open, judged in Build order; a pick refused for an unmet prerequisite
   * is tried again after the band's other picks (guide §7 "The level-up session"). A pick of an earlier band whose
   * slot opened only now is judged here.
   */
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

  /** SelectFeature.CalculatePriority: a slot's band, from its selection's GetGroup. */
  slotBand(slot: SlotState): Band {
    const selection = this.unit.bp(slot.selection);
    return bandOf(
      selection?.$type === 'BlueprintFeatureSelectMythicSpellbook'
        ? 'SelectMythicSpellbook'
        : (selection as BlueprintFeatureSelection | undefined)?.Group,
    );
  }

  /** The walk paused at an open slot (`pauseAt`). */
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

  /** Each pick's last refusal, which `refusePending` records for a pick the level-up never applied. */
  readonly refusals = new Map<Pick, FailedRule>();

  /** Judges a pick and, when the game allows it, applies it (SelectFeature.Check, then Apply). */
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

  /**
   * ADR 0002: under the opt-in, a choice the game allows only because of the Gear is marked with the items it needs.
   * It is judged again as though the worn Gear's Enhancement didn't count and the gear-dependent picks before it
   * weren't held, with what they gave. If it fails then, its items are those its failing leaves need: for a stat leaf,
   * the worn item whose Enhancement counts on a score the leaf reads (`scoresRead`; the largest bonus counts, as
   * ModifiableValue.ApplyModifiersFiltered keeps one per descriptor); for a leaf naming a fact of a gear-dependent
   * pick, that pick's items. Returns the items, or undefined when the choice doesn't depend on the Gear.
   *
   * `judge` has just allowed the choice, starting when `Unit.gearReads` stood at `readsBefore`. When it counted no
   * worn Enhancement and no fact is set aside, judging again without the Gear would read the same values and allow it
   * again, so it isn't run.
   */
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

  /** The held facts of the gear-dependent picks and what they gave (`descendants`), each with its pick's items. */
  gearAside(): Map<Fact, readonly Guid[]> {
    const aside = new Map<Fact, readonly Guid[]>();
    for (const [fact, items] of this.gearDependentFacts) {
      for (const f of this.descendants(fact)) if (!aside.has(f)) aside.set(f, items);
    }
    return aside;
  }

  /** The worn item whose Enhancement to a score counts: the largest, the first worn on a tie. */
  countedItem(stat: Attribute): Guid | undefined {
    const best = this.unit.wornEnhancement.get(stat) ?? 0;
    if (best <= 0) return undefined;
    return [...this.unit.worn.values()].find((item) => gearEnhancement(this.unit, [item], stat) === best);
  }

  /** SelectFeature.Check for a pick: undefined when the game allows it. */
  judgePick(slot: SlotState, pick: Pick): FailedRule | undefined {
    if (this.unit.bp(slot.selection)?.$type === 'BlueprintFeatureSelectMythicSpellbook') {
      return this.canSelectMythicSpellbook(slot, pick);
    }
    const outer = this.canSelect(slot, pick.feature);
    if (outer !== undefined || pick.param === undefined) return outer;
    const feat = this.unit.bp(pick.feature);
    // A parameter only for a parametrized feat: its Items are the only ones that carry one.
    if (feat?.$type !== 'BlueprintParametrizedFeature') return { rule: 'BlueprintParametrizedFeature.CanSelect:Items' };
    const nested = new SlotState(slot.id, feat.guid, slot.source, slot.level, slot);
    return this.canSelectParam(nested, feat, pick.param);
  }

  /**
   * BlueprintFeatureSelectMythicSpellbook.CanSelect: its items are itself, with no spellbook or with one of
   * m_AllowedSpellbooks that the character has (UnitDescriptor.GetSpellbook).
   */
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

  /**
   * SelectFeature.Apply. A parametrized feat's pick fills the slot and the parameter's nested slot it opens. Returns
   * the fact the pick gained, if it gained one.
   */
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
      // The parameter's nested slot takes the pick's parameter; that pick adds the fact.
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
    // SelectFeature.GetReplaceSpellbook: a prestige class's ReplaceSpellbook pick advances that spellbook; a Mythic
    // path's spellbook pick merges its Mythic spells into a class spellbook (Spellbook.AddSpecialList), which then
    // gains the Mythic ranks.
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
    // ForEachAddFeatureOnApply: a progression an applied feature grants on apply runs now.
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

  /** A pick the level-up never applied: its slot never opened, or the game refused it. */
  refusePending(pick: Pick): void {
    const state = this.level;
    const slot = state.slots.find((s) => sameSlot(s.id, pick.slot));
    const refuse = (refusal: FailedRule) =>
      this.fail({ choice: 'pick', subject: pick.feature, slot: pick.slot, ...refusal });
    // LevelUpState.AddSelection never opened the slot.
    if (slot === undefined) return refuse({ rule: 'LevelUpState.AddSelection' });
    if (slot.pick !== undefined) return refuse({ rule: 'SelectFeature.Check:filled' });
    // Every band judges the open slots' picks from their own band on (`applyPicks`), so a refused pick has a refusal.
    const refusal = this.refusals.get(pick) ?? this.judgePick(slot, pick);
    if (refusal === undefined) throw new Error(`the walk never judged the pick in ${slot.key}`);
    refuse(refusal);
  }

  // ---- what the stats module reads ---------------------------------------------------------------------------

  /** The level-up under way. */
  get level(): LevelState {
    return this.levelState as LevelState;
  }

  fail(failure: Omit<Failure, 'place'>): void {
    this.failures.push({ place: this.place, ...failure });
  }
}

/** BlueprintArchetype.MinFeatureLevel: 1 for a spellbook change, else its lowest add or remove level. */
function minFeatureLevel(a: BlueprintArchetype): number {
  if (a.RemoveSpellbook || a.m_ReplaceSpellbook !== null) return 1;
  const levels = [...a.AddFeatures, ...a.RemoveFeatures].map((e) => e.Level);
  return levels.length === 0 ? 0 : Math.min(...levels);
}
