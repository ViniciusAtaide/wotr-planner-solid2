// Synergy links, the prerequisite-chain kind (map 09; build ticket 05): "this needs" and "this enables", read from P
// and G. A blueprint needs what its prerequisites require; it enables every blueprint that requires it, or requires
// something it grants. The other link kinds come in ticket 06.
import type { CheckedData } from './data/load';
import { isShown, type Guid } from './data/types';
import { buildGrantIndex, removes, type GrantIndex } from './grants';
import { namedBlueprints, prerequisites } from './prerequisites';

export interface LinkIndex {
  /** The shown blueprints `guid`'s prerequisites require. */
  needs(guid: Guid): readonly Guid[];
  /** The shown blueprints that require `guid`, or require something it grants. */
  enables(guid: Guid): readonly Guid[];
}

const cache = new WeakMap<CheckedData, LinkIndex>();

/** The chain links of every blueprint, built once per data. */
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
      // What requires it, or requires a fact it grants (G's grants, removals left out).
      const via = [
        guid,
        ...G.grantsOf(guid)
          .filter((g) => !removes(g))
          .map((g) => g.granted),
      ];
      return [...new Set(via.flatMap((v) => requiredBy.get(v) ?? []))].filter((g) => g !== guid);
    },
  };
  cache.set(data, index);
  return index;
}
