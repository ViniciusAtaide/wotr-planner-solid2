import type { Build, GearPlace } from '~engine/build';
import type { Guid } from '~engine/data';
import { stackWords, type StackClash } from '~engine/links';
import type { Engine } from '~engine/mcp';
import { gearClashIndex } from '~engine/pickers';

type ClashIndex = (item: Guid) => readonly StackClash[];

const indexes = new WeakMap<Build, Map<GearPlace, ClashIndex>>();
const worded = new WeakMap<Build, Map<string, readonly string[]>>();

function indexOf(engine: Engine, build: Build, place: GearPlace): ClashIndex {
  let byPlace = indexes.get(build);
  if (byPlace === undefined) indexes.set(build, (byPlace = new Map()));
  let index = byPlace.get(place);
  if (index === undefined) byPlace.set(place, (index = gearClashIndex(engine.data, build, place, engine.G)));
  return index;
}

export function clashWords(engine: Engine, build: Build, place: GearPlace, item: Guid): readonly string[] {
  let byKey = worded.get(build);
  if (byKey === undefined) worded.set(build, (byKey = new Map()));
  const key = `${place} ${item}`;
  const cached = byKey.get(key);
  if (cached !== undefined) return cached;
  const words = indexOf(engine, build, place)(item).map((c) => `${stackWords(engine.data, c)}.`);
  byKey.set(key, words);
  return words;
}
