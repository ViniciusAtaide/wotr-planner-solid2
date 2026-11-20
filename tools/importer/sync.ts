// Server side only: compares the importer's files with data/ and applies the difference. The importer owns each kind's
// folder and report.md; data/overrides/ is hand-kept and never touched here.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { kindOf } from '~engine/data/types';

const OWNED_FOLDERS = [...new Set(Object.values(kindOf))];
const OWNED_FILES = ['report.md'];

export interface DataDiff {
  /** Paths whose content is new or changed. */
  readonly write: readonly string[];
  /** Paths the importer owns that it no longer produces. */
  readonly remove: readonly string[];
}

function readOrUndefined(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

function owned(dataDir: string): string[] {
  const paths = [...OWNED_FILES];
  for (const folder of OWNED_FOLDERS) {
    let names: string[] = [];
    try {
      names = readdirSync(join(dataDir, folder));
    } catch {
      continue;
    }
    for (const name of names) paths.push(`${folder}/${name}`);
  }
  return paths;
}

export function diffData(dataDir: string, files: ReadonlyMap<string, string>): DataDiff {
  const write = [...files]
    .filter(([path, content]) => readOrUndefined(join(dataDir, path)) !== content)
    .map(([p]) => p);
  const remove = owned(dataDir).filter((p) => !files.has(p) && readOrUndefined(join(dataDir, p)) !== undefined);
  return { write: write.sort(), remove: remove.sort() };
}

export function applyDiff(dataDir: string, files: ReadonlyMap<string, string>, diff: DataDiff): void {
  for (const path of diff.write) {
    const full = join(dataDir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, files.get(path)!);
  }
  for (const path of diff.remove) rmSync(join(dataDir, path));
}
