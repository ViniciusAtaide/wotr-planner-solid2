import { createMemo, For, Match, Show, Switch } from 'solid-js';
import { toRankLevel, toSkillRanks, type SlotId } from '~engine/build';
import type { Attribute, StatType } from '~engine/data';
import { allows, type Edit } from '~engine/edits';
import { expectedLevel } from '~engine/mcp';
import { mythicStartingClass, offeredClasses, offeredMythicClasses } from '~engine/pickers';
import { nameOf, rankLevelRange, statName } from '~engine/refusals';
import { ATTRIBUTES, SKILL_ATTRIBUTE } from '~engine/walk';

import { Button, Refusal } from '../design';
import { BackgroundStep, RaceStep } from './CharacterSteps';
import { PickStep } from './PickStep';
import { ChoiceList, currentFirst, judge, type ChoiceRow } from './ChoiceList';
import { flatName, shownArchetypes } from './flat-choices';
import { judgeClasses, type ClassJudged, type EditOutcome, type NonEmpty } from './planner-state';
import type { Planner } from './state';
import type { TrailAction, TrailState, TrailView } from './trail-state';
import {
  atLevelCap,
  classLevelAt,
  isBackgroundSlot,
  isFirstLevelOfClass,
  isHeritageSlot,
  mythicDue,
  sameRanks,
  skillBudget,
} from './trail-state';
import type { Selection } from './workspace-state';
import { bareNameOf } from './words';

export interface TrailApi {
  readonly planner: Planner;
  readonly view: () => TrailView;
  readonly state: () => TrailState;
  readonly send: (a: TrailAction) => void;
  readonly selection: () => Selection | undefined;
  readonly select: (s: Selection | undefined) => void;
  readonly edit: (e: Edit, title: string) => EditOutcome;
  readonly editAll: (edits: NonEmpty<Edit>, title: string) => EditOutcome;
}

const SKILLS = Object.keys(SKILL_ATTRIBUTE) as StatType[];

export interface SlotStepProps {
  readonly trail: TrailApi;
  readonly slot: SlotId;
}

export function SlotStep(props: SlotStepProps) {
  const kind = () => {
    const view = props.trail.view();
    if (isHeritageSlot(view, props.slot)) return 'race';
    return isBackgroundSlot(view, props.slot) ? 'background' : 'pick';
  };
  return (
    <Switch>
      <Match when={kind() === 'race'}>
        <RaceStep trail={props.trail} />
      </Match>
      <Match when={kind() === 'background'}>
        <BackgroundStep trail={props.trail} />
      </Match>
      <Match when={kind() === 'pick'}>
        <PickStep trail={props.trail} slot={props.slot} />
      </Match>
    </Switch>
  );
}

export interface LevelStepProps {
  readonly trail: TrailApi;
  readonly level: number;
}

export function IncreaseStep(props: LevelStepProps) {
  const build = () => props.trail.planner.build();
  const chosen = () => build().levels[props.level - 1]?.increase;
  const before = () =>
    build()
      .levels.slice(0, props.level - 1)
      .findLast((l) => l.increase !== undefined)?.increase;
  const raise = (a: Attribute) =>
    props.trail.edit({ kind: 'increase', level: props.level, increase: a }, `Level ${props.level}: ${a} +1`);
  return (
    <div class="trail-buttons trail-buttons--wide" role="group" aria-label="Ability increase">
      <For each={ATTRIBUTES}>
        {(a) => (
          <button
            type="button"
            class={['trail-button', { 'trail-button--on': chosen() === a }]}
            aria-pressed={chosen() === a ? 'true' : 'false'}
            onClick={() => raise(a)}
          >
            {a}
            <Show when={before() === a}>
              <small> · as before</small>
            </Show>
          </button>
        )}
      </For>
    </div>
  );
}

export function SkillsStep(props: LevelStepProps) {
  const build = () => props.trail.planner.build();
  const ranks = () => build().levels[props.level - 1]?.skills ?? {};
  const budget = () => skillBudget(props.trail.view(), props.level);
  const last = () => props.level === build().levels.length;
  const left = () => budget().available - budget().spent;
  const previous = () => {
    const before = build().levels[props.level - 2]?.skills;
    return before === undefined || sameRanks(before, ranks()) ? undefined : before;
  };
  const raisable = createMemo(() => {
    const engine = props.trail.planner.engine;
    const b = build();
    const now = ranks();
    return new Set(
      SKILLS.filter((skill) => {
        const skills = toSkillRanks({ ...now, [skill]: (now[skill] ?? 0) + 1 });
        return (
          skills !== undefined && allows(engine.data, b, { kind: 'skills', level: props.level, skills }, engine.G).ok
        );
      }),
    );
  });
  const set = (skill: StatType, delta: number) => {
    const wanted: Record<string, number> = { ...ranks() };
    const n = Math.max(0, (wanted[skill] ?? 0) + delta);
    if (n === 0) delete wanted[skill];
    else wanted[skill] = n;
    const skills = toSkillRanks(wanted);
    if (skills === undefined) return;
    props.trail.edit(
      { kind: 'skills', level: props.level, skills },
      `${statName(skill)} ${delta > 0 ? '+1' : '−1'} at level ${props.level}`,
    );
  };
  return (
    <div class="trail-step">
      <div class="trail-skills__head">
        <span class="trail-budget">
          <Show when={last()} fallback={<>{budget().spent} ranks at this level</>}>
            {budget().spent} of {budget().available} skill points spent
          </Show>
        </span>
        <Show when={previous()}>
          {(same) => (
            <button
              type="button"
              class="trail-button"
              onClick={() =>
                props.trail.edit(
                  { kind: 'skills', level: props.level, skills: same() },
                  `Skills at level ${props.level} as at level ${props.level - 1}`,
                )
              }
            >
              Same as level {props.level - 1}
            </button>
          )}
        </Show>
      </div>
      <Show when={last() && left() > 0}>
        <button
          type="button"
          class="trail-link"
          onClick={() => {
            props.trail.send({ kind: 'leaveSkills', level: props.level });
            props.trail.select(undefined);
          }}
        >
          Done · leave {left()} unspent
        </button>
      </Show>
      <ul class="trail-skills">
        <For each={SKILLS}>
          {(skill) => (
            <li class="trail-skill">
              <span>{statName(skill)}</span>
              <button
                type="button"
                class="trail-stepper"
                aria-label={`Fewer ${statName(skill)} ranks`}
                disabled={(ranks()[skill] ?? 0) === 0}
                onClick={() => set(skill, -1)}
              >
                −
              </button>
              <span class="trail-skill__n">{ranks()[skill] ?? 0}</span>
              <button
                type="button"
                class="trail-stepper"
                aria-label={`More ${statName(skill)} ranks`}
                disabled={!raisable().has(skill)}
                onClick={() => set(skill, 1)}
              >
                +
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

export interface TrailStepProps {
  readonly trail: TrailApi;
}

function ClassList(props: TrailStepProps) {
  const planner = () => props.trail.planner;
  const rows = createMemo((): ChoiceRow[] => {
    const b = planner().build();
    const data = planner().engine.data;
    const previous = b.levels.at(-1)?.class;
    const level = b.levels.length + 1;
    const offered = offeredClasses(data);
    const judgedAll = judgeClasses(
      planner().engine,
      b,
      { level },
      offered.map((c) => c.guid),
      (cls) => ({ kind: 'addLevel', class: cls }),
    );
    return currentFirst(
      offered.flatMap((c): ChoiceRow[] => {
        const judged: ClassJudged = judgedAll.get(c.guid) ?? { open: false, reasons: [] };
        if (judged.shown === false && c.guid !== previous) return [];
        const name = judged.label ?? bareNameOf(data, c.guid);
        const plain: ChoiceRow = {
          key: c.guid,
          name,
          open: judged.open,
          reasons: judged.reasons,
          note: judged.note,
          current: c.guid === previous,
          take: () => props.trail.edit({ kind: 'addLevel', class: c.guid }, `Level ${level} as ${name}`),
        };
        if (b.levels.some((l) => l.class === c.guid)) return [plain];
        return [
          plain,
          ...[...(judged.archetypes?.keys() ?? shownArchetypes(data, c.guid))].map((a) => {
            const own = judged.archetypes?.get(a);
            const flat = flatName(name, own?.label ?? bareNameOf(data, a));
            return {
              key: `${c.guid} ${a}`,
              name: flat,
              open: judged.open && (own?.open ?? true),
              reasons: [...judged.reasons, ...(own?.reasons ?? [])],
              note: judged.note,
              current: false,
              take: () =>
                props.trail.editAll(
                  [
                    { kind: 'addLevel', class: c.guid },
                    { kind: 'archetypes', class: c.guid, archetypes: [a] },
                  ],
                  `Level ${level} as ${flat}`,
                ),
            };
          }),
        ];
      }),
    );
  });
  return <ChoiceList label="Filter classes and archetypes by name" rows={rows()} />;
}

export function startingWith(key: string | undefined, rows: ChoiceRow[]): ChoiceRow[] {
  const at = rows.findIndex((r) => r.key === key);
  return at <= 0 ? rows : [rows[at] as ChoiceRow, ...rows.slice(0, at), ...rows.slice(at + 1)];
}

export function NextLevelStep(props: TrailStepProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const next = () => planner().build().levels.length + 1;
  const previous = () => planner().build().levels.at(-1)?.class;
  const verdict = createMemo(() => {
    const cls = previous();
    return cls === undefined ? undefined : judge(planner().engine, planner().build(), { kind: 'addLevel', class: cls });
  });
  const others = () => props.trail.state().otherClass || previous() === undefined;
  return (
    <div class="trail-step">
      <Show when={previous()}>
        {(cls) => (
          <>
            <button
              type="button"
              class="trail-cta"
              disabled={verdict()?.open !== true}
              onClick={() =>
                props.trail.edit({ kind: 'addLevel', class: cls() }, `Level ${next()} as ${nameOf(data(), cls())}`)
              }
            >
              <span>Continue as {nameOf(data(), cls())}</span>
              <span class="trail-cta__to">→ level {next()}</span>
            </button>
            <Show when={verdict()?.reasons.length}>
              <Refusal lines={verdict()?.reasons ?? []} />
            </Show>
          </>
        )}
      </Show>
      <Show
        when={others()}
        fallback={
          <button type="button" class="trail-link" onClick={() => props.trail.send({ kind: 'otherClass', open: true })}>
            Another class…
          </button>
        }
      >
        <ClassList trail={props.trail} />
      </Show>
    </div>
  );
}

export function MythicStep(props: TrailStepProps) {
  const planner = () => props.trail.planner;
  const due = () => mythicDue(props.trail.view(), props.trail.state().mythicLater);
  const rows = createMemo((): ChoiceRow[] => {
    const d = due();
    const level = d === undefined ? undefined : toRankLevel(d.at);
    if (d === undefined || level === undefined) return [];
    const b = planner().build();
    const path = b.ranks?.at(-1)?.class;
    const first = path ?? mythicStartingClass(planner().engine.data);
    const offered = offeredMythicClasses(planner().engine.data);
    const judged = judgeClasses(
      planner().engine,
      b,
      { rank: d.rank },
      offered.map((c) => c.guid),
      (cls) => ({ kind: 'addRank', class: cls, level }),
      level,
    );
    return startingWith(
      first,
      currentFirst(
        offered.map((c) => {
          const name = judged.get(c.guid)?.label ?? bareNameOf(planner().engine.data, c.guid);
          return {
            key: c.guid,
            name,
            ...(judged.get(c.guid) ?? { open: false, reasons: [] }),
            current: c.guid === path,
            take: () => props.trail.edit({ kind: 'addRank', class: c.guid, level }, `Mythic rank ${d.rank} as ${name}`),
          };
        }),
      ),
    );
  });
  return (
    <Show when={due()}>
      {(d) => (
        <div class="trail-step trail-step--mythic">
          <p class="trail-note">
            Your story grants Mythic rank {d().rank} at level {d().at}.
          </p>
          <ChoiceList label="Filter Mythic paths by name" rows={rows()} />
          <Show when={!atLevelCap(props.trail.view())}>
            <button
              type="button"
              class="trail-link"
              onClick={() => props.trail.send({ kind: 'mythicLater', level: planner().build().levels.length })}
            >
              Not now · onward to level {planner().build().levels.length + 1}
            </button>
          </Show>
        </div>
      )}
    </Show>
  );
}

export function LevelEditor(props: LevelStepProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const level = () => planner().build().levels[props.level - 1];
  const judgedHere = createMemo(() =>
    judgeClasses(
      planner().engine,
      planner().build(),
      { level: props.level },
      offeredClasses(data()).map((c) => c.guid),
      (cls) => ({ kind: 'class', level: props.level, class: cls }),
    ),
  );
  const classRows = createMemo((): ChoiceRow[] => {
    const now = level()?.class;
    const judged = judgedHere();
    return currentFirst(
      offeredClasses(data()).flatMap((c): ChoiceRow[] => {
        const own = judged.get(c.guid);
        if (own?.shown === false && c.guid !== now) return [];
        const name = own?.label ?? bareNameOf(data(), c.guid);
        return [
          {
            key: c.guid,
            name,
            ...(c.guid === now
              ? { open: true, reasons: [] }
              : { open: own?.open ?? false, reasons: own?.reasons ?? [], note: own?.note }),
            current: c.guid === now,
            take: () => {
              if (c.guid !== now)
                props.trail.edit(
                  { kind: 'class', level: props.level, class: c.guid },
                  `Level ${props.level} as ${name}`,
                );
            },
          },
        ];
      }),
    );
  });
  const archetypeRows = createMemo((): ChoiceRow[] => {
    const cls = level()?.class;
    if (cls === undefined || !isFirstLevelOfClass(planner().build(), props.level)) return [];
    const b = planner().build();
    const held = b.classChoices?.[cls]?.archetypes[0];
    const judged = judgedHere().get(cls)?.archetypes;
    const options = judged === undefined ? shownArchetypes(data(), cls) : [...judged.keys()];
    if (options.length === 0) return [];
    const none: ChoiceRow = {
      key: 'none',
      name: 'No archetype',
      open: true,
      reasons: [],
      current: held === undefined,
      take: () => props.trail.edit({ kind: 'archetypes', class: cls, archetypes: [] }, 'No archetype'),
    };
    return [
      none,
      ...options.map((a) => {
        const own = judged?.get(a);
        const name = own?.label ?? bareNameOf(data(), a);
        return {
          key: a,
          name,
          ...(a === held
            ? { open: true, reasons: [] }
            : own === undefined
              ? judge(planner().engine, b, { kind: 'archetypes', class: cls, archetypes: [a] })
              : { open: own.open, reasons: own.reasons }),
          current: a === held,
          take: () => props.trail.edit({ kind: 'archetypes', class: cls, archetypes: [a] }, `Took ${name}`),
        };
      }),
    ];
  });
  return (
    <Show when={level()}>
      <div class="trail-step">
        <Show when={archetypeRows().length > 0}>
          <h4 class="trail-subhead">Archetype</h4>
          <ChoiceList label="Filter archetypes by name" rows={archetypeRows()} />
        </Show>
        <h4 class="trail-subhead">
          Class at level {props.level} · {classLevelAt(planner().build(), props.level)} in its class
        </h4>
        <ChoiceList label="Filter classes by name" rows={classRows()} />
        <Show when={props.level === planner().build().levels.length}>
          <Button
            variant="danger"
            onClick={() => props.trail.edit({ kind: 'dropLevel' }, `Removed level ${props.level}`)}
          >
            Remove level {props.level}
          </Button>
        </Show>
      </div>
    </Show>
  );
}

export interface RankStepProps {
  readonly trail: TrailApi;
  readonly rank: number;
}

export function RankEditor(props: RankStepProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const rank = () => planner().build().ranks?.[props.rank - 1];
  const rows = createMemo((): ChoiceRow[] => {
    const b = planner().build();
    const now = rank()?.class;
    const offered = offeredMythicClasses(data());
    const judged = judgeClasses(
      planner().engine,
      b,
      { rank: props.rank },
      offered.map((c) => c.guid),
      (cls) => ({ kind: 'rankClass', rank: props.rank, class: cls }),
      rank()?.level,
    );
    return currentFirst(
      offered.map((c) => {
        const name = judged.get(c.guid)?.label ?? bareNameOf(data(), c.guid);
        return {
          key: c.guid,
          name,
          ...(c.guid === now ? { open: true, reasons: [] } : (judged.get(c.guid) ?? { open: false, reasons: [] })),
          current: c.guid === now,
          take: () => {
            if (c.guid !== now)
              props.trail.edit(
                { kind: 'rankClass', rank: props.rank, class: c.guid },
                `Mythic rank ${props.rank} as ${name}`,
              );
          },
        };
      }),
    );
  });
  const move = (delta: number) => {
    const at = (rank()?.level ?? 1) + delta;
    const level = toRankLevel(at);
    if (level === undefined) props.trail.planner.refuse([rankLevelRange(at)]);
    else props.trail.edit({ kind: 'rankLevel', rank: props.rank, level }, `Mythic rank ${props.rank} at level ${at}`);
  };
  return (
    <Show when={rank()}>
      {(r) => (
        <div class="trail-step">
          <div class="trail-rank-level">
            <span>Taken at level</span>
            <button
              type="button"
              class="trail-stepper"
              aria-label="Take the rank a level earlier"
              onClick={() => move(-1)}
            >
              −
            </button>
            <span class="trail-skill__n">{r().level}</span>
            <button
              type="button"
              class="trail-stepper"
              aria-label="Take the rank a level later"
              onClick={() => move(1)}
            >
              +
            </button>
            <span class="trail-note">Expected at level {expectedLevel(data(), props.rank)}</span>
          </div>
          <h4 class="trail-subhead">Mythic path</h4>
          <ChoiceList label="Filter Mythic paths by name" rows={rows()} />
          <Show when={props.rank === (planner().build().ranks?.length ?? 0)}>
            <Button
              variant="danger"
              onClick={() => props.trail.edit({ kind: 'dropRank' }, `Removed Mythic rank ${props.rank}`)}
            >
              Remove Mythic rank {props.rank}
            </Button>
          </Show>
        </div>
      )}
    </Show>
  );
}
