import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { DataFile } from '../data/index.ts';

function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

export function readDataDir(root: string): { files: DataFile[]; overrides: DataFile[] } {
  const files: DataFile[] = [];
  const overrides: DataFile[] = [];
  for (const full of jsonFiles(root)) {
    const path = relative(root, full).split(sep).join('/');
    const file = { path, value: JSON.parse(readFileSync(full, 'utf8')) as unknown };
    (path.startsWith('overrides/') ? overrides : files).push(file);
  }
  return { files, overrides };
}
