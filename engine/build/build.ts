import type { Attribute, Guid, StatType } from '../data';
import type { GrantParam } from '../grants';

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

export type Place = { readonly level: number } | { readonly rank: number };

export interface SlotId {
  readonly place: Place;
  readonly selection: Guid;
  readonly index: number;
}

export interface Pick {
  readonly slot: SlotId;
  readonly feature: Guid;
  readonly param?: GrantParam;
}

export interface LevelUp {
  readonly class: Guid;
  readonly increase?: Attribute;
  readonly skills?: Readonly<Partial<Record<StatType, number>>>;
}

export interface Ascension {
  readonly class: Guid;
  readonly level: number;
}

export interface ClassChoice {
  readonly archetypes: readonly Guid[];
}

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

export type Gear = Readonly<Partial<Record<GearPlace, Guid>>>;

export interface Build {
  readonly race?: Guid;
  readonly raceStat?: Attribute;
  readonly alignment?: Alignment;
  readonly scores?: Readonly<Record<Attribute, number>>;
  readonly classChoices?: Readonly<Record<Guid, ClassChoice>>;
  readonly levels: readonly LevelUp[];
  readonly ranks?: readonly Ascension[];
  readonly picks: readonly Pick[];
  readonly gear?: Gear;
  readonly aspects?: readonly Guid[];
  readonly countGear?: boolean;
}

export function placeKey(place: Place): string {
  return 'level' in place ? `L${place.level}` : `M${place.rank}`;
}

export function slotKey(slot: SlotId): string {
  return `${placeKey(slot.place)}/${slot.selection}#${slot.index}`;
}

export function withPick(build: Build, pick: Pick): Build {
  const key = slotKey(pick.slot);
  return { ...build, picks: [...build.picks.filter((p) => slotKey(p.slot) !== key), pick] };
}
