import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { abilityScores, rankLevel, skillRanks, slotKey, type Build, type SlotId } from '~engine/build';
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
import { picker } from '~engine/pickers';
import { linkDidNotOpen, nameOf } from '~engine/refusals';

import { EMPTY, openHash } from './link';
import Planner from './Planner';
import { createPlanner, type Planner as PlannerApi } from './state';
import { MythicStep, NextLevelStep, RankEditor, SlotStep, type TrailApi } from './steps';
import Trail from './Trail';
import { reduceTrail, TRAIL_START, type TrailState } from './trail-state';
import type { Selection } from './workspace-state';
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

function trailOf(build: Build) {
  const shown = render(() => (
    <Trail
      planner={createPlanner(e, build)}
      state={TRAIL_START}
      send={() => {}}
      selection={undefined}
      select={() => {}}
      phone={false}
    />
  ));
  flush();
  return shown.container;
}

const LEVEL_STOPS = '.trail-stop:not(.trail-stop--mythic):not(.trail-stop--next):not(.trail-stop--chapter)';

function apiOf(planner: PlannerApi, state: TrailState = TRAIL_START): TrailApi {
  let s = state;
  let selection: Selection | undefined;
  return {
    planner,
    view: () => ({ data: e.data, build: planner.build(), walk: planner.walked() }),
    state: () => s,
    send: (a) => {
      s = reduceTrail(s, a);
    },
    selection: () => selection,
    select: (next) => {
      selection = next;
    },
    edit: (edit, title) => planner.edit(edit, title),
  };
}

describe('a Build code from the MCP opens the same Build in the UI', () => {
  test('every step of a Fighter built through the MCP', { timeout: 120_000 }, async () => {
    const steps = await fighterThroughMcp();
    expect(steps.length).toBeGreaterThan(4);
    for (const step of steps) {
      const opened = await openedBuild(`#b=${step.code}`);
      expect(ordered(opened)).toEqual(ordered(step.build));
      expect(await encodeBuild(e.data, opened)).toBe(step.code);
      const shown = trailOf(opened);
      expect(shown.querySelectorAll(LEVEL_STOPS).length).toBe(opened.levels.length);
      for (const p of opened.picks) {
        expect(shown.textContent).toContain(optionName(e.data, p.feature, p.param));
      }
    }
  });

  test('Jack in the Green, every level and Mythic rank', { timeout: 120_000 }, async () => {
    const code = await encodeBuild(e.data, jackInTheGreen.build);
    const opened = await openedBuild(`#b=${code}`);
    expect(opened).toEqual(await (await import('~engine/codec')).decodeBuild(e.data, code));
    const shown = trailOf(opened);
    expect(shown.querySelectorAll(LEVEL_STOPS).length).toBe(opened.levels.length);
    expect(shown.querySelectorAll('.trail-stop--mythic').length).toBe(opened.ranks?.length ?? 0);
  });

  test('a link that does not open says so and starts empty', async () => {
    expect(await openHash(e, '#b=*')).toEqual({ kind: 'didNotOpen', reason: 'notACode' });
    history.replaceState(null, '', '/#b=*');
    gate.load = () => Promise.resolve(e);
    const { container } = render(() => <Planner />);
    await screen.findByText(linkDidNotOpen('load', 'notACode'));
    expect(container.querySelectorAll(LEVEL_STOPS).length).toBe(0);
    expect(container.querySelector('.trail-here__title')?.textContent).toBe('Your character · set the ability scores');
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
  readonly media = '(max-width: 899px)';
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
  await waitFor(() => expect(location.hash).toMatch(/^#b=./));
  if (code !== undefined) expect(location.hash).toBe(`#b=${code}`);
  return code;
}

const levelRows = () => document.querySelectorAll(LEVEL_STOPS).length;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const dialog = () => document.querySelector('[role="dialog"]');
const hereTitle = () => document.querySelector('.trail-here__title')?.textContent;

function tap(name: string | RegExp): void {
  fireEvent.click(button(name));
  flush();
}

function openMenu(): void {
  tap('Build menu');
}

function menuItem(name: string): void {
  fireEvent.click(screen.getByRole('menuitem', { name }));
  flush();
}

function openCharacter(): void {
  const head = document.querySelector<HTMLElement>('.trail-card__head');
  if (head === null) throw new Error('no character card');
  fireEvent.click(head);
  flush();
}

async function openPreview(): Promise<void> {
  openCharacter();
  tap('Lower Strength');
  await waitFor(() => expect(dialog()).not.toBeNull());
}

function chipNamed(text: string): HTMLElement {
  const chip = [...document.querySelectorAll<HTMLElement>('.trail-chip')].find((c) => c.textContent?.includes(text));
  if (chip === undefined) throw new Error(`no chip with ${text}`);
  return chip;
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

function everyChoiceMade(build: Build): Build {
  let b = build;
  for (;;) {
    const empty = createPlanner(e, b)
      .walked()
      .slots.find((s) => s.pick === undefined);
    if (empty === undefined) return b;
    const option = picker(e.data, b, empty.id, e.G)?.options.find((o) => o.shown && o.closed === undefined);
    if (option === undefined) throw new Error(`nothing open at ${slotKey(empty.id)}`);
    b = {
      ...b,
      picks: [...b.picks, { slot: empty.id, feature: option.feature, ...(option.param && { param: option.param }) }],
    };
  }
}

const slotNamed = (build: Build, assetName: string): SlotId => {
  const slot = createPlanner(e, build)
    .walked()
    .slots.find((x) => e.data.blueprints.get(x.id.selection)?.assetName === assetName);
  if (slot === undefined) throw new Error(`no ${assetName} slot`);
  return slot.id;
};

describe('the levelling trail (build ticket 07)', () => {
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

  test('a fresh Build opens on the ability scores, which stay open through their edits until Done', async () => {
    await openPlanner(undefined);
    expect(hereTitle()).toBe('Your character · set the ability scores');
    tap('Raise Strength');
    expect(hereTitle()).toBe('Your character · set the ability scores');
    expect(screen.queryByRole('button', { name: 'Back to the next choice' })).toBeNull();
    tap(/^Done/);
    expect(hereTitle()).toBe('Begin · choose a first class');
  });

  test('a Build whose scores are set opens past them', async () => {
    await openPlanner({ scores: abilityScores(SCORES), levels: [], picks: [] });
    expect(hereTitle()).toBe('Begin · choose a first class');
  });

  test('a reload keeps the Build, through the #b= link', async () => {
    await openPlanner(undefined);
    tap('Human');
    tap('Lawful Good');
    tap(/^Done/);
    tap(/^Fighter/);
    await waitFor(() => expect(levelRows()).toBe(1));
    const shown = [...document.querySelectorAll('.trail-card__line')].map((n) => n.textContent);
    await waitFor(async () => {
      const opened = await openHash(e, location.hash);
      expect(opened.kind === 'opened' && opened.build.levels.length).toBe(1);
    });
    const reloaded = location.hash;
    cleanup();
    history.replaceState(null, '', `/${reloaded}`);
    render(() => <Planner />);
    await screen.findByRole('toolbar', { name: 'Build' });
    await waitFor(() => expect(levelRows()).toBe(1));
    expect([...document.querySelectorAll('.trail-card__line')].map((n) => n.textContent)).toEqual(shown);
    expect(shown[0]).toContain('Human · Lawful Good');
  });

  test('a pick opens the next empty choice in place, and the Undo line names it', async () => {
    await openPlanner(cleaver);
    const first = hereTitle();
    expect(first).toMatch(/^Your character · choose /);
    const option = document.querySelector<HTMLElement>('.trail-here button.ww-option');
    const name = option?.querySelector('.ww-option__name')?.textContent ?? '';
    fireEvent.click(option ?? document.body);
    flush();
    expect(hereTitle()).not.toBe(first);
    expect(document.querySelector('.planner-undo')?.textContent).toContain(`Picked ${name}`);
    tap('Undo');
    expect(hereTitle()).toBe(first);
  });

  test('race, +2, alignment and score edits reach the Undo line, and an undo names the change before', async () => {
    await openPlanner(undefined);
    const line = () => document.querySelector('.planner-undo__what')?.textContent;
    tap('Human');
    expect(line()).toBe('Race Human');
    tap('Racial +2 to Strength');
    expect(line()).toBe('Racial +2 to Strength');
    tap('Lawful Good');
    expect(line()).toBe('Alignment Lawful Good');
    tap('Raise Dexterity');
    expect(line()).toBe('Dexterity 11');
    tap('Undo');
    expect(line()).toBe('Alignment Lawful Good');
    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
    flush();
    expect(line()).toBe('Dexterity 11');
  });

  test('from 900 px wide the character card keeps its controls after level 1', async () => {
    await openPlanner(withLevels(2));
    expect(button('Raise Strength')).toBeEnabled();
    expect(button('Human')).toBeTruthy();
    expect(document.querySelector('[aria-label="The character"] button.trail-card__head')).toBeNull();
  });

  test('on a phone the card stays open until level 1 is done, then shrinks to one line', async () => {
    await openPlanner({ ...cleaver, picks: [] }, true);
    expect(screen.queryByRole('button', { name: 'Raise Strength' })).not.toBeNull();
    cleanup();
    await openPlanner(everyChoiceMade(withLevels(2)), true);
    expect(screen.queryByRole('button', { name: 'Raise Strength' })).toBeNull();
    expect(document.querySelector('.trail-card--folded')).not.toBeNull();
  });

  test('a tapped chip opens its pick in place, with a way back to the next choice', async () => {
    await openPlanner(cleaver);
    const next = hereTitle();
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    expect(hereTitle()).toBe('Level 1 · choose feat');
    tap('Back to the next choice');
    expect(hereTitle()).toBe(next);
  });

  test('Continue as the previous class adds the next level in one tap', () => {
    const planner = createPlanner(e, cleaver);
    render(() => <NextLevelStep trail={apiOf(planner)} />);
    flush();
    tap(/^Continue as Fighter/);
    expect(planner.build().levels.map((l) => l.class)).toEqual([fighter, fighter]);
  });

  test('the class list waits for Another class…, and offers player classes only (comparison bug 5)', () => {
    const planner = createPlanner(e, cleaver);
    const api = apiOf(planner);
    const { unmount } = render(() => <NextLevelStep trail={api} />);
    flush();
    expect(document.querySelectorAll('.ww-option').length).toBe(0);
    unmount();
    render(() => <NextLevelStep trail={apiOf(planner, { ...TRAIL_START, otherClass: true })} />);
    flush();
    const names = [...document.querySelectorAll('.ww-option__name')].map((n) => n.textContent);
    expect(names[0]).toBe('Fighter');
    for (const creature of ['Animal', 'Dragon', 'Monstrous Humanoid']) expect(names).not.toContain(creature);
  });

  test('the Mythic path list leaves out the companions’ class and Shard Powers (comparison bug 5)', () => {
    const ranked: Build = { ...cleaver, ranks: [{ class: MYTHIC_HERO, level: rankLevel(1) }] };
    render(() => <RankEditor trail={apiOf(createPlanner(e, ranked))} rank={1} />);
    flush();
    const names = [...document.querySelectorAll('.ww-option__name')].map((n) => n.textContent);
    expect(names).toContain('Aeon');
    expect(names).not.toContain('Mythic Companion');
    expect(names).not.toContain('Shard Powers');
  });

  test('a due Mythic rank lists the paths with their status', () => {
    const levels = Array.from({ length: 10 }, () => ({ class: fighter }));
    render(() => <MythicStep trail={apiOf(createPlanner(e, { ...cleaver, levels }))} />);
    flush();
    expect(document.querySelectorAll('button.ww-option').length).toBeGreaterThan(0);
    expect(screen.getByText(/^Your story grants Mythic rank 1 at level/)).toBeTruthy();
  });

  test('the menu copies the link and exports the build sheet', async () => {
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text: string) => Promise.resolve(void written.push(text)) },
    });
    await openPlanner(cleaver);
    openMenu();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeEnabled());
    menuItem('Copy link');
    await screen.findByRole('menuitem', { name: 'Link copied.' });
    expect(written[0]).toBe(`${location.origin}/${location.hash}`);
    menuItem('Export as text');
    await screen.findByRole('menuitem', { name: 'Build sheet copied.' });
    expect(written[1]).toContain('Level 1: Fighter 1 · Power Attack');
  });
});

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
    openCharacter();
    tap('Raise Dexterity');
    tap('Lower Strength');
    await waitFor(() => expect(dialog()).not.toBeNull());
    fireEvent.keyDown(dialog() ?? window, { key: 'z', metaKey: true });
    flush();
    expect(dialog()).toBeNull();
    const values = [...document.querySelectorAll('.trail-stat__value')].map((v) => v.textContent);
    expect(values.slice(0, 2)).toEqual(['13', '11']);
    expect(document.querySelector('[inert]:not(.planner-build__trail)')).toBeNull();
    expect(button('Undo')).toBeEnabled();
  });

  test('a chip’s pick that waits on the Cascade preview keeps its step open, also after Cancel', async () => {
    await openPlanner(cleaver, true);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    const toughness = [...document.querySelectorAll('.trail-here button.ww-option')].find((o) =>
      o.textContent?.includes('Toughness'),
    );
    expect(toughness).toBeDefined();
    fireEvent.click(toughness ?? document.body);
    flush();
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(hereTitle()).toBe('Level 1 · choose feat');
    tap(/^Cancel/);
    expect(hereTitle()).toBe('Level 1 · choose feat');
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
    openCharacter();
    const lower = button('Lower Strength');
    lower.focus();
    fireEvent.click(lower);
    flush();
    await waitFor(() => expect(dialog()).not.toBeNull());
    tap(/^Cancel/);
    await waitFor(() => expect(document.activeElement).toBe(button('Lower Strength')));
  });

  test('a Cascade confirmed lands on the first pick it cleared', async () => {
    await openPlanner(cleaver);
    await openPreview();
    tap(/^Clear 2 picks/);
    expect(dialog()).toBeNull();
    expect(hereTitle()).toBe('Level 1 · choose feat');
    expect(document.querySelector('.planner-undo')?.textContent).toContain('Strength 12');
  });

  test('Clear this pick comes after the options (comparison bug 3)', async () => {
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    const option = document.querySelector<HTMLElement>('.trail-here button.ww-option');
    const clear = button('Clear this pick');
    expect(option !== null && option.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('side by side becomes one Build, its segment pressed, after narrowing to phone width', async () => {
    await openPlanner(cleaver);
    openMenu();
    menuItem('Fork this Build');
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
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    const before = gate.decoded;
    pasteHash(`#b=${await storedBlockCode(code ?? '')}`);
    await waitFor(() => expect(gate.decoded).toBeGreaterThan(before));
    await new Promise((r) => setTimeout(r, 20));
    flush();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
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
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'Making the link…' })).toBeDisabled();
    expect(location.hash).not.toMatch(/#b=$/);
    held.release();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeEnabled());
  });

  test('a stop names a class the class list doesn’t offer', () => {
    trailOf({ levels: [{ class: MYTHIC_HERO }], picks: [] });
    expect(document.querySelector('.trail-stop__class')?.textContent).toBe(`${nameOf(e.data, MYTHIC_HERO)} 1`);
  });

  test('the race chip the Build holds is pressed after a change (comparison bug 1)', async () => {
    await openPlanner(cleaver);
    openCharacter();
    tap('Human');
    expect(button('Human')).toHaveAttribute('aria-pressed', 'true');
    expect(button('Elf')).toHaveAttribute('aria-pressed', 'false');
  });

  test('before level 1 the stats say they are the point buy only (comparison bug 4)', async () => {
    await openPlanner({ levels: [], picks: [] });
    expect(screen.getByText(/Point buy only/)).toBeTruthy();
    cleanup();
    await openPlanner(cleaver);
    expect(screen.queryByText(/Point buy only/)).toBeNull();
  });

  test('picker lists are in name order (audit: deities and Weapon Focus out of order)', () => {
    render(() => <SlotStep trail={apiOf(createPlanner(e, cleaver))} slot={slotNamed(cleaver, 'DeitySelection')} />);
    flush();
    const names = [...document.querySelectorAll('.ww-option .ww-option__name')].map((n) => n.textContent ?? '');
    expect(names.length).toBeGreaterThan(5);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test('the closed summary names each reason once (audit)', () => {
    render(() => <SlotStep trail={apiOf(createPlanner(e, cleaver))} slot={slotNamed(cleaver, 'BasicFeatSelection')} />);
    flush();
    const summary = document.querySelector('.ww-count')?.textContent ?? '';
    const labels = summary
      .replace(/^\d+ more closed: /, '')
      .split(', ')
      .map((part) => part.replace(/^\d+ /, ''));
    expect(labels.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test('the alignment wheel names the alignment under focus, else the chosen one, and marks it', async () => {
    await openPlanner(undefined);
    const name = () => document.querySelector('.trail-alignment-name')?.textContent;
    expect(name()).toBe('Choose an alignment');
    const evil = button('Chaotic Evil');
    expect(evil.className).toContain('trail-alignment__node--se');
    expect(evil.className).toContain('trail-alignment__node--evil');
    fireEvent.focus(evil);
    flush();
    expect(name()).toBe('Chaotic Evil');
    fireEvent.blur(evil);
    flush();
    expect(name()).toBe('Choose an alignment');
    tap('Neutral Good');
    expect(name()).toBe('Neutral Good');
    expect(button('Neutral Good')).toHaveAttribute('aria-pressed', 'true');
    expect(button('Neutral Good').className).toContain('trail-alignment__node--on');
  });

  test('the +2 row keeps its place for a race whose bonuses are fixed (audit: layout shift)', async () => {
    const elf = [...e.data.blueprints.values()].find((b) => b.$type === 'BlueprintRace' && b.name === 'Elf');
    if (elf === undefined) throw new Error('no Elf');
    await openPlanner({ ...cleaver, race: elf.guid });
    openCharacter();
    expect(button('Racial +2 to Strength')).toBeDisabled();
    expect(screen.getByText(/Elf sets its bonuses/)).toBeTruthy();
  });

  test('a refusal shows in the floating notice area, not in the page flow (audit: layout shift)', async () => {
    await openPlanner(cleaver);
    openCharacter();
    for (let i = 0; i < 5; i++) tap('Raise Strength');
    for (let i = 0; i < 6; i++) tap('Raise Dexterity');
    await waitFor(() => expect(document.querySelector('.planner-notices [role="alert"]')).not.toBeNull());
  });

  test('the Skills chip says what the level holds (audit)', () => {
    trailOf({
      ...cleaver,
      levels: cleaver.levels.map((l, i) => (i === 0 ? { ...l, skills: skillRanks({ SkillAthletics: 1 }) } : l)),
    });
    expect(chipNamed('Skills').textContent).toMatch(/1 (rank|of)/);
  });

  test('a score steps no lower than 7 and no higher than 18', async () => {
    await openPlanner({ ...cleaver, scores: abilityScores({ ...SCORES, Strength: 7, Dexterity: 18 }) });
    openCharacter();
    expect(button('Lower Strength')).toBeDisabled();
    expect(button('Raise Dexterity')).toBeDisabled();
  });

  test('Close keeps the Build being edited, the second one', async () => {
    await openPlanner(cleaver);
    openMenu();
    menuItem('Fork this Build');
    const second = document.querySelectorAll('section.planner-build')[1];
    const title = second?.querySelector<HTMLElement>('.trail-stop__class');
    fireEvent.click(title ?? document.body);
    flush();
    tap('Remove level 1');
    expect(levelRows()).toBe(1);
    tap(/^Close the fork/);
    tap('Keep Second');
    expect(levelRows()).toBe(0);
  });

  test('Close the fork asks before dropping the other Build, and Cancel keeps both (audit)', async () => {
    await openPlanner(cleaver);
    openMenu();
    menuItem('Fork this Build');
    tap(/^Close the fork/);
    expect(document.querySelectorAll('section.planner-build').length).toBe(2);
    expect(screen.getByText(/drop the First Build\?/)).toBeTruthy();
    tap('Cancel');
    expect(document.querySelectorAll('section.planner-build').length).toBe(2);
    expect(screen.queryByText(/drop the First Build\?/)).toBeNull();
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
