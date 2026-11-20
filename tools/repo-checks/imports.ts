import { posix } from 'node:path';
import { parseSync } from 'oxc-parser';
import { APP_LAYER, BANNED_PACKAGES, FEATURES, LAYER_DEPS, type Feature } from './features';
import type { SourceFile } from './files';

export interface Declared {
  readonly features: readonly Feature[];
  readonly app: readonly string[];
}

const DEFAULT: Declared = { features: FEATURES, app: APP_LAYER };

const RESOLVE_SUFFIXES = ['', '.ts', '.tsx', '.mts', '.mjs', '.js', '/index.ts', '/index.tsx'];

export function specifiersOf(file: SourceFile): string[] {
  const { module } = parseSync(file.path, file.text);
  const out: string[] = [];
  for (const i of module.staticImports) out.push(i.moduleRequest.value);
  for (const e of module.staticExports) {
    for (const entry of e.entries) if (entry.moduleRequest !== null) out.push(entry.moduleRequest.value);
  }
  for (const d of module.dynamicImports) {
    const literal = /^(['"`])([^'"`]*)\1$/.exec(file.text.slice(d.moduleRequest.start, d.moduleRequest.end));
    if (literal !== null) out.push(literal[2]);
  }
  return out;
}

function ownerOf(path: string, declared: Declared): Feature | 'app' | undefined {
  const feature = declared.features.find((f) => path.startsWith(`${f.path}/`));
  if (feature !== undefined) return feature;
  return declared.app.some((a) => (a.endsWith('/') ? path.startsWith(a) : path === a)) ? 'app' : undefined;
}

function isBanned(specifier: string, banned: readonly string[]): boolean {
  return banned.some((b) =>
    b.endsWith('/') || b.endsWith(':') ? specifier.startsWith(b) : specifier === b || specifier.startsWith(`${b}/`),
  );
}

function localTarget(from: string, specifier: string): string | undefined {
  if (specifier.startsWith('.')) return posix.normalize(posix.join(posix.dirname(from), specifier));
  if (specifier.startsWith('~engine/')) return `engine/${specifier.slice('~engine/'.length)}`;
  return undefined;
}

function cycleIn(features: readonly Feature[]): string[] | undefined {
  const byPath = new Map(features.map((f) => [f.path, f]));
  const state = new Map<string, 'open' | 'done'>();
  const stack: string[] = [];
  const visit = (path: string): string[] | undefined => {
    if (state.get(path) === 'done') return undefined;
    if (state.get(path) === 'open') return [...stack.slice(stack.indexOf(path)), path];
    state.set(path, 'open');
    stack.push(path);
    for (const dep of byPath.get(path)?.deps ?? []) {
      const cycle = visit(dep);
      if (cycle !== undefined) return cycle;
    }
    stack.pop();
    state.set(path, 'done');
    return undefined;
  };
  for (const f of features) {
    const cycle = visit(f.path);
    if (cycle !== undefined) return cycle;
  }
  return undefined;
}

export function declarationProblems(declared: Declared, present: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const byPath = new Map(declared.features.map((f) => [f.path, f]));
  for (const f of declared.features) {
    if (!present.has(`${f.path}/index.ts`)) problems.push(`${f.path}: [feature-entry] the feature has no index.ts`);
    if (!present.has(`${f.path}/README.md`)) problems.push(`${f.path}: [feature-readme] the feature has no README.md`);
    for (const dep of f.deps) {
      const target = byPath.get(dep);
      if (target === undefined) problems.push(`${f.path}: [dag-unknown] declares a dependency on ${dep}, no feature`);
      else if (!LAYER_DEPS[f.layer].includes(target.layer)) {
        problems.push(`${f.path}: [layer] a ${f.layer} feature may not depend on ${dep}, a ${target.layer} feature`);
      }
    }
  }
  const cycle = cycleIn(declared.features);
  if (cycle !== undefined) problems.push(`[dag-cycle] the declared dependencies form a cycle: ${cycle.join(' → ')}`);
  return problems;
}

export function importProblems(
  files: readonly SourceFile[],
  present: ReadonlySet<string>,
  declared = DEFAULT,
): string[] {
  const problems = declarationProblems(declared, present);
  const used = new Set<string>();
  const resolve = (base: string) => RESOLVE_SUFFIXES.map((s) => base + s).find((p) => present.has(p));
  for (const file of files) {
    const owner = ownerOf(file.path, declared);
    if (owner === undefined) {
      problems.push(
        `${file.path}: [feature-owner] the file belongs to no declared feature and is not in the app layer`,
      );
      continue;
    }
    for (const specifier of specifiersOf(file)) {
      const say = (rule: string, what: string) =>
        problems.push(`${file.path}: import '${specifier}': [${rule}] ${what}`);
      const base = localTarget(file.path, specifier);
      if (base === undefined) {
        if (owner !== 'app' && isBanned(specifier, BANNED_PACKAGES[owner.layer])) {
          say('banned-package', `a ${owner.layer} feature may not import this package`);
        }
        continue;
      }
      const target = resolve(base);
      if (target === undefined) {
        say('unresolved', 'the import names no file in the repo');
        continue;
      }
      const targetOwner = ownerOf(target, declared);
      if (targetOwner === owner) continue;
      if (targetOwner === undefined) {
        say('feature-owner', `${target} belongs to no declared feature`);
        continue;
      }
      if (targetOwner === 'app') {
        say('app-import', `features may not import the app layer (${target})`);
        continue;
      }
      if (target !== `${targetOwner.path}/index.ts`) {
        say('deep-import', `import ${targetOwner.path}'s entry (its index.ts), not ${target}`);
        continue;
      }
      if (owner === 'app') continue;
      if (!owner.deps.includes(targetOwner.path)) {
        say('undeclared-dependency', `${owner.path} → ${targetOwner.path} is not in the declared DAG`);
        continue;
      }
      used.add(`${owner.path} → ${targetOwner.path}`);
    }
  }
  for (const f of declared.features) {
    for (const dep of f.deps) {
      if (!used.has(`${f.path} → ${dep}`)) {
        problems.push(`${f.path}: [unused-dependency] declares ${dep}, but nothing in it imports ${dep}`);
      }
    }
  }
  return problems;
}
