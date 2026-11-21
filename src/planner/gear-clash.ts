import type { Build, GearPlace } from '~engine/build';
import type { Guid } from '~engine/data';
import { stackWords } from '~engine/links';
import type { Engine } from '~engine/mcp';
import { gearClashes } from '~engine/pickers';

const known = new WeakMap<Build, Map<string, readonly string[]>>();

function cacheOf(build: Build): Map<string, readonly string[]> {
  let map = known.get(build);
  if (map === undefined) known.set(build, (map = new Map()));
  return map;
}

export function knownClashes(build: Build, place: GearPlace, item: Guid): readonly string[] | undefined {
  return known.get(build)?.get(`${place} ${item}`);
}

export function clashWords(engine: Engine, build: Build, place: GearPlace, item: Guid): readonly string[] {
  const map = cacheOf(build);
  const key = `${place} ${item}`;
  const cached = map.get(key);
  if (cached !== undefined) return cached;
  const words = gearClashes(engine.data, build, place, item, engine.G).map((c) => `${stackWords(engine.data, c)}.`);
  map.set(key, words);
  return words;
}

export function fillClashes(
  engine: Engine,
  build: Build,
  place: GearPlace,
  items: readonly Guid[],
  done: () => void,
): () => void {
  let stopped = false;
  let at = 0;
  const next = () => {
    if (stopped) return;
    while (at < items.length && knownClashes(build, place, items[at] as Guid) !== undefined) at += 1;
    if (at >= items.length) return;
    clashWords(engine, build, place, items[at] as Guid);
    at += 1;
    done();
    setTimeout(next, 0);
  };
  setTimeout(next, 0);
  return () => {
    stopped = true;
  };
}
