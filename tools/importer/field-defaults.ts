import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { allowlist, type AllowEntry } from './allowlist';
import { structKey } from '~engine/compact';
import type { AnySpec } from './spec';

export type SpecDefaults = Record<string, Record<string, unknown>>;

export function fieldDefaults(entries: readonly AllowEntry[] = allowlist): SpecDefaults {
  const out = new Map<string, Map<string, unknown>>();
  const visited = new Set<unknown>();
  const visit = (type: string | undefined, fields: Readonly<Record<string, AnySpec>>) => {
    if (visited.has(fields)) return;
    visited.add(fields);
    for (const [name, spec] of Object.entries(fields)) {
      if (type !== undefined && spec.zero !== undefined) {
        const forType = out.get(type) ?? new Map<string, unknown>();
        const earlier = forType.get(name);
        if (forType.has(name) && JSON.stringify(earlier) !== JSON.stringify(spec.zero.value)) {
          throw new Error(
            `${type}.${name} has two defaults: ${JSON.stringify(earlier)} and ${JSON.stringify(spec.zero.value)}`,
          );
        }
        forType.set(name, spec.zero.value);
        out.set(type, forType);
      }
      for (const [variant, { fields: inner }] of Object.entries(spec.variants ?? {})) visit(variant, inner);
      if (spec.struct !== undefined) visit(structKey(Object.keys(spec.struct)), spec.struct);
    }
  };
  for (const entry of entries) visit(entry.type, entry.fields);
  return Object.fromEntries(
    [...out]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, fields]) => [type, Object.fromEntries([...fields].sort(([a], [b]) => a.localeCompare(b)))]),
  );
}

const TARGET = fileURLToPath(new URL('../../engine/compact/field-defaults.ts', import.meta.url));

export function writeFieldDefaults(): void {
  const body = JSON.stringify(fieldDefaults(), null, 2);
  writeFileSync(
    TARGET,
    `import type { FieldDefaults } from './compact';\n\nexport const FIELD_DEFAULTS: FieldDefaults = ${body};\n`,
  );
}

if (import.meta.main) writeFieldDefaults();
