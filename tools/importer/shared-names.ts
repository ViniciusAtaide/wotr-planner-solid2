import type { CheckedData } from '~engine/load';
import type { Guid } from '~engine/data';

export const sharedNameExceptions: ReadonlyMap<string, string> = new Map<string, string>([]);

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
