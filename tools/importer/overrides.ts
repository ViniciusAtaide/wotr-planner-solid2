import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataFile } from '~engine/load';
import type { PatchOp } from '~engine/data';

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
      !Object.hasOwn(container, last)
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
