import {
  parentKey,
  placeKey,
  slotKey,
  toAbilityScores,
  toArchetypes,
  toBuildName,
  toRankLevel,
  toSkillRanks,
  type Alignment,
  type Build,
  type GearPlace,
  type Pick,
  type Place,
  type SlotId,
} from '../build';
import { decodeBuild, DecodeError, encodeBuild } from '../codec';
import type { CheckedData } from '../load';
import {
  equippableItems,
  isShown,
  kindOf,
  type Attribute,
  type BlueprintFeatureSelection,
  type Guid,
  type Kind,
  type StatType,
} from '../data';
import { describe, summaryText, type Description } from '../describe';
import { allows, apply, breaksOf, cascade, type Breaks, type Edit, checkBuild, type CheckedBuild } from '../edits';
import { buildGrantIndex, type GrantIndex, type GrantParam } from '../grants';
import { linkIndex, linkNames, sharedWords, stackWords } from '../links';
import { gearClashes, openSlotsAt, picker, raceStatPending, type OptionStatus } from '../pickers';
import {
  abilityScoreRange,
  archetypeCount,
  clearsLaterText,
  gearNote,
  groupedFailures,
  nameOf,
  buildNameLength,
  bareNameOf,
  namesIn,
  rankLevelRange,
  refusal,
  skillRankRange,
  statName,
  type Refusal,
  pickName,
  pickWords,
  slotWords,
} from '../refusals';
import {
  maxSpellLevel,
  ATTRIBUTES,
  POINT_BUY,
  SKILL_ATTRIBUTE,
  bandOf,
  pauseAt,
  pointBuyCost,
  walk,
  type Band,
} from '../walk';

export interface Engine {
  readonly data: CheckedData;
  readonly G: GrantIndex;
}

export function engineOf(data: CheckedData): Engine {
  return { data, G: buildGrantIndex(data) };
}

export interface ToolRefusal {
  readonly refused: true;
  readonly reason: string;
  readonly unmet?: readonly string[];
  readonly breaks?: readonly string[];
}

export interface Changed {
  readonly code: string;
  readonly build: Build;
}

const refused = (reason: string, more: Omit<ToolRefusal, 'refused' | 'reason'> = {}): ToolRefusal => ({
  refused: true,
  reason,
  ...more,
});

const CLEARED_CODES_KEPT = 64;
const clearedByCode = new Map<string, readonly string[]>();

export function clearedOnOpen(code: unknown): readonly string[] | undefined {
  return typeof code === 'string' ? clearedByCode.get(code) : undefined;
}

async function open(e: Engine, code: string): Promise<CheckedBuild | ToolRefusal> {
  try {
    const checked = checkBuild(e.data, await decodeBuild(e.data, code), e.G);
    if (checked.cleared.length > 0) {
      if (clearedByCode.size >= CLEARED_CODES_KEPT) clearedByCode.delete(clearedByCode.keys().next().value as string);
      const among = [...checked.cleared, ...checked.build.picks];
      clearedByCode.set(
        code,
        checked.cleared.map((p) => `${placeKey(p.slot.place)} ${pickWords(e.data, checked.build, p, among)}`),
      );
    }
    return checked.build;
  } catch (err) {
    if (err instanceof DecodeError) return refused(`Not a Build code this planner reads (${err.reason}).`);
    throw err;
  }
}

const isRefusal = (x: unknown): x is ToolRefusal => typeof x === 'object' && x !== null && 'refused' in x;

function pickInWords(e: Engine, p: Pick, names?: ReadonlyMap<Guid, string>): string {
  const name = names?.get(p.feature) ?? bareNameOf(e.data, p.feature);
  return `${placeKey(p.slot.place)} ${bareNameOf(e.data, p.slot.selection)}: ${name}`;
}

function picksInWords(e: Engine, picks: readonly Pick[]): string[] {
  const names = namesIn(
    e.data,
    picks.map((p) => p.feature),
  );
  return picks.map((p) => pickInWords(e, p, names));
}

function breaksInWords(e: Engine, b: Breaks, unitOf?: () => Parameters<typeof refusal>[0]['unit']): string[] {
  const w = { data: e.data, G: e.G, unit: unitOf?.() };
  return [
    ...picksInWords(e, b.picks),
    ...groupedFailures(w, b.others).map((g) => `${g.places.map(placeKey).join(', ')} ${g.choice}: ${g.text}`),
  ];
}

async function changed(e: Engine, build: Build): Promise<Changed> {
  return { code: await encodeBuild(e.data, build), build };
}

async function plainEdit(e: Engine, build: Build, edit: Edit): Promise<Changed | ToolRefusal> {
  const verdict = allows(e.data, build, edit, e.G);
  if (verdict.ok) return changed(e, verdict.build);
  return refused('The change would break other choices.', { breaks: breaksInWords(e, verdict) });
}

export type Mode = 'strict' | 'preview' | 'cascade';

async function withMode(
  e: Engine,
  build: Build,
  edit: Edit,
  mode: Mode,
): Promise<Changed | ToolRefusal | { readonly preview: true; readonly clears: readonly string[] }> {
  if (mode === 'strict') return plainEdit(e, build, edit);
  const c = cascade(e.data, build, edit, e.G);
  if (!c.ok) return refused('A cascade can’t mend what the change breaks.', { breaks: breaksInWords(e, c) });
  if (mode === 'preview') return { preview: true, clears: picksInWords(e, c.cleared) };
  return changed(e, c.build);
}

export function brief(e: Engine, build: Build): string {
  const count = (list: readonly { readonly class: Guid }[]) => {
    const n = new Map<Guid, number>();
    for (const l of list) n.set(l.class, (n.get(l.class) ?? 0) + 1);
    return [...n].map(([cls, k]) => `${bareNameOf(e.data, cls)} ${k}`).join(', ');
  };
  const gear = Object.keys(build.gear ?? {}).length;
  return [
    build.name,
    build.race === undefined ? 'no race' : bareNameOf(e.data, build.race),
    build.levels.length === 0 ? 'no levels' : count(build.levels),
    (build.ranks?.length ?? 0) > 0 ? count(build.ranks ?? []) : undefined,
    `${build.picks.length} picks`,
    gear > 0 ? `${gear} Gear` : undefined,
  ]
    .filter((p): p is string => p !== undefined)
    .join(' · ');
}

export function start_build(e: Engine): Promise<Changed>;
export function start_build(e: Engine, args: { readonly name?: string }): Promise<Changed | ToolRefusal>;
export async function start_build(e: Engine, args: { readonly name?: string } = {}): Promise<Changed | ToolRefusal> {
  if (args.name === undefined || args.name.trim() === '') return changed(e, { levels: [], picks: [] });
  const name = toBuildName(args.name);
  if (name === undefined) return refused(buildNameLength(args.name));
  return changed(e, { name, levels: [], picks: [] });
}

export async function set_start(
  e: Engine,
  args: {
    readonly code: string;
    readonly race?: Guid;
    readonly raceStat?: Attribute;
    readonly scores?: Readonly<Record<Attribute, number>>;
    readonly alignment?: Alignment;
  },
): Promise<(Changed & { readonly pointBuy?: { readonly spent: number; readonly of: number } }) | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const scores = args.scores === undefined ? undefined : toAbilityScores(args.scores);
  if (args.scores !== undefined && scores === undefined) return refused(abilityScoreRange(args.scores));
  const edits: Edit[] = [
    ...(args.race !== undefined
      ? [{ kind: 'race', race: args.race, raceStat: args.raceStat ?? build.raceStat } as const]
      : []),
    ...(args.race === undefined && args.raceStat !== undefined
      ? [{ kind: 'raceStat', raceStat: args.raceStat } as const]
      : []),
    ...(scores !== undefined ? [{ kind: 'scores', scores } as const] : []),
    ...(args.alignment !== undefined ? [{ kind: 'alignment', alignment: args.alignment } as const] : []),
  ];
  const r = await plainEdits(e, build, edits);
  if (isRefusal(r) || r.build.scores === undefined) return r;
  return { ...r, pointBuy: { spent: pointBuyCost(r.build.scores), of: POINT_BUY } };
}

async function plainEdits(e: Engine, build: Build, edits: readonly Edit[]): Promise<Changed | ToolRefusal> {
  const after = edits.reduce(apply, build);
  const broken = breaksOf(e.data, build, after, e.G);
  if (broken.picks.length > 0 || broken.others.length > 0) {
    return refused('The change would break other choices.', { breaks: breaksInWords(e, broken) });
  }
  return changed(e, after);
}

export function expectedLevel(data: CheckedData, rank: number): number {
  const settings = [...data.blueprints.values()].find((b) => b.$type === 'BlueprintMythicsSettings');
  return settings?.$type === 'BlueprintMythicsSettings' ? (settings.CharcaterLevelRestrictions[rank] ?? 0) : 0;
}

export interface SlotView {
  readonly slot: SlotId;
  readonly place: string;
  readonly selection: string;
  readonly label: string;
  readonly band: Band;
  readonly kind: string;
}

function slotLabel(e: Engine, build: Build, slot: SlotId): string {
  const key = parentKey(slot);
  const parent = key === undefined ? undefined : build.picks.find((p) => slotKey(p.slot) === key);
  return parent === undefined
    ? slotWords(e.data, build, slot)
    : `${slotWords(e.data, build, parent.slot)}: ${pickName(e.data, parent)}`;
}

function openSlots(e: Engine, build: Build, place?: Place): SlotView[] {
  return openSlotsAt(e.data, build, walk(e.data, build, e.G).slots, place).map((s) => {
    const bp = e.data.blueprints.get(s.id.selection);
    const group = bp?.$type === 'BlueprintFeatureSelection' ? (bp as BlueprintFeatureSelection).Group : undefined;
    return {
      slot: s.id,
      place: placeKey(s.id.place),
      selection: nameOf(e.data, s.id.selection),
      label: slotLabel(e, build, s.id),
      band: bp?.$type === 'BlueprintFeatureSelectMythicSpellbook' ? 'ReplaceSpellbook' : bandOf(group),
      kind: bp?.$type ?? 'unknown',
    };
  });
}

export interface RankDue {
  readonly rank: number;
  readonly expectedLevel: number;
}

function mythicRankDue(e: Engine, build: Build, ranksEnded: boolean): RankDue | undefined {
  if (ranksEnded) return undefined;
  const rank = (build.ranks?.length ?? 0) + 1;
  const at = expectedLevel(e.data, rank);
  return at > 0 && at <= build.levels.length ? { rank, expectedLevel: at } : undefined;
}

export interface LevelUp extends Changed {
  readonly slots: readonly SlotView[];
  readonly skillPoints?: number;
  readonly characterLevel?: number;
  readonly mythicRankDue?: RankDue;
  readonly note?: string;
}

function rankPlacements(
  e: Engine,
  build: Build,
  rank: number,
): { readonly placed: number; readonly last?: number; readonly early?: number } {
  const expected = expectedLevel(e.data, rank);
  const after = Math.max(build.ranks?.at(-1)?.level ?? 1, 1);
  const reached = Math.max(build.levels.length, 1);
  const early = expected > reached ? expected : undefined;
  const placed = Math.max(expected > 0 ? Math.min(expected, reached) : build.levels.length, after);
  const last = build.levels.length > placed ? build.levels.length : undefined;
  return { placed, ...(last !== undefined && { last }), ...(early !== undefined && { early }) };
}

export async function level_up(
  e: Engine,
  args: {
    readonly code: string;
    readonly class: Guid;
    readonly archetypes?: readonly Guid[];
    readonly increase?: Attribute;
  },
): Promise<LevelUp | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const cls = e.data.blueprints.get(args.class);
  if (cls?.$type !== 'BlueprintCharacterClass') return refused('Not a class.');
  const archetypes = args.archetypes === undefined ? undefined : toArchetypes(args.archetypes);
  if (args.archetypes !== undefined && archetypes === undefined) return refused(archetypeCount(args.archetypes));
  if (!cls.IsMythic) {
    const r = await addLevelOrRank(e, build, args, archetypes, { level: build.levels.length + 1 }, [
      { kind: 'addLevel', class: args.class },
      ...(args.increase !== undefined
        ? [{ kind: 'increase', level: build.levels.length + 1, increase: args.increase } as const]
        : []),
    ]);
    if (isRefusal(r)) return r;
    const w = walk(e.data, r.build, e.G);
    const due = mythicRankDue(e, r.build, w.ranksEnded);
    return { ...r, skillPoints: w.skillPoints.at(-1) ?? 0, ...(due && { mythicRankDue: due }) };
  }
  const rank = (build.ranks?.length ?? 0) + 1;
  const addRankAt = async (at: number): Promise<LevelUp | ToolRefusal> => {
    const level = toRankLevel(at);
    if (level === undefined) return refused(rankLevelRange(at));
    const r = await addLevelOrRank(e, build, args, archetypes, { rank }, [
      { kind: 'addRank', class: args.class, level },
    ]);
    return isRefusal(r) ? r : { ...r, characterLevel: at };
  };
  const { placed, last, early } = rankPlacements(e, build, rank);
  const first = await addRankAt(placed);
  if (!isRefusal(first) && early !== undefined)
    return {
      ...first,
      note: `Mythic rank ${rank} is taken early, at character level ${placed}; it is usually reached at ${early}. place_rank moves it.`,
    };
  if (!isRefusal(first) || first.breaks === undefined || last === undefined) return first;
  const later = await addRankAt(last);
  if (isRefusal(later)) return first;
  return {
    ...later,
    note: `Mythic rank ${rank} is placed at character level ${last}, since at ${placed} it would break ${first.breaks.join('; ')}.`,
  };
}

async function addLevelOrRank(
  e: Engine,
  build: Build,
  args: { readonly class: Guid },
  archetypes: ReturnType<typeof toArchetypes>,
  place: Place,
  added: readonly Edit[],
): Promise<(Changed & { readonly slots: readonly SlotView[] }) | ToolRefusal> {
  const edits: Edit[] = [
    ...added,
    ...(archetypes !== undefined ? [{ kind: 'archetypes', class: args.class, archetypes } as const] : []),
  ];
  const after = edits.reduce(apply, build);
  const walked = walk(e.data, after, e.G);
  const own = walked.failures.find(
    (f) =>
      placeKey(f.place) === placeKey(place) &&
      (f.choice === 'class' || f.choice === 'rank') &&
      f.subject === args.class,
  );
  if (own !== undefined) {
    const r = refusal({ data: e.data, G: e.G, unit: walked.unit }, own);
    return refused(r.text, r.unmet.length > 0 ? { unmet: r.unmet } : {});
  }
  const r = await plainEdits(e, build, edits);
  if (isRefusal(r)) return r;
  return { ...r, slots: openSlots(e, r.build, place) };
}

export interface NextSlots {
  readonly slots: readonly SlotView[];
  readonly skillPointsLeft?: { readonly level: number; readonly points: number };
  readonly raceStatToChoose?: true;
  readonly mythicRankDue?: RankDue;
}

export async function next_slots(e: Engine, args: { readonly code: string }): Promise<NextSlots | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const w = walk(e.data, build, e.G);
  const level = build.levels.length;
  const spent = Object.values(build.levels.at(-1)?.skills ?? {}).reduce((n, r) => n + (r ?? 0), 0);
  const points = (w.skillPoints.at(-1) ?? 0) - spent;
  const due = mythicRankDue(e, build, w.ranksEnded);
  return {
    slots: openSlots(e, build),
    ...(level > 0 && points > 0 && { skillPointsLeft: { level, points } }),
    ...(raceStatPending(e.data, build) && { raceStatToChoose: true as const }),
    ...(due && { mythicRankDue: due }),
  };
}

export interface OptionView {
  readonly feature: Guid;
  readonly param?: GrantParam;
  readonly name: string;
  readonly summary: string;
  readonly buildsOn: readonly string[];
  readonly shares?: readonly string[];
  readonly wontStack?: readonly string[];
  readonly gear?: string;
  readonly clears?: string;
  readonly refusal?: Refusal;
}

const OPTIONS_PER_PAGE = 25;

const PER_VALUE_REASONS: Readonly<Partial<Record<string, string>>> = {
  'BlueprintParametrizedFeature.CanSelect:RequireProficiency': 'Needs proficiency with its weapon.',
  'BlueprintParametrizedFeature.CanSelect:Disabled': "The game doesn't offer that choice for this feat.",
};

export async function options(
  e: Engine,
  args: {
    readonly code: string;
    readonly slot: SlotId;
    readonly text?: string;
    readonly page?: number;
    readonly include_closed?: boolean;
  },
): Promise<
  | {
      readonly open: readonly OptionView[];
      readonly openTotal: number;
      readonly closedTotal: number;
      readonly page: number;
      readonly pages: number;
      readonly closedByReason: Readonly<Record<string, number>>;
      readonly closed?: readonly OptionView[];
    }
  | ToolRefusal
> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const p = picker(e.data, build, args.slot, e.G);
  if (p === undefined) return refused('No such slot opens in this Build.');
  const unit = pauseAt(e.data, build, args.slot, e.G)?.unit;
  const held = new Set(unit === undefined ? [] : [...unit.facts()].map((f) => f.blueprint));
  const links = linkIndex(e.data, e.G);
  const text = args.text?.toLowerCase();
  const listed = p.options.filter(
    (o) => o.shown && (text === undefined || optionName(e, o).toLowerCase().includes(text)),
  );
  const view = (o: OptionStatus): OptionView => ({
    feature: o.feature,
    ...(o.param && { param: o.param }),
    name: optionName(e, o),
    summary: summaryText(e.data, o.feature, e.G),
    buildsOn: linkNames(
      e.data,
      links.needs(o.feature).filter((g) => held.has(g)),
    ),
    ...(o.synergy && o.synergy.shared.length > 0 && { shares: o.synergy.shared.map((s) => sharedWords(e.data, s)) }),
    ...(o.synergy &&
      o.synergy.wontStack.length > 0 && { wontStack: o.synergy.wontStack.map((c) => stackWords(e.data, c)) }),
    ...(o.gearItems && { gear: gearNote(e.data, o.gearItems) }),
    ...(o.clearsLater && { clears: clearsLaterText(o.clearsLater.place) }),
    ...(o.closed && { refusal: refusal({ data: e.data, G: e.G, unit }, o.closed) }),
  });
  const openOnes = listed.filter((o) => o.closed === undefined);
  const closedOnes = listed.filter((o) => o.closed !== undefined);
  const page = Math.max(1, args.page ?? 1);
  const closedByReason: Record<string, number> = {};
  for (const o of closedOnes) {
    const closed = o.closed as NonNullable<OptionStatus['closed']>;
    const text = PER_VALUE_REASONS[closed.rule] ?? refusal({ data: e.data, G: e.G, unit }, closed).text;
    closedByReason[text] = (closedByReason[text] ?? 0) + 1;
  }
  const onPage = <T>(list: readonly T[]) => list.slice((page - 1) * OPTIONS_PER_PAGE, page * OPTIONS_PER_PAGE);
  const pagesOf = (n: number) => Math.max(1, Math.ceil(n / OPTIONS_PER_PAGE));
  return {
    open: onPage(openOnes).map(view),
    openTotal: openOnes.length,
    closedTotal: closedOnes.length,
    page,
    pages: Math.max(pagesOf(openOnes.length), args.include_closed ? pagesOf(closedOnes.length) : 1),
    closedByReason,
    ...(args.include_closed && { closed: onPage(closedOnes).map(view) }),
  };
}

function optionName(
  e: Engine,
  o: { readonly feature: Guid; readonly param?: GrantParam; readonly name?: string; readonly qualifier?: string },
): string {
  const listed = o.name === undefined ? undefined : o.qualifier === undefined ? o.name : `${o.name} (${o.qualifier})`;
  const name = listed ?? nameOf(e.data, o.feature);
  if (o.param === undefined) return name;
  if ('WeaponCategory' in o.param) return `${name} (${o.param.WeaponCategory.replace(/([a-z])([A-Z])/g, '$1 $2')})`;
  if ('SpellSchool' in o.param) return `${name} (${o.param.SpellSchool})`;
  if ('StatType' in o.param) return `${name} (${statName(o.param.StatType)})`;
  return `${name} (${nameOf(e.data, o.param.Blueprint)})`;
}

export async function pick(
  e: Engine,
  args: {
    readonly code: string;
    readonly slot: SlotId;
    readonly feature: Guid;
    readonly param?: GrantParam;
    readonly mode?: Mode;
  },
): Promise<Changed | ToolRefusal | { readonly preview: true; readonly clears: readonly string[] }> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const paused = pauseAt(e.data, build, args.slot, e.G);
  if (paused === undefined) return refused('No such slot opens in this Build.');
  const closed = paused.judge(args.feature, args.param);
  if (closed !== undefined) {
    const r = refusal({ data: e.data, G: e.G, unit: paused.unit }, closed);
    return refused(r.text, { unmet: r.unmet });
  }
  const edit: Edit = {
    kind: 'pick',
    slot: args.slot,
    pick: { feature: args.feature, ...(args.param && { param: args.param }) },
  };
  return withMode(e, build, edit, args.mode ?? 'strict');
}

const SKILL_NAMES: ReadonlyMap<string, StatType> = new Map(
  (Object.keys(SKILL_ATTRIBUTE) as StatType[]).flatMap((skill) => [
    [skill.toLowerCase(), skill],
    [statName(skill).toLowerCase(), skill],
    [
      skill
        .replace(/^Skill/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase(),
      skill,
    ],
  ]),
);

function skillKeys(ranks: Readonly<Record<string, number>>): Partial<Record<StatType, number>> | string {
  const out: Partial<Record<StatType, number>> = {};
  for (const [name, n] of Object.entries(ranks)) {
    const skill = SKILL_NAMES.get(name.trim().toLowerCase());
    if (skill === undefined) {
      const known = (Object.keys(SKILL_ATTRIBUTE) as StatType[]).map(statName).join(', ');
      return `Not a skill: ${JSON.stringify(name)}. The skills are ${known}.`;
    }
    out[skill] = n;
  }
  return out;
}

export async function set_skills(
  e: Engine,
  args: { readonly code: string; readonly level: number; readonly ranks: Readonly<Record<string, number>> },
): Promise<
  (Changed & { readonly skillPointsLeft?: { readonly level: number; readonly points: number } }) | ToolRefusal
> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  if (args.level < 1 || args.level > build.levels.length) return refused('The Build has no such level.');
  const ranks = skillKeys(args.ranks);
  if (typeof ranks === 'string') return refused(ranks);
  const skills = toSkillRanks(ranks);
  if (skills === undefined) return refused(skillRankRange(args.ranks));
  const after = apply(build, { kind: 'skills', level: args.level, skills });
  const own = walk(e.data, after, e.G).failures.find(
    (f) => f.choice === 'skills' && 'level' in f.place && f.place.level === args.level,
  );
  if (own !== undefined) return refused(refusal({ data: e.data, G: e.G }, own).text);
  const r = await plainEdit(e, build, { kind: 'skills', level: args.level, skills });
  if (isRefusal(r)) return r;
  const spent = Object.values(skills).reduce((n, k) => n + (k ?? 0), 0);
  const points = (walk(e.data, r.build, e.G).skillPoints[args.level - 1] ?? 0) - spent;
  return points > 0 ? { ...r, skillPointsLeft: { level: args.level, points } } : r;
}

export async function place_rank(
  e: Engine,
  args: { readonly code: string; readonly rank: number; readonly level: number },
): Promise<(Changed & { readonly note?: string }) | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  if (args.rank < 1 || args.rank > (build.ranks?.length ?? 0)) return refused('The Build has no such Mythic rank.');
  const level = toRankLevel(args.level);
  if (level === undefined) return refused(rankLevelRange(args.level));
  const r = await plainEdit(e, build, { kind: 'rankLevel', rank: args.rank, level });
  if (isRefusal(r)) return r;
  const expected = expectedLevel(e.data, args.rank);
  return args.level === expected
    ? r
    : { ...r, note: `Mythic rank ${args.rank} is usually reached at character level ${expected}.` };
}

export async function equip(
  e: Engine,
  args: { readonly code: string; readonly place: GearPlace; readonly item?: Guid; readonly mode?: Mode },
): Promise<
  | (Changed & { readonly wontStack?: readonly string[] })
  | ToolRefusal
  | { readonly preview: true; readonly clears: readonly string[] }
> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const edit: Edit = { kind: 'gear', place: args.place, ...(args.item !== undefined && { item: args.item }) };
  const own = walk(e.data, apply(build, edit), e.G).failures.find(
    (f) => f.choice === 'gear' && f.subject === args.item,
  );
  if (own !== undefined) return refused(refusal({ data: e.data, G: e.G }, own).text);
  const r = await withMode(e, build, edit, args.mode ?? 'strict');
  if (args.item === undefined || !('code' in r)) return r;
  const clashes = gearClashes(e.data, build, args.place, args.item, e.G).map((c) => `${stackWords(e.data, c)}.`);
  return clashes.length === 0 ? r : { ...r, wontStack: clashes };
}

export interface SynergyRow {
  readonly slot: SlotId;
  readonly place: string;
  readonly option: string;
  readonly feature: Guid;
  readonly param?: GrantParam;
  readonly buildsOn: readonly string[];
  readonly shares?: readonly string[];
  readonly wontStack?: readonly string[];
}

export async function synergies(
  e: Engine,
  args: { readonly code: string; readonly slot?: SlotId },
): Promise<readonly SynergyRow[] | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const slots = args.slot === undefined ? openSlots(e, build).map((s) => s.slot) : [args.slot];
  const out: SynergyRow[] = [];
  for (const slot of slots) {
    const listed = await options(e, { code: args.code, slot, page: 1 });
    if (isRefusal(listed)) continue;
    const all = await allOpen(e, args.code, slot, listed.openTotal);
    for (const o of all)
      if (o.buildsOn.length > 0 || o.shares !== undefined || o.wontStack !== undefined)
        out.push({
          slot,
          place: placeKey(slot.place),
          option: o.name,
          feature: o.feature,
          ...(o.param && { param: o.param }),
          buildsOn: o.buildsOn,
          ...(o.shares && { shares: o.shares }),
          ...(o.wontStack && { wontStack: o.wontStack }),
        });
  }
  return out;
}

async function allOpen(e: Engine, code: string, slot: SlotId, total: number): Promise<OptionView[]> {
  const out: OptionView[] = [];
  for (let page = 1; (page - 1) * OPTIONS_PER_PAGE < total; page++) {
    const r = await options(e, { code, slot, page });
    if (!isRefusal(r)) out.push(...r.open);
  }
  return out;
}

const SEARCH_PER_PAGE = 50;

export interface SearchHit {
  readonly guid: Guid;
  readonly name: string;
  readonly kind: Kind;
  readonly summary: string;
}

export function search(
  e: Engine,
  args: { readonly text: string; readonly kind?: Kind; readonly page?: number },
): { readonly hits: readonly SearchHit[]; readonly total: number; readonly page: number; readonly pages: number } {
  const text = args.text.toLowerCase();
  const gear = new Set(equippableItems(e.data.blueprints).map((b) => b.guid));
  const found = [...e.data.blueprints.values()]
    .filter((bp) => isShown(bp) && (args.kind === undefined || kindOf[bp.$type] === args.kind))
    .filter((bp) => kindOf[bp.$type] !== 'items' || (gear.has(bp.guid) && !e.data.twins.has(bp.guid)))
    .filter((bp) => (bp.name ?? '').toLowerCase().includes(text))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') || a.guid.localeCompare(b.guid));
  const pages = Math.max(1, Math.ceil(found.length / SEARCH_PER_PAGE));
  const page = Math.min(Math.max(1, args.page ?? 1), pages);
  return {
    hits: found.slice((page - 1) * SEARCH_PER_PAGE, page * SEARCH_PER_PAGE).map((bp) => ({
      guid: bp.guid,
      name: bp.name ?? bp.assetName,
      kind: kindOf[bp.$type],
      summary: summaryText(e.data, bp.guid, e.G),
    })),
    total: found.length,
    page,
    pages,
  };
}

export function explain(e: Engine, args: { readonly guid: Guid }): Description | ToolRefusal {
  return describe(e.data, args.guid, e.G) ?? refused('Not a blueprint the game shows.');
}

export interface SaveNumbers {
  readonly base: number;
  readonly ability: number;
  readonly withAbility: number;
}

export interface Sheet {
  readonly name?: string;
  readonly level: number;
  readonly scores: Readonly<Record<Attribute, number>>;
  readonly scoresWithGear?: Readonly<Record<Attribute, number>>;
  readonly baseAttackBonus: number;
  readonly saves: { readonly fortitude: SaveNumbers; readonly reflex: SaveNumbers; readonly will: SaveNumbers };
  readonly skills: Readonly<Record<string, { readonly ranks: number; readonly value: number }>>;
  readonly spellbooks: readonly {
    readonly name: string;
    readonly baseLevel: number;
    readonly mythicLevel: number;
    readonly maxSpellLevel: number;
  }[];
}

function buildUpToLevel(build: Build, level: number): Build {
  return {
    ...build,
    levels: build.levels.slice(0, level),
    ...(build.ranks && { ranks: build.ranks.filter((r) => r.level <= level) }),
    picks: build.picks.filter((p) => ('level' in p.slot.place ? p.slot.place.level <= level : true)),
  };
}

const saveNumbers = (base: number, ability: number): SaveNumbers => ({ base, ability, withAbility: base + ability });

function sheetOf(e: Engine, build: Build, level: number): Sheet {
  const unit = walk(e.data, buildUpToLevel(build, level), e.G).unit;
  const skills: Record<string, { ranks: number; value: number }> = {};
  for (const skill of Object.keys(SKILL_ATTRIBUTE) as StatType[]) {
    skills[statName(skill)] = { ranks: unit.base.get(skill) ?? 0, value: unit.skillBase(skill) };
  }
  return {
    ...(build.name !== undefined && { name: build.name }),
    level: Math.min(level, build.levels.length),
    scores: Object.fromEntries(ATTRIBUTES.map((a) => [a, unit.permanent(a)])) as Record<Attribute, number>,
    ...(!unit.countGear &&
      ATTRIBUTES.some((a) => (unit.wornEnhancement.get(a) ?? 0) !== 0) && {
        scoresWithGear: Object.fromEntries(
          ATTRIBUTES.map((a) => [a, unit.permanent(a) + (unit.wornEnhancement.get(a) ?? 0)]),
        ) as Record<Attribute, number>,
      }),
    baseAttackBonus: unit.tableStat('m_BaseAttackBonus'),
    saves: {
      fortitude: saveNumbers(unit.tableStat('m_FortitudeSave'), unit.modifier('Constitution')),
      reflex: saveNumbers(unit.tableStat('m_ReflexSave'), unit.modifier('Dexterity')),
      will: saveNumbers(unit.tableStat('m_WillSave'), unit.modifier('Wisdom')),
    },
    skills,
    spellbooks: [...unit.spellbooks].map(([g, s]) => ({
      name: nameOf(e.data, g),
      baseLevel: s.base,
      mythicLevel: s.mythic,
      maxSpellLevel: maxSpellLevel(unit, g),
    })),
  };
}

export async function sheet(
  e: Engine,
  args: { readonly code: string; readonly level?: number },
): Promise<(Sheet & { readonly build: Build }) | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  return { ...sheetOf(e, build, args.level ?? build.levels.length), build };
}
