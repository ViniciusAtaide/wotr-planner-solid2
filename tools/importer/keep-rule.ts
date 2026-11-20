// The keep rule (guide §3 point 5, build tickets 02b, 02d and 02e): which held blueprints the importer writes, judged
// on their kept forms through G. tools/importer/filter.ts is the generic filter that makes those forms.
import type { CheckedData } from '~engine/data/load';
import { kindOf, references, type Guid, type Kind } from '~engine/data/types';
import { buildGrantIndex, removes } from '~engine/grants';

/**
 * The kinds of Grant carrier (map tickets 23 and 26, ADR 0005): buffs, abilities and toggles, held only because they
 * pass grants on to held facts. The keep rule (`keptSet`) decides which stay.
 */
const CARRIER_KINDS: ReadonlySet<Kind> = new Set<Kind>(['buffs', 'abilities', 'activatables']);

/**
 * The keep rule (guide §3 point 5, tickets 02b and 02d), over held blueprints' kept forms. A blueprint is kept for its
 * own sake when it isn't a Grant carrier and G reaches it from the root or from the Gear (the sourced items), or when
 * a kept blueprint's kept field names it (a spellbook, a table, a prerequisite's target, an item type), and so on. A
 * Grant carrier is named only by a strict reference (`strict`, KeepContext.names: the buff a BuffExtraEffects checks,
 * a toggle's buff), since every other field drops a carrier the planner doesn't hold. A Grant carrier is also kept
 * when it lies on a grant path from the root or the Gear to a blueprint kept for its own sake. A path goes through a
 * toggle into its buff (ActivatableBuff) only when that buff is kept: a Build keeps a toggle on only for the
 * BuffExtraEffects that checks its buff (a Shifter aspect, ADR 0005). The settings blueprints are named by
 * BlueprintRoot.
 */
export function keptSet(data: Pick<CheckedData, 'blueprints'>, strict: StrictNames): Set<Guid> {
  const G = buildGrantIndex(data);
  const isCarrier = (guid: Guid) => {
    const bp = data.blueprints.get(guid);
    return bp !== undefined && CARRIER_KINDS.has(kindOf[bp.$type]);
  };
  const reached = new Set<Guid>();
  const kept = new Set<Guid>();
  const queue: Guid[] = [];
  const keep = (guid: Guid) => {
    if (kept.has(guid)) return;
    kept.add(guid);
    queue.push(guid);
  };
  /**
   * What G's grants reach from `start`, keeping each blueprint reached that isn't a carrier, and each carrier that
   * grants something already kept: the loop below keeps a carrier when it looks at what the carrier grants, which may
   * have happened before the carrier was reached (through a toggle whose buff was kept later).
   */
  const reach = (start: Guid) => {
    const stack = [start];
    for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
      if (reached.has(next)) continue;
      reached.add(next);
      const grants = G.grantsOf(next).filter((g) => !removes(g));
      if (!isCarrier(next) || grants.some((g) => kept.has(g.granted))) keep(next);
      for (const g of grants) if (g.kind !== 'ActivatableBuff' || kept.has(g.granted)) stack.push(g.granted);
    }
  };
  for (const bp of data.blueprints.values())
    if (bp.$type === 'BlueprintRoot' || kindOf[bp.$type] === 'items') reach(bp.guid);
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    const bp = data.blueprints.get(next);
    const named = strict.get(next);
    if (bp !== undefined)
      for (const { guid: target } of references(bp))
        if (!isCarrier(target) || named?.has(target) === true) keep(target);
    // `next` is kept for its own sake or leads to such a blueprint, so a reached carrier that grants it lies on a grant
    // path to one. A kept buff a reached toggle applies is reached through it.
    for (const g of G.grantorsOf(next)) {
      if (!reached.has(g.grantor)) continue;
      if (isCarrier(g.grantor)) keep(g.grantor);
      if (g.kind === 'ActivatableBuff') reach(next);
    }
  }
  return kept;
}

/** What each held blueprint's strict references name (KeepContext.names). */
export type StrictNames = Map<Guid, ReadonlySet<Guid>>;
