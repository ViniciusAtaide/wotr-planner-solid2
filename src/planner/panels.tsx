import { createMemo, createSignal, For, Show } from 'solid-js';
import { slotKey, type Alignment, type GearPlace, type SlotId } from '~engine/build';
import type { CheckedData } from '~engine/load';
import {
  isShown,
  refGuid,
  type Attribute,
  type Blueprint,
  type BlueprintCharacterClass,
  type Guid,
  type StatType,
} from '~engine/data';
import { expectedLevel } from '~engine/mcp';
import { linkIndex } from '~engine/links';
import { picker, type OptionStatus } from '~engine/pickers';
import { gearNote, nameOf, refusal, statName } from '~engine/refusals';
import { pointBuyCost, POINT_BUY, ATTRIBUTES, PLACE_ITEM_TYPES, SKILL_ATTRIBUTE } from '~engine/walk';

import { Button, ClosedCount, OptionList, PickerHead, PickerOption } from '../design';
import type { Planner } from './state';
import { placeWords } from './state';
import { optionName } from './words';

const ALIGNMENTS: readonly Alignment[] = [
  'LawfulGood',
  'NeutralGood',
  'ChaoticGood',
  'LawfulNeutral',
  'TrueNeutral',
  'ChaoticNeutral',
  'LawfulEvil',
  'NeutralEvil',
  'ChaoticEvil',
];
const words = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

function shownSortedByName(data: CheckedData, keep: (bp: Blueprint) => boolean): Blueprint[] {
  return [...data.blueprints.values()]
    .filter((bp) => isShown(bp) && keep(bp))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

function revertControl(el: HTMLInputElement | HTMLSelectElement, value: string | number): void {
  el.value = String(value);
}

interface ChoiceProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly { readonly value: string; readonly text: string }[];
  readonly onChange: (value: string) => void;
}

function Choice(props: ChoiceProps) {
  return (
    <label class="planner-field">
      <span class="planner-field__label">{props.label}</span>
      <select
        class="planner-field__control"
        value={props.value}
        onChange={(e) => {
          const el = e.currentTarget;
          props.onChange(el.value);
          revertControl(el, props.value);
        }}
      >
        <For each={props.options}>{(o) => <option value={o.value}>{o.text}</option>}</For>
      </select>
    </label>
  );
}

const CLOSED_SHOWN = 30;

export interface SlotPickerProps {
  readonly planner: Planner;
  readonly slot: SlotId;
  readonly onPicked?: () => void;
}

export function SlotPicker(props: SlotPickerProps) {
  const data = () => props.planner.engine.data;
  const [text, setText] = createSignal('');
  const [allClosed, setAllClosed] = createSignal(false);
  const p = createMemo(() => picker(data(), props.planner.build(), props.slot, props.planner.engine.G));
  const current = () => props.planner.build().picks.find((q) => slotKey(q.slot) === slotKey(props.slot));
  const name = (o: OptionStatus) => optionName(data(), o.feature, o.param);
  const listed = createMemo(() => {
    const t = text().toLowerCase();
    return (p()?.options ?? []).filter((o) => o.shown && (t === '' || name(o).toLowerCase().includes(t)));
  });
  const open = () => listed().filter((o) => o.closed === undefined);
  const closed = () => listed().filter((o) => o.closed !== undefined);
  const words = (o: OptionStatus) =>
    o.closed === undefined
      ? []
      : (() => {
          const r = refusal({ data: data(), G: props.planner.engine.G, unit: p()?.unit }, o.closed);
          return r.unmet.length > 0 ? r.unmet : [r.text];
        })();
  const byReason = () => {
    const counts = new Map<string, number>();
    for (const o of closed().slice(CLOSED_SHOWN)) {
      const key = o.closed?.unmet?.length ? 'need a prerequisite' : (o.closed?.rule ?? '');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].map(([k, n]) => `${n} ${k.includes('.') ? 'refused by the game' : k}`).join(', ');
  };
  const heldFeatures = createMemo(() => new Set([...(p()?.unit.facts() ?? [])].map((f) => f.blueprint)));
  const links = (o: OptionStatus): string | undefined => {
    const index = linkIndex(data(), props.planner.engine.G);
    const on = index.needs(o.feature).filter((g) => heldFeatures().has(g));
    const enables = index.enables(o.feature);
    const words = [
      on.length > 0 && `Builds on ${on.map((g) => nameOf(data(), g)).join(', ')}`,
      enables[0] !== undefined &&
        `Enables ${nameOf(data(), enables[0])}${enables.length > 1 ? ` → and ${enables.length - 1} more` : ''}`,
    ].filter((w) => typeof w === 'string');
    return words.length > 0 ? words.join(' · ') : undefined;
  };
  const isCurrent = (o: OptionStatus) => {
    const c = current();
    return c !== undefined && c.feature === o.feature && JSON.stringify(c.param) === JSON.stringify(o.param);
  };
  const pick = (o: OptionStatus) => {
    props.planner.edit(
      { kind: 'pick', slot: props.slot, pick: { feature: o.feature, ...(o.param && { param: o.param }) } },
      `Pick ${name(o)}`,
    );
    props.onPicked?.();
  };
  const move = (e: KeyboardEvent) => {
    if (e.key !== 'j' && e.key !== 'k') return;
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const options = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.ww-option')];
    const at = options.indexOf(document.activeElement as HTMLElement);
    options[Math.max(0, Math.min(options.length - 1, at + (e.key === 'j' ? 1 : -1)))]?.focus();
    e.preventDefault();
  };
  return (
    <Show when={p()} fallback={<p>This slot doesn't open in the Build any more.</p>}>
      <div class="planner-panel" onKeyDown={move}>
        <PickerHead
          title={`${nameOf(data(), props.slot.selection)} · ${placeWords(props.slot.place)}`}
          counts={`${open().length} open · ${closed().length} closed`}
        />
        <input
          class="planner-field__control"
          type="search"
          placeholder="Filter by name ( / )"
          aria-label="Filter options by name"
          data-picker-filter
          value={text()}
          onInput={(e) => setText(e.currentTarget.value)}
        />
        <Show when={current()}>
          <Button
            variant="danger"
            onClick={() => props.planner.edit({ kind: 'pick', slot: props.slot }, 'Clear this pick')}
          >
            Clear this pick
          </Button>
        </Show>
        <OptionList>
          <For each={open()}>
            {(o) => (
              <PickerOption
                name={name(o)}
                status="open"
                selected={isCurrent(o)}
                links={links(o)}
                {...(o.gearItems && { gear: gearNote(data(), o.gearItems) })}
                onPick={() => pick(o)}
              />
            )}
          </For>
          <For each={allClosed() ? closed() : closed().slice(0, CLOSED_SHOWN)}>
            {(o) => <PickerOption name={name(o)} status="closed" links={links(o)} refusal={words(o)} />}
          </For>
          <Show when={!allClosed() && closed().length > CLOSED_SHOWN}>
            <ClosedCount text={`${closed().length - CLOSED_SHOWN} more closed: ${byReason()}`} />
            <Button onClick={() => setAllClosed(true)}>Show all closed</Button>
          </Show>
        </OptionList>
      </div>
    </Show>
  );
}

export interface LevelPanelProps {
  readonly planner: Planner;
  readonly level: number;
}

export function LevelPanel(props: LevelPanelProps) {
  const data = () => props.planner.engine.data;
  const b = () => props.planner.build();
  const l = () => b().levels[props.level - 1];
  const classes = () =>
    shownSortedByName(
      data(),
      (bp) => bp.$type === 'BlueprintCharacterClass' && !(bp as BlueprintCharacterClass).IsMythic,
    );
  const firstOfClass = () => b().levels.findIndex((x) => x.class === l()?.class) + 1 === props.level;
  const archetypes = () => {
    const cls = data().blueprints.get(l()?.class ?? '');
    return cls?.$type === 'BlueprintCharacterClass'
      ? cls.m_Archetypes
          .map((r) => refGuid(r) ?? '')
          .filter((g) => {
            const bp = data().blueprints.get(g);
            return bp !== undefined && isShown(bp);
          })
      : [];
  };
  const chosen = () => b().classChoices?.[l()?.class ?? '']?.archetypes ?? [];
  const skills = Object.keys(SKILL_ATTRIBUTE) as StatType[];
  return (
    <Show when={l()} fallback={<p>No such level.</p>}>
      {(level) => (
        <div class="planner-panel">
          <h2 class="planner-panel__title">Level {props.level}</h2>
          <Choice
            label="Class"
            value={level().class}
            options={classes().map((c) => ({ value: c.guid, text: c.name ?? c.assetName }))}
            onChange={(cls) =>
              props.planner.edit(
                { kind: 'class', level: props.level, class: cls },
                `Level ${props.level} as ${nameOf(data(), cls)}`,
              )
            }
          />
          <Show when={firstOfClass() && archetypes().length > 0}>
            <Choice
              label="Archetype"
              value={chosen()[0] ?? ''}
              options={[
                { value: '', text: 'None' },
                ...archetypes().map((a) => ({ value: a, text: nameOf(data(), a) })),
              ]}
              onChange={(a) =>
                props.planner.edit(
                  { kind: 'archetypes', class: level().class, archetypes: a === '' ? [] : [a] },
                  a === '' ? 'No archetype' : `Take ${nameOf(data(), a)}`,
                )
              }
            />
          </Show>
          <Show when={props.level % 4 === 0}>
            <Choice
              label="Ability increase"
              value={level().increase ?? ''}
              options={[{ value: '', text: 'None' }, ...ATTRIBUTES.map((a) => ({ value: a, text: a }))]}
              onChange={(a) =>
                props.planner.edit(
                  { kind: 'increase', level: props.level, ...(a !== '' && { increase: a as Attribute }) },
                  `Increase ${a}`,
                )
              }
            />
          </Show>
          <fieldset class="planner-grid">
            <legend class="planner-field__label">Skill ranks at this level</legend>
            <For each={skills}>
              {(skill) => (
                <label class="planner-field planner-field--inline">
                  <span>{statName(skill)}</span>
                  <input
                    class="planner-field__control planner-field__control--number"
                    type="number"
                    min="0"
                    max={props.level}
                    value={level().skills?.[skill] ?? 0}
                    onChange={(e) => {
                      const n = Number(e.currentTarget.value);
                      const next = { ...level().skills, [skill]: n };
                      if (n === 0) delete next[skill];
                      props.planner.edit(
                        { kind: 'skills', level: props.level, skills: next },
                        `${statName(skill)} ranks`,
                      );
                      revertControl(e.currentTarget, level().skills?.[skill] ?? 0);
                    }}
                  />
                </label>
              )}
            </For>
          </fieldset>
          <Show when={props.level === b().levels.length}>
            <Button
              variant="danger"
              onClick={() => props.planner.edit({ kind: 'dropLevel' }, `Remove level ${props.level}`)}
            >
              Remove level {props.level}
            </Button>
          </Show>
        </div>
      )}
    </Show>
  );
}

function mythicClasses(data: CheckedData): Blueprint[] {
  return shownSortedByName(
    data,
    (bp) => bp.$type === 'BlueprintCharacterClass' && (bp as BlueprintCharacterClass).IsMythic,
  );
}

export interface RankPanelProps {
  readonly planner: Planner;
  readonly rank: number;
}

export function RankPanel(props: RankPanelProps) {
  const data = () => props.planner.engine.data;
  const r = () => props.planner.build().ranks?.[props.rank - 1];
  return (
    <Show when={r()} fallback={<p>No such rank.</p>}>
      {(rank) => (
        <div class="planner-panel">
          <h2 class="planner-panel__title">Mythic Rank {props.rank}</h2>
          <Choice
            label="Mythic class"
            value={rank().class}
            options={mythicClasses(data()).map((c) => ({ value: c.guid, text: c.name ?? c.assetName }))}
            onChange={(cls) =>
              props.planner.edit(
                { kind: 'rankClass', rank: props.rank, class: cls },
                `Rank ${props.rank} as ${nameOf(data(), cls)}`,
              )
            }
          />
          <label class="planner-field">
            <span class="planner-field__label">Rank level</span>
            <input
              class="planner-field__control planner-field__control--number"
              type="number"
              min="1"
              value={rank().level}
              onChange={(e) => {
                props.planner.edit(
                  { kind: 'rankLevel', rank: props.rank, level: Number(e.currentTarget.value) },
                  `Move rank ${props.rank}`,
                );
                revertControl(e.currentTarget, rank().level);
              }}
            />
            <span class="planner-field__hint">Expected at level {expectedLevel(data(), props.rank)}.</span>
          </label>
          <Show when={props.rank === (props.planner.build().ranks?.length ?? 0)}>
            <Button
              variant="danger"
              onClick={() => props.planner.edit({ kind: 'dropRank' }, `Remove rank ${props.rank}`)}
            >
              Remove rank {props.rank}
            </Button>
          </Show>
        </div>
      )}
    </Show>
  );
}

export interface StartPanelProps {
  readonly planner: Planner;
}

export function StartPanel(props: StartPanelProps) {
  const data = () => props.planner.engine.data;
  const b = () => props.planner.build();
  const races = () => shownSortedByName(data(), (bp) => bp.$type === 'BlueprintRace');
  const race = () => data().blueprints.get(b().race ?? '');
  const scores = () =>
    b().scores ?? { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };
  return (
    <div class="planner-panel">
      <h2 class="planner-panel__title">Start</h2>
      <Choice
        label="Race"
        value={b().race ?? ''}
        options={[{ value: '', text: 'None' }, ...races().map((r) => ({ value: r.guid, text: r.name ?? r.assetName }))]}
        onChange={(g) =>
          props.planner.edit(
            { kind: 'race', race: g === '' ? undefined : g, ...(b().raceStat && { raceStat: b().raceStat }) },
            'Change race',
          )
        }
      />
      <Show when={race()?.$type === 'BlueprintRace' && (race() as { SelectableRaceStat?: boolean }).SelectableRaceStat}>
        <Choice
          label="Racial +2"
          value={b().raceStat ?? ''}
          options={[{ value: '', text: 'None' }, ...ATTRIBUTES.map((a) => ({ value: a, text: a }))]}
          onChange={(a) =>
            props.planner.edit({ kind: 'raceStat', ...(a !== '' && { raceStat: a as Attribute }) }, 'Racial +2')
          }
        />
      </Show>
      <Choice
        label="Alignment"
        value={b().alignment ?? ''}
        options={[{ value: '', text: 'Not chosen' }, ...ALIGNMENTS.map((a) => ({ value: a, text: words(a) }))]}
        onChange={(a) =>
          props.planner.edit(
            { kind: 'alignment', alignment: a === '' ? undefined : (a as Alignment) },
            'Change alignment',
          )
        }
      />
      <fieldset class="planner-grid">
        <legend class="planner-field__label">
          Point buy · {pointBuyCost(scores())} of {POINT_BUY} points
        </legend>
        <For each={ATTRIBUTES}>
          {(a) => (
            <label class="planner-field planner-field--inline">
              <span>{a}</span>
              <input
                class="planner-field__control planner-field__control--number"
                type="number"
                min="7"
                max="18"
                value={scores()[a]}
                onChange={(e) => {
                  props.planner.edit(
                    { kind: 'scores', scores: { ...scores(), [a]: Number(e.currentTarget.value) } },
                    `${a} score`,
                  );
                  revertControl(e.currentTarget, scores()[a]);
                }}
              />
            </label>
          )}
        </For>
      </fieldset>
    </div>
  );
}

export interface AddPanelProps {
  readonly planner: Planner;
}

export function AddPanel(props: AddPanelProps) {
  const data = () => props.planner.engine.data;
  const classes = () =>
    shownSortedByName(
      data(),
      (bp) => bp.$type === 'BlueprintCharacterClass' && !(bp as BlueprintCharacterClass).IsMythic,
    );
  const [cls, setCls] = createSignal('');
  const [mythic, setMythic] = createSignal('');
  const nextLevel = () => props.planner.build().levels.length + 1;
  const nextRank = () => (props.planner.build().ranks?.length ?? 0) + 1;
  return (
    <div class="planner-panel">
      <h2 class="planner-panel__title">Add</h2>
      <Choice
        label={`Level ${nextLevel()}`}
        value={cls()}
        options={[
          { value: '', text: 'Choose a class' },
          ...classes().map((c) => ({ value: c.guid, text: c.name ?? c.assetName })),
        ]}
        onChange={setCls}
      />
      <Button
        variant="primary"
        disabled={cls() === ''}
        onClick={() => props.planner.edit({ kind: 'addLevel', class: cls() }, `Add level ${nextLevel()}`)}
      >
        Add level {nextLevel()}
      </Button>
      <Choice
        label={`Mythic rank ${nextRank()}`}
        value={mythic()}
        options={[
          { value: '', text: 'Choose a Mythic class' },
          ...mythicClasses(data()).map((c) => ({ value: c.guid, text: c.name ?? c.assetName })),
        ]}
        onChange={setMythic}
      />
      <Button
        disabled={mythic() === ''}
        onClick={() =>
          props.planner.edit(
            {
              kind: 'addRank',
              class: mythic(),
              level: Math.max(expectedLevel(data(), nextRank()), props.planner.build().levels.length, 1),
            },
            `Add Mythic rank ${nextRank()}`,
          )
        }
      >
        Add Mythic rank {nextRank()}
      </Button>
    </div>
  );
}

const PLACES = Object.keys(PLACE_ITEM_TYPES) as GearPlace[];

export interface GearPanelProps {
  readonly planner: Planner;
}

export function GearPanel(props: GearPanelProps) {
  const data = () => props.planner.engine.data;
  const [place, setPlace] = createSignal<GearPlace>('Armor');
  const [text, setText] = createSignal('');
  const gear = () => props.planner.build().gear ?? {};
  const items = createMemo(() => {
    const t = text().toLowerCase();
    if (t.length < 2) return [];
    return shownSortedByName(
      data(),
      (bp) =>
        PLACE_ITEM_TYPES[place()].includes(bp.$type) &&
        !data().twins.has(bp.guid) &&
        (bp.name ?? '').toLowerCase().includes(t),
    ).slice(0, 40);
  });
  return (
    <div class="planner-panel">
      <h2 class="planner-panel__title">Gear</h2>
      <label class="planner-field planner-field--inline">
        <input
          type="checkbox"
          checked={props.planner.build().countGear === true}
          onChange={(e) => {
            const el = e.currentTarget;
            props.planner.edit({ kind: 'countGear', on: el.checked }, 'Count Gear toward stat prerequisites');
            el.checked = props.planner.build().countGear === true;
          }}
        />
        <span>Count Gear toward stat prerequisites</span>
      </label>
      <Choice
        label="Place"
        value={place()}
        options={PLACES.map((p) => ({
          value: p,
          text: `${words(p)}${gear()[p] ? ` · ${nameOf(data(), gear()[p] as Guid)}` : ''}`,
        }))}
        onChange={(p) => setPlace(p as GearPlace)}
      />
      <Show when={gear()[place()]}>
        {(item) => (
          <Button
            variant="danger"
            onClick={() => props.planner.edit({ kind: 'gear', place: place() }, `Take off ${nameOf(data(), item())}`)}
          >
            Take off {nameOf(data(), item())}
          </Button>
        )}
      </Show>
      <input
        class="planner-field__control"
        type="search"
        placeholder="Search items (2 letters or more)"
        aria-label="Search items"
        value={text()}
        onInput={(e) => setText(e.currentTarget.value)}
      />
      <OptionList>
        <For each={items()}>
          {(item) => (
            <PickerOption
              name={item.name ?? item.assetName}
              status="open"
              selected={gear()[place()] === item.guid}
              onPick={() =>
                props.planner.edit({ kind: 'gear', place: place(), item: item.guid }, `Wear ${item.name ?? ''}`)
              }
            />
          )}
        </For>
      </OptionList>
    </div>
  );
}
