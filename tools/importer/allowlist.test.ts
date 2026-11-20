// Module A (guide §4): the allowlist keeps every field its cited methods read. Each citation names a decompiled file,
// a method and, in parentheses, the kept fields that method reads. These tests check that the citations and the kept
// fields agree, and, where the git-ignored decompiled/ sources are present, that each cited method exists, reads the
// fields it is cited for, and reads no field of the entry's class (or of a kept struct's class) that the entry drops
// without a listed reason (`notKept`, `awaiting`).
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readerProblems } from '~engine/areas';
import { grantTypes } from '~engine/grants';
import { isPrerequisite, paramPrerequisiteTypes, prerequisiteTypes } from '~engine/prerequisites';
import { walkAreas } from '~engine/walk/areas';
import { allowlist, type AllowEntry } from './allowlist';
import { gearNameTypes } from './gear-names';
import { body, elementType, readSources, reads, type ClassFields, type Sources } from './csharp';
import type { AnySpec } from './spec';

const sources = readSources(fileURLToPath(new URL('../../decompiled/', import.meta.url)));

interface Citation {
  readonly file: string;
  readonly method: string;
  readonly fields: readonly string[];
}

/** What module A checks: an allowlist entry, or a variant of a polymorphic value (`poly`) inside one's kept fields. */
type Checked = Pick<AllowEntry, 'type' | 'fields' | 'cite' | 'notKept' | 'awaiting'>;

/**
 * Every variant of a polymorphic value (a condition, an evaluator, an action) inside the entries' kept fields, through
 * structs, lists and nested variants, once each by class name.
 */
function variantsIn(entries: readonly Checked[]): Checked[] {
  const found = new Map<string, Checked>();
  const seen = new Set<object>();
  const visit = (fields: Readonly<Record<string, AnySpec>>) => {
    if (seen.has(fields)) return;
    seen.add(fields);
    for (const spec of Object.values(fields)) {
      if (spec.struct !== undefined) visit(spec.struct);
      for (const [type, v] of Object.entries(spec.variants ?? {})) {
        if (found.has(type)) continue;
        found.set(type, { type, fields: v.fields, cite: v.cite, notKept: v.notKept });
        visit(v.fields);
      }
    }
  };
  for (const e of entries) visit(e.fields);
  return [...found.values()];
}

const variants = variantsIn(allowlist);

function parse(cite: string): Citation {
  const m = /^([\w/]+\.cs) (\w+)(?: \(([\w, ]+)\))?$/.exec(cite);
  if (m === null) throw new Error(`not a citation: ${cite}`);
  return { file: m[1], method: m[2], fields: m[3]?.split(', ') ?? [] };
}

/**
 * Every field of the entry's class (and, inside a kept struct, of the struct's class) that a cited method reads and
 * the entry neither keeps nor lists in `notKept` or `awaiting`; and every listing that is stale, because the field is
 * kept or no cited method reads it. A field a method reads under the same name on another object is listed too, with
 * that reason: the check matches names, so it errs towards asking.
 */
function fieldReadProblems(entry: Checked, src: Sources): string[] {
  const chain = src.fields(entry.type);
  if (chain === undefined) return [`${entry.type}: no class of that name in the sources`];
  const bodies = entry.cite.map(parse).map((c) => body(src.file(c.file) ?? '', c.method) ?? '');
  const listed = new Map(
    [...Object.keys(entry.notKept ?? {}), ...Object.keys(entry.awaiting ?? {})].map((at) => [at, false]),
  );
  const problems: string[] = [];
  const visit = (kept: Readonly<Record<string, AnySpec>>, fields: ClassFields, path: string) => {
    for (const [field, declared] of fields) {
      const at = `${path}${field}`;
      if (Object.hasOwn(kept, field)) {
        const struct = kept[field].struct;
        if (struct === undefined) continue;
        const inner = src.fields(elementType(declared), entry.type);
        if (inner === undefined) problems.push(`${at}: no class ${declared} in the sources`);
        else visit(struct, inner, `${at}.`);
        continue;
      }
      if (!bodies.some((b) => reads(b, field))) continue;
      if (listed.has(at)) listed.set(at, true);
      else problems.push(`${at}: a cited method reads it; keep it, or list it in notKept or awaiting`);
    }
  };
  visit(entry.fields, chain, '');
  for (const [at, used] of listed)
    if (!used) problems.push(`${at}: listed as not kept, but it is kept or no cited method reads it`);
  return problems;
}

describe('allowlist', () => {
  it('names each $type once', () => {
    const types = allowlist.map((e) => e.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('cites a decompiled method for every entry', () => {
    for (const entry of allowlist) {
      expect(entry.cite.length, entry.type).toBeGreaterThan(0);
      for (const cite of entry.cite) expect(() => parse(cite), entry.type).not.toThrow();
    }
  });

  it('keeps every prerequisite type P reads, and no prerequisite P cannot read', () => {
    const kept = allowlist.filter((e) => e.role === 'component' && isPrerequisite({ $type: e.type }));
    expect(new Set(kept.map((e) => e.type))).toEqual(prerequisiteTypes);
  });

  describe('every allowlisted component type is read once: by P, by G, by a landed area or by the Gear names', () => {
    const components = allowlist.filter((e) => e.role === 'component').map((e) => e.type);
    // A landed area adds its exported set of types here.
    const readers = new Map<string, Iterable<string>>([
      ['P', [...prerequisiteTypes, ...paramPrerequisiteTypes]],
      ['G', grantTypes],
      ...walkAreas,
      ['Gear names', gearNameTypes],
    ]);

    it('holds for the allowlist', () => {
      expect(readerProblems(components, readers)).toEqual([]);
    });

    it('fails when the allowlist keeps a grant type G does not read', () => {
      // AddFeatureToPet is a real grant type of the game's, which the allowlist leaves out (not-needed.ts).
      expect(readerProblems([...components, 'AddFeatureToPet'], readers)).toEqual([
        'AddFeatureToPet: allowlisted, but no module reads it',
      ]);
    });
  });

  describe('reads the fields its cited methods read (module A)', () => {
    it.runIf(sources !== undefined)('fails when an entry drops a field its cited method reads', () => {
      // BuffExtraEffects.CheckHadPrerequiredBuff reads m_CheckedBuffList as well as m_CheckedBuff.
      const real = allowlist.find((e) => e.type === 'BuffExtraEffects')!;
      expect(fieldReadProblems({ ...real, awaiting: {}, notKept: {} }, sources!)).toEqual([
        'm_CheckedBuffList: a cited method reads it; keep it, or list it in notKept or awaiting',
      ]);
    });

    it.runIf(sources !== undefined)(
      'fails when a variant of a polymorphic value drops a field its method reads',
      () => {
        // UnitClass.CheckCondition reads LimitMaxLevel and MaxLevel as well as the minimum.
        const real = variants.find((v) => v.type === 'UnitClass')!;
        const { LimitMaxLevel: _limit, MaxLevel: _max, ...fields } = real.fields;
        expect(fieldReadProblems({ ...real, fields }, sources!)).toEqual([
          'LimitMaxLevel: a cited method reads it; keep it, or list it in notKept or awaiting',
          'MaxLevel: a cited method reads it; keep it, or list it in notKept or awaiting',
        ]);
      },
    );

    it.runIf(sources !== undefined)('fails on a listing no cited method needs', () => {
      const real = allowlist.find((e) => e.type === 'AddFacts')!;
      expect(fieldReadProblems({ ...real, notKept: { ...real.notKept, m_Facts: 'kept' } }, sources!)).toEqual([
        'm_Facts: listed as not kept, but it is kept or no cited method reads it',
      ]);
    });
  });

  it('finds the variants of the conditions, evaluators and grant actions it keeps', () => {
    expect(variants.map((v) => v.type)).toEqual(
      expect.arrayContaining(['UnitClass', 'PlayerCharacter', 'IntConstant', 'AddFact', 'Conditional']),
    );
  });

  describe.each([...allowlist, ...variants].map((e) => [e.type, e] as const))('%s', (_type, entry) => {
    const citations = entry.cite.map(parse);
    const cited = new Set(citations.flatMap((c) => c.fields));
    const kept = new Set(Object.keys(entry.fields));
    const keptAndNested = new Set([...kept, ...nestedFields(entry.fields)]);

    it('keeps every field its citations name', () => {
      expect([...cited].filter((f) => !keptAndNested.has(f))).toEqual([]);
    });

    it('cites a method for every field it keeps', () => {
      expect([...kept].filter((f) => !cited.has(f))).toEqual([]);
    });

    it.runIf(sources !== undefined).each(citations.map((c) => [`${c.file} ${c.method}`, c] as const))(
      '%s exists and reads its fields',
      (_label, c) => {
        const source = sources!.file(c.file);
        expect(source, c.file).toBeDefined();
        const code = body(source!, c.method);
        expect(code, `${c.method} in ${c.file}`).toBeDefined();
        expect(c.fields.filter((f) => !reads(code!, f))).toEqual([]);
      },
    );

    it.runIf(sources !== undefined)('keeps, or lists with a reason, every field its cited methods read', () => {
      expect(fieldReadProblems(entry, sources!)).toEqual([]);
    });
  });
});

/** Field names inside struct specs (`LevelEntries` → `Level`, `m_Features`), which citations may also name. */
function nestedFields(fields: Readonly<Record<string, AnySpec>>): string[] {
  return Object.values(fields).flatMap((spec) =>
    spec.struct === undefined ? [] : [...Object.keys(spec.struct), ...nestedFields(spec.struct)],
  );
}
