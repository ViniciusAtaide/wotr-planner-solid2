import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { abilityScores, slotKey, type Build, type SlotId } from '~engine/build';
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
import { abilityScoreRange, linkDidNotOpen, nameOf } from '~engine/refusals';

import { EMPTY, openHash } from './link';
import { AddPanel, LevelPanel, StartPanel } from './panels';
import Planner from './Planner';
import { createPlanner } from './state';
import Timeline from './Timeline';
import { optionName } from './words';

const gate = vi.hoisted(() => ({
  load: (): Promise<unknown> => Promise.reject(new Error('no engine yet')),
  decodeHolds: new Map<string, Promise<void>>(),
  decodeStarted: new Set<string>(),
  decoded: 0,
  encodeHold: undefined as Promise<void> | undefined,
}));

vi.mock('./engine', () => ({ loadEngine: () => gate.load() }));

vi.mock('~engine/codec', async (importOriginal) => {
  const codec = await importOriginal<typeof import('~engine/codec')>();
  return {
    ...codec,
    decodeBuild: async (...args: Parameters<typeof codec.decodeBuild>) => {
      gate.decodeStarted.add(args[1]);
      await gate.decodeHolds.get(args[1]);
      try {
        return await codec.decodeBuild(...args);
      } finally {
        gate.decoded++;
      }
    },
    encodeBuild: async (...args: Parameters<typeof codec.encodeBuild>) => {
      await gate.encodeHold;
      return codec.encodeBuild(...args);
    },
  };
});

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

async function openedBuild(hash: string): Promise<Build> {
  const opened = await openHash(e, hash);
  expect(opened.kind).toBe('opened');
  return opened.kind === 'opened' ? opened.build : EMPTY;
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
      const opened = await openedBuild(`#b=${step.code}`);
      expect(ordered(opened)).toEqual(ordered(step.build));
      expect(await encodeBuild(e.data, opened)).toBe(step.code);
      const shown = timelineOf(opened);
      expect(shown.querySelectorAll('.ww-level').length).toBe(Math.max(1, opened.levels.length));
      for (const p of opened.picks) {
        expect(shown.textContent).toContain(optionName(e.data, p.feature, p.param));
      }
    }
  });

  test('Jack in the Green, every level and Mythic rank', { timeout: 120_000 }, async () => {
    const code = await encodeBuild(e.data, jackInTheGreen.build);
    const opened = await openedBuild(`#b=${code}`);
    expect(opened).toEqual(await (await import('~engine/codec')).decodeBuild(e.data, code));
    const shown = timelineOf(opened);
    expect(shown.querySelectorAll('.ww-level').length).toBe(opened.levels.length);
    expect(shown.querySelectorAll('.ww-rank').length).toBe(opened.ranks?.length ?? 0);
  });

  test('a link that does not open says so and starts empty', async () => {
    expect(await openHash(e, '#b=*')).toEqual({ kind: 'didNotOpen', reason: 'notACode' });
    history.replaceState(null, '', '/#b=*');
    gate.load = () => Promise.resolve(e);
    const { container } = render(() => <Planner />);
    await screen.findByText(linkDidNotOpen('load', 'notACode'));
    expect(container.querySelectorAll('.ww-level').length).toBe(1);
    expect(container.querySelector('.ww-level')?.textContent).toContain('No levels yet');
    cleanup();
    history.replaceState(null, '', '/');
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

const POWER_ATTACK = '9972f33f977fc724c838e59641b2fca5';
const CLEAVE = 'd809b6c4ff2aaff4fa70d712a70f7d7b';
const MYTHIC_HERO = '247aa787806d5da4f89cfc3dff0b217f';
const FEAT: SlotId = { place: { level: 1 }, selection: '247a4068296e8be42890143f451b4b45', index: 0 };
const BONUS_COMBAT_FEAT: SlotId = { place: { level: 1 }, selection: '41c8486641f7d6d4283ca9dae4147a9f', index: 0 };

const cleaver: Build = {
  scores: abilityScores(SCORES),
  levels: [{ class: fighter }],
  picks: [
    { slot: FEAT, feature: POWER_ATTACK },
    { slot: BONUS_COMBAT_FEAT, feature: CLEAVE },
  ],
};
const withLevels = (n: number): Build => ({
  ...cleaver,
  levels: Array.from({ length: n }, () => ({ class: fighter })),
});

class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  matches = false;
  readonly media = '(max-width: 767px)';
  onchange = null;
  addListener(): void {}
  removeListener(): void {}
}
const media = new FakeMediaQueryList();
Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => media });

function setPhone(on: boolean): void {
  media.matches = on;
  media.dispatchEvent(new Event('change'));
  flush();
}

function pasteHash(hash: string): void {
  history.replaceState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function deferred(): { promise: Promise<void>; release: () => void } {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function openPlanner(build: Build | undefined, phone = false): Promise<string | undefined> {
  const code = build === undefined ? undefined : await encodeBuild(e.data, build);
  history.replaceState(null, '', code === undefined ? '/' : `/#b=${code}`);
  media.matches = phone;
  gate.load = () => Promise.resolve(e);
  render(() => <Planner />);
  await screen.findByRole('toolbar', { name: 'Build' });
  flush();
  await waitFor(() => expect(screen.getByRole('button', { name: /Copy link/ })).toBeEnabled());
  if (code !== undefined) expect(location.hash).toBe(`#b=${code}`);
  return code;
}

const levelRows = () => document.querySelectorAll('.ww-level').length;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const dialog = () => document.querySelector('[role="dialog"]');

function changeInput(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  flush();
}

async function openPreview(): Promise<void> {
  fireEvent.click(button('Start'));
  flush();
  changeInput('Strength', '10');
  await waitFor(() => expect(dialog()).not.toBeNull());
}

async function storedBlockCode(code: string): Promise<string> {
  const bytes = Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const inflated = new Uint8Array(
    await new Response(
      new Response(bytes.subarray(1)).body?.pipeThrough(new DecompressionStream('deflate-raw')),
    ).arrayBuffer(),
  );
  const n = inflated.length;
  const stored = [bytes[0] ?? 1, 1, n & 0xff, n >> 8, ~n & 0xff, (~n >> 8) & 0xff, ...inflated];
  return btoa(String.fromCharCode(...stored))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('render regressions (ticket 05d), each failing before its fix', () => {
  beforeEach(() => {
    gate.decodeHolds.clear();
    gate.decodeStarted.clear();
    gate.encodeHold = undefined;
    media.matches = false;
  });
  afterEach(() => {
    cleanup();
    history.replaceState(null, '', '/');
  });

  test('the notice survives undo', () => {
    let planner!: ReturnType<typeof createPlanner>;
    render(() => {
      planner = createPlanner(e, cleaver);
      return null;
    });
    planner.edit({ kind: 'addLevel', class: fighter }, 'Add level 2');
    flush();
    planner.refuse(['Refused.']);
    flush();
    planner.undo();
    flush();
    expect(planner.build()).toBe(cleaver);
    expect(planner.notice()).toBeUndefined();
  });

  test('⌘Z in the Cascade preview cancels it, keeping the history', async () => {
    await openPlanner(cleaver);
    fireEvent.click(button('Start'));
    flush();
    changeInput('Dexterity', '11');
    await openPreview();
    fireEvent.keyDown(dialog() ?? window, { key: 'z', metaKey: true });
    flush();
    expect(dialog()).toBeNull();
    expect(screen.getByLabelText('Dexterity')).toHaveValue(11);
    expect(screen.getByLabelText('Strength')).toHaveValue(13);
    expect(document.querySelector('[inert]')).toBeNull();
    expect(button(/Undo/)).toBeEnabled();
  });

  test('the phone sheet stays open on a pick that waits on the Cascade preview', async () => {
    await openPlanner(cleaver, true);
    const chip = [...document.querySelectorAll('.ww-pick')].find((c) => c.textContent?.includes('Power Attack'));
    fireEvent.click(chip ?? document.body);
    flush();
    expect(document.querySelector('.planner-sheet')).not.toBeNull();
    const toughness = [...document.querySelectorAll('button.ww-option')].find((o) =>
      o.textContent?.includes('Toughness'),
    );
    expect(toughness).toBeDefined();
    fireEvent.click(toughness ?? document.body);
    flush();
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(document.querySelector('.planner-sheet')).not.toBeNull();
  });

  test('Tab stays inside the Cascade preview, and the page behind it is inert', async () => {
    await openPlanner(cleaver);
    await openPreview();
    const buttons = [...(dialog()?.querySelectorAll('button') ?? [])];
    const last = buttons.at(-1);
    last?.focus();
    fireEvent.keyDown(last ?? window, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(buttons[0] ?? window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    expect(screen.getByRole('toolbar', { name: 'Build' }).closest('[inert]')).not.toBeNull();
  });

  test('the Cascade preview opens with focus on Cancel (comparison bug 3)', async () => {
    await openPlanner(cleaver);
    await openPreview();
    await waitFor(() => expect(document.activeElement?.textContent).toMatch(/^Cancel/));
  });

  test('focus goes back to the control that opened the preview (comparison bug 3)', async () => {
    await openPlanner(cleaver);
    fireEvent.click(button('Start'));
    flush();
    const strength = screen.getByLabelText('Strength');
    strength.focus();
    fireEvent.change(strength, { target: { value: '10' } });
    flush();
    await waitFor(() => expect(dialog()).not.toBeNull());
    fireEvent.click(button(/^Cancel/));
    flush();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Strength')));
  });

  test('a picked option keeps focus, and Clear this pick comes after the options (comparison bug 3)', async () => {
    await openPlanner(cleaver);
    const empty = [...document.querySelectorAll<HTMLElement>('.ww-pick--empty')].find((c) =>
      /deity/i.test(c.textContent ?? ''),
    );
    if (empty === undefined) throw new Error('no empty deity chip');
    fireEvent.click(empty);
    flush();
    const option = document.querySelector<HTMLElement>('button.ww-option');
    if (option === null) throw new Error('no open option');
    option.focus();
    fireEvent.click(option);
    flush();
    await waitFor(() => expect(document.activeElement).toBe(option));
    expect(option.isConnected).toBe(true);
    const clear = button('Clear this pick');
    expect(option.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('side by side becomes one Build, its segment pressed, after narrowing to phone width', async () => {
    await openPlanner(cleaver);
    fireEvent.click(button('Fork this Build'));
    flush();
    expect(document.querySelectorAll('section.planner-build').length).toBe(2);
    setPhone(true);
    expect(document.querySelectorAll('section.planner-build').length).toBe(1);
    expect(document.querySelectorAll('.ww-segment [aria-pressed="true"]').length).toBe(1);
  });

  test('two hash decodes resolving out of order leave the last pasted link', async () => {
    await openPlanner(cleaver);
    const first = await encodeBuild(e.data, withLevels(2));
    const last = await encodeBuild(e.data, withLevels(3));
    const held = deferred();
    gate.decodeHolds.set(first, held.promise);
    pasteHash(`#b=${first}`);
    pasteHash(`#b=${last}`);
    await waitFor(() => expect(levelRows()).toBe(3));
    const before = gate.decoded;
    held.release();
    await waitFor(() => expect(gate.decoded).toBeGreaterThan(before));
    await new Promise((r) => setTimeout(r, 20));
    flush();
    expect(levelRows()).toBe(3);
  });

  test('a failed paste puts back the page’s own link', async () => {
    const code = await openPlanner(cleaver);
    pasteHash('#b=not-a-build-code');
    await waitFor(() => expect(document.querySelector('.planner-notice')).not.toBeNull());
    expect(location.hash).toBe(`#b=${code}`);
  });

  test('the link notice clears when a later link opens', async () => {
    await openPlanner(cleaver);
    pasteHash('#b=not-a-build-code');
    await waitFor(() => expect(document.querySelector('.planner-notice')).not.toBeNull());
    pasteHash(`#b=${await encodeBuild(e.data, withLevels(2))}`);
    await waitFor(() => expect(levelRows()).toBe(2));
    expect(document.querySelector('.planner-notice')).toBeNull();
  });

  test('the page’s own Build, pasted as another code, adds no undo entry', async () => {
    const code = await openPlanner(cleaver);
    expect(button(/Undo/)).toBeDisabled();
    const before = gate.decoded;
    pasteHash(`#b=${await storedBlockCode(code ?? '')}`);
    await waitFor(() => expect(gate.decoded).toBeGreaterThan(before));
    await new Promise((r) => setTimeout(r, 20));
    flush();
    expect(button(/Undo/)).toBeDisabled();
  });

  test('a link pasted while the game data loads opens once the planner is ready', async () => {
    const first = await encodeBuild(e.data, cleaver);
    const later = await encodeBuild(e.data, withLevels(2));
    const held = deferred();
    gate.decodeHolds.set(first, held.promise);
    history.replaceState(null, '', `/#b=${first}`);
    gate.load = () => Promise.resolve(e);
    render(() => <Planner />);
    await waitFor(() => expect(gate.decodeStarted.has(first)).toBe(true));
    pasteHash(`#b=${later}`);
    held.release();
    await screen.findByRole('toolbar', { name: 'Build' });
    await waitFor(() => expect(levelRows()).toBe(2));
  });

  test('the Share link says it is being made, with Copy off, while the code encodes', async () => {
    const held = deferred();
    history.replaceState(null, '', '/');
    gate.encodeHold = held.promise;
    gate.load = () => Promise.resolve(e);
    render(() => <Planner />);
    await screen.findByRole('toolbar', { name: 'Build' });
    flush();
    expect(screen.queryByDisplayValue(/#b=$/)).toBeNull();
    expect(screen.getByDisplayValue('Making the link…')).toBeInTheDocument();
    expect(button(/Copy link/)).toBeDisabled();
    held.release();
    await waitFor(() => expect(button(/Copy link/)).toBeEnabled());
  });

  test('a select names a Build value its options don’t list', () => {
    render(() => <LevelPanel planner={createPlanner(e, { levels: [{ class: MYTHIC_HERO }], picks: [] })} level={1} />);
    flush();
    const select = screen.getByLabelText('Class');
    expect(select instanceof HTMLSelectElement && select.selectedOptions[0]?.textContent).toBe(
      nameOf(e.data, MYTHIC_HERO),
    );
  });

  test('the Race select shows the race the Build holds after a change (comparison bug 1)', () => {
    let planner!: ReturnType<typeof createPlanner>;
    render(() => {
      planner = createPlanner(e, cleaver);
      return <StartPanel planner={planner} />;
    });
    flush();
    const select = screen.getByLabelText('Race');
    if (!(select instanceof HTMLSelectElement)) throw new Error('no Race select');
    const human = [...select.options].find((o) => o.text === 'Human');
    if (human === undefined) throw new Error('no Human option');
    fireEvent.change(select, { target: { value: human.value } });
    flush();
    expect(planner.build().race).toBe(human.value);
    expect(select.selectedOptions[0]?.textContent).toBe('Human');
  });

  test('the Add panel keeps showing the class it will add (comparison bug 2)', () => {
    let planner!: ReturnType<typeof createPlanner>;
    render(() => {
      planner = createPlanner(e, cleaver);
      return <AddPanel planner={planner} />;
    });
    flush();
    const select = screen.getByLabelText(/^Level /);
    if (!(select instanceof HTMLSelectElement)) throw new Error('no class select');
    const fighter = [...select.options].find((o) => o.text === 'Fighter');
    if (fighter === undefined) throw new Error('no Fighter option');
    fireEvent.change(select, { target: { value: fighter.value } });
    flush();
    fireEvent.click(screen.getByRole('button', { name: /^Add level/ }));
    flush();
    expect(select.selectedOptions[0]?.textContent).toBe('Fighter');
  });

  test('before level 1 the stats say they are the point buy only (comparison bug 4)', async () => {
    await openPlanner({ levels: [], picks: [] });
    expect(screen.getByText(/Point buy only/)).toBeTruthy();
    cleanup();
    await openPlanner(cleaver);
    expect(screen.queryByText(/Point buy only/)).toBeNull();
  });

  test('the Add panel offers player classes only (comparison bug 5)', () => {
    render(() => <AddPanel planner={createPlanner(e, cleaver)} />);
    flush();
    const texts = [...(screen.getByLabelText(/^Level /) as HTMLSelectElement).options].map((o) => o.text);
    expect(texts).toContain('Fighter');
    for (const creature of ['Animal', 'Dragon', 'Monstrous Humanoid']) expect(texts).not.toContain(creature);
    const mythic = [...(screen.getByLabelText(/^Mythic rank /) as HTMLSelectElement).options].map((o) => o.text);
    expect(mythic).not.toContain('Mythic Companion');
    expect(mythic).not.toContain('Shard Powers');
  });

  test('an ability score of 6 or 12.5 is refused, worded with the number typed', () => {
    let planner!: ReturnType<typeof createPlanner>;
    render(() => {
      planner = createPlanner(e, cleaver);
      return <StartPanel planner={planner} />;
    });
    flush();
    for (const typed of [6, 12.5]) {
      changeInput('Strength', String(typed));
      expect(planner.notice()).toEqual([abilityScoreRange(typed)]);
      expect(planner.build()).toBe(cleaver);
    }
  });

  test('Close keeps the Build being edited, the second one', async () => {
    await openPlanner(cleaver);
    fireEvent.click(button('Fork this Build'));
    flush();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add a level or rank' }).at(-1) ?? document.body);
    flush();
    changeInput('Level 2', fighter);
    fireEvent.click(button('Add level 2'));
    flush();
    expect(levelRows()).toBe(3);
    fireEvent.click(button('Close the fork'));
    flush();
    expect(levelRows()).toBe(2);
  });

  test('Retry loads the game data again after it failed', async () => {
    history.replaceState(null, '', '/');
    gate.load = () => Promise.reject(new Error('offline'));
    render(() => <Planner />);
    await screen.findByText(/offline/);
    gate.load = () => Promise.resolve(e);
    fireEvent.click(button('Retry'));
    await screen.findByRole('toolbar', { name: 'Build' });
  });

  test('loadEngine asks again after a failed load', async () => {
    const actual = await vi.importActual<typeof import('./engine')>('./engine');
    const fetch = vi.fn(() => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetch);
    try {
      await expect(actual.loadEngine()).rejects.toThrow('offline');
      await expect(actual.loadEngine()).rejects.toThrow('offline');
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
