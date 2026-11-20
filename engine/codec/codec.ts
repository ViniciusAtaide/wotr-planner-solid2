import {
  slotKey,
  toAbilityScores,
  toRankLevel,
  toSkillRank,
  type AbilityScores,
  type Alignment,
  type Ascension,
  type Build,
  type GearPlace,
  type LevelUp,
  type Pick,
  type Place,
  type SkillRank,
} from '../build';
import type { CheckedData } from '../load';
import {
  kindOf,
  type Attribute,
  type Guid,
  type Kind,
  type SpellSchool,
  type StatType,
  type WeaponCategory,
} from '../data';
import type { GrantParam } from '../grants';
import { pointBuyCost, POINT_BUY, ATTRIBUTES, SKILL_ATTRIBUTE, WEAPON_CATEGORIES } from '../walk';

export const CODEC_VERSION = 1;

const MAX_INFLATED_BYTES = 256 * 1024;

const KEY_HASH_BYTES = 4;

export function keyHash(key: string): number {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(key)) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return KEY_HASH_BYTES === 4 ? hash : hash & (2 ** (8 * KEY_HASH_BYTES) - 1);
}

export class DecodeError extends Error {
  constructor(
    readonly reason: 'empty' | 'base64' | 'version' | 'decompress' | 'format' | 'unknownKey',
    detail = '',
  ) {
    super(`not a Build code: ${reason}${detail ? ` (${detail})` : ''}`);
    this.name = 'DecodeError';
  }
}

const KINDS: readonly Kind[] = [
  'classes',
  'archetypes',
  'progressions',
  'selections',
  'features',
  'races',
  'tables',
  'spellbooks',
  'settings',
  'buffs',
  'abilities',
  'activatables',
  'items',
  'itemtypes',
  'enchantments',
  'units',
];

const ALIGNMENTS: readonly Alignment[] = [
  'LawfulGood',
  'NeutralGood',
  'ChaoticGood',
  'LawfulNeutral',
  'TrueNeutral',
  'ChaoticNeutral',
  'LawfulEvil',
  'NeutralEvil',
  'ChaoticEvil',
];
const SKILLS = Object.keys(SKILL_ATTRIBUTE) as readonly StatType[];
const SCHOOLS: readonly SpellSchool[] = [
  'None',
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
  'Universalist',
];
const PLACES: readonly GearPlace[] = [
  'Armor',
  'Head',
  'Glasses',
  'Neck',
  'Shoulders',
  'Shirt',
  'Belt',
  'Wrist',
  'Gloves',
  'Feet',
  'Ring1',
  'Ring2',
  'MainHand',
  'OffHand',
];

export interface KeyCollision {
  readonly kind: Kind;
  readonly keys: readonly [Guid, Guid];
}

interface Hashed {
  readonly named: Guid;
  live: boolean;
  readonly heirs: Set<Guid>;
  shared: boolean;
}

export interface LinkKeys {
  readonly collisions: readonly KeyCollision[];
  get(kind: Kind, hash: number): Guid | undefined;
  heirs(kind: Kind, old: Guid): readonly Guid[];
}

const linkKeysCache = new WeakMap<CheckedData, LinkKeys>();

export function linkKeys(data: CheckedData): LinkKeys {
  const cached = linkKeysCache.get(data);
  if (cached !== undefined) return cached;
  const table = new Map<string, Hashed>();
  const collisions: KeyCollision[] = [];
  const hashed = (kind: Kind, named: Guid): Hashed => {
    const at = `${kind}|${keyHash(named)}`;
    let held = table.get(at);
    if (held === undefined) table.set(at, (held = { named, live: false, heirs: new Set(), shared: false }));
    if (held.named !== named) {
      held.shared = true;
      const keys = [held.named, named].sort() as [Guid, Guid];
      if (!collisions.some((c) => c.kind === kind && c.keys[0] === keys[0] && c.keys[1] === keys[1]))
        collisions.push({ kind, keys });
    }
    return held;
  };
  for (const bp of data.blueprints.values()) hashed(kindOf[bp.$type], bp.guid).live = true;
  for (const o of data.overrides) {
    if (o.change !== 'alias') continue;
    const target = data.blueprints.get(o.target);
    if (target !== undefined) hashed(kindOf[target.$type], o.from).heirs.add(o.target);
  }
  const keys: LinkKeys = {
    collisions,
    get(kind, hash) {
      const held = table.get(`${kind}|${hash}`);
      if (held === undefined || held.shared) return undefined;
      const [heir] = held.heirs;
      return !held.live && held.heirs.size === 1 && heir !== undefined ? heir : held.named;
    },
    heirs(kind, old) {
      const held = table.get(`${kind}|${keyHash(old)}`);
      return held === undefined || held.named !== old || held.shared ? [] : [...held.heirs].sort();
    },
  };
  linkKeysCache.set(data, keys);
  return keys;
}

const BASE64URL = /^[A-Za-z0-9_-]*$/;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): Uint8Array<ArrayBuffer> {
  if (!BASE64URL.test(code) || code.length % 4 === 1) throw new DecodeError('base64');
  const padded = code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    throw new DecodeError('base64');
  }
}

function streamOf(bytes: Uint8Array<ArrayBuffer>): ReadableStream<Uint8Array<ArrayBuffer>> {
  return new Response(bytes).body as ReadableStream<Uint8Array<ArrayBuffer>>;
}

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = streamOf(bytes).pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  try {
    const reader = streamOf(bytes).pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
      size += r.value.length;
      if (size > MAX_INFLATED_BYTES) {
        await reader.cancel();
        throw new DecodeError('decompress', 'too large');
      }
      chunks.push(r.value);
    }
    const out = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
    return out;
  } catch (e) {
    if (e instanceof DecodeError) throw e;
    throw new DecodeError('decompress');
  }
}

function slotOrder(a: Pick, b: Pick): number {
  const rank = (p: Place) => ('rank' in p ? 1 : 0);
  const n = (p: Place) => ('rank' in p ? p.rank : p.level);
  return (
    rank(a.slot.place) - rank(b.slot.place) ||
    n(a.slot.place) - n(b.slot.place) ||
    (a.slot.selection < b.slot.selection ? -1 : a.slot.selection > b.slot.selection ? 1 : 0) ||
    a.slot.index - b.slot.index
  );
}

class Writer {
  readonly keys: Guid[] = [];
  readonly bytes: number[] = [];

  constructor(readonly data: CheckedData) {}

  byte(b: number): void {
    if (!Number.isInteger(b) || b < 0 || b > 255) throw new Error(`not a byte: ${b}`);
    this.bytes.push(b);
  }

  varint(n: number): void {
    if (!Number.isInteger(n) || n < 0) throw new Error(`not a count: ${n}`);
    for (; n >= 0x80; n = Math.floor(n / 0x80)) this.bytes.push((n % 0x80) | 0x80);
    this.bytes.push(n);
  }

  key(guid: Guid): void {
    this.keys.push(guid);
  }

  kindKey(guid: Guid): void {
    const bp = this.data.blueprints.get(guid);
    if (bp === undefined) throw new Error(`the Build names ${guid}, which the data doesn't hold`);
    this.byte(KINDS.indexOf(kindOf[bp.$type]));
    this.key(guid);
  }

  index<T>(all: readonly T[], value: T): void {
    const i = all.indexOf(value);
    if (i < 0) throw new Error(`not a value the code knows: ${String(value)}`);
    this.byte(i);
  }

  optIndex<T>(all: readonly T[], value: T | undefined): void {
    if (value === undefined) this.byte(0);
    else {
      const i = all.indexOf(value);
      if (i < 0) throw new Error(`not a value the code knows: ${String(value)}`);
      this.byte(1 + i);
    }
  }

  build(b: Build): void {
    const { race, raceStat, alignment, scores, levels, ranks, classChoices, picks, gear, countGear, aspects } = b;
    if (race === undefined) this.byte(0);
    else {
      this.byte(1);
      this.key(race);
    }
    this.optIndex(ATTRIBUTES, raceStat);
    this.optIndex(ALIGNMENTS, alignment);
    if (scores === undefined) this.byte(0);
    else {
      this.byte(1);
      for (const a of ATTRIBUTES) this.byte(scores[a]);
    }
    this.varint(levels.length);
    for (const l of levels) {
      this.key(l.class);
      this.optIndex(ATTRIBUTES, l.increase);
      const skills = Object.entries(l.skills ?? {})
        .filter(([, n]) => (n ?? 0) > 0)
        .sort(([a], [b]) => SKILLS.indexOf(a as StatType) - SKILLS.indexOf(b as StatType));
      this.varint(skills.length);
      for (const [skill, n] of skills) {
        this.index(SKILLS, skill as StatType);
        this.byte(n ?? 0);
      }
    }
    this.varint(ranks?.length ?? 0);
    for (const r of ranks ?? []) {
      this.key(r.class);
      this.byte(r.level);
    }
    const choices = Object.entries(classChoices ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    this.varint(choices.length);
    for (const [cls, choice] of choices) {
      this.key(cls);
      this.varint(choice.archetypes.length);
      for (const a of choice.archetypes) this.key(a);
    }
    const sorted = [...picks].sort(slotOrder);
    this.varint(sorted.length);
    for (const p of sorted) {
      this.byte('rank' in p.slot.place ? 1 : 0);
      this.varint('rank' in p.slot.place ? p.slot.place.rank : p.slot.place.level);
      this.kindKey(p.slot.selection);
      this.varint(p.slot.index);
      this.kindKey(p.feature);
      this.param(p.param);
    }
    const worn = PLACES.filter((place) => gear?.[place] !== undefined);
    this.varint(worn.length);
    for (const place of worn) {
      this.index(PLACES, place);
      this.key(gear?.[place] as Guid);
    }
    this.byte(countGear === true ? 1 : 0);
    this.varint(aspects?.length ?? 0);
    for (const a of aspects ?? []) this.key(a);
  }

  param(p: GrantParam | undefined): void {
    if (p === undefined) this.byte(0);
    else if ('WeaponCategory' in p) {
      this.byte(1);
      this.index(WEAPON_CATEGORIES, p.WeaponCategory);
    } else if ('SpellSchool' in p) {
      this.byte(2);
      this.index(SCHOOLS, p.SpellSchool);
    } else if ('StatType' in p) {
      this.byte(3);
      this.index(SKILLS, p.StatType);
    } else {
      this.byte(4);
      this.kindKey(p.Blueprint);
    }
  }
}

export async function encodeBuild(data: CheckedData, build: Build): Promise<string> {
  const w = new Writer(data);
  w.build(build);
  const body: number[] = [];
  const count = new Writer(data);
  count.varint(w.keys.length);
  body.push(...count.bytes);
  for (const guid of w.keys) {
    const h = keyHash(guid);
    for (let i = 0; i < KEY_HASH_BYTES; i++) body.push((h >>> (8 * i)) & 0xff);
  }
  body.push(...w.bytes);
  const compressed = await deflate(Uint8Array.from(body));
  const out = new Uint8Array(compressed.length + 1);
  out[0] = CODEC_VERSION;
  out.set(compressed, 1);
  return toBase64Url(out);
}

class Reader {
  private at = 0;
  private hashAt = 0;
  private readonly hashes: number[] = [];

  constructor(
    private readonly bytes: Uint8Array,
    private readonly data: CheckedData,
    private readonly keys: LinkKeys,
  ) {
    const count = this.varint();
    if (count * KEY_HASH_BYTES > bytes.length - this.at) throw new DecodeError('format', 'hash list');
    for (let i = 0; i < count; i++, this.at += KEY_HASH_BYTES) {
      let h = 0;
      for (let b = 0; b < KEY_HASH_BYTES; b++) h += (bytes[this.at + b] ?? 0) * 2 ** (8 * b);
      this.hashes.push(h);
    }
  }

  byte(): number {
    const b = this.bytes[this.at];
    if (b === undefined) throw new DecodeError('format', 'short');
    this.at++;
    return b;
  }

  varint(): number {
    let value = 0;
    for (let shift = 0; shift < 35; shift += 7) {
      const b = this.byte();
      if (shift > 0 && b === 0) throw new DecodeError('format', 'varint');
      value += (b & 0x7f) * 2 ** shift;
      if ((b & 0x80) === 0) return value;
    }
    throw new DecodeError('format', 'varint');
  }

  count(): number {
    const n = this.varint();
    if (n > this.bytes.length - this.at + this.hashes.length - this.hashAt) throw new DecodeError('format', 'count');
    return n;
  }

  flag(): boolean {
    const b = this.byte();
    if (b > 1) throw new DecodeError('format', 'flag');
    return b === 1;
  }

  key(kind: Kind): Guid {
    const hash = this.hashes[this.hashAt++];
    if (hash === undefined) throw new DecodeError('format', 'hashes');
    const guid = this.keys.get(kind, hash);
    if (guid === undefined) throw new DecodeError('unknownKey');
    return kind === 'items' ? (this.data.twins.get(guid) ?? guid) : guid;
  }

  kindKey(): Guid {
    const kind = KINDS[this.byte()];
    if (kind === undefined) throw new DecodeError('format', 'kind');
    return this.key(kind);
  }

  index<T>(all: readonly T[]): T {
    const v = all[this.byte()];
    if (v === undefined) throw new DecodeError('format', 'index');
    return v;
  }

  optIndex<T>(all: readonly T[]): T | undefined {
    const b = this.byte();
    if (b === 0) return undefined;
    const v = all[b - 1];
    if (v === undefined) throw new DecodeError('format', 'index');
    return v;
  }

  build(): Build {
    const race = this.flag() ? this.key('races') : undefined;
    const raceStat = this.optIndex(ATTRIBUTES);
    const alignment = this.optIndex(ALIGNMENTS);
    let scores: AbilityScores | undefined;
    if (this.flag()) {
      const read: Record<string, number> = {};
      for (const a of ATTRIBUTES) read[a] = this.byte();
      scores = toAbilityScores(read);
      if (scores === undefined) throw new DecodeError('format', 'scores');
    }
    const levels: LevelUp[] = [];
    for (let i = this.count(); i > 0; i--) {
      const cls = this.key('classes');
      const increase = this.optIndex(ATTRIBUTES);
      const skills: Partial<Record<StatType, SkillRank>> = {};
      let last = -1;
      for (let j = this.count(); j > 0; j--) {
        const index = this.byte();
        const skill = SKILLS[index];
        const n = this.byte();
        const rank = n === 0 ? undefined : toSkillRank(n);
        if (skill === undefined || index <= last || rank === undefined) throw new DecodeError('format', 'skills');
        last = index;
        skills[skill] = rank;
      }
      levels.push({
        class: cls,
        ...(increase !== undefined && { increase }),
        ...(last >= 0 && { skills }),
      });
    }
    const ranks: Ascension[] = [];
    for (let i = this.count(); i > 0; i--) {
      const cls = this.key('classes');
      const level = toRankLevel(this.byte());
      if (level === undefined) throw new DecodeError('format', 'rank level');
      ranks.push({ class: cls, level });
    }
    const classChoices: Record<Guid, { archetypes: Guid[] }> = {};
    let lastClass = '';
    for (let i = this.count(); i > 0; i--) {
      const cls = this.key('classes');
      if (cls <= lastClass) throw new DecodeError('format', 'class choices');
      lastClass = cls;
      const archetypes: Guid[] = [];
      for (let j = this.count(); j > 0; j--) archetypes.push(this.key('archetypes'));
      classChoices[cls] = { archetypes };
    }
    const picks: Pick[] = [];
    for (let i = this.count(); i > 0; i--) {
      const ranked = this.flag();
      const n = this.varint();
      const place: Place = ranked ? { rank: n } : { level: n };
      const selection = this.kindKey();
      const index = this.varint();
      const feature = this.kindKey();
      const param = this.param();
      const pick: Pick = { slot: { place, selection, index }, feature, ...(param && { param }) };
      const before = picks.at(-1);
      if (before !== undefined && slotOrder(before, pick) >= 0) throw new DecodeError('format', 'picks');
      picks.push(pick);
    }
    const gear: Partial<Record<GearPlace, Guid>> = {};
    let lastPlace = -1;
    for (let i = this.count(); i > 0; i--) {
      const index = this.byte();
      const place = PLACES[index];
      if (place === undefined || index <= lastPlace) throw new DecodeError('format', 'gear');
      lastPlace = index;
      gear[place] = this.key('items');
    }
    const countGear = this.flag();
    const aspects: Guid[] = [];
    for (let i = this.count(); i > 0; i--) aspects.push(this.key('activatables'));
    if (this.at !== this.bytes.length || this.hashAt !== this.hashes.length) {
      throw new DecodeError('format', 'left over');
    }
    return {
      ...(race !== undefined && { race }),
      ...(raceStat !== undefined && { raceStat }),
      ...(alignment !== undefined && { alignment }),
      ...(scores !== undefined && { scores }),
      ...(Object.keys(classChoices).length > 0 && { classChoices }),
      levels,
      ...(ranks.length > 0 && { ranks }),
      picks,
      ...(lastPlace >= 0 && { gear }),
      ...(aspects.length > 0 && { aspects }),
      ...(countGear && { countGear }),
    };
  }

  param(): GrantParam | undefined {
    switch (this.byte()) {
      case 0:
        return undefined;
      case 1:
        return { WeaponCategory: this.index<WeaponCategory>(WEAPON_CATEGORIES) };
      case 2:
        return { SpellSchool: this.index(SCHOOLS) };
      case 3:
        return { StatType: this.index(SKILLS) };
      case 4:
        return { Blueprint: this.kindKey() };
      default:
        throw new DecodeError('format', 'parameter');
    }
  }
}

function keepsFixedRules(b: Build): boolean {
  const s = b.scores;
  if (s !== undefined && (ATTRIBUTES.some((a) => s[a] < 7 || s[a] > 18) || pointBuyCost(s) > POINT_BUY)) return false;
  const ranks = new Map<string, number>();
  for (const [i, l] of b.levels.entries()) {
    if (l.increase !== undefined && (i + 1) % 4 !== 0) return false;
    for (const [skill, n] of Object.entries(l.skills ?? {})) {
      const total = (ranks.get(skill) ?? 0) + (n ?? 0);
      if (total > i + 1) return false;
      ranks.set(skill, total);
    }
  }
  const slots = new Set(b.picks.map((p) => slotKey(p.slot)));
  return slots.size === b.picks.length && (b.ranks ?? []).every((r) => toRankLevel(r.level) !== undefined);
}

export async function decodeBuild(data: CheckedData, code: string): Promise<Build> {
  if (code === '') throw new DecodeError('empty');
  const bytes = fromBase64Url(code);
  const [version] = bytes;
  if (version === undefined) throw new DecodeError('empty');
  if (version !== 1) throw new DecodeError('version', String(version));
  const build = new Reader(await inflate(bytes.subarray(1)), data, linkKeys(data)).build();
  if (!keepsFixedRules(build)) throw new DecodeError('format', 'a Build no planner makes');
  return build;
}

export async function openBuild(
  data: CheckedData,
  code: string,
  takes: (build: Build, pick: Pick) => boolean,
): Promise<Build> {
  let build = await decodeBuild(data, code);
  const keys = linkKeys(data);
  for (const p of build.picks) {
    if (data.blueprints.has(p.feature)) continue;
    const kind = KINDS.find((k) => keys.heirs(k, p.feature).length > 0);
    const heir =
      kind === undefined ? undefined : keys.heirs(kind, p.feature).find((h) => takes(build, { ...p, feature: h }));
    if (heir === undefined) throw new DecodeError('unknownKey', p.feature);
    const key = slotKey(p.slot);
    build = { ...build, picks: build.picks.map((q) => (slotKey(q.slot) === key ? { ...q, feature: heir } : q)) };
  }
  return build;
}
