// The importer's grantor check (guide §3 point 8; ticket 02): every prerequisite leaf on a blueprint a Build can reach
// names facts, classes and archetypes that G finds a grantor for, or the leaf is in the report with a reason from
// `noGrantor`. It reads prerequisites through P and grants through G, so it gives the same answer the engine will.
import type { CheckedData } from '~engine/data/load';
import { isShown, type Guid } from '~engine/data/types';
import { buildGrantIndex, reachableFromGear, reachableFromRoot, type GrantIndex } from '~engine/grants';
import { namedBlueprints, prerequisites } from '~engine/prerequisites';
import { noGrantor } from './no-grantor';
import { unreachable as unreachableReasons } from './unreachable';

export interface GrantorFinding {
  /** The fact, class or archetype no grantor gives. */
  readonly fact: Guid;
  /** The reachable blueprints whose requiring leaves name it. */
  readonly neededBy: readonly Guid[];
  /** The cited reason, or `undefined` when none is kept (an import problem). */
  readonly reason: string | undefined;
}

export interface GrantorCheck {
  readonly G: GrantIndex;
  readonly findings: readonly GrantorFinding[];
  /**
   * Facts a leaf on a reachable blueprint names that no Build can reach, from the root or through its Gear (ticket
   * 02b), with the reason from no-grantor.ts or unreachable.ts, or `undefined` when neither lists it.
   */
  readonly unreachable: readonly GrantorFinding[];
  /**
   * Facts a leaf names that a player never sees (nameless or hidden, `isShown`) and whose climb through G finds no
   * shown grantor (map ticket 19 words them by asset name).
   */
  readonly namelessWithoutNamedGrantor: readonly { readonly fact: Guid; readonly neededBy: readonly Guid[] }[];
}

export function checkGrantors(data: CheckedData): GrantorCheck {
  const G = buildGrantIndex(data);
  const reachable = reachableFromRoot(data, G);
  const gear = reachableFromGear(data, G);
  const missing = new Map<Guid, Set<Guid>>();
  const unreached = new Map<Guid, Set<Guid>>();
  const nameless = new Map<Guid, Set<Guid>>();
  const note = (map: Map<Guid, Set<Guid>>, fact: Guid, by: Guid) => {
    let set = map.get(fact);
    if (set === undefined) map.set(fact, (set = new Set()));
    set.add(by);
  };
  for (const guid of reachable) {
    const bp = data.blueprints.get(guid);
    if (bp === undefined) continue;
    for (const leaf of prerequisites(bp, data.blueprints)) {
      for (const fact of namedBlueprints(leaf)) {
        if (leaf.polarity === 'requires' && G.grantorsOf(fact).length === 0) note(missing, fact, guid);
        if (!reachable.has(fact) && !gear.has(fact)) note(unreached, fact, guid);
        const target = data.blueprints.get(fact);
        if (target !== undefined && !isShown(target) && G.namedGrantorsByKind(fact).size === 0) {
          note(nameless, fact, guid);
        }
      }
    }
  }
  const sorted = <T>(m: Map<Guid, Set<Guid>>, f: (fact: Guid, by: Guid[]) => T) =>
    [...m].sort(([a], [b]) => (a < b ? -1 : 1)).map(([fact, by]) => f(fact, [...by].sort()));
  return {
    G,
    findings: sorted(missing, (fact, neededBy) => ({ fact, neededBy, reason: noGrantor.get(fact) })),
    unreachable: sorted(unreached, (fact, neededBy) => ({
      fact,
      neededBy,
      reason: noGrantor.get(fact) ?? unreachableReasons.get(fact),
    })),
    namelessWithoutNamedGrantor: sorted(nameless, (fact, neededBy) => ({ fact, neededBy })),
  };
}
