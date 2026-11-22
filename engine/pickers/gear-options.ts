import { blueprintRoot, type CheckedData } from '../load';
import type { GearPlace } from '../build';
import { equippableItems, refGuid, type Blueprint, type Guid, type Ref } from '../data';
import { PLACE_ITEM_TYPES } from '../walk';

const lists = new WeakMap<CheckedData, Map<GearPlace, readonly Blueprint[]>>();

function playerClasses(data: CheckedData): ReadonlySet<Guid> {
  const root = blueprintRoot(data)?.Progression;
  return new Set(
    [...(root?.m_CharacterClasses ?? []), ...(root?.m_CharacterMythics ?? [])].flatMap((r) => refGuid(r) ?? []),
  );
}

function forOthersOnly(item: Blueprint, players: ReadonlySet<Guid>): boolean {
  return item.Components.some((c) => {
    const r = c as unknown as { $type: string; Not?: boolean; m_Class?: Ref; m_Classes?: readonly Ref[] };
    if (r.Not === true) return false;
    if (r.$type !== 'EquipmentRestrictionClass' && r.$type !== 'EquipmentRestrictionHasAnyClassFromList') return false;
    const classes = [r.m_Class, ...(r.m_Classes ?? [])].flatMap((ref) => refGuid(ref ?? null) ?? []);
    return classes.length > 0 && !classes.some((g) => players.has(g));
  });
}

export function gearOptions(data: CheckedData, place: GearPlace): readonly Blueprint[] {
  let byPlace = lists.get(data);
  if (byPlace === undefined) lists.set(data, (byPlace = new Map()));
  const known = byPlace.get(place);
  if (known !== undefined) return known;
  const types: readonly string[] = PLACE_ITEM_TYPES[place];
  const players = playerClasses(data);
  const made = equippableItems(data.blueprints)
    .filter((bp) => types.includes(bp.$type) && !data.twins.has(bp.guid) && !forOthersOnly(bp, players))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') || a.guid.localeCompare(b.guid));
  byPlace.set(place, made);
  return made;
}
