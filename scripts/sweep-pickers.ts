// The pickers' sweep (build ticket 04): at every slot of both gold builds, every option's picker status must equal
// what the walk says when the Build takes that option there (pickers.ts walkVerdict). Run it whenever W changes:
//   bun scripts/sweep-pickers.ts [<gold name prefix>] [<slot filter substring>]
// It prints each disagreement and a count, and exits 1 when there is any. `bun run check` runs a sample of it
// (engine/pickers.agree.test.ts); this runs every option, which takes minutes.
import { fileURLToPath } from 'node:url';
import { placeKey, slotKey } from '../engine/build';
import { loadData } from '../engine/data/load';
import { readDataDir } from '../engine/data/read-dir';
import { enforcer } from '../engine/gold/enforcer';
import { jackInTheGreen } from '../engine/gold/jack-in-the-green';
import { buildGrantIndex } from '../engine/grants';
import { picker, walkVerdict } from '../engine/pickers';
import { walk } from '../engine/walk/walk';

export function main(args: readonly string[]): number {
  const [only, slotFilter] = args;
  const files = readDataDir(fileURLToPath(new URL('../data', import.meta.url)));
  const data = loadData(files.files, files.overrides);
  const G = buildGrantIndex(data);
  let options = 0;
  let disagreements = 0;
  for (const gold of [jackInTheGreen, enforcer]) {
    if (only !== undefined && !gold.name.startsWith(only)) continue;
    const started = Date.now();
    for (const opened of walk(data, gold.build, G).slots) {
      if (slotFilter !== undefined && !slotKey(opened.id).includes(slotFilter)) continue;
      const p = picker(data, gold.build, opened.id, G);
      if (p === undefined) {
        console.log(`${gold.name} ${slotKey(opened.id)}: the picker finds no such slot`);
        disagreements++;
        continue;
      }
      for (const o of p.options) {
        options++;
        const verdict = walkVerdict(data, gold.build, opened.id, o, G);
        if ((verdict === undefined) !== (o.closed === undefined)) {
          disagreements++;
          const name = data.blueprints.get(o.feature)?.assetName ?? o.feature;
          console.log(
            `${gold.name} ${placeKey(opened.id.place)} ${data.blueprints.get(opened.id.selection)?.assetName}#${opened.id.index} ${name}${o.param ? ` ${JSON.stringify(o.param)}` : ''}: picker ${o.closed?.rule ?? 'open'}, walk ${verdict?.rule ?? 'open'}`,
          );
        }
      }
    }
    console.log(`${gold.name}: done in ${Math.round((Date.now() - started) / 1000)} s`);
  }
  console.log(`${options} options, ${disagreements} disagreements`);
  return disagreements === 0 ? 0 : 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
