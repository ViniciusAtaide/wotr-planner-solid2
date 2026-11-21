import type { JSX } from '@solidjs/web';
import { createMemo, For, Match, onSettled, Show, Switch } from 'solid-js';
import { slotKey, type Place } from '~engine/build';
import { isShown, refGuid, type Attribute } from '~engine/data';
import type { Edit } from '~engine/edits';
import { nameOf } from '~engine/refusals';
import type { OpenedSlot } from '~engine/walk';

import { FeatIcon, type FeatCategory } from '../design';
import { CharacterCard, ScoresStep } from './CharacterCard';
import { featCategory } from './feat-category';
import { GearStep, wornLine } from './GearStep';
import type { EditOutcome } from './planner-state';
import type { Planner } from './state';
import {
  IncreaseStep,
  LevelEditor,
  MythicStep,
  NextLevelStep,
  RankEditor,
  SkillsStep,
  SlotStep,
  type TrailApi,
} from './steps';
import {
  chapterRange,
  chapters,
  chapterSummary,
  characterEditing,
  characterFolded,
  characterSlots,
  classLevelAt,
  folded,
  hereLevel,
  increaseOffered,
  isFirstLevelOfClass,
  keepsSelection,
  levelOneDone,
  nextStep,
  rankNumbersAt,
  skillBudget,
  slotLabel,
  slotsAt,
  stepTitle,
  whereOf,
  type Step,
  type TrailAction,
  type TrailState,
  type TrailView,
} from './trail-state';
import { sameSelection, type Selection } from './workspace-state';
import { optionName } from './words';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function stepKey(step: Step): string {
  return step.kind === 'slot' ? `slot ${slotKey(step.slot)}` : JSON.stringify(step);
}

export interface HereProps {
  readonly step: string;
  readonly title: string;
  readonly editing: boolean;
  readonly onBack: () => void;
  readonly children: JSX.Element;
}

export function Here(props: HereProps) {
  let el: HTMLDivElement | undefined;
  onSettled(() => {
    const still = matchMedia(REDUCED_MOTION).matches;
    el?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  });
  return (
    <div
      ref={(e) => {
        el = e;
      }}
      class="trail-here"
      data-step={props.step}
      role="region"
      aria-label={props.title}
    >
      <h3 class="trail-here__title">{props.title}</h3>
      <Show when={props.editing}>
        <button type="button" class="trail-link" onClick={() => props.onBack()}>
          Back to the next choice
        </button>
      </Show>
      {props.children}
    </div>
  );
}

export interface TrailProps {
  readonly planner: Planner;
  readonly state: TrailState;
  readonly send: (a: TrailAction) => void;
  readonly selection: Selection | undefined;
  readonly select: (s: Selection | undefined) => void;
  readonly phone: boolean;
  readonly diff?: (a: Attribute) => boolean;
}

export default function Trail(props: TrailProps) {
  const data = () => props.planner.engine.data;
  const build = () => props.planner.build();
  const view = createMemo((): TrailView => ({ data: data(), build: build(), walk: props.planner.walked() }));
  const step = createMemo((): Step => props.selection ?? nextStep(view(), props.state), {
    equals: (a, b) => stepKey(a) === stepKey(b),
  });
  const edit = (e: Edit, title: string): EditOutcome => {
    const outcome = props.planner.edit(e, title);
    if (outcome === 'applied') {
      if (e.kind === 'addLevel') props.send({ kind: 'levelAdded' });
      if (!keepsSelection(props.selection)) {
        props.select(e.kind === 'scores' && step().kind === 'scores' ? { kind: 'scores' } : undefined);
      }
    }
    return outcome;
  };
  const api: TrailApi = {
    get planner() {
      return props.planner;
    },
    view,
    state: () => props.state,
    send: (a) => props.send(a),
    selection: () => props.selection,
    select: (s) => props.select(s),
    edit,
  };
  const where = createMemo(() => whereOf(view(), step()), {
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
  const editing = () => props.selection !== undefined;
  const isTarget = (s: Selection) => {
    const now = step();
    return now.kind !== 'mythic' && now.kind !== 'nextLevel' && sameSelection(now, s);
  };
  const here = () => (
    <Show when={stepKey(step())} keyed>
      {(key) => (
        <Here
          step={key}
          title={stepTitle(view(), step())}
          editing={editing() && step().kind !== 'scores'}
          onBack={() => props.select(undefined)}
        >
          <StepBody trail={api} step={step()} {...(props.diff && { diff: props.diff })} />
        </Here>
      )}
    </Show>
  );
  const atLevel = (level: number) => {
    const w = where();
    return w.kind === 'level' && w.level === level;
  };
  const atRank = (rank: number) => {
    const w = where();
    return w.kind === 'rank' && w.rank === rank;
  };

  const chip = (label: string, value: string | undefined, target: Selection, icon?: FeatCategory) => (
    <button
      type="button"
      class={['trail-chip', { 'trail-chip--empty': value === undefined, 'trail-chip--target': isTarget(target) }]}
      aria-pressed={isTarget(target) ? 'true' : 'false'}
      onClick={() => props.select(isTarget(target) && editing() ? undefined : target)}
    >
      <small>{label}</small>
      <span>
        <Show when={icon}>{(c) => <FeatIcon category={c()} />}</Show>
        {value ?? 'Choose'}
      </span>
    </button>
  );
  const slotChip = (s: OpenedSlot) =>
    chip(
      slotLabel(data(), s.id.selection),
      s.pick === undefined ? undefined : optionName(data(), s.pick.feature, s.pick.param),
      { kind: 'slot', slot: s.id },
      s.pick === undefined ? undefined : featCategory(data(), s.pick.feature),
    );
  const slotChips = (place: Place) => <For each={slotsAt(view(), place)}>{(s) => slotChip(s)}</For>;
  const hasArchetypes = (level: number) => {
    const cls = data().blueprints.get(build().levels[level - 1]?.class ?? '');
    return (
      cls?.$type === 'BlueprintCharacterClass' &&
      cls.m_Archetypes.some((r) => {
        const a = data().blueprints.get(refGuid(r) ?? '');
        return a !== undefined && isShown(a);
      })
    );
  };
  const skillsText = (level: number) => {
    const b = skillBudget(view(), level);
    if (level === build().levels.length && b.spent < b.available) return `${b.spent} of ${b.available}`;
    return b.spent > 0 ? `${b.spent} ${b.spent === 1 ? 'rank' : 'ranks'}` : undefined;
  };
  const levelChips = (level: number) => {
    const l = () => build().levels[level - 1];
    const archetype = () => build().classChoices?.[l()?.class ?? '']?.archetypes[0];
    return (
      <div class="trail-chips">
        {slotChips({ level })}
        <Show when={isFirstLevelOfClass(build(), level) && hasArchetypes(level)}>
          {chip('Archetype', archetype() === undefined ? 'None' : nameOf(data(), archetype() ?? ''), {
            kind: 'level',
            level,
          })}
        </Show>
        <Show when={increaseOffered(view(), level)}>
          {chip('Ability', l()?.increase && `${l()?.increase} +1`, { kind: 'increase', level })}
        </Show>
        {chip('Skills', skillsText(level), { kind: 'skills', level })}
      </div>
    );
  };

  const next = createMemo((): Step => nextStep(view(), props.state), {
    equals: (a, b) => stepKey(a) === stepKey(b),
  });
  const cardView = () => ({
    phone: props.phone,
    levelOneDone: levelOneDone(view(), next()),
    open: props.state.characterOpen,
  });
  const characterOpen = () => characterEditing(cardView());
  const hereIsCharacter = () => where().kind === 'character' || where().kind === 'scores';
  const cardFolded = () => characterFolded({ ...cardView(), hereIsCharacter: hereIsCharacter() });
  const foldView = () => ({
    phone: props.phone,
    levels: build().levels.length,
    here: hereLevel(view(), where()),
    unfolded: props.state.unfolded,
  });
  const levelsOf = (chapter: number) => {
    const { first, last } = chapterRange(chapter);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i).filter((l) => l <= build().levels.length);
  };

  const stops = (chapter: number) => (
    <For each={levelsOf(chapter)}>
      {(level) => (
        <>
          <li class={['trail-stop', { 'trail-stop--here': atLevel(level), 'trail-stop--milestone': level % 4 === 0 }]}>
            <span class="trail-stop__mark">{level}</span>
            <div class="trail-stop__body">
              <button
                type="button"
                class="trail-stop__class"
                aria-label={`Level ${level}: ${nameOf(data(), build().levels[level - 1]?.class ?? '')} ${classLevelAt(build(), level)}`}
                aria-pressed={isTarget({ kind: 'level', level }) ? 'true' : 'false'}
                onClick={() =>
                  props.select(isTarget({ kind: 'level', level }) && editing() ? undefined : { kind: 'level', level })
                }
              >
                {nameOf(data(), build().levels[level - 1]?.class ?? '')} {classLevelAt(build(), level)}
              </button>
              {levelChips(level)}
              <Show when={atLevel(level)}>{here()}</Show>
            </div>
          </li>
          <For each={rankNumbersAt(build(), level)}>
            {(rank) => (
              <li class={['trail-stop trail-stop--mythic', { 'trail-stop--here': atRank(rank) }]}>
                <span class="trail-stop__mark">M{rank}</span>
                <div class="trail-stop__body">
                  <button
                    type="button"
                    class="trail-stop__class"
                    aria-label={`Mythic rank ${rank}: ${nameOf(data(), build().ranks?.[rank - 1]?.class ?? '')}`}
                    aria-pressed={isTarget({ kind: 'rank', rank }) ? 'true' : 'false'}
                    onClick={() =>
                      props.select(isTarget({ kind: 'rank', rank }) && editing() ? undefined : { kind: 'rank', rank })
                    }
                  >
                    Ascension · {nameOf(data(), build().ranks?.[rank - 1]?.class ?? '')}
                  </button>
                  <div class="trail-chips">{slotChips({ rank })}</div>
                  <Show when={atRank(rank)}>{here()}</Show>
                </div>
              </li>
            )}
          </For>
        </>
      )}
    </For>
  );

  return (
    <div class="trail">
      <CharacterCard
        trail={api}
        folded={cardFolded()}
        foldable={props.phone}
        editing={characterOpen()}
        onToggle={() => props.send({ kind: 'character', open: cardFolded() ? true : !characterOpen() })}
        {...(props.diff && { diff: props.diff })}
        chips={
          <Show when={characterSlots(view()).length > 0}>
            <div class="trail-chips">
              <For each={characterSlots(view())}>{(s) => slotChip(s)}</For>
            </div>
          </Show>
        }
        scoresStep={where().kind === 'scores'}
        here={<Show when={hereIsCharacter()}>{here()}</Show>}
      />
      <ol class="trail-path" aria-label="Levels">
        <For each={chapters(build().levels.length)}>
          {(n) => (
            <Show
              when={folded(n, foldView())}
              fallback={
                <>
                  <Show when={props.state.unfolded.has(n)}>
                    <li class="trail-fold-close">
                      <button
                        type="button"
                        class="trail-link"
                        onClick={() => props.send({ kind: 'toggleChapter', chapter: n })}
                      >
                        Fold levels {chapterRange(n).first}–{chapterRange(n).last}
                      </button>
                    </li>
                  </Show>
                  {stops(n)}
                </>
              }
            >
              <ChapterRow view={view()} chapter={n} onOpen={() => props.send({ kind: 'toggleChapter', chapter: n })} />
            </Show>
          )}
        </For>
        <Show when={where().kind === 'next'}>
          <li class="trail-stop trail-stop--here trail-stop--next">
            <span class="trail-stop__mark">{build().levels.length + 1}</span>
            <div class="trail-stop__body">{here()}</div>
          </li>
        </Show>
      </ol>
      <section class="trail-card trail-gear" aria-label="Gear">
        <button
          type="button"
          class="trail-card__head"
          aria-expanded={where().kind === 'gear' ? 'true' : 'false'}
          onClick={() => props.select(where().kind === 'gear' ? undefined : { kind: 'gear' })}
        >
          <span class="trail-kicker">
            Gear <span aria-hidden="true">{where().kind === 'gear' ? '▾' : '▸'}</span>
          </span>
          <span class="trail-fold-line">{wornLine(data(), build().gear)}</span>
        </button>
        <Show when={where().kind === 'gear'}>{here()}</Show>
      </section>
    </div>
  );
}

export interface ChapterRowProps {
  readonly view: TrailView;
  readonly chapter: number;
  readonly onOpen: () => void;
}

export function ChapterRow(props: ChapterRowProps) {
  const summary = createMemo(() => chapterSummary(props.view, props.chapter));
  const range = () => chapterRange(props.chapter);
  return (
    <li class="trail-stop trail-stop--milestone trail-stop--chapter">
      <span class="trail-stop__mark">{range().last}</span>
      <button type="button" class="trail-chapter" aria-expanded="false" onClick={() => props.onOpen()}>
        <span class="trail-kicker">
          Levels {range().first}–{range().last} <span aria-hidden="true">▸</span>
        </span>
        <span class="trail-chapter__classes">
          {summary().classes}
          <Show when={summary().ranks !== ''}>
            <span class="trail-chapter__ranks"> · {summary().ranks}</span>
          </Show>
        </span>
        <span class="trail-fold-line">{summary().picks}</span>
      </button>
    </li>
  );
}

export interface StepBodyProps {
  readonly trail: TrailApi;
  readonly step: Step;
  readonly diff?: (a: Attribute) => boolean;
}

export function StepBody(props: StepBodyProps) {
  const slot = () => (props.step.kind === 'slot' ? props.step.slot : undefined);
  const level = (kind: 'increase' | 'skills' | 'level') => (props.step.kind === kind ? props.step.level : undefined);
  const rank = () => (props.step.kind === 'rank' ? props.step.rank : undefined);
  return (
    <Switch>
      <Match when={slot()}>{(s) => <SlotStep trail={props.trail} slot={s()} />}</Match>
      <Match when={level('increase')}>{(l) => <IncreaseStep trail={props.trail} level={l()} />}</Match>
      <Match when={level('skills')}>{(l) => <SkillsStep trail={props.trail} level={l()} />}</Match>
      <Match when={level('level')}>{(l) => <LevelEditor trail={props.trail} level={l()} />}</Match>
      <Match when={rank()}>{(r) => <RankEditor trail={props.trail} rank={r()} />}</Match>
      <Match when={props.step.kind === 'gear'}>
        <GearStep trail={props.trail} />
      </Match>
      <Match when={props.step.kind === 'scores'}>
        <ScoresStep trail={props.trail} {...(props.diff && { diff: props.diff })} />
      </Match>
      <Match when={props.step.kind === 'mythic'}>
        <MythicStep trail={props.trail} />
      </Match>
      <Match when={props.step.kind === 'nextLevel'}>
        <NextLevelStep trail={props.trail} />
      </Match>
    </Switch>
  );
}
