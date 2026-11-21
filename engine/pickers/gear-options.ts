import type { CheckedData } from '../load';
import type { GearPlace } from '../build';
import { equippableItems, type Blueprint } from '../data';
import { PLACE_ITEM_TYPES } from '../walk';

const lists = new WeakMap<CheckedData, Map<GearPlace, readonly Blueprint[]>>();

export function gearOptions(data: CheckedData, place: GearPlace): readonly Blueprint[] {
  let byPlace = lists.get(data);
  if (byPlace === undefined) lists.set(data, (byPlace = new Map()));
  const known = byPlace.get(place);
  if (known !== undefined) return known;
  const types: readonly string[] = PLACE_ITEM_TYPES[place];
  const made = equippableItems(data.blueprints)
    .filter((bp) => types.includes(bp.$type) && !data.twins.has(bp.guid))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') || a.guid.localeCompare(b.guid));
  byPlace.set(place, made);
  return made;
}
