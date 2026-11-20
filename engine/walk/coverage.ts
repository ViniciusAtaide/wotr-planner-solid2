import type { GrantComponent } from '../data';

export const grantsAppliedElsewhere: ReadonlyMap<GrantComponent['$type'], string> = new Map<
  GrantComponent['$type'],
  string
>([
  [
    'AbilityApplyFact',
    'the daily choices (engine/walk/daily-choices.ts): a pick made through the ability is a daily choice, not part of a Build (map tickets 24 and 26)',
  ],
]);

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
