import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadData } from './data/load';
import { readDataDir } from './data/read-dir';
import { prerequisites } from './prerequisites';

const { files, overrides } = readDataDir(fileURLToPath(new URL('./data/fixtures/small', import.meta.url)));
const data = loadData(files, overrides);
const g = (n: number) => `f1${'0'.repeat(29)}${n}`;

function leavesOf(n: number) {
  const bp = data.blueprints.get(g(n));
  if (bp === undefined) throw new Error(`no fixture blueprint ${n}`);
  return prerequisites(bp, data.blueprints).map(({ Group, CheckInProgression, polarity, names }) => ({
    Group,
    CheckInProgression,
    polarity,
    names,
  }));
}

describe('prerequisites (P)', () => {
  it('gives a blueprint without prerequisites no leaves', () => {
    expect(leavesOf(4)).toEqual([]);
  });

  it('reads a required fact, keeping its group and whether progressions check it', () => {
    expect(leavesOf(5)).toEqual([
      { Group: 'All', CheckInProgression: true, polarity: 'requires', names: { kind: 'fact', m_Feature: g(4) } },
    ]);
  });

  it("reads an Any group and a forbidden fact, in the game's component order", () => {
    expect(leavesOf(7)).toEqual([
      { Group: 'Any', CheckInProgression: false, polarity: 'requires', names: { kind: 'fact', m_Feature: g(6) } },
      { Group: 'Any', CheckInProgression: false, polarity: 'requires', names: { kind: 'fact', m_Feature: g(4) } },
      { Group: 'All', CheckInProgression: false, polarity: 'forbids', names: { kind: 'fact', m_Feature: g(8) } },
    ]);
  });
});
