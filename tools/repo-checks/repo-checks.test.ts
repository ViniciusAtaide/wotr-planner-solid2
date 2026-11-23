import { describe, expect, it } from 'vitest';
import { codeComments, commentProblems, cssComments } from './comments';
import type { Feature } from './features';
import { configImportProblems } from './config-imports';
import { declarationProblems, importProblems } from './imports';
import { operatorProblems } from './operators';
import { planRowProblems } from './plan-rows';

const file = (path: string, text: string) => ({ path, text });

describe('the comment check', () => {
  it('finds line, block and JSX comments, and nothing inside strings, templates, regexes or JSX text', () => {
    const text = [
      "const url = 'https://example.com/a//b';",
      'const t = `/* not ${1} // either */`;',
      'const r = /\\/\\/ no/;',
      'const j = <p>// text, not a comment</p>;',
      'const k = <p>{/* a JSX comment */}</p>;',
      '// a line comment',
      '/* a block comment */',
    ].join('\n');
    expect(codeComments(file('a.tsx', text)).map((c) => c.line)).toEqual([5, 6, 7]);
  });

  it('allows triple-slash references and vitest environment pragmas, and skips generated files', () => {
    const problems = commentProblems([
      file('a.d.ts', '/// <reference types="vite/client" />\nexport {};'),
      file('b.test.ts', '// @vitest-environment jsdom\nexport {};'),
      file('file-routes.d.ts', '// generated\nexport {};'),
      file('c.ts', '/** a doc comment */\nexport const c = 1;'),
    ]);
    expect(problems).toEqual([
      "c.ts:1: [no-comments] move this to the feature's README.md or a better name: /** a doc comment */",
    ]);
  });

  it('reads CSS comments outside strings only', () => {
    const css = '.a { background: url("x/*y*/z"); content: \'/* no */\'; }\n/* yes */\n.b {}';
    expect(cssComments(css)).toEqual([{ line: 2, text: '/* yes */' }]);
  });
});

describe('the operator check', () => {
  it('rejects `in` with a computed key and every for...in, and names the line', () => {
    const text = [
      'const table: Record<string, number> = { a: 1 };',
      'const key = String(1);',
      'export const byName = key in table;',
      'export const byTemplate = `${key}` in table;',
      'export const byMember = table.a in table;',
      'export function each(): void {',
      '  for (const k in table) console.log(k);',
      '}',
    ].join('\n');
    expect(
      operatorProblems([file('a.ts', text)]).map((p) => p.split(': ')[0] + ' ' + /\[[\w-]+\]/.exec(p)?.[0]),
    ).toEqual(['a.ts:3 [computed-in]', 'a.ts:4 [computed-in]', 'a.ts:5 [computed-in]', 'a.ts:7 [for-in]']);
  });

  it('allows a quoted or numbered key, a private-field check, and `in` inside strings', () => {
    const text = [
      'type Place = { level: number } | { rank: number };',
      'export const isLevel = (p: Place) => ("level" in p ? p.level : 0);',
      'export const hasFirst = (xs: number[]) => 0 in xs;',
      'export class Box {',
      '  #mark = 1;',
      '  static is(o: object): boolean {',
      '    return #mark in o;',
      '  }',
      '}',
      "export const words = 'key in table' + `for (k in t)`;",
    ].join('\n');
    expect(operatorProblems([file('b.ts', text)])).toEqual([]);
  });

  it('skips the jev-lint fixtures, which hold defects on purpose', () => {
    expect(
      operatorProblems([file('.jev-lint/holdout/case.ts', 'const t = {}; export const x = String(1) in t;')]),
    ).toEqual([]);
  });
});

describe('the import check', () => {
  const features: Feature[] = [
    { path: 'engine/a', layer: 'engine', deps: [] },
    { path: 'engine/b', layer: 'engine', deps: ['engine/a'] },
    { path: 'src/ui', layer: 'ui', deps: ['engine/b'] },
  ];
  const declared = { features, app: ['src/App.tsx'] };
  const present = new Set([
    ...features.flatMap((f) => [`${f.path}/index.ts`, `${f.path}/README.md`]),
    'engine/a/inner.ts',
    'engine/b/b.ts',
    'src/App.tsx',
    'src/ui/View.tsx',
  ]);

  it('passes entry imports along declared edges', () => {
    const files = [
      file('engine/b/b.ts', "import { a } from '../a';\nexport const b = a;"),
      file('src/ui/View.tsx', "import { b } from '~engine/b';\nexport const v = b;"),
      file('src/App.tsx', "import { v } from './ui';\nexport default v;"),
      file('engine/a/index.ts', "export * from './inner';"),
    ];
    expect(importProblems(files, present, declared)).toEqual([]);
  });

  it('names the file, the import and the rule for each breach', () => {
    const files = [
      file('engine/b/b.ts', "import { x } from '../a/inner';\nimport 'solid-js';"),
      file('src/ui/View.tsx', "import { a } from '~engine/a';\nimport App from '../App';"),
      file('engine/a/index.ts', "export const a = await import('../b');"),
      file('stray.ts', 'export {};'),
    ];
    expect(importProblems(files, present, declared)).toEqual([
      "engine/b/b.ts: import '../a/inner': [deep-import] import engine/a's entry (its index.ts), not engine/a/inner.ts",
      "engine/b/b.ts: import 'solid-js': [banned-package] a engine feature may not import this package",
      "src/ui/View.tsx: import '~engine/a': [undeclared-dependency] src/ui → engine/a is not in the declared DAG",
      "src/ui/View.tsx: import '../App': [app-import] features may not import the app layer (src/App.tsx)",
      "engine/a/index.ts: import '../b': [undeclared-dependency] engine/a → engine/b is not in the declared DAG",
      'stray.ts: [feature-owner] the file belongs to no declared feature and is not in the app layer',
      'engine/b: [unused-dependency] declares engine/a, but nothing in it imports engine/a',
      'src/ui: [unused-dependency] declares engine/b, but nothing in it imports engine/b',
    ]);
  });

  it('rejects a cycle, an unknown name and a layer breach in the declared DAG', () => {
    const bad: Feature[] = [
      { path: 'engine/a', layer: 'engine', deps: ['engine/b', 'engine/nowhere'] },
      { path: 'engine/b', layer: 'engine', deps: ['engine/a', 'src/ui'] },
      { path: 'src/ui', layer: 'ui', deps: [] },
    ];
    expect(declarationProblems({ features: bad, app: [] }, present)).toEqual([
      'engine/a: [dag-unknown] declares a dependency on engine/nowhere, no feature',
      'engine/b: [layer] a engine feature may not depend on src/ui, a ui feature',
      '[dag-cycle] the declared dependencies form a cycle: engine/a → engine/b → engine/a',
    ]);
  });
});

describe('the config-import check', () => {
  it('follows the runtime imports vite.config.ts reaches and wants each relative one to name its file', () => {
    const files: Record<string, string> = {
      'vite.config.ts':
        "import { plugin } from './vite/plugin/index.ts';\nimport type { Options } from './vite/types';",
      'vite/plugin/index.ts': "export { plugin } from './plugin';\nimport { read } from '../../engine/x/index.ts';",
      'engine/x/index.ts': "import { y } from '~engine/y';\nimport type { Z } from './z';\nimport 'node:fs';",
    };
    expect(configImportProblems((path) => files[path])).toEqual([
      "vite/plugin/index.ts: import './plugin': [config-import] needs its file extension, since vite.config.ts loads natively",
      "engine/x/index.ts: import '~engine/y': [config-import] vite.config.ts loads natively, so path aliases don't resolve",
    ]);
  });
});

describe('the plan-rows check', () => {
  const plan = [
    '| # | Ticket |',
    '| --- | --- |',
    '| 01 | [One](issues/01-one.md) |',
    '| 02 | [Two](issues/02-two.md) |',
  ].join('\n');

  it('passes when every ticket file has exactly one row and every row has a file', () => {
    expect(planRowProblems(plan, ['01-one.md', '02-two.md'])).toEqual([]);
  });

  it('reports a ticket with no row, a row with no file, and a ticket with two rows', () => {
    const doubled = `${plan}\n| 02 | [Two again](issues/02-two.md) |`;
    expect(planRowProblems(doubled, ['01-one.md', '03-three.md'])).toEqual([
      '.scratch/wotr-planner-build/plan.md: row links issues/02-two.md: [plan-row] no such ticket file',
      '.scratch/wotr-planner-build/plan.md: issues/02-two.md: [plan-row] has 2 rows',
      '.scratch/wotr-planner-build/issues/03-three.md: [plan-row] has no row in .scratch/wotr-planner-build/plan.md',
    ]);
  });
});
