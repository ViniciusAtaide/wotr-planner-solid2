import type { CheckedData } from '../load';
import type { Build, GearPlace } from '../build';
import { enchantmentsOf, type Guid } from '../data';
import { buildGrantIndex, equipmentGrants, type GrantIndex } from '../grants';
import { bonusesOf, clashOf, highestOf, stackable, type StackClash, type StatBonus } from '../links';
import { walk } from '../walk';

function partsOf(data: CheckedData, G: GrantIndex, worn: Guid): Guid[] {
  const bp = data.blueprints.get(worn);
  return [
    ...(bp === undefined ? [] : enchantmentsOf(bp, data.blueprints)),
    ...equipmentGrants(data, G, worn).map((g) => g.granted),
  ];
}

export function gearClashIndex(
  data: CheckedData,
  build: Build,
  place: GearPlace,
  G: GrantIndex = buildGrantIndex(data),
): (item: Guid) => StackClash[] {
  const { [place]: _replaced, ...others } = build.gear ?? {};
  const unit = walk(data, { ...build, gear: others }, G).unit;
  const owners = new Map<Guid, Guid>();
  for (const worn of unit.worn.values()) for (const part of partsOf(data, G, worn)) owners.set(part, worn);
  for (const f of unit.facts()) if (!owners.has(f.blueprint)) owners.set(f.blueprint, f.blueprint);
  const held = new Map<string, Map<Guid, number | undefined>>();
  for (const [part, owner] of owners)
    for (const b of bonusesOf(data, part)) {
      if (stackable(b.descriptor)) continue;
      const key = `${b.stat} ${b.descriptor}`;
      const values = held.get(key) ?? new Map<Guid, number | undefined>();
      values.set(owner, values.has(owner) ? highestOf([values.get(owner), b.value]) : b.value);
      held.set(key, values);
    }
  return (item) => {
    const own = new Map<string, StatBonus>();
    for (const part of partsOf(data, G, item))
      for (const b of bonusesOf(data, part)) {
        const key = `${b.stat} ${b.descriptor}`;
        if (stackable(b.descriptor) || !held.has(key)) continue;
        const before = own.get(key);
        const value = before === undefined ? b.value : highestOf([before.value, b.value]);
        own.set(key, { stat: b.stat, descriptor: b.descriptor, ...(value !== undefined && { value }) });
      }
    return [...own].map(([key, b]): StackClash => {
      const values = held.get(key)!;
      return clashOf(b, [...values.keys()], highestOf([...values.values()]));
    });
  };
}

export function gearClashes(
  data: CheckedData,
  build: Build,
  place: GearPlace,
  item: Guid,
  G: GrantIndex = buildGrantIndex(data),
): StackClash[] {
  return gearClashIndex(data, build, place, G)(item);
}
