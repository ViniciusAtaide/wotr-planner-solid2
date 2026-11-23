import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Cites } from '~engine/cite';
import { cites as data } from '~engine/data';
import { cites as load } from '~engine/load';
import { cites as prerequisites } from '~engine/prerequisites';
import { cites as grants } from '~engine/grants';
import { cites as build } from '~engine/build';
import { cites as gold } from '~engine/gold';
import { cites as walk } from '~engine/walk';
import { cites as pickers } from '~engine/pickers';
import { cites as describeCites } from '~engine/describe';
import { cites as links } from '~engine/links';
import { cites as mcp } from '~engine/mcp';
import { citeFormatProblems, citeSourceProblems, codeNames, featureNames } from './cites';
import { readSources, type Sources } from './csharp';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const sources = readSources(join(repo, 'decompiled'));

const registries = new Map<string, Cites>([
  ['engine/data', data],
  ['engine/load', load],
  ['engine/prerequisites', prerequisites],
  ['engine/grants', grants],
  ['engine/build', build],
  ['engine/gold', gold],
  ['engine/walk', walk],
  ['engine/pickers', pickers],
  ['engine/describe', describeCites],
  ['engine/links', links],
  ['engine/mcp', mcp],
]);

describe('the engine citations', () => {
  it('checks every engine feature that has a cites registry', () => {
    const withCites = readdirSync(join(repo, 'engine'))
      .filter((f) => existsSync(join(repo, 'engine', f, 'cites.ts')))
      .map((f) => `engine/${f}`);
    expect(withCites.sort()).toEqual([...registries.keys()].sort());
  });

  it('writes each cite as "Path/File.cs Method (Field, …)" under a key the feature declares', () => {
    const problems = [...registries].flatMap(([feature, cites]) =>
      citeFormatProblems(feature, cites, featureNames(join(repo, feature))),
    );
    expect(problems).toEqual([]);
  });

  it.skipIf(sources === undefined)('cites files under decompiled/ whose cited member reads each cited field', () => {
    const problems = [...registries].flatMap(([feature, cites]) => citeSourceProblems(feature, cites, sources!));
    expect(problems).toEqual([]);
  });
});

describe('the cite checks', () => {
  const counter: Sources = {
    file: (path) =>
      path === 'Counter.cs'
        ? [
            'public class Counter',
            '{',
            '\tprivate int m_Count;',
            '\tpublic void Add()',
            '\t{',
            '\t\tm_Count++;',
            '\t}',
            '\tpublic void Step()',
            '\t{',
            '\t\tAdd();',
            '\t}',
            '}',
          ].join('\n')
        : undefined,
    fields: () => undefined,
  };

  it('needs a key to name code in the feature, not text inside a string', () => {
    const cites: Cites = { countRule: ['Counter.cs Add'] };
    expect(citeFormatProblems('fake', cites, codeNames('a.ts', 'const label = "countRule";'))).toEqual([
      "fake: cites key countRule names nothing in the feature's code",
    ]);
    expect(citeFormatProblems('fake', cites, codeNames('a.ts', 'export function countRule() {}'))).toEqual([]);
  });

  it('needs the cited method to read each cited field itself', () => {
    expect(citeSourceProblems('fake', { add: ['Counter.cs Add (m_Count)'] }, counter)).toEqual([]);
    expect(citeSourceProblems('fake', { step: ['Counter.cs Step (m_Count)'] }, counter)).toEqual([
      'fake: step: Counter.cs Step reads no m_Count',
    ]);
    expect(citeSourceProblems('fake', { add: ['Counter.cs Add (NonexistentField)'] }, counter)).toEqual([
      'fake: add: Counter.cs Add reads no NonexistentField',
    ]);
  });

  it('reads a cited type as its whole file', () => {
    expect(citeSourceProblems('fake', { counter: ['Counter.cs Counter (m_Count)'] }, counter)).toEqual([]);
    expect(citeSourceProblems('fake', { counter: ['Counter.cs Counter (m_Total)'] }, counter)).toEqual([
      'fake: counter: Counter.cs Counter reads no m_Total',
    ]);
  });
});
