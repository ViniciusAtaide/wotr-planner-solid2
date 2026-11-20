import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runImport } from './import';
import { readOverrides } from './overrides';
import { applyDiff, diffData } from './sync';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const DATA = `${repo}data`;
const DUMP = process.env.DUMP ?? `${repo}blueprints/blueprints_raw_2.7.0x_0.binz`;

const SHOWN = Number(process.env.SHOWN ?? 40);

export async function main(args: readonly string[]): Promise<number> {
  const check = args.includes('--check');
  if (!existsSync(DUMP)) {
    if (check) {
      console.log(`import check skipped: no dump at ${DUMP}`);
      return 0;
    }
    console.error(`no dump at ${DUMP}`);
    return 1;
  }

  const { files, problems } = await runImport(DUMP, readOverrides(`${DATA}/overrides`));
  if (problems.length > 0) {
    console.error(`the import failed ${problems.length} check(s); data/ is unchanged:`);
    for (const p of problems.slice(0, SHOWN)) console.error(`- ${p}`);
    if (problems.length > SHOWN) console.error(`… and ${problems.length - SHOWN} more`);
    return 1;
  }

  const diff = diffData(DATA, files);
  const changes = diff.write.length + diff.remove.length;
  if (check) {
    if (changes === 0) {
      console.log(`import check passed: ${files.size} files, data/ is up to date`);
      return 0;
    }
    console.error(
      `data/ differs from a fresh import (${diff.write.length} to write, ${diff.remove.length} to remove):`,
    );
    for (const p of [...diff.write, ...diff.remove].slice(0, SHOWN)) console.error(`- ${p}`);
    console.error('run `bun run import` and review the diff');
    return 1;
  }
  applyDiff(DATA, files, diff);
  console.log(`imported ${files.size} files: ${diff.write.length} written, ${diff.remove.length} removed`);
  return 0;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
