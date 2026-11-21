import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { createSignal, flush } from 'solid-js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { abilityScores, rankLevel, skillRanks, slotKey, type Build, type BuildName, type SlotId } from '~engine/build';
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
import { picker, type OptionStatus } from '~engine/pickers';
import { GROUP_WORDS, stackWords, topicWords } from '~engine/links';
import { buildNameLength, linkDidNotOpen, nameOf } from '~engine/refusals';
import { walk } from '~engine/walk';

import { EMPTY, openHash } from './link';
import Planner, { RefusalNotice } from './Planner';
import { buildSheet } from './sheet';
import { createPlanner, type Planner as PlannerApi } from './state';
import { ChoiceList } from './ChoiceList';
import { PickerOption } from '../design';
import { pageTitle } from './BuildName';
import { isListStep } from './list-mode';
import { ChoiceDialog } from './ChoiceDialog';
import { GearStep, placeWords } from './GearStep';
import { summaryFor } from './option-detail';
import { LevelEditor, MythicStep, NextLevelStep, RankEditor, SkillsStep, SlotStep, type TrailApi } from './steps';
import Trail from './Trail';
import {
  nestedLabel,
  nextStep,
  reduceTrail,
  SPELL_NOT_MODELLED,
  spellPick,
  TRAIL_START,
  type TrailState,
} from './trail-state';
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
  const [s, setS] = createSignal(state);
  let selection: Selection | undefined;
  return {
    planner,
    view: () => ({ data: e.data, build: planner.build(), walk: planner.walked() }),
    state: () => s(),
    send: (a) => {
      setS((now) => reduceTrail(now, a));
    },
    selection: () => selection,
    select: (next) => {
      selection = next;
    },
    edit: (edit, title) => planner.edit(edit, title),
    editAll: (edits, title) => planner.editAll(edits, title),
  };
}

describe('a Build code from the MCP opens the same Build in the UI', () => {
  afterEach(() => {
    cleanup();
  });

  test('every step of a Fighter built through the MCP', { timeout: 120_000 }, async () => {
    const steps = await fighterThroughMcp();
    expect(steps.length).toBeGreaterThan(4);
    for (const step of steps) {
      const opened = await openedBuild(`#b=${step.code}`);
      expect(ordered(opened)).toEqual(ordered(step.build));
      expect(await encodeBuild(e.data, opened)).toBe(step.code);
      const shown = trailOf(opened);
      expect(shown.querySelectorAll(LEVEL_STOPS).length).toBe(opened.levels.length);
      const text = [shown.textContent ?? '', ...[...shown.querySelectorAll('input')].map((i) => i.value)].join(' ');
      for (const p of opened.picks) {
        expect(text).toContain(optionName(e.data, p.feature, p.param));
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
    expect(container.querySelector('.trail-field--target .trail-field__label')?.textContent).toBe('Race');
    flush();
    expect(location.hash).toBe('#b=*');
    tap('Raise Strength');
    await waitFor(() => expect(location.hash).not.toBe('#b=*'));
    expect(screen.getByText(linkDidNotOpen('load', 'notACode'))).toBeTruthy();
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
const DWARF = 'c4faf439f0e70bd40b5e36ee80d06be7';
const DWARF_HERITAGE: SlotId = { place: { level: 1 }, selection: 'fd6e1f53589049cbbbc6a8e058d83b74', index: 0 };
const BASIC_DWARF = '8b2da1d0f9504872809e63b39c24c502';

const cleaver: Build = {
  scores: abilityScores(SCORES),
  race: DWARF,
  alignment: 'TrueNeutral',
  levels: [{ class: fighter }],
  picks: [
    { slot: DWARF_HERITAGE, feature: BASIC_DWARF },
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

function activeFilter(): HTMLInputElement | null {
  return (
    document.querySelector<HTMLInputElement>('.trail-field--target [data-picker-filter]') ??
    document.querySelector<HTMLInputElement>('.trail-here [data-picker-filter]')
  );
}

function showList(): void {
  activeFilter()?.focus();
  flush();
}

function field(label: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('.trail-field')].find(
    (f) => f.querySelector('.trail-field__label')?.textContent === label,
  );
  if (found === undefined) throw new Error(`no field ${label}`);
  return found;
}

function fieldValue(label: string): string {
  return field(label).querySelector<HTMLInputElement>('input')?.value ?? '';
}

function openField(label: string): void {
  const input = field(label).querySelector<HTMLInputElement>('input');
  input?.focus();
  fireEvent.click(input ?? document.body);
  flush();
}

function stepRoot(): HTMLElement | null {
  return (
    document.querySelector('.trail-field--target')?.closest<HTMLElement>('.trail-choices, .trail-step') ??
    document.querySelector<HTMLElement>('.trail-here')
  );
}

function fieldTake(label: string, text: string): void {
  const input = field(label).querySelector<HTMLInputElement>('input');
  if (input === null) throw new Error(`no input in ${label}`);
  input.focus();
  fireEvent.input(input, { target: { value: text } });
  flush();
  fireEvent.keyDown(input, { key: 'Enter' });
  flush();
}

function openTarget(): void {
  const input = document.querySelector<HTMLInputElement>('.trail-field--target input');
  if (input !== null) {
    input.focus();
    flush();
    return;
  }
  tap('Open the list');
}

const targetField = () => document.querySelector('.trail-field--target .trail-field__label')?.textContent ?? undefined;

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

function filterAndTake(text: string): void {
  const filter = activeFilter();
  if (filter === null) throw new Error('no filter');
  fireEvent.input(filter, { target: { value: text } });
  flush();
  fireEvent.keyDown(filter, { key: 'Enter' });
  flush();
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

  test('a fresh Build opens on the race, then the ability scores, which stay open through their edits until Done', async () => {
    await openPlanner(undefined);
    expect(targetField()).toBe('Race');
    expect(fieldValue('Race')).toBe('');
    expect(field('Race').querySelector('input')?.getAttribute('placeholder')).toBe('Choose your race');
    expect(field('Race').classList.contains('trail-field--unset')).toBe(true);
    expect(field('Race').closest('.trail-race')).not.toBeNull();
    showList();
    tap(/^Human$/);
    expect(hereTitle()).toBe('Your character · set the ability scores');
    tap('Raise Strength');
    expect(hereTitle()).toBe('Your character · set the ability scores');
    expect(screen.queryByRole('button', { name: 'Back to the next choice' })).toBeNull();
    tap(/^Done/);
    expect(hereTitle()).toBeUndefined();
    expect(document.querySelector('.trail-alignment-field--target')).not.toBeNull();
    expect(document.querySelector('.trail-alignment-name--unset')).not.toBeNull();
    await waitFor(() => expect(document.activeElement?.closest('.trail-alignment')).not.toBeNull());
    tap('Lawful Good');
    expect(hereTitle()).toBe('Begin · choose a first class');
  });

  test('the race step is only the labeled Race field: no heading, Back or Expand, and focus opens its list (user)', async () => {
    await openPlanner(undefined);
    expect(document.querySelector('.trail-here')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back to the next choice' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand' })).toBeNull();
    expect(field('Race').closest('.trail-race')?.querySelector('button.ww-option')).toBeNull();
    openField('Race');
    const row = field('Race').closest('.trail-race')?.querySelector('button.ww-option');
    expect(row).not.toBeNull();
    const tiles = document.querySelector('[aria-label="The character"] [aria-label="Raise Strength"]');
    expect(row?.compareDocumentPosition(tiles ?? document.body)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    fireEvent.click(row ?? document.body);
    flush();
    expect(fieldValue('Race')).not.toBe('');
    expect(hereTitle()).toBe('Your character · set the ability scores');
  });

  test('"Back to the next choice" shows only after jumping away from the next choice (user)', async () => {
    await openPlanner(cleaver);
    expect(targetField()).toBe('Background');
    expect(screen.queryByRole('button', { name: 'Back to the next choice' })).toBeNull();
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    expect(hereTitle()).toBe('Level 1 · choose feat');
    tap('Back to the next choice');
    expect(document.querySelector('.trail-here')).toBeNull();
    expect(targetField()).toBe('Background');
  });

  test('the race list holds each race with its heritages, and one row takes both as one change', async () => {
    await openPlanner({ scores: abilityScores(SCORES), alignment: 'TrueNeutral', levels: [], picks: [] });
    expect(targetField()).toBe('Race');
    filterAndTake('rakshasa');
    expect(hereTitle()).toBe('Begin · choose a first class');
    expect(document.querySelector('.planner-undo__what')?.textContent).toBe(
      'Race Tiefling · Beastbrood (Rakshasa-Spawn)',
    );
    expect(fieldValue('Race')).toBe('Tiefling · Beastbrood (Rakshasa-Spawn)');
  });

  test('the class list holds each class with its archetypes, and one row takes both as one change', async () => {
    await openPlanner({ scores: abilityScores(SCORES), race: DWARF, alignment: 'TrueNeutral', levels: [], picks: [] });
    filterAndTake('two-handed fighter');
    expect(levelRows()).toBe(1);
    expect(document.querySelector('.planner-undo__what')?.textContent).toBe('Level 1 as Fighter · Two-Handed Fighter');
    expect(chipNamed('Archetype').textContent).toContain('Two-Handed Fighter');
    tap('Undo');
    expect(levelRows()).toBe(0);
  });

  test('the background list holds each group with its variations', async () => {
    await openPlanner(cleaver);
    fieldTake('Background', 'courtier');
    expect(fieldValue('Background')).toBe('Noble (Courtier)');
    expect(document.querySelector('.planner-undo__what')?.textContent).toBe('Background Noble (Courtier)');
  });

  test(
    'at the level cap the trail ends on the cap level, with no closing stop (user, 2026-11-21)',
    { timeout: 120_000 },
    () => {
      const finished = everyChoiceMade(jackInTheGreen.build);
      render(() => (
        <Trail
          planner={createPlanner(e, finished)}
          state={{ ...TRAIL_START, skillsLeft: new Set([20]) }}
          send={() => {}}
          selection={undefined}
          select={() => {}}
          phone={false}
        />
      ));
      flush();
      expect(document.querySelector('.trail-stop--next')).toBeNull();
      expect(document.querySelector('.trail-here')).toBeNull();
      const levels = [...document.querySelectorAll(LEVEL_STOPS)].map(
        (li) => li.querySelector('.trail-stop__mark')?.textContent,
      );
      expect(levels.at(-1)).toBe('20');
    },
  );

  test('a Build whose scores are set opens past them', async () => {
    await openPlanner({ scores: abilityScores(SCORES), race: DWARF, alignment: 'TrueNeutral', levels: [], picks: [] });
    expect(hereTitle()).toBe('Begin · choose a first class');
  });

  test('a reload keeps the Build, through the #b= link', async () => {
    await openPlanner(undefined);
    showList();
    tap(/^Human$/);
    tap(/^Done/);
    tap('Lawful Good');
    tap(/^Fighter$/);
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
    const first = targetField();
    expect(first).toBeTruthy();
    showList();
    const option = stepRoot()?.querySelector<HTMLElement>('button.ww-option');
    const name = option?.querySelector('.ww-option__name')?.textContent ?? '';
    fireEvent.click(option ?? document.body);
    flush();
    expect(targetField() ?? hereTitle()).not.toBe(first);
    expect(document.querySelector('.planner-undo')?.textContent).toContain(name);
    tap('Undo');
    expect(targetField()).toBe(first);
  });

  test('race, +2, alignment and score edits reach the Undo line, and an undo names the change before', async () => {
    await openPlanner(undefined);
    const line = () => document.querySelector('.planner-undo__what')?.textContent;
    showList();
    tap(/^Human$/);
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
    expect(fieldValue('Race')).toBe('Dwarf · Basic');
    expect(button('Lawful Good')).toBeTruthy();
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
    const api = apiOf(createPlanner(e, ranked));
    render(() => <RankEditor trail={api} rank={1} />);
    flush();
    tap(/^Show \d+ closed$/);
    const names = [...document.querySelectorAll('.ww-option__name')].map((n) => n.textContent);
    expect(names).toContain('Aeon');
    expect(names).not.toContain('Mythic Companion');
    expect(names).not.toContain('Shard Powers');
  });

  test('before any rank the starting path comes first but is not marked current (QA pass 1)', () => {
    const levels = Array.from({ length: 10 }, () => ({ class: fighter }));
    render(() => <MythicStep trail={apiOf(createPlanner(e, { ...cleaver, levels }))} />);
    flush();
    expect(document.querySelector('button.ww-option .ww-option__name')?.textContent).toBe(nameOf(e.data, MYTHIC_HERO));
    expect(document.querySelector('button.ww-option[aria-current="true"]')).toBeNull();
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
    await waitFor(() => expect(document.querySelector('.planner-menu__said')?.textContent).toBe('Link copied.'));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(written[0]).toBe(`${location.origin}/${location.hash}`);
    openMenu();
    menuItem('Export as text');
    await waitFor(() => expect(document.querySelector('.planner-menu__said')?.textContent).toBe('Build sheet copied.'));
    expect(screen.queryByRole('menu')).toBeNull();
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
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(document.activeElement?.closest('[role="dialog"]')).toBeNull();
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
    tap(/^Clear 2 choices/);
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

  test('a failed paste keeps the pasted link until the Build is edited (QA pass 1)', async () => {
    const code = await openPlanner(cleaver);
    pasteHash('#b=not-a-build-code');
    await waitFor(() => expect(document.querySelector('.planner-notice')).not.toBeNull());
    expect(location.hash).toBe('#b=not-a-build-code');
    tap('Lawful Good');
    await waitFor(() => expect(location.hash).not.toBe('#b=not-a-build-code'));
    expect(location.hash).not.toBe(`#b=${code}`);
    expect(location.hash).toMatch(/^#b=./);
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

  test('the race the Build holds is marked after a change (comparison bug 1)', async () => {
    await openPlanner(cleaver);
    openField('Race');
    expect(button(/^Dwarf · Basic/)).toHaveAttribute('aria-current', 'true');
    tap(/^Elf · Basic/);
    openField('Race');
    expect(button(/^Elf · Basic/)).toHaveAttribute('aria-current', 'true');
    expect(button(/^Dwarf · Basic/)).not.toHaveAttribute('aria-current');
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

  test('Dismiss on a refusal leaves focus on a control, not the page (QA pass 3)', async () => {
    await openPlanner(cleaver);
    openCharacter();
    for (let i = 0; i < 5; i++) tap('Raise Strength');
    for (let i = 0; i < 6; i++) tap('Raise Dexterity');
    await waitFor(() => expect(document.querySelector('.planner-notices [role="alert"]')).not.toBeNull());
    const dismiss = within(document.querySelector<HTMLElement>('.planner-notices') ?? document.body).getByRole(
      'button',
      { name: 'Dismiss' },
    );
    dismiss.focus();
    fireEvent.click(dismiss);
    flush();
    await waitFor(() => expect(document.querySelector('.planner-notices [role="alert"]')).toBeNull());
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(document.activeElement?.isConnected).toBe(true);
  });

  test('Escape on the open menu returns focus to its button (QA pass 3)', async () => {
    await openPlanner(cleaver);
    openMenu();
    screen.getAllByRole('menuitem')[0]?.focus();
    fireEvent.keyDown(document.activeElement ?? document, { key: 'Escape' });
    flush();
    expect(screen.queryByRole('menu')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(button('Build menu')));
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

  test('loadEngine asks again after a failed load', { timeout: 60_000 }, async () => {
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

describe('QA pass 1', () => {
  afterEach(() => {
    cleanup();
    history.replaceState(null, '', '/');
  });

  const skilled = (first: Record<string, number>, second: Record<string, number>): Build => ({
    ...withLevels(2),
    levels: [
      { class: fighter, skills: skillRanks(first) },
      { class: fighter, skills: skillRanks(second) },
    ],
  });

  test('"Same as level N−1" shows only when it would change the level', async () => {
    const differ = createPlanner(e, skilled({ SkillAthletics: 1 }, { SkillMobility: 1 }));
    const { unmount } = render(() => <SkillsStep trail={apiOf(differ)} level={2} />);
    flush();
    await waitFor(() => expect(button('Same as level 1')).toBeTruthy());
    tap('Same as level 1');
    expect(differ.build().levels[1]?.skills).toEqual({ SkillAthletics: 1 });
    expect(screen.queryByRole('button', { name: 'Same as level 1' })).toBeNull();
    unmount();
  });

  test('"Same as level N−1" stays hidden when the walk refuses it (QA pass 2)', async () => {
    const planner = createPlanner(e, {
      ...withLevels(3),
      levels: [{ class: fighter }, { class: fighter, skills: skillRanks({ SkillAthletics: 2 }) }, { class: fighter }],
    });
    render(() => <SkillsStep trail={apiOf(planner)} level={3} />);
    flush();
    await waitFor(() => expect(button(/^More Mobility/)).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'Same as level 2' })).toBeNull();
  });

  test('the + skill stepper is disabled at the rank cap, as the score steppers are', async () => {
    const planner = createPlanner(e, {
      ...withLevels(1),
      levels: [{ class: fighter, skills: skillRanks({ SkillAthletics: 1 }) }],
    });
    render(() => <SkillsStep trail={apiOf(planner)} level={1} />);
    flush();
    await waitFor(() => expect(button(/^More Athletics/)).toBeDisabled());
    expect(button(/^More Mobility/)).toBeEnabled();
  });

  test('taking a skill’s last rank moves focus to its other stepper, not the page (QA pass 3)', async () => {
    const planner = createPlanner(e, {
      ...withLevels(1),
      levels: [{ class: fighter, skills: skillRanks({ SkillAthletics: 1 }) }],
    });
    render(() => <SkillsStep trail={apiOf(planner)} level={1} />);
    flush();
    const fewer = await waitFor(() => {
      const b = button(/^Fewer Athletics/);
      expect(b).toBeEnabled();
      return b;
    });
    fewer.focus();
    fireEvent.click(fewer);
    flush();
    await waitFor(() => expect(button(/^Fewer Athletics/)).toBeDisabled());
    await waitFor(() => expect(document.activeElement).toBe(button(/^More Athletics/)));
  });

  test('in the filter, Up and Down move the marked row Enter takes; on the rows, they move focus as J and K do', () => {
    const taken: string[] = [];
    const rows = Array.from({ length: 14 }, (_, i) => ({
      key: `r${i}`,
      name: `Row ${String(i).padStart(2, '0')}`,
      open: true,
      reasons: [],
      current: false,
      take: () => void taken.push(`r${i}`),
    }));
    render(() => <ChoiceList label="Filter rows" rows={rows} />);
    flush();
    const options = () => [...document.querySelectorAll<HTMLElement>('button.ww-option')];
    const marked = () => document.querySelector('button.ww-option--marked')?.textContent;
    const filter = screen.getByRole('searchbox', { name: 'Filter rows' });
    filter.focus();
    expect(marked()).toContain('Row 00');
    fireEvent.keyDown(filter, { key: 'ArrowDown' });
    flush();
    expect(marked()).toContain('Row 01');
    expect(document.activeElement).toBe(filter);
    fireEvent.keyDown(filter, { key: 'Enter' });
    expect(taken).toEqual(['r1']);
    options()[0]?.focus();
    fireEvent.keyDown(options()[0] ?? document.body, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options()[1]);
    fireEvent.keyDown(options()[1] ?? document.body, { key: 'k' });
    expect(document.activeElement).toBe(options()[0]);
  });

  test('the filter matches each typed word, and says when nothing matches', () => {
    const rows = [
      'Tiefling · Beastbrood (Rakshasa-Spawn)',
      'Tiefling · Pitborn (Demon-Spawn)',
      ...Array.from({ length: 12 }, (_, i) => `Elf ${i}`),
    ].map((name, i) => ({ key: `r${i}`, name, open: true, reasons: [], current: false, take: () => {} }));
    render(() => <ChoiceList label="Filter races" rows={rows} />);
    flush();
    const filter = screen.getByRole('searchbox', { name: 'Filter races' });
    fireEvent.input(filter, { target: { value: 'tiefling rak' } });
    flush();
    expect([...document.querySelectorAll('.ww-option__name')].map((n) => n.textContent)).toEqual([
      'Tiefling · Beastbrood (Rakshasa-Spawn)',
    ]);
    fireEvent.input(filter, { target: { value: 'gnoll' } });
    flush();
    expect(screen.getByText('No matches for “gnoll”.')).toBeTruthy();
  });

  test('closed rows show a few per reason, then count the rest by reason', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      key: `c${i}`,
      name: `Closed ${i}`,
      open: false,
      reasons: ['Needs a level 1 Build.'],
      current: false,
      take: () => {},
    }));
    render(() => <ChoiceList label="Filter" rows={rows} />);
    flush();
    expect(document.querySelectorAll('.ww-option--closed').length).toBe(0);
    expect(screen.getByText('No choices open here.')).toBeTruthy();
    tap('Show 10 closed');
    expect(document.querySelectorAll('.ww-option--closed').length).toBe(10);
    expect(screen.queryByRole('button', { name: 'Show all closed' })).toBeNull();
    tap('Hide closed');
    expect(document.querySelectorAll('.ww-option--closed').length).toBe(0);
    expect(button('Show 10 closed')).toBeTruthy();
  });

  test('a choice list scrolls inside a capped height, and keeps the current pick when it is closed', () => {
    const rows = [
      { key: 'held', name: 'Held', open: false, reasons: ['No longer fits.'], current: true, take: () => {} },
      ...Array.from({ length: 12 }, (_, i) => ({
        key: `o${i}`,
        name: `Open ${i}`,
        open: true,
        reasons: [],
        current: false,
        take: () => {},
      })),
    ];
    render(() => <ChoiceList label="Filter" rows={rows} />);
    flush();
    const scroll = document.querySelector<HTMLElement>('.trail-scroll');
    expect(scroll?.getAttribute('style')).toContain('max-height: var(--choice-list-max)');
    expect(scroll?.getAttribute('style')).toContain('overflow-y: auto');
    expect(scroll?.querySelector('.trail-filter')).toBeNull();
    const held = [...document.querySelectorAll('.ww-option--closed')];
    expect(held.map((r) => r.querySelector('.ww-option__name')?.textContent)).toEqual(['Held']);
    expect(held[0]?.textContent).toContain('Current');
    expect(button('Show 1 closed')).toBeTruthy();
  });

  test('the class list names each class and archetype once, without the classes the game hides', () => {
    const planner = createPlanner(e, { scores: abilityScores(SCORES), race: DWARF, levels: [], picks: [] });
    render(() => <NextLevelStep trail={apiOf(planner)} />);
    flush();
    const names = [...document.querySelectorAll('.ww-option__name')].map((n) => n.textContent ?? '');
    expect(names.length).toBeGreaterThan(40);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

  test('⌘Z undoes from a filter that is empty', async () => {
    await openPlanner(cleaver);
    showList();
    const option = stepRoot()?.querySelector<HTMLElement>('button.ww-option');
    fireEvent.click(option ?? document.body);
    flush();
    const filter = activeFilter();
    expect(filter?.value).toBe('');
    const before = document.querySelector('.planner-undo__what')?.textContent;
    fireEvent.keyDown(filter ?? window, { key: 'z', metaKey: true });
    flush();
    expect(document.querySelector('.planner-undo__what')?.textContent).not.toBe(before);
  });

  test("pick lists show bare names, not the importer's qualifiers", async () => {
    await openPlanner({ ...cleaver, picks: cleaver.picks.filter((p) => slotKey(p.slot) !== slotKey(FEAT)) });
    fireEvent.click(chipNamed('Feat'));
    flush();
    const names = [...document.querySelectorAll('.trail-here .ww-option__name')].map((n) => n.textContent ?? '');
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => n.endsWith(' (feature)'))).toEqual([]);
  });

  test('after a pick, focus lands on the next step, never on the page body', async () => {
    await openPlanner(cleaver);
    showList();
    const first = stepRoot()?.querySelector<HTMLElement>('button.ww-option');
    first?.focus();
    fireEvent.click(first ?? document.body);
    flush();
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(stepRoot()?.contains(document.activeElement)).toBe(true);
  });

  test('a tile’s controls fill their track and set no width wider than it (user, 2026-11-21)', () => {
    const css = readFileSync(join(process.cwd(), 'src/planner/planner.css'), 'utf8');
    const rule = (selector: string) => {
      const at = css.indexOf(`${selector} {`);
      expect(at).toBeGreaterThanOrEqual(0);
      return css.slice(at, css.indexOf('}', at));
    };
    for (const selector of ['.trail-stepper', '.trail-plus2']) {
      const body = rule(selector);
      expect(body).toContain('box-sizing: border-box');
      expect(body).toContain('width: 100%');
      expect(body).toContain('min-width: 0');
      expect(body).not.toMatch(/min-width: \d+px/);
    }
    expect(rule('.trail-stat__steps')).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(rule('.trail-stats')).toContain('minmax(0, 1fr)');
    expect(rule('.trail-stat')).toContain('min-width: 0');
    expect(rule('.trail-stat')).toContain('padding: var(--space-2) 0;');
  });

  test('the page opens with nothing focused or scrolled, and the step takes both once it moves (ticket 11)', async () => {
    const scrolled = vi.fn();
    Element.prototype.scrollIntoView = scrolled;
    try {
      await openPlanner(cleaver);
      expect(document.activeElement).toBe(document.body);
      expect(scrolled).not.toHaveBeenCalled();
      showList();
      const option = stepRoot()?.querySelector<HTMLElement>('button.ww-option');
      fireEvent.click(option ?? document.body);
      flush();
      await waitFor(() => expect(scrolled).toHaveBeenCalled());
      await waitFor(() => expect(stepRoot()?.contains(document.activeElement)).toBe(true));
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  test('a long refusal puts its first lines in a capped area and folds the rest into "…and N more" (QA pass 2)', () => {
    const lines = [
      'That change can’t be made. It would break:',
      ...Array.from({ length: 12 }, (_, i) => `Line ${i + 1}.`),
    ] as const;
    render(() => <RefusalNotice lines={lines} onDismiss={() => {}} />);
    flush();
    const shown = () => [...document.querySelectorAll('.ww-refusal li')].map((li) => li.textContent);
    expect(shown()).toEqual(['Line 1.', 'Line 2.', 'Line 3.', 'Line 4.', 'Line 5.']);
    tap('…and 7 more');
    expect(shown()).toHaveLength(12);
    const css = readFileSync(join(process.cwd(), 'src/planner/planner.css'), 'utf8');
    const at = css.indexOf('.planner-notices {');
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toContain('max-height: var(--notice-max-height)');
    expect(rule).toContain('overflow-y: auto');
  });

  test('a refused copy keeps the menu label and says why in the status (QA pass 2)', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
    await openPlanner(cleaver);
    openMenu();
    menuItem('Export as text');
    await waitFor(() =>
      expect(document.querySelector('.planner-menu__said')?.textContent).toBe('Copy refused by the browser'),
    );
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'Export as text' })).toBeTruthy();
  });

  test('the ⋯ menu closes after any item, and when the page’s link changes (QA pass 3)', async () => {
    await openPlanner(cleaver);
    openMenu();
    menuItem('Export as text');
    expect(screen.queryByRole('menu')).toBeNull();
    openMenu();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Inline first' }));
    flush();
    expect(screen.queryByRole('menu')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(button('Build menu')));
    openMenu();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    flush();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a broken pasted link says it is not a planner link unless it reads as a newer one (QA pass 2)', async () => {
    expect(await openHash(e, '#b=not-a-build-code')).toEqual({ kind: 'didNotOpen', reason: 'notACode' });
    const code = await encodeBuild(e.data, cleaver);
    const bytes = Uint8Array.from(
      atob(code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4)),
      (c) => c.charCodeAt(0),
    );
    bytes[0] = 2;
    const newer = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(await openHash(e, `#b=${newer}`)).toEqual({ kind: 'didNotOpen', reason: 'newerPlanner' });
  });

  test('the level editor lists archetypes by name, the current one first (QA pass 2)', () => {
    const planner = createPlanner(e, cleaver);
    const api = apiOf(planner);
    render(() => <LevelEditor trail={api} level={1} />);
    flush();
    const list = [...document.querySelectorAll('.trail-subhead')].find(
      (h) => h.textContent === 'Archetype',
    )?.nextElementSibling;
    const names = [...(list?.querySelectorAll('button.ww-option .ww-option__name') ?? [])].map(
      (n) => n.textContent ?? '',
    );
    expect(names[0]).toBe('No archetype');
    const rest = names.slice(1);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  test('"No archetype" stays first when an archetype is held (QA pass 3)', () => {
    const fighterClass = cleaver.levels[0]?.class ?? '';
    const twoHanded = [...e.data.blueprints.values()].find(
      (b) => b.$type === 'BlueprintArchetype' && nameOf(e.data, b.guid) === 'Two-Handed Fighter',
    );
    if (twoHanded === undefined) throw new Error('no Two-Handed Fighter');
    const held: Build = { ...cleaver, classChoices: { [fighterClass]: { archetypes: [twoHanded.guid] } } };
    render(() => <LevelEditor trail={apiOf(createPlanner(e, held))} level={1} />);
    flush();
    const list = [...document.querySelectorAll('.trail-subhead')].find(
      (h) => h.textContent === 'Archetype',
    )?.nextElementSibling;
    const names = [...(list?.querySelectorAll('button.ww-option .ww-option__name') ?? [])].map(
      (n) => n.textContent ?? '',
    );
    expect(names.slice(0, 2)).toEqual(['No archetype', 'Two-Handed Fighter']);
  });

  test('Gear places read as words with their number', () => {
    expect(placeWords('Ring1')).toBe('Ring 1');
    expect(placeWords('MainHand')).toBe('Main Hand');
  });

  test('"Show N closed" shows every closed option in one step (QA pass 3)', async () => {
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    expect(document.querySelectorAll('.trail-here .ww-option--closed').length).toBe(0);
    const label = [...document.querySelectorAll('.trail-here button')]
      .map((b) => b.textContent ?? '')
      .find((t) => /^Show \d+ closed$/.test(t));
    const n = Number(/\d+/.exec(label ?? '')?.[0]);
    expect(n).toBeGreaterThan(30);
    tap(/^Show \d+ closed$/);
    expect(document.querySelectorAll('.trail-here .ww-option--closed').length).toBe(n);
    expect(screen.queryByRole('button', { name: 'Show all closed' })).toBeNull();
  });
});

describe('nested sub-choices (ticket 08)', () => {
  afterEach(() => {
    cleanup();
  });

  const fighter1: Build = {
    scores: abilityScores({ ...SCORES, Dexterity: 13, Intelligence: 13 }),
    race: DWARF,
    levels: [{ class: fighter }],
    picks: [{ slot: DWARF_HERITAGE, feature: BASIC_DWARF }],
  };
  const featList = () => {
    const planner = createPlanner(e, fighter1);
    const api = apiOf(planner);
    render(() => <SlotStep trail={api} slot={FEAT} />);
    flush();
    return planner;
  };
  const parent = (name: string): HTMLElement => {
    const found = [...document.querySelectorAll<HTMLElement>('[data-parent] > .ww-option')].find(
      (b) => b.querySelector('.ww-option__name')?.textContent === name,
    );
    if (found === undefined) throw new Error(`no parent ${name}`);
    return found;
  };
  const child = (name: string): HTMLElement => {
    const found = [...document.querySelectorAll<HTMLElement>('[data-child-of] .ww-option')].find(
      (b) => b.querySelector('.ww-option__name')?.textContent === name,
    );
    if (found === undefined) throw new Error(`no choice ${name}`);
    return found;
  };
  const click = (el: HTMLElement) => {
    fireEvent.click(el);
    flush();
  };

  test('a parametrized feat is one row that expands into its values and collapses again', () => {
    featList();
    const names = [...document.querySelectorAll('.ww-option__name')].map((n) => n.textContent);
    expect(names.filter((n) => n === 'Weapon Focus')).toHaveLength(1);
    expect(parent('Weapon Focus')).toHaveAttribute('aria-expanded', 'false');
    click(parent('Weapon Focus'));
    expect(parent('Weapon Focus')).toHaveAttribute('aria-expanded', 'true');
    expect(child('Kukri')).toBeTruthy();
    click(parent('Weapon Focus'));
    expect(document.querySelector('[data-child-of]')).toBeNull();
  });

  test('one parent is open at a time', () => {
    featList();
    click(parent('Weapon Focus'));
    click(parent('Armor Focus'));
    expect(parent('Weapon Focus')).toHaveAttribute('aria-expanded', 'false');
    const parents = new Set(
      [...document.querySelectorAll('[data-child-of]')].map((c) => c.getAttribute('data-child-of')),
    );
    expect(parents.size).toBe(1);
    expect(child('Light Armor Focus')).toBeTruthy();
  });

  test('a closed sub-option shows its Refusal, and a parent with every value closed shows closed with why', () => {
    featList();
    click(parent('Weapon Focus'));
    const closed = document.querySelectorAll('[data-child-of] .ww-option--closed');
    expect(closed.length).toBeGreaterThan(0);
    expect(closed[0]?.textContent).toMatch(/\S/);
    fireEvent.input(document.querySelector('[data-picker-filter]') ?? document.body, {
      target: { value: 'fencing grace' },
    });
    flush();
    tap(/^Show \d+ closed$/);
    const fencing = [...document.querySelectorAll('.ww-option--closed')].filter(
      (r) => r.querySelector('.ww-option__name')?.textContent === 'Fencing Grace',
    );
    expect(fencing).toHaveLength(1);
    expect(
      fencing[0]?.querySelector('.ww-refusal, [class*="refusal"]')?.textContent ?? fencing[0]?.textContent,
    ).toMatch(/\S/);
  });

  test('Weapon Focus → Kukri takes the pick and its value as one Undo step', () => {
    const planner = featList();
    click(parent('Weapon Focus'));
    click(child('Kukri'));
    const pick = planner.build().picks.find((p) => slotKey(p.slot) === slotKey(FEAT));
    expect(pick?.param).toEqual({ WeaponCategory: 'Kukri' });
    expect(planner.state().past).toHaveLength(1);
    planner.undo();
    flush();
    expect(planner.build()).toEqual(fighter1);
  });

  test('an open parent lists its values by name, open before closed (QA pass 3)', () => {
    featList();
    click(parent('Weapon Focus'));
    const rows = [...document.querySelectorAll('[data-child-of] .ww-option')];
    const named = (closed: boolean) =>
      rows
        .filter((r) => r.classList.contains('ww-option--closed') === closed)
        .map((r) => r.querySelector('.ww-option__name')?.textContent ?? '');
    const open = named(false);
    expect(open.length).toBeGreaterThan(5);
    expect(open).toEqual([...open].sort((a, b) => a.localeCompare(b)));
    const closed = named(true);
    expect(closed).toEqual([...closed].sort((a, b) => a.localeCompare(b)));
  });

  test('a nested pick shows as one chip and one Export entry, "Parent (Value)" (QA pass 3)', () => {
    const planner = featList();
    click(parent('Armor Focus'));
    click(child('Light Armor Focus'));
    const built = planner.build();
    cleanup();
    trailOf(built);
    const chips = [...document.querySelectorAll('.trail-chip')].map((c) => c.textContent ?? '');
    expect(chips.filter((c) => c.includes('Armor Focus'))).toHaveLength(1);
    expect(chips.some((c) => c.includes('Armor Focus (Light Armor Focus)'))).toBe(true);
    const sheet = buildSheet({ data: e.data, build: built, walk: walk(e.data, built, e.G) });
    expect(sheet.split('Light Armor Focus')).toHaveLength(2);
    expect(sheet).toContain('Armor Focus (Light Armor Focus)');
  });

  test('a nested selection takes both picks as one Undo step', () => {
    const planner = featList();
    click(parent('Armor Focus'));
    click(child('Light Armor Focus'));
    const picks = planner.build().picks.filter((p) => 'level' in p.slot.place && p.slot.place.level === 1);
    const armor = picks.find((p) => slotKey(p.slot) === slotKey(FEAT));
    expect(armor).toBeDefined();
    expect(picks.some((p) => p.slot.selection === armor?.feature)).toBe(true);
    expect(planner.state().past).toHaveLength(1);
    expect(planner.change()).toBe('Picked Armor Focus (Light Armor Focus)');
    planner.undo();
    flush();
    expect(planner.build()).toEqual(fighter1);
  });

  test('from the filter, Enter opens a parent, Down marks its first open value, and Enter takes it', () => {
    const planner = featList();
    const filter = document.querySelector<HTMLInputElement>('[data-picker-filter]') ?? document.body;
    fireEvent.input(filter, { target: { value: 'weapon focus' } });
    flush();
    fireEvent.keyDown(filter, { key: 'Enter' });
    flush();
    expect(parent('Weapon Focus')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(filter, { key: 'ArrowDown' });
    flush();
    const marked = document.querySelector('.ww-option--marked');
    expect(marked?.closest('[data-child-of]')).not.toBeNull();
    expect(marked?.classList.contains('ww-option--closed')).toBe(false);
    const name = marked?.querySelector('.ww-option__name')?.textContent ?? '';
    fireEvent.keyDown(filter, { key: 'Enter' });
    flush();
    const pick = planner.build().picks.find((p) => slotKey(p.slot) === slotKey(FEAT));
    expect(pick?.param).toBeDefined();
    expect(planner.change()).toContain(name);
  });

  test('Right opens a parent, Down reaches its values, Left closes it and returns to the parent', () => {
    featList();
    const wf = parent('Weapon Focus');
    wf.focus();
    fireEvent.keyDown(wf, { key: 'ArrowRight' });
    flush();
    expect(parent('Weapon Focus')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(parent('Weapon Focus'), { key: 'ArrowDown' });
    expect(document.activeElement?.closest('[data-child-of]')).not.toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowLeft' });
    flush();
    expect(document.querySelector('[data-child-of]')).toBeNull();
    expect(document.activeElement).toBe(parent('Weapon Focus'));
  });
});

describe('choice lists inline first or modal first (ticket 10)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    history.replaceState(null, '', '/');
  });

  const dialogBox = () => document.querySelector<HTMLElement>('.choice-dialog');
  const dialogTitle = () => dialogBox()?.querySelector('.choice-dialog__title')?.textContent;
  const pickFirstIn = (root: ParentNode) => {
    const option = root.querySelector<HTMLElement>('button.ww-option');
    fireEvent.click(option ?? document.body);
    flush();
  };

  test('the ⋯ menu switches the mode, and it persists', async () => {
    await openPlanner(cleaver);
    openMenu();
    expect(screen.getByRole('menuitemradio', { name: 'Inline first' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Modal first' }));
    flush();
    expect(localStorage.getItem('wotr.choiceLists')).toBe('modal');
    openMenu();
    expect(screen.getByRole('menuitemradio', { name: 'Modal first' })).toHaveAttribute('aria-checked', 'true');
    cleanup();
    await openPlanner(cleaver);
    openMenu();
    expect(screen.getByRole('menuitemradio', { name: 'Modal first' })).toHaveAttribute('aria-checked', 'true');
  });

  test('modal first: no dialog on load; it opens on request, a pick closes it and the next list step opens in it', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    expect(dialogBox()).toBeNull();
    expect(document.querySelector('button.ww-option')).toBeNull();
    openTarget();
    expect(dialogBox()).not.toBeNull();
    expect(document.documentElement.classList.contains('choice-open')).toBe(true);
    const first = dialogTitle();
    pickFirstIn(dialogBox() ?? document);
    await waitFor(() => expect(dialogTitle()).not.toBe(first));
    expect(dialogTitle()).toBeTruthy();
  });

  test('Escape and the back button close the dialog without picking, and focus returns to the step', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    const before = location.hash;
    openTarget();
    fireEvent.keyDown(dialogBox() ?? document.body, { key: 'Escape' });
    flush();
    expect(dialogBox()).toBeNull();
    expect(document.documentElement.classList.contains('choice-open')).toBe(false);
    await new Promise((r) => setTimeout(r, 10));
    flush();
    expect(dialogBox()).toBeNull();
    expect(document.activeElement?.closest('.trail-field--target')).not.toBeNull();
    fireEvent.click(document.activeElement ?? document.body);
    flush();
    expect(dialogBox()).not.toBeNull();
    window.dispatchEvent(new PopStateEvent('popstate'));
    flush();
    expect(dialogBox()).toBeNull();
    expect(location.hash).toBe(before);
  });

  test('a Cascade preview replaces the dialog rather than stacking on it', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    openTarget();
    expect(dialogBox()).not.toBeNull();
    tap('Lower Strength');
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(dialogBox()).toBeNull();
  });

  test('after a Cascade Cancel the dialog is back, with no second click (QA pass 3)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    openTarget();
    const title = dialogTitle();
    tap('Lower Strength');
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(dialogBox()).toBeNull();
    tap(/^Cancel/);
    await waitFor(() => expect(dialogBox()).not.toBeNull());
    expect(dialogTitle()).toBe(title);
  });

  test('one click on the chip of a step whose dialog was closed opens it again (QA pass 3)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    await waitFor(() => expect(dialogBox()).not.toBeNull());
    fireEvent.keyDown(dialogBox() ?? document.body, { key: 'Escape' });
    flush();
    expect(dialogBox()).toBeNull();
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    expect(dialogBox()).not.toBeNull();
    expect(dialogTitle()).toBe('Level 1 · choose feat');
  });

  test('a pick in the dialog leaves the next step’s dialog open once the old one’s history entry settles (ticket 10)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    openTarget();
    const first = dialogTitle();
    pickFirstIn(dialogBox() ?? document);
    await waitFor(() => expect(dialogTitle()).not.toBe(first));
    const next = dialogTitle();
    await new Promise((r) => setTimeout(r, 30));
    flush();
    expect(dialogBox()).not.toBeNull();
    expect(dialogTitle()).toBe(next);
  });

  test('modal: a character field’s dialog closes after its pick (QA pass 5)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(undefined);
    openField('Race');
    await waitFor(() => expect(dialogBox()).not.toBeNull());
    expect(dialogTitle()).toBe('Your character · choose a race');
    const human = [...(dialogBox()?.querySelectorAll<HTMLElement>('button.ww-option') ?? [])].find(
      (b) => b.querySelector('.ww-option__name')?.textContent === 'Human',
    );
    fireEvent.click(human ?? document.body);
    flush();
    await new Promise((r) => setTimeout(r, 30));
    flush();
    expect(fieldValue('Race')).toBe('Human');
    expect(dialogBox()).toBeNull();
  });

  test('modal: after the background, the next dialog is never the race list (QA pass 5)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    openField('Background');
    await waitFor(() => expect(dialogTitle()).toBe('Your character · choose background'));
    pickFirstIn(dialogBox() ?? document);
    await new Promise((r) => setTimeout(r, 30));
    flush();
    expect(fieldValue('Background')).not.toBe('');
    expect(dialogTitle()).toBe('Your character · choose deity');
  });

  test('modal: a trail pick opens no waiting field’s dialog (QA pass 5)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Cleave'));
    flush();
    await waitFor(() => expect(dialogTitle()).toBe('Level 1 · choose bonus combat feat'));
    const row = [...(dialogBox()?.querySelectorAll<HTMLElement>('button.ww-option') ?? [])].find(
      (b) => b.querySelector('.ww-option__name')?.textContent === 'Improved Initiative',
    );
    fireEvent.click(row ?? document.body);
    flush();
    await new Promise((r) => setTimeout(r, 30));
    flush();
    expect(dialogBox()).toBeNull();
  });

  test('"Show N closed" works inside the dialog', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    tap('Open the list');
    const box = dialogBox();
    expect(box?.querySelectorAll('.ww-option--closed').length).toBe(0);
    fireEvent.click(
      [...(box?.querySelectorAll('button') ?? [])].find((b) => /^Show \d+ closed$/.test(b.textContent ?? '')) ??
        document.body,
    );
    flush();
    expect(dialogBox()?.querySelectorAll('.ww-option--closed').length).toBeGreaterThan(0);
  });

  test('inline: the list hides until its filter has focus, and hides on blur, Escape and a pick (user)', async () => {
    await openPlanner(cleaver);
    const rows = () => stepRoot()?.querySelectorAll('button.ww-option:not(.ww-option--selected)').length ?? 0;
    const step = () => targetField() ?? hereTitle();
    expect(activeFilter()).not.toBeNull();
    expect(rows()).toBe(0);
    showList();
    expect(rows()).toBeGreaterThan(0);
    const outside = button('Build menu');
    fireEvent.focusOut(activeFilter() ?? document.body, { relatedTarget: outside });
    flush();
    expect(rows()).toBe(0);
    showList();
    const first = step();
    fireEvent.keyDown(activeFilter() ?? document.body, { key: 'Escape' });
    flush();
    expect(rows()).toBe(0);
    expect(step()).toBe(first);
    fireEvent.input(activeFilter() ?? document.body, { target: { value: 'a' } });
    flush();
    expect(rows()).toBeGreaterThan(0);
    const option = stepRoot()?.querySelector<HTMLElement>('button.ww-option');
    const name = option?.querySelector('.ww-option__name')?.textContent ?? '';
    fireEvent.pointerDown(option ?? document.body);
    fireEvent.click(option ?? document.body);
    flush();
    expect(step()).not.toBe(first);
    expect(document.querySelector('.planner-undo')?.textContent).toContain(name);
  });

  test('inline: a step held open by its chip shows the current pick under the filter while the list is hidden', async () => {
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    fireEvent.focusOut(document.querySelector('.trail-here [data-picker-filter]') ?? document.body, {
      relatedTarget: button('Build menu'),
    });
    flush();
    const shown = [...document.querySelectorAll('.trail-here .ww-option')];
    expect(shown).toHaveLength(1);
    expect(shown[0]?.textContent).toContain('Power Attack');
  });

  test('Escape closes the dialog from its filter, even with text typed, and keeps the step (user)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    await waitFor(() => expect(dialogBox()).not.toBeNull());
    const step = hereTitle();
    const filter = dialogBox()?.querySelector<HTMLInputElement>('[data-picker-filter]');
    fireEvent.input(filter ?? document.body, { target: { value: 'cleave' } });
    flush();
    fireEvent.keyDown(filter ?? document.body, { key: 'Escape' });
    flush();
    expect(dialogBox()).toBeNull();
    expect(hereTitle()).toBe(step);
    await new Promise((r) => setTimeout(r, 30));
    flush();
    expect(dialogBox()).toBeNull();
  });

  test('a feat held for a spell shows as held, with map 22’s note, and is no open step (QA pass 4)', () => {
    const build = jackInTheGreen.build;
    const slot = build.picks.find((p) => 'level' in p.slot.place && p.slot.place.level === 11)?.slot;
    if (slot === undefined) throw new Error('no level 11 pick');
    const view = { data: e.data, build, walk: walk(e.data, build, e.G) };
    expect(spellPick(view, slot)?.param).toBeUndefined();
    expect(nextStep(view, { skillsLeft: new Set(), mythicLater: undefined })).not.toEqual({ kind: 'slot', slot });
    const shown = trailOf(build);
    const chip = [...shown.querySelectorAll<HTMLElement>('.trail-chip')].find((c) =>
      c.textContent?.includes('Spell Specialization'),
    );
    expect(chip?.textContent).toContain('Spell not in the planner yet');
    expect(chip?.getAttribute('title')).toBe(SPELL_NOT_MODELLED);
    expect(chip?.classList.contains('trail-chip--empty')).toBe(false);
  });

  test('a choice row is one compact line, 44 px, or 60 px in a list whose rows carry a second line', () => {
    const tokens = readFileSync(join(process.cwd(), 'src/design/tokens.css'), 'utf8');
    expect(tokens).toContain('--choice-row-height: 44px;');
    expect(tokens).toContain('--choice-row-two-line: 60px;');
    const css = readFileSync(join(process.cwd(), 'src/planner/planner.css'), 'utf8');
    expect(css).toMatch(/\.trail-scroll--two-line \{\s*--choice-row-height: var\(--choice-row-two-line\);/);
  });

  test('inline first: the list sits in the trail, and Expand opens the same list in the dialog', async () => {
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    expect(document.querySelector('.trail-here button.ww-option')).not.toBeNull();
    expect(dialogBox()).toBeNull();
    tap('Expand');
    expect(dialogBox()?.querySelector('button.ww-option')).not.toBeNull();
    expect(document.querySelector('.trail-here .trail-note')?.textContent).toBe('Choosing in the dialog.');
  });
});

describe('Summaries and Synergy in the lists (ticket 06)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    history.replaceState(null, '', '/');
  });

  const rowOf = (key: string) => document.querySelector<HTMLElement>(`[data-detail-key="${key}"]`);
  const keyOf = (feature: string) => `${feature} null`;

  test('the pane never goes stale: it follows a filter to the marked row, or empties (QA pass 5)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    const pane = () => document.querySelector('.choice-dialog__detail');
    const name = () => pane()?.querySelector('.choice-dialog__name')?.textContent ?? null;
    const filter = document.querySelector<HTMLInputElement>('.choice-dialog [data-picker-filter]');
    const type = (text: string) => {
      fireEvent.input(filter ?? document.body, { target: { value: text } });
      flush();
    };
    type('toughness');
    await waitFor(() => expect(name()).toBe('Toughness'));
    type('zzzz');
    await waitFor(() => expect(name()).toBeNull());
    expect(pane()?.textContent).toContain('Point at or focus');
    type('power attack');
    await waitFor(() => expect(name()).toBe('Power Attack'));
  });

  test('keyboard focus on a closed row shows it in the pane (QA pass 5)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    fireEvent.input(document.querySelector('.choice-dialog [data-picker-filter]') ?? document.body, {
      target: { value: 'dodge' },
    });
    flush();
    fireEvent.click(screen.getByRole('button', { name: /^Show \d+ closed$/ }));
    flush();
    const dodge = [...document.querySelectorAll<HTMLElement>('.choice-dialog .ww-option--closed')].find(
      (r) => r.querySelector('.ww-option__name')?.textContent === 'Dodge',
    );
    dodge?.focus();
    flush();
    await waitFor(() =>
      expect(document.querySelector('.choice-dialog__detail .choice-dialog__name')?.textContent).toBe('Dodge'),
    );
    expect(document.querySelector('.choice-dialog__detail')?.textContent).toContain('Closed');
  });

  test('an option row shows its Summary on one line', () => {
    const options = picker(e.data, cleaver, FEAT, e.G)?.options ?? [];
    const described = options.find(
      (o) =>
        o.shown &&
        o.closed === undefined &&
        o.param === undefined &&
        summaryFor(e.data, e.G, o.feature).text !== undefined,
    );
    if (described === undefined) throw new Error('no open feat with a Summary');
    render(() => <SlotStep trail={apiOf(createPlanner(e, cleaver))} slot={FEAT} />);
    flush();
    const row = rowOf(keyOf(described.feature));
    expect(row?.querySelector('.ww-option__meta')?.textContent).toBe(summaryFor(e.data, e.G, described.feature).text);
  });

  test('an option sharing a topic with the Build is marked, and the detail pane names what it shares', () => {
    const build = jackInTheGreen.build;
    const shares = (o: OptionStatus) =>
      o.shown &&
      o.closed === undefined &&
      o.param === undefined &&
      e.data.blueprints.get(o.feature)?.$type !== 'BlueprintFeatureSelection' &&
      (o.synergy?.shared.length ?? 0) > 0;
    let found: { readonly slot: SlotId; readonly option: OptionStatus } | undefined;
    for (const s of walk(e.data, build, e.G).slots.filter((x) => 'level' in x.id.place && x.id.place.level > 1)) {
      const option = picker(e.data, build, s.id, e.G)?.options.find(shares);
      if (option !== undefined) {
        found = { slot: s.id, option };
        break;
      }
    }
    if (found === undefined) throw new Error('no option sharing a topic on the gold Build');
    const { slot, option } = found;
    render(() => (
      <ChoiceDialog title="Pick" line="" onClose={() => {}}>
        <SlotStep trail={apiOf(createPlanner(e, build))} slot={slot} />
      </ChoiceDialog>
    ));
    flush();
    const row = rowOf(keyOf(option.feature));
    expect(row?.textContent).toContain('Synergy');
    fireEvent.pointerOver(row ?? document.body);
    flush();
    const pane = document.querySelector('.choice-dialog__detail');
    expect(pane?.querySelector('.choice-dialog__links')?.textContent).toMatch(/Shares /);
  });

  test('the detail pane shows the Summary’s labels, says Current, and follows the marked row', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    fireEvent.pointerOver(rowOf(keyOf(POWER_ATTACK)) ?? document.body);
    flush();
    const pane = () => document.querySelector('.choice-dialog__detail');
    expect(pane()?.querySelector('.choice-dialog__name')?.textContent).toBe('Power Attack');
    expect(pane()?.textContent).toContain('Current');
    const own = summaryFor(e.data, e.G, POWER_ATTACK);
    if (own.labels.length > 0) {
      expect(pane()?.querySelectorAll('.choice-dialog__labels li')).toHaveLength(own.labels.length);
    } else if (!own.written) {
      expect(pane()?.textContent).toContain('No summary yet.');
    }
    const filter = document.querySelector<HTMLInputElement>('.choice-dialog [data-picker-filter]');
    fireEvent.keyDown(filter ?? document.body, { key: 'ArrowDown' });
    flush();
    const marked = document.querySelector('.choice-dialog .ww-option--marked .ww-option__name')?.textContent;
    expect(marked).toBeTruthy();
    await waitFor(() => expect(pane()?.querySelector('.choice-dialog__name')?.textContent).toBe(marked));
  });

  test('the pane follows the mark after typing, names a value with its feat, and sorts its links (QA pass 4)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    const pane = () => document.querySelector('.choice-dialog__detail');
    const filter = document.querySelector<HTMLInputElement>('.choice-dialog [data-picker-filter]');
    fireEvent.input(filter ?? document.body, { target: { value: 'toughness' } });
    flush();
    await waitFor(() => expect(pane()?.querySelector('.choice-dialog__name')?.textContent).toBe('Toughness'));
    fireEvent.input(filter ?? document.body, { target: { value: 'power attack' } });
    flush();
    await waitFor(() => expect(pane()?.querySelector('.choice-dialog__name')?.textContent).toBe('Power Attack'));
    const enables = [...(pane()?.querySelectorAll('.choice-dialog__links li') ?? [])]
      .map((li) => li.textContent ?? '')
      .find((line) => line.startsWith('Enables '));
    const names = enables?.replace(/^Enables /, '').split(', ') ?? [];
    expect(names.length).toBeGreaterThan(1);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    fireEvent.input(filter ?? document.body, { target: { value: 'weapon focus' } });
    flush();
    const parentRow = [...document.querySelectorAll<HTMLElement>('.choice-dialog [data-parent] > .ww-option')].find(
      (b) => b.querySelector('.ww-option__name')?.textContent === 'Weapon Focus',
    );
    fireEvent.click(parentRow ?? document.body);
    flush();
    const bardiche = [...document.querySelectorAll<HTMLElement>('.choice-dialog [data-child-of] .ww-option')].find(
      (b) => b.querySelector('.ww-option__name')?.textContent === 'Bardiche',
    );
    fireEvent.pointerOver(bardiche ?? document.body);
    flush();
    expect(pane()?.querySelector('.choice-dialog__name')?.textContent).toBe('Weapon Focus (Bardiche)');
  });

  test('a weapon value enables only what its weapon can lead to (QA pass 4, engine enablesWith)', () => {
    render(() => (
      <ChoiceDialog title="Feat" line="" onClose={() => {}}>
        <SlotStep trail={apiOf(createPlanner(e, cleaver))} slot={FEAT} />
      </ChoiceDialog>
    ));
    flush();
    fireEvent.input(document.querySelector('.choice-dialog [data-picker-filter]') ?? document.body, {
      target: { value: 'weapon focus' },
    });
    flush();
    const parentRow = [...document.querySelectorAll<HTMLElement>('.choice-dialog [data-parent] > .ww-option')].find(
      (b) => b.querySelector('.ww-option__name')?.textContent === 'Weapon Focus',
    );
    fireEvent.click(parentRow ?? document.body);
    flush();
    const enablesOf = (value: string) => {
      const row = [...document.querySelectorAll<HTMLElement>('.choice-dialog [data-child-of] .ww-option')].find(
        (b) => b.querySelector('.ww-option__name')?.textContent === value,
      );
      fireEvent.pointerOver(row ?? document.body);
      flush();
      return (
        [...document.querySelectorAll('.choice-dialog__links li')]
          .map((li) => li.textContent ?? '')
          .find((line) => line.startsWith('Enables ')) ?? ''
      );
    };
    expect(enablesOf('Bardiche')).not.toContain('Fencing Grace');
    expect(enablesOf('Rapier')).toContain('Fencing Grace');
  });

  test('links name each linked feat once, by its bare name (QA pass 4, engine linkNames)', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    fireEvent.input(document.querySelector('.choice-dialog [data-picker-filter]') ?? document.body, {
      target: { value: 'dodge' },
    });
    flush();
    fireEvent.click(screen.getByRole('button', { name: /^Show \d+ closed$/ }));
    flush();
    const dodge = [...document.querySelectorAll<HTMLElement>('.choice-dialog .ww-option')].find(
      (r) => r.querySelector('.ww-option__name')?.textContent === 'Dodge',
    );
    fireEvent.pointerOver(dodge ?? document.body);
    flush();
    const enables =
      [...document.querySelectorAll('.choice-dialog__links li')]
        .map((li) => li.textContent ?? '')
        .find((line) => line.startsWith('Enables ')) ?? '';
    expect(enables).not.toBe('');
    expect(enables).not.toMatch(/\(with /);
    const names = enables.replace(/^Enables /, '').split(', ');
    expect(new Set(names).size).toBe(names.length);
  });

  test('the next level is a list step only before level 1, so Modal first keeps "Continue as …" inline (QA pass 4)', () => {
    expect(isListStep({ kind: 'nextLevel' }, 0)).toBe(true);
    expect(isListStep({ kind: 'nextLevel' }, 1)).toBe(false);
  });

  test('Synergy words name every link kind, and a clash reads as a warning', () => {
    expect(topicWords({ kind: 'ability', stat: 'Dexterity' })).toBe('Dexterity');
    expect(topicWords({ kind: 'school', school: 'Evocation' })).toBe('Evocation spells');
    expect(topicWords({ kind: 'weapon', category: 'BastardSword' })).toBe('Bastard sword');
    expect(topicWords({ kind: 'group', group: 'BladesLight' })).toBe(GROUP_WORDS.BladesLight);
    expect(topicWords({ kind: 'energy', energy: 'Fire' })).toBe('fire');
    expect(topicWords({ kind: 'descriptor', descriptor: 'MindAffecting' })).toBe('mind-affecting effects');
    expect(stackWords(e.data, { stat: 'Strength', descriptor: 'Inherent', with: [POWER_ATTACK] })).toBe(
      "Its inherent bonus to Strength won't stack with Power Attack",
    );
    render(() => <PickerOption name="Bull's Strength" status="open" clash />);
    expect(screen.getByText("Won't stack")).toBeTruthy();
  });

  test('Gear items show their Summaries in the list and under the worn item', () => {
    const items = [...e.data.blueprints.values()].filter(
      (bp) => bp.$type === 'BlueprintItemArmor' && summaryFor(e.data, e.G, bp.guid).text !== undefined,
    );
    const worn = items.find((bp) => !e.data.twins.has(bp.guid));
    if (worn === undefined) throw new Error('no armour with a Summary');
    const planner = createPlanner(e, { ...cleaver, gear: { Armor: worn.guid } });
    render(() => <GearStep trail={apiOf(planner)} />);
    flush();
    const text = summaryFor(e.data, e.G, worn.guid).text;
    expect(document.querySelector('.trail-gear__worn')?.textContent).toBe(text);
    const listed = [...document.querySelectorAll<HTMLElement>('[data-detail-key]')].find(
      (r) => summaryFor(e.data, e.G, r.getAttribute('data-detail-key') ?? '').text !== undefined,
    );
    expect(listed?.querySelector('.ww-option__meta')?.textContent).toBe(
      summaryFor(e.data, e.G, listed?.getAttribute('data-detail-key') ?? '').text,
    );
  });
});

describe('the Build-name label (ticket 11)', () => {
  afterEach(() => {
    cleanup();
    history.replaceState(null, '', '/');
  });

  const label = () => document.querySelector<HTMLButtonElement>('.build-name__label');
  const input = () => document.querySelector<HTMLInputElement>('.build-name__input');
  const typeName = async (text: string) => {
    fireEvent.click(label() ?? document.body);
    flush();
    await waitFor(() => expect(document.activeElement).toBe(input()));
    fireEvent.input(input() ?? document.body, { target: { value: text } });
    flush();
  };

  test('a nameless Build reads "Untitled Build", and Enter names it as one Undo step', async () => {
    await openPlanner(cleaver);
    expect(label()?.textContent).toBe('Untitled Build');
    expect(label()?.classList.contains('build-name__label--untitled')).toBe(true);
    await typeName('  Grey Warden ');
    fireEvent.keyDown(input() ?? document.body, { key: 'Enter' });
    flush();
    expect(input()).toBeNull();
    expect(label()?.textContent).toBe('Grey Warden');
    expect(document.querySelector('.planner-undo__what')?.textContent).toBe('Named the Build Grey Warden');
    await waitFor(() => expect(document.activeElement).toBe(label()));
    tap('Undo');
    expect(label()?.textContent).toBe('Untitled Build');
  });

  test('Escape cancels the edit and keeps the step', async () => {
    await openPlanner(cleaver);
    const step = hereTitle();
    await typeName('Not this');
    fireEvent.keyDown(input() ?? document.body, { key: 'Escape' });
    flush();
    expect(input()).toBeNull();
    expect(label()?.textContent).toBe('Untitled Build');
    expect(document.querySelector('.planner-undo__what')).toBeNull();
    expect(hereTitle()).toBe(step);
  });

  test('a name past 60 characters is refused in R’s words, and an empty one clears the name', async () => {
    await openPlanner({ ...cleaver, name: 'Grey Warden' as BuildName });
    const long = 'x'.repeat(61);
    await typeName(long);
    fireEvent.keyDown(input() ?? document.body, { key: 'Enter' });
    flush();
    expect(screen.getByRole('alert').textContent).toBe(buildNameLength(long));
    expect(input()).not.toBeNull();
    fireEvent.input(input() ?? document.body, { target: { value: '   ' } });
    flush();
    fireEvent.keyDown(input() ?? document.body, { key: 'Enter' });
    flush();
    expect(label()?.textContent).toBe('Untitled Build');
    expect(document.querySelector('.planner-undo__what')?.textContent).toBe('Cleared the Build’s name');
  });

  test('the page title carries the name', () => {
    expect(pageTitle(undefined)).toBe('Worldwound Planner');
    expect(pageTitle('Grey Warden')).toBe('Grey Warden · Worldwound Planner');
  });
});

describe('QA pass 4, severity 1', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  const css = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
  const rule = (text: string, selector: string) => {
    const at = text.indexOf(`${selector} {`);
    expect(at).toBeGreaterThanOrEqual(0);
    return text.slice(at, text.indexOf('}', at));
  };

  test('a nested pick names its value once, with its parent', () => {
    expect(nestedLabel('Ascendant Element', 'Ascendant Element (Electricity)')).toBe('Ascendant Element (Electricity)');
    expect(nestedLabel('Bloodline Feat Selection', 'Improved Initiative')).toBe('Bloodline Feat (Improved Initiative)');
    expect(nestedLabel('Armor Focus', 'Light Armor Focus')).toBe('Armor Focus (Light Armor Focus)');
  });

  test('the name refusal floats under the field and describes it, so the top bar keeps its height', async () => {
    await openPlanner(cleaver);
    fireEvent.click(document.querySelector('.build-name__label') ?? document.body);
    flush();
    const input = await waitFor(() => {
      const found = document.querySelector<HTMLInputElement>('.build-name__input');
      expect(found).not.toBeNull();
      return found;
    });
    fireEvent.input(input ?? document.body, { target: { value: 'x'.repeat(61) } });
    fireEvent.keyDown(input ?? document.body, { key: 'Enter' });
    flush();
    const refused = document.getElementById('build-name-refused');
    expect(refused?.getAttribute('role')).toBe('alert');
    expect(input?.getAttribute('aria-describedby')).toBe('build-name-refused');
    expect(rule(css('src/planner/planner.css'), '.build-name__refused')).toContain('position: absolute');
  });

  test('rows size their border box, so closed rows fit the dialog list', () => {
    const option = rule(css('src/design/components.css'), '.ww-option');
    expect(option).toContain('box-sizing: border-box');
    expect(option).toContain('min-width: 0');
  });

  test('an unset field’s placeholder takes the accent colour', () => {
    expect(rule(css('src/planner/planner.css'), '.trail-field--unset .trail-field__input::placeholder')).toContain(
      'color: var(--gold)',
    );
  });

  test('the Build name may use the top bar’s room', () => {
    expect(rule(css('src/shell/app.css'), '.app-header')).toContain(
      'grid-template-columns: minmax(max-content, 1fr) minmax(0, auto) minmax(0, 1fr)',
    );
    expect(rule(css('src/planner/planner.css'), '.build-name')).toContain('max-width: 100%');
  });

  test('Expand keeps the typed filter', async () => {
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    fireEvent.input(document.querySelector('.trail-here [data-picker-filter]') ?? document.body, {
      target: { value: 'toughness' },
    });
    flush();
    tap('Expand');
    expect(document.querySelector<HTMLInputElement>('.choice-dialog [data-picker-filter]')?.value).toBe('toughness');
  });

  test('a Cascade Cancel brings the dialog back with its typed filter', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Power Attack'));
    flush();
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    fireEvent.input(document.querySelector('.choice-dialog [data-picker-filter]') ?? document.body, {
      target: { value: 'toughness' },
    });
    flush();
    tap('Lower Strength');
    await waitFor(() => expect(document.querySelector('[role="dialog"]:not(.choice-dialog)')).not.toBeNull());
    tap(/^Cancel/);
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    expect(document.querySelector<HTMLInputElement>('.choice-dialog [data-picker-filter]')?.value).toBe('toughness');
  });

  test('Fork never writes the empty Build’s code to the address bar', async () => {
    await openPlanner(cleaver);
    const empty = `#b=${await encodeBuild(e.data, EMPTY)}`;
    const written: string[] = [];
    const real = history.replaceState.bind(history);
    vi.spyOn(history, 'replaceState').mockImplementation((data, unused, url) => {
      if (typeof url === 'string') written.push(url);
      real(data, unused, url);
    });
    openMenu();
    menuItem('Fork this Build');
    await new Promise((r) => setTimeout(r, 50));
    flush();
    expect(written).not.toContain(empty);
  });

  test('the ⋯ menu moves with the arrow keys, Home and End', async () => {
    await openPlanner(cleaver);
    const items = () => [...document.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)')];
    openMenu();
    await waitFor(() => expect(document.activeElement?.closest('[role="menu"]')).not.toBeNull());
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeEnabled());
    items()[0]?.focus();
    const list = screen.getByRole('menu');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items()[1]);
    fireEvent.keyDown(list, { key: 'End' });
    expect(document.activeElement).toBe(items().at(-1));
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items()[0]);
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items().at(-1));
  });
});

describe('Gear that won’t stack (ticket 06, engine 4d9b8b50)', () => {
  afterEach(() => {
    cleanup();
  });

  const ring = () => {
    const found = [...e.data.blueprints.values()].find(
      (bp) => bp.name === 'Ring of Protection +1' && !e.data.twins.has(bp.guid),
    );
    if (found === undefined) throw new Error('no Ring of Protection +1');
    return found.guid;
  };
  const placeChip = (name: string) =>
    [...document.querySelectorAll<HTMLElement>('.trail-places .trail-chip')].find((c) => c.textContent?.includes(name));

  test('a second Ring of Protection is badged in the list, and the pane says why', async () => {
    const planner = createPlanner(e, { ...cleaver, gear: { Ring1: ring() } });
    render(() => (
      <ChoiceDialog title="Gear" line="" onClose={() => {}}>
        <GearStep trail={apiOf(planner)} />
      </ChoiceDialog>
    ));
    flush();
    fireEvent.click(placeChip('Ring 2') ?? document.body);
    flush();
    fireEvent.input(document.querySelector('[data-picker-filter]') ?? document.body, {
      target: { value: 'ring of protection +1' },
    });
    flush();
    const row = () => document.querySelector<HTMLElement>(`[data-detail-key="${ring()}"]`);
    await waitFor(() => expect(row()?.textContent).toContain('Won’t stack'.replace('’', "'")));
    fireEvent.pointerOver(row() ?? document.body);
    flush();
    expect(document.querySelector('.choice-dialog__warnings')?.textContent).toBe(
      "Its deflection bonus to AC won't stack with Ring of Protection +1.",
    );
  });

  test('a worn Ring of Protection that clashes with the other says so under it', () => {
    const planner = createPlanner(e, { ...cleaver, gear: { Ring1: ring(), Ring2: ring() } });
    render(() => <GearStep trail={apiOf(planner)} />);
    flush();
    fireEvent.click(placeChip('Ring 2') ?? document.body);
    flush();
    expect(document.querySelector('.trail-gear__clash')?.textContent).toBe(
      "Its deflection bonus to AC won't stack with Ring of Protection +1.",
    );
    fireEvent.click(placeChip('Armor') ?? document.body);
    flush();
    expect(document.querySelector('.trail-gear__clash')).toBeNull();
  });
});

describe('a dialog pick never reverts the Build (QA pass 5, severity 4)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  const settle = async () => {
    await new Promise((r) => setTimeout(r, 120));
    flush();
    await new Promise((r) => setTimeout(r, 60));
    flush();
  };
  const featPick = async () => {
    const opened = await openHash(e, location.hash);
    return opened.kind === 'opened'
      ? opened.build.picks.find((p) => slotKey(p.slot) === slotKey(BONUS_COMBAT_FEAT))?.feature
      : undefined;
  };
  const takeIn = (root: ParentNode, name: string) => {
    const row = [...root.querySelectorAll<HTMLElement>('button.ww-option')].find(
      (b) => b.querySelector('.ww-option__name')?.textContent === name,
    );
    fireEvent.click(row ?? document.body);
    flush();
  };
  const initiative = () =>
    [...e.data.blueprints.values()].find((bp) => bp.name === 'Improved Initiative' && bp.$type === 'BlueprintFeature')
      ?.guid;

  test('a pick in an expanded list keeps the pick in the Build and the link, even when the code is ready before the back lands', async () => {
    const realBack = history.back.bind(history);
    vi.spyOn(history, 'back').mockImplementation(() => {
      setTimeout(realBack, 60);
    });
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Cleave'));
    flush();
    tap('Expand');
    const box = document.querySelector('.choice-dialog');
    fireEvent.input(box?.querySelector('[data-picker-filter]') ?? document.body, {
      target: { value: 'improved initiative' },
    });
    flush();
    takeIn(box ?? document, 'Improved Initiative');
    await settle();
    await waitFor(async () => expect(await featPick()).toBe(initiative()));
    expect(document.querySelector('.planner-undo__what')?.textContent).not.toBe('Opened a link');
    expect(document.querySelector('.choice-dialog')).toBeNull();
  });

  test('two chained dialogs, then the back button, keep the pick and open no link', async () => {
    localStorage.setItem('wotr.choiceLists', 'modal');
    await openPlanner(cleaver);
    fireEvent.click(chipNamed('Cleave'));
    flush();
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    const box = document.querySelector('.choice-dialog');
    fireEvent.input(box?.querySelector('[data-picker-filter]') ?? document.body, {
      target: { value: 'improved initiative' },
    });
    flush();
    takeIn(box ?? document, 'Improved Initiative');
    await settle();
    openTarget();
    await waitFor(() => expect(document.querySelector('.choice-dialog')).not.toBeNull());
    history.back();
    await settle();
    expect(document.querySelector('.choice-dialog')).toBeNull();
    await waitFor(async () => expect(await featPick()).toBe(initiative()));
    expect(document.querySelector('.planner-undo__what')?.textContent).not.toBe('Opened a link');
  });
});
