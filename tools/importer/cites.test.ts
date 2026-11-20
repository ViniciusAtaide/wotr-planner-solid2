import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { citeFormatProblems, citeSourceProblems, featureText, readSources } from '../decompiled';
import { cites } from './cites';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const sources = readSources(join(repo, 'decompiled'));

describe("the importer's citations outside the allowlist", () => {
  it('writes each cite as "Path/File.cs Method (Field, …)" under a key the importer declares', () => {
    expect(citeFormatProblems('tools/importer', cites, featureText(join(repo, 'tools/importer')))).toEqual([]);
  });

  it.skipIf(sources === undefined)('cites files under decompiled/ that declare the cited method', () => {
    expect(citeSourceProblems('tools/importer', cites, sources!)).toEqual([]);
  });
});
