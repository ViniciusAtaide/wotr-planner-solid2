// Field specs: how the importer checks and keeps one allowlisted field (guide §3 point 8, "When importing"). Each
// spec checks a dump value against its declared type and returns the kept value. A reference spec also names the
// kinds of blueprint it may point to, and the importer fails when the target isn't one the planner holds of that kind.
// `Spec<T>` is invariant in `T`, so an allowlist entry's specs must match its hand-written TypeScript type exactly.
import { isRecord, refGuid, type Guid, type Kind, type Ref } from '~engine/data/types';

export interface KeepContext {
  /** Where problems go; the importer fails when any are recorded. */
  readonly problems: string[];
  /** The kind of a blueprint the importer writes, or `undefined` when it doesn't write it. */
  readonly heldKind: (guid: Guid) => Kind | undefined;
  /** The dump's class name of any blueprint, for messages. */
  readonly dumpType: (guid: Guid) => string | undefined;
  /** Counts a reference a `heldRefs` list drops because the planner doesn't hold its target. */
  readonly dropped: (at: string, guid: Guid) => void;
  /** Counts a part of the dump the allowlist leaves out on purpose (an action that grants nothing), by label. */
  readonly droppedPart: (label: string) => void;
  /** Records whether a blueprint or component of type `owner` carried an allowlisted field. */
  readonly seen: (owner: string, field: string, present: boolean) => void;
  /**
   * Records a reference the kept value can't drop: a strict `ref` or `refOrNull`, whose target must be held. The keep
   * rule keeps what these name. A reference that is dropped when its target isn't held (a `heldRefs` list, a
   * component's `requiresHeld` field, a grant action) doesn't name its target, so it is not recorded.
   */
  readonly names?: (guid: Guid) => void;
}

export interface Spec<T> {
  /** The declared type, for messages. */
  readonly describe: string;
  /** Checks a dump value and returns what is kept of it. `at` names the value's place, for messages. */
  readonly keep: (raw: unknown, at: string, ctx: KeepContext) => T;
  /** The value the game gives the field when a blueprint's JSON omits it: the C# field initializer. */
  readonly absent?: { readonly value: T };
  /**
   * A struct's kept fields; for a list or a nullable value, its item's. Module A reads them to check the nested fields
   * a cited method reads.
   */
  readonly struct?: Readonly<Record<string, AnySpec>>;
  /**
   * A polymorphic value's variants (`poly`), by class name; for a list or a nullable value, its item's. Module A checks
   * each variant's fields against its own cited methods, as it checks an allowlist entry's.
   */
  readonly variants?: Readonly<Record<string, Variant<Readonly<Record<string, AnySpec>>>>>;
  /** Phantom member that makes `Spec<T>` invariant in `T`; never set. */
  readonly _type?: (value: T) => T;
}

/** The class name in a dump `$type` (`"<type GUID>, <ClassName>"`). */
export function shortType(dollarType: unknown): string {
  if (typeof dollarType !== 'string') return String(dollarType);
  const comma = dollarType.lastIndexOf(', ');
  return comma < 0 ? dollarType : dollarType.slice(comma + 2);
}

/** A spec with its value type erased, as allowlist entries store them once their types have been checked. */
export type AnySpec = Pick<Spec<unknown>, 'describe' | 'keep' | 'absent' | 'struct' | 'variants'>;

/**
 * Why the engine doesn't need a field a cited method reads. `holds` states what every kept blueprint's, component's or
 * variant's raw JSON must satisfy for the reason to stay true, when the reason rests on the data; the importer fails
 * otherwise (`checkNotKept`).
 */
export type NotKept = string | { readonly reason: string; readonly holds: (raw: Record<string, unknown>) => boolean };

/** A `notKept` reason that rests on the data must hold for every kept value, or the import fails. */
export function checkNotKept(
  notKept: Readonly<Record<string, NotKept>> | undefined,
  raw: Record<string, unknown>,
  at: string,
  ctx: KeepContext,
): void {
  for (const [field, why] of Object.entries(notKept ?? {})) {
    if (typeof why !== 'string' && !why.holds(raw))
      ctx.problems.push(`${at}: ${field} isn't kept because ${why.reason}, which no longer holds here`);
  }
}

/**
 * One variant of a polymorphic value (a condition, an evaluator, an action): its kept fields and the decompiled
 * methods that read them, cited as an allowlist entry's are (`<file> <method> (<fields>)`).
 */
export interface Variant<F> {
  readonly fields: F;
  readonly cite: readonly string[];
  /** Fields a cited method reads that the engine doesn't need, each with why. */
  readonly notKept?: Readonly<Record<string, NotKept>>;
}

function primitive<T>(describe: string, test: (raw: unknown) => boolean): Spec<T> {
  return {
    describe,
    keep(raw, at, ctx) {
      if (!test(raw)) ctx.problems.push(`${at}: expected ${describe}, found ${JSON.stringify(raw)}`);
      return raw as T;
    },
  };
}

export const int: Spec<number> = primitive('an integer', (raw) => Number.isInteger(raw));
export const num: Spec<number> = primitive('a number', (raw) => typeof raw === 'number' && Number.isFinite(raw));
export const bool: Spec<boolean> = primitive('a boolean', (raw) => typeof raw === 'boolean');
export const str: Spec<string> = primitive('a string', (raw) => typeof raw === 'string');

/**
 * A field some blueprints' JSON omits, so the game loads it with its C# initializer (`value`). The importer writes that
 * value, and the field must still occur on at least one blueprint of its type.
 */
export function orDefault<T>(spec: Spec<T>, value: T): Spec<T> {
  return { ...spec, describe: `${spec.describe} (default ${JSON.stringify(value)})`, absent: { value } };
}

/** A C# enum the engine switches on, by member name. Only the listed members are accepted. */
export function enumOf<const V extends readonly string[]>(...members: V): Spec<V[number]> {
  return primitive(`one of ${members.join(', ')}`, (raw) => typeof raw === 'string' && members.includes(raw));
}

function checkRef(raw: unknown, at: string, ctx: KeepContext, kinds: readonly Kind[]): raw is Ref {
  const guid = refGuid(raw);
  if (guid === undefined) {
    ctx.problems.push(`${at}: expected a reference, found ${JSON.stringify(raw)}`);
    return false;
  }
  const kind = ctx.heldKind(guid);
  if (kind === undefined || !kinds.includes(kind)) {
    const what = kind ?? `not held; the dump has a ${ctx.dumpType(guid) ?? 'missing blueprint'}`;
    ctx.problems.push(`${at}: names ${guid} (${what}), expected one of ${kinds.join(', ')}`);
  }
  return true;
}

/** A reference to a blueprint the planner holds, in one of `kinds`. */
export function ref(...kinds: Kind[]): Spec<Ref> {
  return {
    describe: `a reference to ${kinds.join(' or ')}`,
    keep(raw, at, ctx) {
      if (checkRef(raw, at, ctx, kinds)) ctx.names?.(refGuid(raw)!);
      return raw as Ref;
    },
  };
}

/** A value the game leaves `null` when unset, and its code checks for null. */
export function orNull<T>(spec: Spec<T>): Spec<T | null> {
  return {
    describe: `${spec.describe}, or null`,
    keep: (raw, at, ctx) => (raw === null ? null : spec.keep(raw, at, ctx)),
    struct: spec.struct,
    variants: spec.variants,
  };
}

/** A reference that the game leaves `null` when unset. */
export function refOrNull(...kinds: Kind[]): Spec<Ref | null> {
  return {
    describe: `a reference to ${kinds.join(' or ')}, or null`,
    keep(raw, at, ctx) {
      if (raw !== null && checkRef(raw, at, ctx, kinds)) ctx.names?.(refGuid(raw)!);
      return raw as Ref | null;
    },
  };
}

/**
 * A list of references whose C# type admits blueprints the planner doesn't hold (an `AddFacts` that also grants
 * abilities and buffs). References to blueprints the planner doesn't write are dropped and counted in the report;
 * every other reference must be of one of `kinds`.
 */
export function heldRefs(...kinds: Kind[]): Spec<readonly Ref[]> {
  return {
    describe: `a list of references to ${kinds.join(' or ')} (others dropped)`,
    keep(raw, at, ctx) {
      if (!Array.isArray(raw)) {
        ctx.problems.push(`${at}: expected a list, found ${JSON.stringify(raw)}`);
        return [];
      }
      const kept: Ref[] = [];
      for (const [i, item] of raw.entries()) {
        const guid = refGuid(item);
        if (guid !== undefined && ctx.heldKind(guid) === undefined) ctx.dropped(at, guid);
        else if (checkRef(item, `${at}[${i}]`, ctx, kinds)) kept.push(item);
      }
      return kept;
    },
  };
}

export function list<T>(item: Spec<T>): Spec<readonly T[]> {
  return {
    describe: `a list of ${item.describe}`,
    struct: item.struct,
    variants: item.variants,
    keep(raw, at, ctx) {
      if (!Array.isArray(raw)) {
        ctx.problems.push(`${at}: expected a list, found ${JSON.stringify(raw)}`);
        return [];
      }
      return raw.map((v, i) => item.keep(v, `${at}[${i}]`, ctx));
    },
  };
}

export type Fields<T> = { readonly [K in keyof T]-?: Spec<T[K]> };

/**
 * Keeps the listed fields of a dump object. A field the object omits takes its spec's default, or is a problem. `owner`
 * (a blueprint or component type) is reported to `ctx.seen`, so the importer can check each field occurs on its type.
 */
export function keepFields<T>(fields: Fields<T>, raw: unknown, at: string, ctx: KeepContext, owner?: string): T {
  const kept: Record<string, unknown> = {};
  if (!isRecord(raw)) {
    ctx.problems.push(`${at}: expected an object, found ${JSON.stringify(raw)}`);
    return kept as T;
  }
  for (const [name, spec] of Object.entries(fields) as [string, Spec<unknown>][]) {
    const present = name in raw;
    if (owner !== undefined) ctx.seen(owner, name, present);
    if (present) kept[name] = spec.keep(raw[name], `${at}.${name}`, ctx);
    else if (spec.absent !== undefined) kept[name] = spec.absent.value;
    else ctx.problems.push(`${at}: allowlisted field ${name} is absent, and the allowlist gives it no default`);
  }
  return kept as T;
}

/** A plain nested object (a level entry, a class-with-level), with no `$type` of its own. */
export function struct<T>(fields: Fields<T>): Spec<T> {
  return {
    describe: `an object with ${Object.keys(fields).join(', ')}`,
    keep: (raw, at, ctx) => keepFields(fields, raw, at, ctx),
    struct: fields as Readonly<Record<string, AnySpec>>,
  };
}

/**
 * A C# `[Flags]` enum. The dump writes its member names joined by `, ` (`"LawfulGood, NeutralGood"`), or the raw bits
 * as a number when no names express them (`-1`, or `0` for an enum without a zero member). It is kept as the game
 * writes it; every name must be a member.
 */
export function flagsOf(...members: readonly string[]): Spec<string | number> {
  return primitive(
    `flags of ${members.join(', ')}, or their bits`,
    (raw) => Number.isInteger(raw) || (typeof raw === 'string' && raw.split(', ').every((m) => members.includes(m))),
  );
}

type Variants<T extends { readonly $type: string }> = {
  readonly [K in T['$type']]: Variant<Fields<Omit<Extract<T, { readonly $type: K }>, '$type'>>>;
};

/**
 * A polymorphic nested object (a condition, an evaluator), chosen by its `$type`. Its kept form has the class name as
 * `$type` and the variant's listed fields; a `$type` with no variant is a problem.
 */
export function poly<T extends { readonly $type: string }>(variants: Variants<T>): Spec<T> {
  const table = variants as unknown as Record<string, Variant<Fields<Record<string, unknown>>>>;
  return {
    describe: `one of ${Object.entries(table)
      .map(([type, { fields }]) => `${type} (an object with ${Object.keys(fields).join(', ') || 'no fields'})`)
      .join('; ')}`,
    variants: table as unknown as Readonly<Record<string, Variant<Readonly<Record<string, AnySpec>>>>>,
    keep(raw, at, ctx) {
      const type = shortType((raw as { $type?: unknown } | null)?.$type);
      const variant = Object.hasOwn(table, type) ? table[type] : undefined;
      if (variant === undefined) {
        ctx.problems.push(`${at}: expected one of ${Object.keys(table).join(', ')}, found ${type}`);
        return { $type: type } as unknown as T;
      }
      const kept = { $type: type, ...keepFields(variant.fields, raw, at, ctx, type) };
      checkNotKept(variant.notKept, raw as Record<string, unknown>, at, ctx);
      return kept as unknown as T;
    },
  };
}

/** A spec defined later, for recursive shapes (a condition tree holds conditions). */
export function lazy<T>(get: () => Spec<T>): Spec<T> {
  return {
    describe: 'a nested value',
    keep: (raw, at, ctx) => get().keep(raw, at, ctx),
    get struct() {
      return get().struct;
    },
    get variants() {
      return get().variants;
    },
  };
}
