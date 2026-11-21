import type { CheckedData } from '../load';
import { bareName, guids, refGuid, type Blueprint, type Component, type Guid } from '../data';
import { bareNameOf, familyOf } from '../refusals';

export { bareName };

export interface ListName {
  readonly name: string;
  readonly qualifier?: string;
}

function prerequisiteQualifier(data: CheckedData, bp: Blueprint): string | undefined {
  const of = (type: string) =>
    bp.Components.find((c) => c.$type === type) as (Component & Record<string, unknown>) | undefined;
  const archetype = refGuid(of('PrerequisiteArchetypeLevel')?.m_Archetype);
  if (archetype !== undefined) return bareNameOf(data, archetype);
  const feature = refGuid(of('PrerequisiteFeature')?.m_Feature);
  if (feature !== undefined) return bareNameOf(data, feature);
  const list = of('PrerequisiteFeaturesFromList');
  if (list === undefined) return undefined;
  const names = [...new Set(guids(list.m_Features as readonly unknown[]).map((g) => bareNameOf(data, g)))];
  return names.length === 1 ? names[0] : familyOf(names);
}

function partsAll(qualifiers: readonly (string | undefined)[]): boolean {
  const named = qualifiers.filter((q): q is string => q !== undefined);
  return qualifiers.length - named.length <= 1 && new Set(named).size === named.length;
}

function qualifiersOf(data: CheckedData, members: readonly Guid[]): readonly (string | undefined)[] {
  const own = members.map((g) => data.blueprints.get(g)?.qualifier);
  if (partsAll(own)) return own;
  const fromPrerequisites = members.map((g, i) => {
    const bp = data.blueprints.get(g);
    return own[i] ?? (bp === undefined ? undefined : prerequisiteQualifier(data, bp));
  });
  return partsAll(fromPrerequisites) ? fromPrerequisites : own;
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
    const qualifiers = members.length > 1 ? qualifiersOf(data, members) : [];
    members.forEach((guid, i) => {
      const qualifier = qualifiers[i];
      out.set(guid, qualifier !== undefined ? { name, qualifier } : { name });
    });
  }
  return out;
}
