// Overrides (guide §3 point 6): the only way the game's data is corrected, one cited file per correction in
// data/overrides/. A patch is a list of JSON Patch operations (RFC 6902, `remove` and `replace` only) on the
// blueprint's dump JSON, applied before the filter, so its paths match what `show.mjs` prints.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataFile } from '~engine/data/load';
import type { PatchOp } from '~engine/data/types';

/** The override files under `dir` (data/overrides/), in file-name order, as the loader takes them. */
export function readOverrides(dir: string): DataFile[] {
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
  return names.sort().map((n) => ({ path: `overrides/${n}`, value: JSON.parse(readFileSync(join(dir, n), 'utf8')) }));
}

function decode(token: string): string {
  return token.replaceAll('~1', '/').replaceAll('~0', '~');
}

/** A copy of `json` with the operations applied. A path that doesn't resolve is a problem, and the op is skipped. */
export function applyPatch(
  json: Record<string, unknown>,
  ops: readonly PatchOp[],
  at: string,
  problems: string[],
): Record<string, unknown> {
  const copy = structuredClone(json);
  for (const { op, path, value } of ops) {
    const tokens = path.split('/').slice(1).map(decode);
    const last = tokens.pop();
    let parent: unknown = copy;
    for (const t of tokens) parent = (parent as Record<string, unknown> | undefined)?.[t];
    const container = parent as Record<string, unknown> | unknown[] | undefined;
    if (
      !path.startsWith('/') ||
      last === undefined ||
      container === null ||
      typeof container !== 'object' ||
      !(last in container)
    ) {
      problems.push(`${at}: override path ${path} doesn't resolve`);
      continue;
    }
    if (op === 'remove') {
      if (Array.isArray(container)) container.splice(Number(last), 1);
      else delete container[last];
    } else (container as Record<string, unknown>)[last] = value;
  }
  return copy;
}
