import type { CheckedData } from '../load';
import type { Build, GearPlace } from '../build';
import { enchantmentsOf, type Guid } from '../data';
import { buildGrantIndex, equipmentGrants, type GrantIndex } from '../grants';
import { bonusesOf, stackable, type StackClash } from '../links';
import { walk } from '../walk';

export function gearClashes(
  data: CheckedData,
  build: Build,
  place: GearPlace,
  item: Guid,
  G: GrantIndex = buildGrantIndex(data),
): StackClash[] {
  const { [place]: _replaced, ...others } = build.gear ?? {};
  const unit = walk(data, { ...build, gear: others }, G).unit;
  const partsOf = (worn: Guid) => {
    const bp = data.blueprints.get(worn);
    return [
      ...(bp === undefined ? [] : enchantmentsOf(bp, data.blueprints)),
      ...equipmentGrants(data, G, worn).map((g) => g.granted),
    ];
  };
  const owners = new Map<Guid, Guid>();
  for (const worn of unit.worn.values()) for (const part of partsOf(worn)) owners.set(part, worn);
  for (const f of unit.facts()) if (!owners.has(f.blueprint)) owners.set(f.blueprint, f.blueprint);
  const held = new Map<string, Guid[]>();
  for (const [part, owner] of owners)
    for (const b of bonusesOf(data, part)) {
      if (stackable(b.descriptor)) continue;
      const key = `${b.stat} ${b.descriptor}`;
      const list = held.get(key) ?? [];
      if (!list.includes(owner)) held.set(key, [...list, owner]);
    }
  const clashes: StackClash[] = [];
  const seen = new Set<string>();
  for (const part of partsOf(item))
    for (const b of bonusesOf(data, part)) {
      const key = `${b.stat} ${b.descriptor}`;
      const by = held.get(key);
      if (stackable(b.descriptor) || by === undefined || seen.has(key)) continue;
      seen.add(key);
      clashes.push({ stat: b.stat, descriptor: b.descriptor, with: by });
    }
  return clashes;
}
