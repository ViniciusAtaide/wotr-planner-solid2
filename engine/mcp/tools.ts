import {
  placeKey,
  slotKey,
  toAbilityScores,
  toArchetypes,
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
  isShown,
  kindOf,
  type Attribute,
  type BlueprintFeatureSelection,
  type Guid,
  type Kind,
  type StatType,
} from '../data';
import { describe, NO_SUMMARY, type Description } from '../describe';
import { allows, apply, breaksOf, cascade, type Breaks, type Edit } from '../edits';
import { buildGrantIndex, type GrantIndex, type GrantParam } from '../grants';
import { linkIndex } from '../links';
import { picker, type OptionStatus } from '../pickers';
import {
  abilityScoreRange,
  archetypeCount,
  gearNote,
  nameOf,
  rankLevelRange,
  refusal,
  skillRankRange,
  statName,
  type Refusal,
} from '../refusals';
import { maxSpellLevel, ATTRIBUTES, SKILL_ATTRIBUTE, bandOf, pauseAt, walk, type Band, type Failure } from '../walk';

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

async function open(e: Engine, code: string): Promise<Build | ToolRefusal> {
  try {
    return await decodeBuild(e.data, code);
  } catch (err) {
    if (err instanceof DecodeError) return refused(`Not a Build code this planner reads (${err.reason}).`);
    throw err;
  }
}

const isRefusal = (x: unknown): x is ToolRefusal => typeof x === 'object' && x !== null && 'refused' in x;

function pickInWords(e: Engine, p: Pick): string {
  return `${placeKey(p.slot.place)} ${nameOf(e.data, p.slot.selection)}: ${nameOf(e.data, p.feature)}`;
}

function breaksInWords(e: Engine, b: Breaks, unitOf?: () => Parameters<typeof refusal>[0]['unit']): string[] {
  const w = { data: e.data, G: e.G, unit: unitOf?.() };
  return [
    ...b.picks.map((p) => pickInWords(e, p)),
    ...b.others.map((f: Failure) => `${placeKey(f.place)} ${f.choice}: ${refusal(w, f).text}`),
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
  if (mode === 'preview') return { preview: true, clears: c.cleared.map((p) => pickInWords(e, p)) };
  return changed(e, c.build);
}

export function start_build(e: Engine): Promise<Changed> {
  return changed(e, { levels: [], picks: [] });
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
): Promise<Changed | ToolRefusal> {
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
  return plainEdits(e, build, edits);
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
  readonly band: Band;
  readonly kind: string;
}

function openSlots(e: Engine, build: Build, place?: Place): SlotView[] {
  return walk(e.data, build, e.G)
    .slots.filter((s) => s.pick === undefined && (place === undefined || placeKey(s.id.place) === placeKey(place)))
    .filter((s) => e.data.blueprints.get(s.id.selection)?.$type !== 'BlueprintParametrizedFeature')
    .map((s) => {
      const bp = e.data.blueprints.get(s.id.selection);
      const group = bp?.$type === 'BlueprintFeatureSelection' ? (bp as BlueprintFeatureSelection).Group : undefined;
      return {
        slot: s.id,
        place: placeKey(s.id.place),
        selection: nameOf(e.data, s.id.selection),
        band: bp?.$type === 'BlueprintFeatureSelectMythicSpellbook' ? 'ReplaceSpellbook' : bandOf(group),
        kind: bp?.$type ?? 'unknown',
      };
    });
}

export async function level_up(
  e: Engine,
  args: {
    readonly code: string;
    readonly class: Guid;
    readonly archetypes?: readonly Guid[];
    readonly increase?: Attribute;
  },
): Promise<(Changed & { readonly slots: readonly SlotView[] }) | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const cls = e.data.blueprints.get(args.class);
  if (cls?.$type !== 'BlueprintCharacterClass') return refused('Not a class.');
  const mythic = cls.IsMythic;
  const rank = (build.ranks?.length ?? 0) + 1;
  const placed = Math.max(expectedLevel(e.data, rank), build.levels.length, 1);
  const level = toRankLevel(placed);
  if (mythic && level === undefined) return refused(rankLevelRange(placed));
  const archetypes = args.archetypes === undefined ? undefined : toArchetypes(args.archetypes);
  if (args.archetypes !== undefined && archetypes === undefined) return refused(archetypeCount(args.archetypes));
  const edits: Edit[] = [
    mythic && level !== undefined
      ? { kind: 'addRank', class: args.class, level }
      : { kind: 'addLevel', class: args.class },
    ...(archetypes !== undefined ? [{ kind: 'archetypes', class: args.class, archetypes } as const] : []),
    ...(!mythic && args.increase !== undefined
      ? [{ kind: 'increase', level: build.levels.length + 1, increase: args.increase } as const]
      : []),
  ];
  const r = await plainEdits(e, build, edits);
  if (isRefusal(r)) return r;
  const place: Place = mythic ? { rank } : { level: build.levels.length + 1 };
  return { ...r, slots: openSlots(e, r.build, place) };
}

export async function next_slots(
  e: Engine,
  args: { readonly code: string },
): Promise<readonly SlotView[] | ToolRefusal> {
  const build = await open(e, args.code);
  return isRefusal(build) ? build : openSlots(e, build);
}

export interface OptionView {
  readonly feature: Guid;
  readonly param?: GrantParam;
  readonly name: string;
  readonly summary: string;
  readonly buildsOn: readonly string[];
  readonly gear?: string;
  readonly refusal?: Refusal;
}

const OPTIONS_PER_PAGE = 25;

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
      readonly page: number;
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
    summary: NO_SUMMARY,
    buildsOn: links
      .needs(o.feature)
      .filter((g) => held.has(g))
      .map((g) => nameOf(e.data, g)),
    ...(o.gearItems && { gear: gearNote(e.data, o.gearItems) }),
    ...(o.closed && { refusal: refusal({ data: e.data, G: e.G, unit }, o.closed) }),
  });
  const openOnes = listed.filter((o) => o.closed === undefined);
  const closedOnes = listed.filter((o) => o.closed !== undefined);
  const page = Math.max(1, args.page ?? 1);
  const closedByReason: Record<string, number> = {};
  for (const o of closedOnes) {
    const text = refusal({ data: e.data, G: e.G, unit }, o.closed as NonNullable<OptionStatus['closed']>).text;
    closedByReason[text] = (closedByReason[text] ?? 0) + 1;
  }
  return {
    open: openOnes.slice((page - 1) * OPTIONS_PER_PAGE, page * OPTIONS_PER_PAGE).map(view),
    openTotal: openOnes.length,
    page,
    closedByReason,
    ...(args.include_closed && { closed: closedOnes.map(view) }),
  };
}

function optionName(e: Engine, o: { readonly feature: Guid; readonly param?: GrantParam }): string {
  const name = nameOf(e.data, o.feature);
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

export async function set_skills(
  e: Engine,
  args: { readonly code: string; readonly level: number; readonly ranks: Readonly<Partial<Record<StatType, number>>> },
): Promise<Changed | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  if (args.level < 1 || args.level > build.levels.length) return refused('The Build has no such level.');
  const skills = toSkillRanks(args.ranks);
  if (skills === undefined) return refused(skillRankRange(args.ranks));
  const after = apply(build, { kind: 'skills', level: args.level, skills });
  const own = walk(e.data, after, e.G).failures.find(
    (f) => f.choice === 'skills' && 'level' in f.place && f.place.level === args.level,
  );
  if (own !== undefined) return refused(refusal({ data: e.data, G: e.G }, own).text);
  return plainEdit(e, build, { kind: 'skills', level: args.level, skills });
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
    : { ...r, note: `Mythic rank ${args.rank} is usually reached at character level ${expected} (ADR 0003).` };
}

export async function equip(
  e: Engine,
  args: { readonly code: string; readonly place: GearPlace; readonly item?: Guid; readonly mode?: Mode },
): Promise<Changed | ToolRefusal | { readonly preview: true; readonly clears: readonly string[] }> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const edit: Edit = { kind: 'gear', place: args.place, ...(args.item !== undefined && { item: args.item }) };
  const own = walk(e.data, apply(build, edit), e.G).failures.find(
    (f) => f.choice === 'gear' && f.subject === args.item,
  );
  if (own !== undefined) return refused(refusal({ data: e.data, G: e.G }, own).text);
  return withMode(e, build, edit, args.mode ?? 'strict');
}

export async function synergies(
  e: Engine,
  args: { readonly code: string; readonly slot?: SlotId },
): Promise<
  readonly { readonly slot: string; readonly option: string; readonly buildsOn: readonly string[] }[] | ToolRefusal
> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  const slots = args.slot === undefined ? openSlots(e, build).map((s) => s.slot) : [args.slot];
  const out: { slot: string; option: string; buildsOn: readonly string[] }[] = [];
  for (const slot of slots) {
    const listed = await options(e, { code: args.code, slot, page: 1 });
    if (isRefusal(listed)) continue;
    const all = await allOpen(e, args.code, slot, listed.openTotal);
    for (const o of all)
      if (o.buildsOn.length > 0) out.push({ slot: slotKey(slot), option: o.name, buildsOn: o.buildsOn });
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

export function search(
  e: Engine,
  args: { readonly text: string; readonly kind?: Kind },
): readonly { readonly guid: Guid; readonly name: string; readonly kind: Kind; readonly summary: string }[] {
  const text = args.text.toLowerCase();
  const out: { guid: Guid; name: string; kind: Kind; summary: string }[] = [];
  for (const bp of e.data.blueprints.values()) {
    if (!isShown(bp) || (args.kind !== undefined && kindOf[bp.$type] !== args.kind)) continue;
    if (!(bp.name ?? '').toLowerCase().includes(text)) continue;
    out.push({ guid: bp.guid, name: bp.name ?? bp.assetName, kind: kindOf[bp.$type], summary: NO_SUMMARY });
    if (out.length >= 50) break;
  }
  return out;
}

export function explain(e: Engine, args: { readonly guid: Guid }): Description | ToolRefusal {
  return describe(e.data, args.guid, e.G) ?? refused('Not a blueprint the game shows.');
}

export interface Sheet {
  readonly level: number;
  readonly scores: Readonly<Record<Attribute, number>>;
  readonly baseAttackBonus: number;
  readonly saves: { readonly fortitude: number; readonly reflex: number; readonly will: number };
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

function sheetOf(e: Engine, build: Build, level: number): Sheet {
  const unit = walk(e.data, buildUpToLevel(build, level), e.G).unit;
  const skills: Record<string, { ranks: number; value: number }> = {};
  for (const skill of Object.keys(SKILL_ATTRIBUTE) as StatType[]) {
    skills[statName(skill)] = { ranks: unit.base.get(skill) ?? 0, value: unit.skillBase(skill) };
  }
  return {
    level: Math.min(level, build.levels.length),
    scores: Object.fromEntries(ATTRIBUTES.map((a) => [a, unit.permanent(a)])) as Record<Attribute, number>,
    baseAttackBonus: unit.tableStat('m_BaseAttackBonus'),
    saves: {
      fortitude: unit.tableStat('m_FortitudeSave'),
      reflex: unit.tableStat('m_ReflexSave'),
      will: unit.tableStat('m_WillSave'),
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
): Promise<Sheet | ToolRefusal> {
  const build = await open(e, args.code);
  if (isRefusal(build)) return build;
  return sheetOf(e, build, args.level ?? build.levels.length);
}

export async function compare(
  e: Engine,
  args: { readonly codes: readonly string[]; readonly levels: readonly number[] },
): Promise<
  | {
      readonly sheets: readonly (readonly Sheet[])[];
      readonly links: readonly number[];
      readonly divergeAt?: string;
    }
  | ToolRefusal
> {
  if (args.codes.length < 2 || args.codes.length > 4) return refused('Compare takes 2 to 4 Build codes.');
  const builds: Build[] = [];
  for (const code of args.codes) {
    const b = await open(e, code);
    if (isRefusal(b)) return b;
    builds.push(b);
  }
  const links = linkIndex(e.data, e.G);
  const linkCount = (b: Build) => {
    const held = new Set([...walk(e.data, b, e.G).unit.facts()].map((f) => f.blueprint));
    return [...held].reduce((n, g) => n + links.needs(g).filter((x) => held.has(x)).length, 0);
  };
  return {
    sheets: builds.map((b) => args.levels.map((l) => sheetOf(e, b, l))),
    links: builds.map(linkCount),
    ...divergence(builds),
  };
}

export function divergence(builds: readonly Build[]): { divergeAt?: string } {
  const at = (b: Build, place: Place) =>
    JSON.stringify([
      'level' in place ? b.levels[place.level - 1] : b.ranks?.[place.rank - 1],
      b.picks
        .filter((p) => placeKey(p.slot.place) === placeKey(place))
        .map((p) => [slotKey(p.slot), p.feature, p.param])
        .sort(),
    ]);
  const most = Math.max(...builds.map((b) => b.levels.length));
  for (let l = 1; l <= most; l++) {
    const place = { level: l };
    if (new Set(builds.map((b) => at(b, place))).size > 1) return { divergeAt: placeKey(place) };
  }
  const ranks = Math.max(...builds.map((b) => b.ranks?.length ?? 0));
  for (let r = 1; r <= ranks; r++) {
    const place = { rank: r };
    if (new Set(builds.map((b) => at(b, place))).size > 1) return { divergeAt: placeKey(place) };
  }
  return {};
}
