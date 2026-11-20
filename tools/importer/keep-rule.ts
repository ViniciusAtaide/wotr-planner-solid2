import type { CheckedData } from '~engine/load';
import { kindOf, references, type Guid, type Kind } from '~engine/data';
import { buildGrantIndex, removes } from '~engine/grants';

const CARRIER_KINDS: ReadonlySet<Kind> = new Set<Kind>(['buffs', 'abilities', 'activatables']);

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
    for (const g of G.grantorsOf(next)) {
      if (!reached.has(g.grantor)) continue;
      if (isCarrier(g.grantor)) keep(g.grantor);
      if (g.kind === 'ActivatableBuff') reach(next);
    }
  }
  return kept;
}

export type StrictNames = Map<Guid, ReadonlySet<Guid>>;
