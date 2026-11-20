// Print the tree of what refers to a blueprint in the raw dump: bun scripts/dump/referrer-tree.mjs <guid|name> [depth]
// Follows the back-reference table (chunk 33/1) upward, and stops at classes, races and the root, or at `depth` steps
// (default 4). Each line is one referrer: indentation shows the step, then `<name> <guid> <type>`. A reference isn't
// always a grant (a prerequisite or a check refers too), so read each step's blueprint with show.mjs to see which
// field it is. G answers "who grants X?" from the imported data.
import { backReferences, blueprints } from './reader.mjs';

const path = process.env.DUMP ?? new URL('../../blueprints/blueprints_raw_2.7.0x_0.binz', import.meta.url).pathname;
const [wanted, depthArg] = process.argv.slice(2);
if (wanted === undefined) {
  console.error('usage: bun scripts/dump/referrer-tree.mjs <guid|name> [depth]');
  process.exit(2);
}
const depth = Number(depthArg ?? 4);
const STOP = new Set(['BlueprintCharacterClass', 'BlueprintRace', 'BlueprintRoot']);

const byGuid = new Map();
for await (const r of blueprints(path))
  byGuid.set(r.guid, { name: r.name, type: r.type.slice(r.type.lastIndexOf('.') + 1) });
const referrersOf = new Map();
for await (const { guid, referrers } of backReferences(path)) referrersOf.set(guid, referrers);

const start = [...byGuid].find(([g, b]) => g === wanted || b.name === wanted)?.[0];
if (start === undefined) {
  console.error(`no blueprint with GUID or name: ${wanted}`);
  process.exit(1);
}
const line = (g) => `${byGuid.get(g)?.name ?? '<missing>'} ${g} ${byGuid.get(g)?.type ?? ''}`;
console.log(line(start));
const seen = new Set([start]);
const walk = (g, level) => {
  if (level > depth) return;
  for (const r of referrersOf.get(g) ?? []) {
    if (seen.has(r)) continue;
    seen.add(r);
    console.log(`${'  '.repeat(level)}${line(r)}`);
    if (!STOP.has(byGuid.get(r)?.type)) walk(r, level + 1);
  }
};
walk(start, 1);
