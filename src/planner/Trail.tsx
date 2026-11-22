import type { JSX } from '@solidjs/web';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onSettled,
  Show,
  Switch,
  untrack,
  useContext,
} from 'solid-js';
import { slotKey, type Place } from '~engine/build';
import { isShown, refGuid, type Attribute } from '~engine/data';
import type { Edit } from '~engine/edits';
import { nameOf } from '~engine/refusals';
import { ATTRIBUTES, type OpenedSlot } from '~engine/walk';

import { Badge, FeatIcon, type FeatCategory } from '../design';
import { CharacterCard, ScoresStep, SHORT } from './CharacterCard';
import { ChoiceDialog } from './ChoiceDialog';
import { isListStep, type ListMode } from './list-mode';
import { CollapsedLists, createFilterMemory, StepFilter } from './list-panel';
import { CharacterField } from './CharacterField';
import { BackgroundStep, RaceStep } from './CharacterSteps';
import { PickStep } from './PickStep';
import { StepArrived } from './ChoiceList';
import { featCategory } from './feat-category';
import { firstControl } from './focus-return';
import { backgroundLabel, raceLabel } from './flat-choices';
import { GearStep, wornLine } from './GearStep';
import type { EditOutcome, NonEmpty } from './planner-state';
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
  characterChipSlots,
  characterSlots,
  isCharacterSlot,
  classLevelAt,
  folded,
  gearDependentSlots,
  hereLevel,
  increaseOffered,
  isBackgroundSlot,
  isFirstLevelOfClass,
  keepsSelection,
  levelOneDone,
  chipSlots,
  pickLabels,
  nextStep,
  rankNumbersAt,
  skillBudget,
  slotName,
  SPELL_NOT_MODELLED,
  spellPick,
  slotsAt,
  stepKey,
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
const FINE_POINTER = '(pointer: fine)';

function lost(active: Element | null): boolean {
  return active === null || active === document.body || !active.isConnected;
}

export interface HereProps {
  readonly step: string;
  readonly title: string;
  readonly editing: boolean;
  readonly onBack: () => void;
  readonly list?: boolean;
  readonly mode?: ListMode;
  readonly line?: string;
  readonly confirming?: boolean;
  readonly dialogOpen?: boolean;
  readonly onDialog?: (open: boolean) => void;
  readonly children: JSX.Element;
}

export function Here(props: HereProps) {
  let el: HTMLDivElement | undefined;
  const arrived = useContext(StepArrived);
  let expand: HTMLButtonElement | undefined;
  const memory = createFilterMemory();
  const modal = () => props.list === true && props.mode === 'modal';
  const setDialog = (open: boolean) => props.onDialog?.(open);
  const dialog = () => props.dialogOpen === true;
  onSettled(() => {
    if (!arrived()) return;
    if (modal()) setDialog(true);
    const frame = requestAnimationFrame(() => {
      const still = matchMedia(REDUCED_MOTION).matches;
      el?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
      if (el !== undefined && lost(document.activeElement)) {
        firstControl(el, matchMedia(FINE_POINTER).matches)?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
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
      <Show when={props.editing || props.list === true}>
        <div class="trail-here__links">
          <Show when={props.editing}>
            <button type="button" class="trail-link" data-back onClick={() => props.onBack()}>
              Back to the next choice
            </button>
          </Show>
          <Show when={props.list === true}>
            <button
              ref={(b) => {
                expand = b;
              }}
              type="button"
              class="trail-link trail-here__expand"
              data-aside
              onClick={() => setDialog(true)}
            >
              {modal() ? 'Open the list' : 'Expand'}
            </button>
          </Show>
        </div>
      </Show>
      <Show
        when={dialog() && props.confirming !== true}
        fallback={
          <Show when={!modal()}>
            <StepFilter value={memory}>
              <CollapsedLists value={true}>{props.children}</CollapsedLists>
            </StepFilter>
          </Show>
        }
      >
        <p class="trail-note">Choosing in the dialog.</p>
        <ChoiceDialog
          title={props.title}
          line={props.line ?? ''}
          onClose={() => setDialog(false)}
          returnTo={() => expand}
        >
          <StepFilter value={memory}>{props.children}</StepFilter>
        </ChoiceDialog>
      </Show>
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
  readonly listMode?: ListMode;
}

export default function Trail(props: TrailProps) {
  const data = () => props.planner.engine.data;
  const build = () => props.planner.build();
  const view = createMemo((): TrailView => ({ data: data(), build: build(), walk: props.planner.walked() }));
  const step = createMemo((): Step => props.selection ?? nextStep(view(), props.state), {
    equals: (a, b) => stepKey(a) === stepKey(b),
  });
  const scoresLine = () => ATTRIBUTES.map((a) => `${SHORT[a]} ${props.planner.walked().unit.permanent(a)}`).join(' · ');
  const firstStep = createMemo((was?: string) => was ?? stepKey(step()));
  const arrived = createMemo((was?: boolean) => was === true || stepKey(step()) !== firstStep());
  const applied = (edits: NonEmpty<Edit>, outcome: EditOutcome): EditOutcome => {
    if (outcome === 'applied') {
      if (edits.some((e) => e.kind === 'addLevel')) props.send({ kind: 'levelAdded' });
      if (!keepsSelection(props.selection)) {
        const scores = edits.length === 1 && edits[0].kind === 'scores' && step().kind === 'scores';
        props.select(scores ? { kind: 'scores' } : undefined);
      }
    }
    return outcome;
  };
  const edit = (e: Edit, title: string): EditOutcome => applied([e], props.planner.edit(e, title));
  const editAll = (edits: NonEmpty<Edit>, title: string): EditOutcome =>
    applied(edits, props.planner.editAll(edits, title));
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
    editAll,
  };
  const where = createMemo(() => whereOf(view(), step()), {
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
  const editing = () => props.selection !== undefined;
  const reopens = () =>
    props.listMode === 'modal' && isListStep(step(), build().levels.length) && props.state.dialog !== stepKey(step());
  const isTarget = (s: Selection) => {
    const now = step();
    return (
      now.kind !== 'mythic' &&
      now.kind !== 'nextLevel' &&
      now.kind !== 'complete' &&
      now.kind !== 'alignment' &&
      sameSelection(now, s)
    );
  };
  const here = () => (
    <Show when={stepKey(step())} keyed>
      {(key) => (
        <Here
          step={key}
          title={stepTitle(view(), step())}
          editing={editing() && step().kind !== 'scores' && stepKey(step()) !== stepKey(next())}
          onBack={() => props.select(undefined)}
          list={isListStep(step(), build().levels.length)}
          mode={props.listMode ?? 'inline'}
          line={scoresLine()}
          confirming={props.planner.session().kind === 'confirming'}
          dialogOpen={props.state.dialog === key}
          onDialog={(open) => props.send({ kind: 'dialog', step: open ? key : undefined })}
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

  const chip = (
    label: string,
    value: string | undefined,
    target: Selection,
    icon?: FeatCategory,
    gear = false,
    empty = 'Choose',
    note?: string,
  ) => (
    <button
      type="button"
      title={note}
      class={['trail-chip', { 'trail-chip--empty': value === undefined, 'trail-chip--target': isTarget(target) }]}
      aria-pressed={isTarget(target) ? 'true' : 'false'}
      onClick={() => {
        if (isTarget(target) && reopens()) props.send({ kind: 'dialog', step: stepKey(step()) });
        else props.select(isTarget(target) && editing() ? undefined : target);
      }}
    >
      <small>{label}</small>
      <span>
        <Show when={icon}>{(c) => <FeatIcon category={c()} />}</Show>
        {value ?? empty}
        <Show when={gear}>
          <span class="trail-chip__gear" title="Taken through Gear (counted toward its prerequisites)">
            <Badge kind="gear">◈</Badge>
          </span>
        </Show>
      </span>
      <Show when={note}>
        <small class="trail-chip__note">Spell not in the planner yet</small>
      </Show>
    </button>
  );
  const slotField = (s: OpenedSlot) => {
    const background = () => isBackgroundSlot(view(), s.id);
    const step: Step = { kind: 'slot', slot: s.id };
    const value = () => {
      const now = characterChipSlots(view()).find((x) => slotKey(x.id) === slotKey(s.id));
      if (now?.pick === undefined) return undefined;
      return background()
        ? backgroundLabel(props.planner.engine, build(), props.planner.walked(), s.id)
        : pickLabels(data(), characterChipSlots(view())).get(slotKey(s.id));
    };
    return (
      <CharacterField
        trail={api}
        step={step}
        title={stepTitle(view(), step)}
        modal={props.listMode === 'modal'}
        field={{
          label: slotName(view(), s.id),
          value: value(),
          placeholder: `Choose your ${slotName(view(), s.id).toLowerCase()}`,
          target: isTarget({ kind: 'slot', slot: s.id }),
          arrive: arriving() === stepKey(step),
          onArrived: arrivalDone,
        }}
        list={(f) =>
          background() ? <BackgroundStep trail={api} field={f} /> : <PickStep trail={api} slot={s.id} field={f} />
        }
      />
    );
  };
  const slotChip = (s: OpenedSlot, labels: ReadonlyMap<string, string>) => {
    const background = isBackgroundSlot(view(), s.id);
    return chip(
      slotName(view(), s.id),
      s.pick === undefined
        ? undefined
        : background
          ? backgroundLabel(props.planner.engine, build(), props.planner.walked(), s.id)
          : (labels.get(slotKey(s.id)) ?? optionName(data(), s.pick.feature, s.pick.param)),
      { kind: 'slot', slot: s.id },
      s.pick === undefined || background ? undefined : featCategory(data(), s.pick.feature),
      s.pick !== undefined && gearDependentSlots(view()).has(slotKey(s.id)),
      'Choose',
      spellPick(view(), s.id) === undefined ? undefined : SPELL_NOT_MODELLED,
    );
  };
  const slotChips = (place: Place) => (
    <For each={chipSlots(slotsAt(view(), place))}>
      {(s) => <>{slotChip(s, pickLabels(data(), slotsAt(view(), place)))}</>}
    </For>
  );
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
  const [arriving, setArriving] = createSignal<string | undefined>(undefined);
  const arrivalDone = () => setArriving(undefined);
  const nextRank = () => {
    const s = step();
    return s.kind === 'mythic' ? s.rank : undefined;
  };
  const nextMark = () => {
    const rank = nextRank();
    return rank === undefined ? String(build().levels.length + 1) : `M${rank}`;
  };
  const fieldKey = (st: Step) =>
    st.kind === 'race' || st.kind === 'alignment' || (st.kind === 'slot' && isCharacterSlot(view(), st.slot))
      ? stepKey(st)
      : undefined;
  const isFieldKey = (key: string) =>
    key === stepKey({ kind: 'race' }) ||
    characterSlots(view()).some((x) => stepKey({ kind: 'slot', slot: x.id }) === key);
  let lastNext = untrack(() => stepKey(next()));
  createEffect(
    () => ({ built: build(), now: next(), held: props.selection !== undefined }),
    ({ now, held }) => {
      const open = props.state.dialog;
      if (open !== undefined && isFieldKey(open)) props.send({ kind: 'dialog', step: undefined });
      const key = stepKey(now);
      if (held || key === lastNext) return;
      lastNext = key;
      const arrivingKey = fieldKey(now);
      if (arrivingKey === undefined || !arrived()) {
        setArriving(undefined);
        return;
      }
      if (props.listMode === 'modal' && now.kind !== 'alignment') props.send({ kind: 'dialog', step: arrivingKey });
      else setArriving(arrivingKey);
    },
  );
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
    <StepArrived value={arrived}>
      <div class="trail">
        <CharacterCard
          trail={api}
          folded={cardFolded()}
          foldable={props.phone}
          editing={characterOpen()}
          onToggle={() => props.send({ kind: 'character', open: cardFolded() ? true : !characterOpen() })}
          {...(props.diff && { diff: props.diff })}
          race={
            <CharacterField
              trail={api}
              step={{ kind: 'race' }}
              title={stepTitle(view(), { kind: 'race' })}
              modal={props.listMode === 'modal'}
              field={{
                label: 'Race',
                value: raceLabel(props.planner.engine, build(), props.planner.walked()),
                placeholder: 'Choose your race',
                target: isTarget({ kind: 'race' }),
                arrive: arriving() === stepKey({ kind: 'race' }),
                onArrived: arrivalDone,
              }}
              list={(f) => <RaceStep trail={api} field={f} />}
            />
          }
          chips={
            <div class="trail-fields">
              <For each={characterChipSlots(view())} keyed={(s) => slotKey(s.id)}>
                {(s) => untrack(() => slotField(s()))}
              </For>
            </div>
          }
          scoresStep={where().kind === 'scores'}
          alignmentStep={step().kind === 'alignment'}
          alignmentArrives={arriving() === stepKey({ kind: 'alignment' })}
          onAlignmentArrived={arrivalDone}
          here={<Show when={where().kind === 'scores'}>{here()}</Show>}
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
                <ChapterRow
                  view={view()}
                  chapter={n}
                  onOpen={() => props.send({ kind: 'toggleChapter', chapter: n })}
                />
              </Show>
            )}
          </For>
          <Show when={where().kind === 'next'}>
            <li
              class={[
                'trail-stop trail-stop--here trail-stop--next',
                { 'trail-stop--mythic': nextRank() !== undefined },
              ]}
            >
              <span class="trail-stop__mark">{nextMark()}</span>
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
    </StepArrived>
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
      <Match when={props.step.kind === 'race'}>
        <RaceStep trail={props.trail} />
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
