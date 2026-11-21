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
import { cites as links } from '~engine/links';
import { cites as mcp } from '~engine/mcp';
import { citeFormatProblems, citeSourceProblems, featureText } from './cites';
import { readSources } from './csharp';

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
      citeFormatProblems(feature, cites, featureText(join(repo, feature))),
    );
    expect(problems).toEqual([]);
  });

  it.skipIf(sources === undefined)('cites files under decompiled/ that declare the cited method', () => {
    const problems = [...registries].flatMap(([feature, cites]) => citeSourceProblems(feature, cites, sources!));
    expect(problems).toEqual([]);
  });
});
