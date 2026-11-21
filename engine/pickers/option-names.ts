import type { CheckedData } from '../load';
import type { Blueprint, Guid } from '../data';

export interface ListName {
  readonly name: string;
  readonly qualifier?: string;
}

export function bareName(bp: Blueprint): string | undefined {
  const { name, qualifier } = bp;
  if (name === undefined) return undefined;
  return qualifier !== undefined && name.endsWith(` (${qualifier})`) ? name.slice(0, -(qualifier.length + 3)) : name;
}

export function namesInList(data: CheckedData, guids: readonly Guid[]): ReadonlyMap<Guid, ListName> {
  const byBare = new Map<string, Guid[]>();
  for (const guid of new Set(guids)) {
    const bp = data.blueprints.get(guid);
    const bare = bp === undefined ? undefined : bareName(bp);
    if (bare !== undefined) byBare.set(bare, [...(byBare.get(bare) ?? []), guid]);
  }
  const out = new Map<Guid, ListName>();
  for (const [name, members] of byBare) {
    for (const guid of members) {
      const qualifier = data.blueprints.get(guid)?.qualifier;
      out.set(guid, members.length > 1 && qualifier !== undefined ? { name, qualifier } : { name });
    }
  }
  return out;
}
