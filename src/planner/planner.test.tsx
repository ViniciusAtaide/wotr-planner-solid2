import { join } from 'node:path';
import { render } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { describe, expect, test } from 'vitest';
import { abilityScores, slotKey, type Build } from '~engine/build';
import { encodeBuild } from '~engine/codec';
import { loadData } from '~engine/load';
import { readDataDir } from '~engine/data-dir';
import type { BlueprintCharacterClass } from '~engine/data';
import { jackInTheGreen } from '~engine/gold';
import {
  engineOf,
  level_up,
  options,
  pick,
  set_start,
  start_build,
  type Changed,
  type OptionView,
  type ToolRefusal,
} from '~engine/mcp';

import { buildFromHash } from './link';
import { createPlanner } from './state';
import Timeline from './Timeline';
import { optionName } from './words';

const files = readDataDir(join(process.cwd(), 'data'));
const e = engineOf(loadData(files.files, files.overrides));

function ok<T>(r: T | ToolRefusal | { readonly preview: true }, step: string): T {
  if (typeof r === 'object' && r !== null && ('refused' in r || 'preview' in r)) {
    throw new Error(`${step}: ${JSON.stringify(r)}`);
  }
  return r;
}

const fighter = [...e.data.blueprints.values()].find(
  (bp) => bp.$type === 'BlueprintCharacterClass' && bp.name === 'Fighter' && !(bp as BlueprintCharacterClass).IsMythic,
)?.guid as string;
const SCORES = { Strength: 13, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };

async function fighterThroughMcp(): Promise<Changed[]> {
  const steps: Changed[] = [await start_build(e)];
  const last = () => steps.at(-1) as Changed;
  steps.push(ok(await set_start(e, { code: last().code, scores: SCORES }), 'set_start'));
  const levelled = ok(await level_up(e, { code: last().code, class: fighter }), 'level_up');
  steps.push(levelled);
  let tookPowerAttack = false;
  for (const s of levelled.slots) {
    const listed = ok(await options(e, { code: last().code, slot: s.slot }), `options ${s.place}`);
    const power: OptionView | undefined = tookPowerAttack
      ? undefined
      : listed.open.find((o) => o.name === 'Power Attack');
    const choice = power ?? listed.open[0];
    if (choice === undefined) continue;
    tookPowerAttack ||= power !== undefined;
    steps.push(
      ok(
        await pick(e, {
          code: last().code,
          slot: s.slot,
          feature: choice.feature,
          ...(choice.param && { param: choice.param }),
        }),
        `pick ${choice.name}`,
      ) as Changed,
    );
  }
  return steps;
}

const ordered = (b: Build): Build => ({
  ...b,
  picks: [...b.picks].sort((x, y) => slotKey(x.slot).localeCompare(slotKey(y.slot))),
});

function timelineOf(build: Build) {
  const planner = render(() => {
    const p = createPlanner(e, build);
    return <Timeline planner={p} selected={undefined} onSelect={() => {}} />;
  });
  flush();
  return planner.container;
}

describe('a Build code from the MCP opens the same Build in the UI', () => {
  test('every step of a Fighter built through the MCP', { timeout: 120_000 }, async () => {
    const steps = await fighterThroughMcp();
    expect(steps.length).toBeGreaterThan(4);
    for (const step of steps) {
      const opened = await buildFromHash(e, `#b=${step.code}`);
      expect(opened.stale).toBe(false);
      expect(ordered(opened.build)).toEqual(ordered(step.build));
      expect(await encodeBuild(e.data, opened.build)).toBe(step.code);
      const shown = timelineOf(opened.build);
      expect(shown.querySelectorAll('.ww-level').length).toBe(Math.max(1, opened.build.levels.length));
      for (const p of opened.build.picks) {
        expect(shown.textContent).toContain(optionName(e.data, p.feature, p.param));
      }
    }
  });

  test('Jack in the Green, every level and Mythic rank', { timeout: 120_000 }, async () => {
    const code = await encodeBuild(e.data, jackInTheGreen.build);
    const opened = await buildFromHash(e, `#b=${code}`);
    expect(opened.stale).toBe(false);
    expect(opened.build).toEqual(await (await import('~engine/codec')).decodeBuild(e.data, code));
    const shown = timelineOf(opened.build);
    expect(shown.querySelectorAll('.ww-level').length).toBe(opened.build.levels.length);
    expect(shown.querySelectorAll('.ww-rank').length).toBe(opened.build.ranks?.length ?? 0);
  });

  test('a link that does not open says so and starts empty', async () => {
    const opened = await buildFromHash(e, '#b=not-a-build-code');
    expect(opened).toEqual({ build: { levels: [], picks: [] }, stale: true });
  });
});

describe('the planner routes every change through E', () => {
  test(
    'lowering Strength under Power Attack waits on the Cascade preview; cancel keeps the Build',
    { timeout: 120_000 },
    async () => {
      const steps = await fighterThroughMcp();
      const start = (steps.at(-1) as Changed).build;
      const powerAttack = start.picks.find((p) => optionName(e.data, p.feature) === 'Power Attack');
      expect(powerAttack).toBeDefined();

      let planner!: ReturnType<typeof createPlanner>;
      render(() => {
        planner = createPlanner(e, start);
        return null;
      });
      const lower = () =>
        planner.edit({ kind: 'scores', scores: abilityScores({ ...SCORES, Strength: 10 }) }, 'Strength score');

      lower();
      flush();
      expect(planner.pending()?.clears).toEqual([{ name: 'Power Attack', place: 'Level 1' }]);
      expect(planner.build()).toBe(start);

      planner.cancel();
      flush();
      expect(planner.pending()).toBeUndefined();
      expect(planner.build()).toBe(start);

      lower();
      flush();
      planner.confirm();
      flush();
      expect(planner.build().scores?.Strength).toBe(10);
      expect(planner.build().picks).not.toContainEqual(powerAttack);

      planner.undo();
      flush();
      expect(planner.build()).toBe(start);
    },
  );
});
