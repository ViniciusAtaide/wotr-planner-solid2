import type { CheckedData } from '../load';
import { isShown, type Guid } from '../data';
import { buildGrantIndex, removes, type GrantIndex } from '../grants';
import { namedBlueprints, prerequisites } from '../prerequisites';

export interface LinkIndex {
  needs(guid: Guid): readonly Guid[];
  enables(guid: Guid): readonly Guid[];
}

const cache = new WeakMap<CheckedData, LinkIndex>();

export function linkIndex(data: CheckedData, G: GrantIndex = buildGrantIndex(data)): LinkIndex {
  const cached = cache.get(data);
  if (cached !== undefined) return cached;
  const shown = (g: Guid) => {
    const bp = data.blueprints.get(g);
    return bp !== undefined && isShown(bp);
  };
  const needs = new Map<Guid, Guid[]>();
  const requiredBy = new Map<Guid, Guid[]>();
  for (const bp of data.blueprints.values()) {
    if (!shown(bp.guid)) continue;
    const required = new Set(
      prerequisites(bp, data.blueprints)
        .filter((l) => l.polarity === 'requires')
        .flatMap(namedBlueprints),
    );
    needs.set(bp.guid, [...required].filter(shown));
    for (const r of required) {
      let list = requiredBy.get(r);
      if (list === undefined) requiredBy.set(r, (list = []));
      list.push(bp.guid);
    }
  }
  const index: LinkIndex = {
    needs: (guid) => needs.get(guid) ?? [],
    enables(guid) {
      const itselfAndWhatItGrants = [
        guid,
        ...G.grantsOf(guid)
          .filter((g) => !removes(g))
          .map((g) => g.granted),
      ];
      return [...new Set(itselfAndWhatItGrants.flatMap((v) => requiredBy.get(v) ?? []))].filter((g) => g !== guid);
    },
  };
  cache.set(data, index);
  return index;
}
