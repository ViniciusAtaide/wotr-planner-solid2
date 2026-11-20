import type { CheckedData } from '~engine/data/load';
import type { Guid } from '~engine/data/types';

// Written names that blueprints a player sees still share after qualifying (build ticket 02c, map ticket 27), each
// with why both stay. The importer fails on a shared name not listed here, and on a listed one no longer shared; the
// report lists every one with its reason. Every other shared name is qualified, by a source or a name override.
export const sharedNameExceptions: ReadonlyMap<string, string> = new Map<string, string>([]);

/** The list stays honest: every name still shared is listed here, and a listed name no longer shared leaves it. */
export function sharedNameProblems(
  collisions: ReadonlyMap<string, readonly Guid[]>,
  data: Pick<CheckedData, 'blueprints'>,
): string[] {
  const problems: string[] = [];
  const label = (guid: Guid) => `${data.blueprints.get(guid)?.assetName} ${guid}`;
  for (const [name, guids] of collisions) {
    if (sharedNameExceptions.has(name)) continue;
    problems.push(
      `"${name}" is still shared by ${guids.map(label).join(', ')}: give a name override, or list it in shared-names.ts`,
    );
  }
  for (const name of sharedNameExceptions.keys())
    if (!collisions.has(name)) problems.push(`shared-names.ts lists "${name}", which isn't shared; remove it`);
  return problems;
}
