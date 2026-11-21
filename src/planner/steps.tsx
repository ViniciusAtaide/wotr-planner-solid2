import { createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { slotKey, toRankLevel, toSkillRanks, type SlotId } from '~engine/build';
import type { Attribute, StatType } from '~engine/data';
import { allows, type Edit } from '~engine/edits';
import { linkIndex } from '~engine/links';
import { expectedLevel } from '~engine/mcp';
import { mythicStartingClass, offeredClasses, offeredMythicClasses, picker, type OptionStatus } from '~engine/pickers';
import { gearNote, nameOf, rankLevelRange, refusal, statName } from '~engine/refusals';
import { ATTRIBUTES, SKILL_ATTRIBUTE } from '~engine/walk';

import { Button, ClosedCount, OptionList, PickerOption, Refusal } from '../design';
import { BackgroundStep, RaceStep } from './CharacterSteps';
import {
  ChoiceList,
  clampMark,
  createReveal,
  currentFirst,
  Filter,
  judge,
  matches,
  moveThroughOptions,
  type ChoiceRow,
} from './ChoiceList';
import { featCategory } from './feat-category';
import { flatName, shownArchetypes } from './flat-choices';
import { judgeClasses, type EditOutcome, type NonEmpty } from './planner-state';
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
  slotLabel,
} from './trail-state';
import type { Selection } from './workspace-state';
import { bareNameOf, shownName } from './words';

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

const CLOSED_SHOWN = 30;
const SKILLS = Object.keys(SKILL_ATTRIBUTE) as StatType[];
const optionKey = (o: OptionStatus): string => `${o.feature} ${JSON.stringify(o.param ?? null)}`;

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

function PickStep(props: SlotStepProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const [text, setText] = createSignal('');
  const p = createMemo(() => picker(data(), planner().build(), props.slot, planner().engine.G));
  const current = () =>
    planner()
      .build()
      .picks.find((q) => slotKey(q.slot) === slotKey(props.slot));
  const name = (o: OptionStatus) =>
    shownName(
      data(),
      o.feature,
      o.param,
      o.name === undefined ? undefined : { name: o.name, ...(o.qualifier !== undefined && { qualifier: o.qualifier }) },
    );
  const [mark, setMark] = createSignal(0);
  const listed = createMemo(() => {
    const t = text();
    return (p()?.options ?? [])
      .filter((o) => o.shown)
      .map((o) => ({ o, n: name(o) }))
      .filter(({ n }) => matches(n, t))
      .sort((a, b) => a.n.localeCompare(b.n))
      .map(({ o }) => o);
  });
  const open = () => listed().filter((o) => o.closed === undefined);
  const closed = () => listed().filter((o) => o.closed !== undefined);
  const reveal = createReveal(CLOSED_SHOWN, () => closed().length);
  const closedShown = () => closed().slice(0, reveal.limit());
  const words = (o: OptionStatus): readonly string[] => {
    if (o.closed === undefined) return [];
    const r = refusal({ data: data(), G: planner().engine.G, unit: p()?.unit }, o.closed);
    return r.unmet.length > 0 ? r.unmet : [r.text];
  };
  const byReason = () => {
    const counts = new Map<string, number>();
    for (const o of closed().slice(closedShown().length)) {
      const label = o.closed?.unmet?.length ? 'need a prerequisite' : 'refused by the game';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts].map(([label, n]) => `${n} ${label}`).join(', ');
  };
  const held = createMemo(() => new Set([...(p()?.unit.facts() ?? [])].map((f) => f.blueprint)));
  const links = (o: OptionStatus): string | undefined => {
    const index = linkIndex(data(), planner().engine.G);
    const on = index.needs(o.feature).filter((g) => held().has(g));
    const enables = index.enables(o.feature);
    const parts = [
      on.length > 0 && `Builds on ${on.map((g) => nameOf(data(), g)).join(', ')}`,
      enables[0] !== undefined &&
        `Enables ${nameOf(data(), enables[0])}${enables.length > 1 ? ` → and ${enables.length - 1} more` : ''}`,
    ].filter((w) => typeof w === 'string');
    return parts.length > 0 ? parts.join(' · ') : undefined;
  };
  const isCurrent = (o: OptionStatus) => {
    const c = current();
    return c !== undefined && c.feature === o.feature && JSON.stringify(c.param) === JSON.stringify(o.param);
  };
  const take = (o: OptionStatus) =>
    props.trail.edit(
      { kind: 'pick', slot: props.slot, pick: { feature: o.feature, ...(o.param && { param: o.param }) } },
      `Picked ${name(o)}`,
    );
  return (
    <Show when={p()} fallback={<p class="trail-note">This choice doesn't open in the Build any more.</p>}>
      <div class="trail-step" onKeyDown={moveThroughOptions}>
        <Filter
          label={`Filter ${slotLabel(data(), props.slot.selection)} by name`}
          value={text()}
          onInput={(t) => {
            setText(t);
            setMark(0);
          }}
          onMove={(delta) => setMark((m) => clampMark(m, delta, open().length))}
          onEnter={() => {
            const marked = open()[mark()];
            if (marked !== undefined) take(marked);
          }}
        />
        <Show
          when={text() === '' || listed().length > 0}
          fallback={<p class="trail-note">No matches for “{text()}”.</p>}
        >
          <p class="trail-note">
            {open().length} open · {closed().length} closed
          </p>
        </Show>
        <OptionList>
          <For each={open()} keyed={optionKey}>
            {(o, i) => (
              <PickerOption
                name={name(o())}
                status="open"
                icon={featCategory(data(), o().feature)}
                selected={isCurrent(o())}
                marked={i() === mark()}
                links={links(o())}
                gear={o().gearItems === undefined ? undefined : gearNote(data(), o().gearItems ?? [])}
                onPick={() => take(o())}
              />
            )}
          </For>
          <For each={closedShown()} keyed={optionKey}>
            {(o) => (
              <PickerOption
                name={name(o())}
                status="closed"
                icon={featCategory(data(), o().feature)}
                links={links(o())}
                refusal={words(o())}
              />
            )}
          </For>
          <Show when={closed().length > closedShown().length}>
            <ClosedCount text={`${closed().length - closedShown().length} more closed: ${byReason()}`} />
            <Button onClick={() => reveal.more()}>Show all closed</Button>
          </Show>
        </OptionList>
        <Show when={current()}>
          <Button
            variant="danger"
            onClick={() =>
              props.trail.edit({ kind: 'pick', slot: props.slot }, `Cleared ${slotLabel(data(), props.slot.selection)}`)
            }
          >
            Clear this pick
          </Button>
        </Show>
      </div>
    </Show>
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
        const judged = judgedAll.get(c.guid) ?? { open: false, reasons: [] };
        const name = judged.label ?? bareNameOf(data, c.guid);
        const plain: ChoiceRow = {
          key: c.guid,
          name,
          ...judged,
          current: c.guid === previous,
          take: () => props.trail.edit({ kind: 'addLevel', class: c.guid }, `Level ${level} as ${name}`),
        };
        if (b.levels.some((l) => l.class === c.guid)) return [plain];
        return [
          plain,
          ...shownArchetypes(data, c.guid).map((a) => {
            const flat = flatName(name, bareNameOf(data, a));
            return {
              key: `${c.guid} ${a}`,
              name: flat,
              ...judged,
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
  const classRows = createMemo((): ChoiceRow[] => {
    const b = planner().build();
    const now = level()?.class;
    const offered = offeredClasses(data());
    const judged = judgeClasses(
      planner().engine,
      b,
      { level: props.level },
      offered.map((c) => c.guid),
      (cls) => ({ kind: 'class', level: props.level, class: cls }),
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
              props.trail.edit({ kind: 'class', level: props.level, class: c.guid }, `Level ${props.level} as ${name}`);
          },
        };
      }),
    );
  });
  const archetypeRows = createMemo((): ChoiceRow[] => {
    const cls = level()?.class;
    if (cls === undefined || !isFirstLevelOfClass(planner().build(), props.level)) return [];
    const b = planner().build();
    const held = b.classChoices?.[cls]?.archetypes[0];
    const options = shownArchetypes(data(), cls);
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
      ...options.map((a) => ({
        key: a,
        name: nameOf(data(), a),
        ...(a === held
          ? { open: true, reasons: [] }
          : judge(planner().engine, b, { kind: 'archetypes', class: cls, archetypes: [a] })),
        current: a === held,
        take: () => props.trail.edit({ kind: 'archetypes', class: cls, archetypes: [a] }, `Took ${nameOf(data(), a)}`),
      })),
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
