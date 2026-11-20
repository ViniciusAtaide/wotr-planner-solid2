import { describe, expect, it } from 'vitest';
import { codeComments, commentProblems, cssComments } from './comments';
import type { Feature } from './features';
import { declarationProblems, importProblems } from './imports';

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
