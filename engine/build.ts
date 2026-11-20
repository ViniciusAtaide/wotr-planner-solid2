// A Build: the main character's choices, in the game's own terms (GLOSSARY.md "Build"). Every choice names the
// blueprint the game's level-up action would take, so the walk (engine/walk/) replays the Build through the game's
// rules without translating it. A Build may be incomplete: a missing choice is an empty slot, never an error.
import type { Attribute, Guid, StatType } from './data/types';
import type { GrantParam } from './grants';

/** Kingmaker/Enums/Alignment.cs. */
export type Alignment =
  | 'LawfulGood'
  | 'NeutralGood'
  | 'ChaoticGood'
  | 'LawfulNeutral'
  | 'TrueNeutral'
  | 'ChaoticNeutral'
  | 'LawfulEvil'
  | 'NeutralEvil'
  | 'ChaoticEvil';

/** Where a level-up happens: a character level, or a Mythic rank (a Mythic class's level-up, its own LevelUpState). */
export type Place = { readonly level: number } | { readonly rank: number };

/**
 * A slot, as the game keys it within one level-up (UnitLogic/Class/LevelUp/LevelUpState.cs AddSelection): the selection
 * and how many of its slots that level-up opened before this one. A nested slot keeps the same key shape.
 */
export interface SlotId {
  readonly place: Place;
  readonly selection: Guid;
  readonly index: number;
}

/** The option a Build puts in a slot (UnitLogic/Class/LevelUp/Actions/SelectFeature.cs: the item and its param). */
export interface Pick {
  readonly slot: SlotId;
  readonly feature: Guid;
  /** The parameter, for a parametrized feat. */
  readonly param?: GrantParam;
}

/** One character level's own choices besides its picks (SelectClass, SpendAttributePoint, SpendSkillPoint). */
export interface LevelUp {
  readonly class: Guid;
  /** The ability that takes the point at a level that is a multiple of 4 (SelectClass.Apply). */
  readonly increase?: Attribute;
  /** Ranks bought at this level, by skill. */
  readonly skills?: Readonly<Partial<Record<StatType, number>>>;
}

/** One Mythic rank: its Mythic class, and its Rank level (ADR 0003): the character level it is taken at. */
export interface Ascension {
  readonly class: Guid;
  readonly level: number;
}

/** What a Build fixes for a class when it is first taken (GLOSSARY.md "Class choice"). */
export interface ClassChoice {
  readonly archetypes: readonly Guid[];
}

/** The places of Items/Slots: the worn places (EquipmentSlot, ArmorSlot) and the two hands (HandSlot). */
export type GearPlace =
  | 'Armor'
  | 'Head'
  | 'Glasses'
  | 'Neck'
  | 'Shoulders'
  | 'Shirt'
  | 'Belt'
  | 'Wrist'
  | 'Gloves'
  | 'Feet'
  | 'Ring1'
  | 'Ring2'
  | 'MainHand'
  | 'OffHand';

/** A Build's Gear (GLOSSARY.md): at most one item in each place. Gear belongs to no level. */
export type Gear = Readonly<Partial<Record<GearPlace, Guid>>>;

export interface Build {
  readonly race?: Guid;
  /** The ability that takes a race's +2 when the race lets the Build choose it (SelectRaceStat). */
  readonly raceStat?: Attribute;
  readonly alignment?: Alignment;
  /** The point-buy scores, before racial modifiers (StatsDistribution). */
  readonly scores?: Readonly<Record<Attribute, number>>;
  readonly classChoices?: Readonly<Record<Guid, ClassChoice>>;
  /** Character level i + 1 is `levels[i]`. */
  readonly levels: readonly LevelUp[];
  /** Mythic rank r + 1 is `ranks[r]`. */
  readonly ranks?: readonly Ascension[];
  readonly picks: readonly Pick[];
  readonly gear?: Gear;
  /**
   * The aspect toggles the Build keeps on (GLOSSARY.md "Aspect kept on"; map 32), each a BlueprintActivatableAbility
   * the character holds. Only these toggles' buffs count as on.
   */
  readonly aspects?: readonly Guid[];
  /**
   * The opt-in of ADR 0002: the Gear's Enhancement bonuses count toward stat prerequisites, and each pick that needs
   * them is marked gear-dependent. Off by default; the MCP never sets it.
   */
  readonly countGear?: boolean;
}

/** One key per place, for maps and messages: `L3`, `M2`. */
export function placeKey(place: Place): string {
  return 'level' in place ? `L${place.level}` : `M${place.rank}`;
}

/** One key per slot: `L3/<selection guid>#0`. */
export function slotKey(slot: SlotId): string {
  return `${placeKey(slot.place)}/${slot.selection}#${slot.index}`;
}

/** The Build with `pick` in its slot, in place of the pick there. */
export function withPick(build: Build, pick: Pick): Build {
  const key = slotKey(pick.slot);
  return { ...build, picks: [...build.picks.filter((p) => slotKey(p.slot) !== key), pick] };
}
