import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseRelationInput } from 'jev-lint/relations';
import { cites as prerequisites } from '~engine/prerequisites';
import { readSources, type Sources } from '../decompiled';
import { OPENROUTER_DECISIONS, pacedTransport } from './client';
import { portPairs, type FeatureFile } from './pairs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const sha = 'a'.repeat(40);

const gate = [
  'public class Gate',
  '{',
  '\tpublic int Level;',
  '\tprotected bool CheckInternal(int level)',
  '\t{',
  '\t\treturn level >= Level && Allowed();',
  '\t}',
  '\tprivate bool Allowed()',
  '\t{',
  '\t\treturn true;',
  '\t}',
  '}',
].join('\n');

const sources: Sources = {
  file: (path) => (path === 'Gate.cs' ? gate : undefined),
  fields: () => undefined,
};

const port: FeatureFile = {
  path: 'engine/fake/fake.ts',
  text: [
    'export interface Leaf {',
    '  readonly Level: number;',
    '}',
    'const keep = (level: number) => ({ Level: level });',
    'const readers = {',
    '  Gate: (c: { Level: number }) => keep(c.Level),',
    '};',
    'export const types = Object.keys(readers);',
  ].join('\n'),
};

const readme: FeatureFile = { path: 'engine/fake/README.md', text: '# Fake\n\nReaders keep the level for the walk.\n' };

describe('the port pairs', () => {
  const pairs = portPairs(
    {
      feature: 'engine/fake',
      cites: {
        'readers.Gate': ['Gate.cs CheckInternal (Level)'],
        'Leaf.Level': ['Gate.cs Gate (Level)'],
        missing: ['Gate.cs CheckInternal'],
        unknown: ['Gate.cs Nowhere'],
      },
      files: [port],
      readme,
    },
    sources,
    sha,
    'test-1',
  );

  it('quotes the cited C# member as the claim and the keyed declaration as the target', () => {
    const relation = pairs.input.relations.find((r) => r.id === 'readers.Gate.0.port');
    const claim = pairs.input.claims.find((c) => c.id === 'readers.Gate.0');
    expect(claim?.evidence.map((e) => [e.startLine, e.endLine])).toEqual([[4, 7]]);
    expect(relation?.targets.map((t) => [t.startLine, t.quote])).toEqual([
      [6, '  Gate: (c: { Level: number }) => keep(c.Level),'],
    ]);
  });

  it('gives each relation the feature README and the same-file helpers the C# member and the port call', () => {
    const relation = pairs.input.relations.find((r) => r.id === 'readers.Gate.0.port');
    expect(relation?.context.map((e) => [e.sourceId, e.startLine, e.endLine])).toEqual([
      ['s0', 1, 3],
      ['s1', 8, 11],
      ['s2', 4, 4],
    ]);
  });

  it('quotes a cited type as its whole declaration, and resolves an interface member', () => {
    const relation = pairs.input.relations.find((r) => r.id === 'Leaf.Level.0.port');
    const claim = pairs.input.claims.find((c) => c.id === 'Leaf.Level.0');
    expect(claim?.evidence.map((e) => [e.startLine, e.endLine])).toEqual([[1, 12]]);
    expect(relation?.targets.map((t) => t.quote)).toEqual(['  readonly Level: number;']);
  });

  it('keeps an unresolved key or member as an expected claim with no relation, and says why', () => {
    expect(pairs.input.expectedClaimIds).toEqual(['readers.Gate.0', 'Leaf.Level.0', 'missing.0', 'unknown.0']);
    expect(pairs.input.relations.map((r) => r.claimId)).toEqual(['readers.Gate.0', 'Leaf.Level.0']);
    expect(pairs.unpaired).toEqual([
      { key: 'missing', cite: 'Gate.cs CheckInternal', reason: 'no declaration in engine/fake for missing' },
      { key: 'unknown', cite: 'Gate.cs Nowhere', reason: 'Gate.cs declares no Nowhere' },
    ]);
    expect(() => parseRelationInput(pairs.input)).not.toThrow();
  });
});

describe('the OpenRouter transport', () => {
  it('sends every request to the decisions endpoint, spaced by the interval', async () => {
    const sent: { url: string; at: number }[] = [];
    const transport = pacedTransport(40, async (url) => {
      sent.push({ url, at: Date.now() });
      return new Response('{}');
    });
    await Promise.all([transport('https://api.typesafe.ai/x'), transport('https://api.typesafe.ai/y')]);
    expect(sent.map((s) => s.url)).toEqual([OPENROUTER_DECISIONS, OPENROUTER_DECISIONS]);
    expect(sent[1]!.at - sent[0]!.at).toBeGreaterThanOrEqual(35);
  });
});

const decompiled = readSources(join(repo, 'decompiled'));

describe('the prerequisites pairs', () => {
  it.skipIf(decompiled === undefined)('pair every citation in engine/prerequisites with its port', () => {
    const feature = 'engine/prerequisites';
    const files = readdirSync(join(repo, feature))
      .filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts') && n !== 'cites.ts')
      .map((n) => ({ path: `${feature}/${n}`, text: readFileSync(join(repo, feature, n), 'utf8') }));
    const readmePath = join(repo, feature, 'README.md');
    const pairs = portPairs(
      {
        feature,
        cites: prerequisites,
        files,
        readme: { path: `${feature}/README.md`, text: existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '' },
      },
      decompiled!,
      sha,
      'test-2',
    );
    const citations = Object.values(prerequisites).reduce((n, list) => n + list.length, 0);
    expect(pairs.unpaired).toEqual([]);
    expect(pairs.input.relations).toHaveLength(citations);
  });
});
