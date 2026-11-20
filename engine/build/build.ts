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

export const MAX_BYTE = 255;

export type RankLevel = number & { readonly brand: 'RankLevel' };
export type SkillRank = number & { readonly brand: 'SkillRank' };
export type SkillRanks = Readonly<Partial<Record<StatType, SkillRank>>>;
export type AbilityScore = number & { readonly brand: 'AbilityScore' };
export type AbilityScores = Readonly<Record<Attribute, AbilityScore>>;

export const MIN_SCORE = 7;
export const MAX_SCORE = 18;
const ATTRIBUTE_NAMES: readonly Attribute[] = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
];

const inRange = (n: unknown, min: number): n is number =>
  Number.isInteger(n) && (n as number) >= min && (n as number) <= MAX_BYTE;

export function toRankLevel(n: unknown): RankLevel | undefined {
  return inRange(n, 1) ? (n as RankLevel) : undefined;
}

export function toSkillRank(n: unknown): SkillRank | undefined {
  return inRange(n, 1) ? (n as SkillRank) : undefined;
}

export function toSkillRanks(ranks: Readonly<Record<string, unknown>>): SkillRanks | undefined {
  const out: Partial<Record<StatType, SkillRank>> = {};
  for (const [skill, n] of Object.entries(ranks)) {
    if (n === 0) continue;
    const rank = toSkillRank(n);
    if (rank === undefined) return undefined;
    out[skill as StatType] = rank;
  }
  return out;
}

export function toAbilityScore(n: unknown): AbilityScore | undefined {
  return Number.isInteger(n) && (n as number) >= MIN_SCORE && (n as number) <= MAX_SCORE
    ? (n as AbilityScore)
    : undefined;
}

export function toAbilityScores(scores: Readonly<Record<string, unknown>>): AbilityScores | undefined {
  const out = {} as Record<Attribute, AbilityScore>;
  for (const a of ATTRIBUTE_NAMES) {
    const score = toAbilityScore(scores[a]);
    if (score === undefined) return undefined;
    out[a] = score;
  }
  return Object.keys(scores).length === ATTRIBUTE_NAMES.length ? out : undefined;
}

export class InvalidValue extends Error {}

export function abilityScores(scores: Readonly<Record<Attribute, number>>): AbilityScores {
  const out = toAbilityScores(scores);
  if (out === undefined) throw new InvalidValue(`not ability scores: ${JSON.stringify(scores)}`);
  return out;
}

export function rankLevel(n: number): RankLevel {
  const level = toRankLevel(n);
  if (level === undefined) throw new InvalidValue(`not a Rank level: ${n}`);
  return level;
}

export function skillRanks(ranks: Readonly<Record<string, number>>): SkillRanks {
  const out = toSkillRanks(ranks);
  if (out === undefined) throw new InvalidValue(`not skill ranks: ${JSON.stringify(ranks)}`);
  return out;
}

export interface LevelUp {
  readonly class: Guid;
  readonly increase?: Attribute;
  readonly skills?: SkillRanks;
}

export interface Ascension {
  readonly class: Guid;
  readonly level: RankLevel;
}

export type Archetypes = readonly [] | readonly [Guid];

export interface ClassChoice {
  readonly archetypes: Archetypes;
}

export function toArchetypes(archetypes: readonly Guid[]): Archetypes | undefined {
  const [first, ...rest] = archetypes;
  if (rest.length > 0) return undefined;
  return first === undefined ? [] : [first];
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
  readonly scores?: AbilityScores;
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

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, canonical(v)]),
  );
}

function picksBySlot(build: Build): readonly [string, unknown][] {
  return build.picks
    .map((p): [string, unknown] => [slotKey(p.slot), canonical(p)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

export function sameBuild(a: Build, b: Build): boolean {
  if (a === b) return true;
  const rest = (build: Build) => canonical({ ...build, picks: picksBySlot(build) });
  return JSON.stringify(rest(a)) === JSON.stringify(rest(b));
}
