// Gear's twins (map ticket 29's rule 1, as amended after the review of tickets 02 and 03): items a Build can equip that
// share a display name and whose kept fields are all equal, apart from GUID and asset name, are one choice. The
// pickers offer the lowest GUID among them; the others decode to it in a Build code. A part (a shield's armour half or
// bash weapon, a double weapon's second end) is compared without its name too, since it is never shown on its own.
// Twins are a derived view, so the loader computes them and data/ never stores them (guide §3.4).
import { byName, sortKeys } from '../util';
import { PART_FIELDS, partsOf } from './items';
import { isShown, kindOf, refGuid, type Blueprint, type Guid } from './types';

/** The items a Build can equip: every shown item that isn't worn only as part of another. */
export function equippableItems(blueprints: ReadonlyMap<Guid, Blueprint>): Blueprint[] {
  const items = [...blueprints.values()].filter((b) => kindOf[b.$type] === 'items');
  const parts = new Set(items.flatMap(partsOf));
  return items.filter((b) => isShown(b) && !parts.has(b.guid));
}

/** Each twin, with the item the pickers offer in its place: the lowest GUID among the twins. */
export function deriveTwins(blueprints: ReadonlyMap<Guid, Blueprint>): Map<Guid, Guid> {
  const keys = new Map<string, string>();
  /** An item as rule 1 compares it; `asPart` leaves its name out too. */
  const twinKey = (item: Blueprint, asPart = false): string => {
    const cacheKey = `${item.guid}${asPart ? ' part' : ''}`;
    let key = keys.get(cacheKey);
    if (key !== undefined) return key;
    const value: Record<string, unknown> = { ...item, guid: undefined, assetName: undefined };
    if (asPart) value.name = undefined;
    for (const f of PART_FIELDS) {
      const part = refGuid(value[f]);
      const partBp = part === undefined || part === item.guid ? undefined : blueprints.get(part);
      if (partBp !== undefined) value[f] = twinKey(partBp, true);
    }
    key = JSON.stringify(sortKeys(value));
    keys.set(cacheKey, key);
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
