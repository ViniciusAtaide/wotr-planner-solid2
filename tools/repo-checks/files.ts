import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SourceFile {
  readonly path: string;
  readonly text: string;
}

export const CODE = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
export const STYLE = /\.css$/;

const NOT_OWNED = ['data/', 'decompiled/', 'blueprints/', 'dist/', 'node_modules/', '.scratch/'];

export function ownedFiles(repo: string, wanted: RegExp): SourceFile[] {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: repo,
    encoding: 'utf8',
  });
  return listed
    .split('\n')
    .filter((path) => wanted.test(path) && !NOT_OWNED.some((dir) => path.startsWith(dir)))
    .filter((path) => existsSync(join(repo, path)))
    .sort()
    .map((path) => ({ path, text: readFileSync(join(repo, path), 'utf8') }));
}
