import { byName, sortKeys } from './util';
import { PART_FIELDS, partsOf } from './items';
import { isShown, kindOf, refGuid, type Blueprint, type Guid } from './types';

export function equippableItems(blueprints: ReadonlyMap<Guid, Blueprint>): Blueprint[] {
  const parts = itemPartSet(blueprints);
  return [...blueprints.values()].filter((b) => kindOf[b.$type] === 'items' && isShown(b) && !parts.has(b.guid));
}

const partSets = new WeakMap<ReadonlyMap<Guid, Blueprint>, ReadonlySet<Guid>>();

export function itemPartSet(blueprints: ReadonlyMap<Guid, Blueprint>): ReadonlySet<Guid> {
  let set = partSets.get(blueprints);
  if (set === undefined) {
    const items = [...blueprints.values()].filter((b) => kindOf[b.$type] === 'items');
    const shieldHalves = items.filter(
      (b) =>
        b.$type === 'BlueprintItemArmor' && blueprints.get(refGuid(b.m_Type) ?? '')?.$type === 'BlueprintShieldType',
    );
    set = new Set([...items.flatMap(partsOf), ...shieldHalves.map((b) => b.guid)]);
    partSets.set(blueprints, set);
  }
  return set;
}

export function deriveTwins(blueprints: ReadonlyMap<Guid, Blueprint>): Map<Guid, Guid> {
  const twinKeyCache = new Map<string, string>();
  const twinKey = (item: Blueprint, asPart = false): string => {
    const cacheKey = `${item.guid}${asPart ? ' part' : ''}`;
    let key = twinKeyCache.get(cacheKey);
    if (key !== undefined) return key;
    const value: Record<string, unknown> = { ...item, guid: undefined, assetName: undefined };
    if (asPart) value.name = undefined;
    for (const f of PART_FIELDS) {
      const part = refGuid(value[f]);
      const partBp = part === undefined || part === item.guid ? undefined : blueprints.get(part);
      if (partBp !== undefined) value[f] = twinKey(partBp, true);
    }
    key = JSON.stringify(sortKeys(value));
    twinKeyCache.set(cacheKey, key);
    return key;
  };

  const twins = new Map<Guid, Guid>();
  for (const group of byName(equippableItems(blueprints), (item) => item.name).values()) {
    if (group.length < 2) continue;
    const offered = new Map<string, Guid>();
    for (const item of group.sort((a, b) => (a.guid < b.guid ? -1 : 1))) {
      const key = twinKey(item);
      const first = offered.get(key);
      if (first === undefined) offered.set(key, item.guid);
      else twins.set(item.guid, first);
    }
  }
  return twins;
}
