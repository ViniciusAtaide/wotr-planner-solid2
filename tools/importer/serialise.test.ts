import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readDataDir } from '~engine/data-dir';
import { serialise } from './serialise';

describe('serialise', () => {
  it('writes the same bytes whatever order the keys came in', () => {
    const a = serialise({ b: 1, a: { d: [3, 1], c: null } });
    const b = serialise({ a: { c: null, d: [3, 1] }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{\n  "a": {\n    "c": null,\n    "d": [\n      3,\n      1\n    ]\n  },\n  "b": 1\n}\n');
  });

  it("keeps array order, which is the game's", () => {
    expect(serialise([2, 1])).toBe('[\n  2,\n  1\n]\n');
  });

  it('is the form every committed fixture file is in', () => {
    const root = fileURLToPath(new URL('../../engine/load/fixtures/small', import.meta.url));
    const { files, overrides } = readDataDir(root);
    for (const file of [...files, ...overrides]) {
      expect(readFileSync(`${root}/${file.path}`, 'utf8'), file.path).toBe(serialise(file.value));
    }
  });
});
