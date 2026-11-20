// Who reads each allowlisted component type, and who applies each grant (build ticket 02d). Two checks keep the
// allowlist and the modules in step, as the prerequisite check keeps the allowlist and P:
// - every allowlisted component type is read by exactly one of P, G, a landed area, or the Gear names
//   (tools/importer/allowlist.test.ts);
// - every grant type G reads, and every kind of grant G reads off a blueprint's own fields, is applied by the walk
//   (`appliedGrantTypes`, `appliedFieldGrants`) or listed in `grantsAppliedElsewhere` (engine/areas.test.ts).
// This is not tools/importer/not-needed.ts, which lists the types the allowlist leaves out.
import type { GrantComponent } from './data/types';

/**
 * Each grant type G reads that the walk doesn't apply, with the module that applies it and why. An entry leaves when
 * the walk applies the type.
 */
export const grantsAppliedElsewhere: ReadonlyMap<GrantComponent['$type'], string> = new Map<
  GrantComponent['$type'],
  string
>([
  [
    'AbilityApplyFact',
    'the daily choices (engine/walk/daily-choices.ts): a pick made through the ability is a daily choice, not part of a Build (map tickets 24 and 26)',
  ],
]);

/**
 * What is wrong with who reads the allowlisted component types: a type no reader set holds, a type two hold, or a type
 * a set holds that the allowlist doesn't keep. `readers` maps each reader (P, G, an area, the Gear names) to its types.
 */
export function readerProblems(
  allowlisted: Iterable<string>,
  readers: ReadonlyMap<string, Iterable<string>>,
): string[] {
  const problems: string[] = [];
  const readBy = new Map<string, string[]>();
  for (const [reader, types] of readers) {
    for (const type of types) {
      let by = readBy.get(type);
      if (by === undefined) readBy.set(type, (by = []));
      by.push(reader);
    }
  }
  const kept = new Set(allowlisted);
  for (const type of kept) {
    const by = readBy.get(type) ?? [];
    if (by.length === 0) problems.push(`${type}: allowlisted, but no module reads it`);
    if (by.length > 1) problems.push(`${type}: read by more than one of ${by.join(', ')}`);
  }
  for (const [type, by] of readBy) {
    if (!kept.has(type)) problems.push(`${type}: ${by.join(', ')} lists it, but the allowlist doesn't keep it`);
  }
  return problems;
}

/**
 * What is wrong with who applies the grants G reads (component types and field-grant kinds alike): one the walk
 * doesn't apply that `elsewhere` doesn't list, or a listing that G doesn't read or the walk applies.
 */
export function grantCoverageProblems(
  indexed: ReadonlySet<string>,
  applied: ReadonlySet<string>,
  elsewhere: ReadonlyMap<string, string>,
): string[] {
  const problems: string[] = [];
  for (const type of indexed) {
    if (!applied.has(type) && !elsewhere.has(type))
      problems.push(`${type}: G reads it, but neither the walk nor a listed module applies it`);
  }
  for (const type of applied)
    if (!indexed.has(type)) problems.push(`${type}: the walk applies it, but G doesn't read it`);
  for (const type of elsewhere.keys()) {
    if (!indexed.has(type)) problems.push(`${type}: listed as applied elsewhere, but G doesn't read it`);
    else if (applied.has(type)) problems.push(`${type}: listed as applied elsewhere, but the walk applies it`);
  }
  return problems;
}
