import { isRecord, refGuid, type Guid, type Kind, type Ref } from '~engine/data';

export interface KeepContext {
  readonly problems: string[];
  readonly heldKind: (guid: Guid) => Kind | undefined;
  readonly dumpType: (guid: Guid) => string | undefined;
  readonly dropped: (at: string, guid: Guid) => void;
  readonly droppedPart: (label: string) => void;
  readonly seen: (owner: string, field: string, present: boolean) => void;
  readonly names?: ((guid: Guid) => void) | undefined;
}

export interface Spec<T> {
  readonly describe: string;
  readonly keep: (raw: unknown, at: string, ctx: KeepContext) => T;
  readonly absent?: { readonly value: T } | undefined;
  readonly zero?: { readonly value: T } | undefined;
  readonly struct?: Readonly<Record<string, AnySpec>> | undefined;
  readonly variants?: Readonly<Record<string, Variant<Readonly<Record<string, AnySpec>>>>> | undefined;
  readonly _type?: (value: T) => T;
}

export function shortType(dollarType: unknown): string {
  if (typeof dollarType !== 'string') return String(dollarType);
  const comma = dollarType.lastIndexOf(', ');
  return comma < 0 ? dollarType : dollarType.slice(comma + 2);
}

export type AnySpec = Pick<Spec<unknown>, 'describe' | 'keep' | 'absent' | 'zero' | 'struct' | 'variants'>;

export type NotKept = string | { readonly reason: string; readonly holds: (raw: Record<string, unknown>) => boolean };

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

export interface Variant<F> {
  readonly fields: F;
  readonly cite: readonly string[];
  readonly notKept?: Readonly<Record<string, NotKept>> | undefined;
}

function primitive<T>(describe: string, test: (raw: unknown) => boolean, zero?: { readonly value: T }): Spec<T> {
  return {
    describe,
    ...(zero && { zero }),
    keep(raw, at, ctx) {
      if (!test(raw)) ctx.problems.push(`${at}: expected ${describe}, found ${JSON.stringify(raw)}`);
      return raw as T;
    },
  };
}

export const int: Spec<number> = primitive('an integer', (raw) => Number.isInteger(raw), { value: 0 });
export const num: Spec<number> = primitive('a number', (raw) => typeof raw === 'number' && Number.isFinite(raw), {
  value: 0,
});
export const bool: Spec<boolean> = primitive('a boolean', (raw) => typeof raw === 'boolean', { value: false });
export const str: Spec<string> = primitive('a string', (raw) => typeof raw === 'string');

export function orDefault<T>(spec: Spec<T>, value: T): Spec<T> {
  return {
    ...spec,
    describe: `${spec.describe} (default ${JSON.stringify(value)})`,
    absent: { value },
    zero: { value },
  };
}

export function enumOf<const V extends readonly string[]>(...members: V): Spec<V[number]> {
  return primitive(
    `one of ${members.join(', ')}`,
    (raw) => typeof raw === 'string' && members.includes(raw),
    members.includes('None') ? { value: 'None' as V[number] } : undefined,
  );
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

export function ref(...kinds: Kind[]): Spec<Ref> {
  return {
    describe: `a reference to ${kinds.join(' or ')}`,
    keep(raw, at, ctx) {
      if (checkRef(raw, at, ctx, kinds)) ctx.names?.(refGuid(raw)!);
      return raw as Ref;
    },
  };
}

export function orNull<T>(spec: Spec<T>): Spec<T | null> {
  return {
    describe: `${spec.describe}, or null`,
    zero: { value: null },
    keep: (raw, at, ctx) => (raw === null ? null : spec.keep(raw, at, ctx)),
    struct: spec.struct,
    variants: spec.variants,
  };
}

export function refOrNull(...kinds: Kind[]): Spec<Ref | null> {
  return {
    describe: `a reference to ${kinds.join(' or ')}, or null`,
    zero: { value: null },
    keep(raw, at, ctx) {
      if (raw !== null && checkRef(raw, at, ctx, kinds)) ctx.names?.(refGuid(raw)!);
      return raw as Ref | null;
    },
  };
}

export function heldRefs(...kinds: Kind[]): Spec<readonly Ref[]> {
  return {
    describe: `a list of references to ${kinds.join(' or ')} (others dropped)`,
    zero: { value: [] },
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
    zero: { value: [] },
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

export function struct<T>(fields: Fields<T>): Spec<T> {
  return {
    describe: `an object with ${Object.keys(fields).join(', ')}`,
    keep: (raw, at, ctx) => keepFields(fields, raw, at, ctx),
    struct: fields as Readonly<Record<string, AnySpec>>,
  };
}

export function flagsOf(...members: readonly string[]): Spec<string | number> {
  return primitive(
    `flags of ${members.join(', ')}, or their bits`,
    (raw) => Number.isInteger(raw) || (typeof raw === 'string' && raw.split(', ').every((m) => members.includes(m))),
  );
}

type Variants<T extends { readonly $type: string }> = {
  readonly [K in T['$type']]: Variant<Fields<Omit<Extract<T, { readonly $type: K }>, '$type'>>>;
};

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
