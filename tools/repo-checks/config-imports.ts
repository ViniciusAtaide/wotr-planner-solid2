import { posix } from 'node:path';
import { parseSync } from 'oxc-parser';

export const CONFIG = 'vite.config.ts';

const HAS_EXTENSION = /\.(?:ts|tsx|mts|js|mjs)$/;

function runtimeSpecifiers(path: string, text: string): string[] {
  const { module } = parseSync(path, text);
  const out: string[] = [];
  for (const i of module.staticImports) {
    if (i.entries.length > 0 && i.entries.every((e) => e.isType)) continue;
    out.push(i.moduleRequest.value);
  }
  for (const e of module.staticExports) {
    for (const entry of e.entries)
      if (entry.moduleRequest !== null && !entry.isType) out.push(entry.moduleRequest.value);
  }
  return out;
}

export function configImportProblems(read: (path: string) => string | undefined, root = CONFIG): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const queue = [root];
  for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
    if (seen.has(path)) continue;
    seen.add(path);
    const text = read(path);
    if (text === undefined) continue;
    for (const specifier of new Set(runtimeSpecifiers(path, text))) {
      if (specifier.startsWith('~')) {
        problems.push(
          `${path}: import '${specifier}': [config-import] ${root} loads natively, so path aliases don't resolve`,
        );
      } else if (specifier.startsWith('.')) {
        if (!HAS_EXTENSION.test(specifier)) {
          problems.push(
            `${path}: import '${specifier}': [config-import] needs its file extension, since ${root} loads natively`,
          );
        } else queue.push(posix.normalize(posix.join(posix.dirname(path), specifier)));
      }
    }
  }
  return problems;
}
