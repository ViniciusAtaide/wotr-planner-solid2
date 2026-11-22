import type { JSX } from '@solidjs/web';
import { createEffect, createSignal, For, Show, untrack } from 'solid-js';
import {
  abilityScores,
  MAX_SCORE,
  MIN_SCORE,
  toAbilityScores,
  type AbilityScores,
  type Alignment,
} from '~engine/build';
import type { Attribute } from '~engine/data';
import { raceStatPending } from '~engine/pickers';
import { abilityScoreRange, nameOf } from '~engine/refusals';
import { ATTRIBUTES, attributeBonus, pointBuyCost, POINT_BUY } from '~engine/walk';

import { Button } from '../design';
import type { TrailApi } from './steps';
import { alignmentWords, characterLine, characterPicksLine } from './trail-state';

export type WheelPlace = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' | 'middle';
export type Moral = 'good' | 'neutral' | 'evil';

export interface WheelNode {
  readonly alignment: Alignment;
  readonly short: string;
  readonly place: WheelPlace;
  readonly moral: Moral;
}

export const ALIGNMENT_WHEEL: readonly WheelNode[] = [
  { alignment: 'LawfulGood', short: 'LG', place: 'nw', moral: 'good' },
  { alignment: 'NeutralGood', short: 'NG', place: 'n', moral: 'good' },
  { alignment: 'ChaoticGood', short: 'CG', place: 'ne', moral: 'good' },
  { alignment: 'LawfulNeutral', short: 'LN', place: 'w', moral: 'neutral' },
  { alignment: 'TrueNeutral', short: 'N', place: 'middle', moral: 'neutral' },
  { alignment: 'ChaoticNeutral', short: 'CN', place: 'e', moral: 'neutral' },
  { alignment: 'LawfulEvil', short: 'LE', place: 'sw', moral: 'evil' },
  { alignment: 'NeutralEvil', short: 'NE', place: 's', moral: 'evil' },
  { alignment: 'ChaoticEvil', short: 'CE', place: 'se', moral: 'evil' },
];

export const SHORT: Readonly<Record<Attribute, string>> = {
  Strength: 'STR',
  Dexterity: 'DEX',
  Constitution: 'CON',
  Intelligence: 'INT',
  Wisdom: 'WIS',
  Charisma: 'CHA',
};

const TENS = { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };

export interface CharacterCardProps {
  readonly trail: TrailApi;
  readonly folded: boolean;
  readonly foldable: boolean;
  readonly editing: boolean;
  readonly onToggle: () => void;
  readonly race: JSX.Element;
  readonly chips: JSX.Element;
  readonly scoresStep: boolean;
  readonly alignmentStep?: boolean;
  readonly alignmentArrives?: boolean;
  readonly onAlignmentArrived?: () => void;
  readonly here: JSX.Element;
  readonly diff?: (a: Attribute) => boolean;
}

export function CharacterCard(props: CharacterCardProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const build = () => planner().build();
  const picksLine = () => characterPicksLine(props.trail.view());
  return (
    <section class={['trail-card', { 'trail-card--folded': props.folded }]} aria-label="The character">
      <Show
        when={props.foldable}
        fallback={
          <div class="trail-card__head">
            <span class="trail-kicker">The character</span>
            <span class="trail-card__line">{characterLine(data(), build())}</span>
          </div>
        }
      >
        <button
          type="button"
          class="trail-card__head"
          aria-expanded={props.folded ? 'false' : 'true'}
          onClick={() => props.onToggle()}
        >
          <span class="trail-kicker">
            The character <span aria-hidden="true">{props.folded || !props.editing ? '▸' : '▾'}</span>
          </span>
          <span class="trail-card__line">{characterLine(data(), build())}</span>
          <Show when={props.folded && picksLine() !== ''}>
            <span class="trail-fold-line">{picksLine()}</span>
          </Show>
        </button>
      </Show>
      <Show when={!props.folded}>
        <div class="trail-race">{props.race}</div>
        <Show
          when={props.scoresStep}
          fallback={<StatTiles trail={props.trail} editing={props.editing} {...(props.diff && { diff: props.diff })} />}
        >
          {props.here}
        </Show>
        <Show when={build().levels.length === 0}>
          <p class="trail-note">Point buy only: the race and its +2 count from level 1.</p>
        </Show>
        <Show when={props.editing || props.alignmentStep === true}>
          <div class={['trail-alignment-field', { 'trail-alignment-field--target': props.alignmentStep === true }]}>
            <h4 class="trail-subhead">Alignment</h4>
            <AlignmentWheel
              trail={props.trail}
              arrives={props.alignmentArrives === true}
              onArrived={() => props.onAlignmentArrived?.()}
            />
          </div>
        </Show>
        {props.chips}
      </Show>
    </section>
  );
}

export interface CardPartProps {
  readonly trail: TrailApi;
}

export interface ScoresStepProps {
  readonly trail: TrailApi;
  readonly diff?: (a: Attribute) => boolean;
}

export function ScoresStep(props: ScoresStepProps) {
  const planner = () => props.trail.planner;
  const left = () => POINT_BUY - pointBuyCost(planner().build().scores ?? TENS);
  const pending = () => raceStatPending(planner().engine.data, planner().build());
  const done = () => {
    if (planner().build().scores === undefined) {
      planner().edit({ kind: 'scores', scores: abilityScores(TENS) }, 'Every score at 10');
    }
    props.trail.select(undefined);
  };
  return (
    <div class="trail-step">
      <StatTiles trail={props.trail} editing {...(props.diff && { diff: props.diff })} />
      <Show when={pending()}>
        <p class="trail-note">Choose a score for the race’s +2.</p>
      </Show>
      <Button variant="primary" disabled={pending()} onClick={done}>
        <Show when={left() > 0} fallback="Done">
          Done · leave {left()} unspent
        </Show>
      </Button>
    </div>
  );
}

export interface AlignmentWheelProps extends CardPartProps {
  readonly arrives?: boolean;
  readonly onArrived?: () => void;
}

export function AlignmentWheel(props: AlignmentWheelProps) {
  const now = () => props.trail.planner.build().alignment;
  let wheel: HTMLDivElement | undefined;
  createEffect(
    () => props.arrives === true,
    (due) => {
      if (!due) return;
      untrack(() => props.onArrived?.());
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      wheel?.scrollIntoView?.({ block: 'center', behavior: still ? 'auto' : 'smooth' });
      wheel?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    },
  );
  const [pointed, setPointed] = createSignal<Alignment | undefined>(undefined);
  const shownName = () => {
    const a = pointed() ?? now();
    return a === undefined ? 'Choose an alignment' : alignmentWords(a);
  };
  return (
    <div class="trail-alignment-wrap">
      <p class={['trail-alignment-name', { 'trail-alignment-name--unset': now() === undefined }]} aria-hidden="true">
        {shownName()}
      </p>
      <div
        ref={(el) => {
          wheel = el;
        }}
        class="trail-alignment"
        role="group"
        aria-label="Alignment"
      >
        <For each={ALIGNMENT_WHEEL}>
          {(node) => (
            <button
              type="button"
              class={[
                'trail-alignment__node',
                `trail-alignment__node--${node.place}`,
                `trail-alignment__node--${node.moral}`,
                { 'trail-alignment__node--on': now() === node.alignment },
              ]}
              aria-pressed={now() === node.alignment ? 'true' : 'false'}
              aria-label={alignmentWords(node.alignment)}
              title={alignmentWords(node.alignment)}
              onPointerEnter={() => setPointed(node.alignment)}
              onPointerLeave={() => setPointed(undefined)}
              onFocus={() => setPointed(node.alignment)}
              onBlur={() => setPointed(undefined)}
              onClick={() =>
                props.trail.edit(
                  { kind: 'alignment', alignment: node.alignment },
                  `Alignment ${alignmentWords(node.alignment)}`,
                )
              }
            >
              {node.short}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}

export interface StatTilesProps {
  readonly trail: TrailApi;
  readonly editing: boolean;
  readonly diff?: (a: Attribute) => boolean;
}

export function StatTiles(props: StatTilesProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const build = () => planner().build();
  const scores = (): AbilityScores | typeof TENS => build().scores ?? TENS;
  const selectable = () => {
    const race = data().blueprints.get(build().race ?? '');
    return race?.$type === 'BlueprintRace' && race.SelectableRaceStat;
  };
  const value = (a: Attribute) => planner().walked().unit.permanent(a);
  const step = (a: Attribute, delta: number) => {
    const wanted = scores()[a] + delta;
    const next = toAbilityScores({ ...scores(), [a]: wanted });
    if (next === undefined) planner().refuse([abilityScoreRange(wanted)]);
    else props.trail.edit({ kind: 'scores', scores: next }, `${a} ${wanted}`);
  };
  const raceNote = () =>
    build().race === undefined ? 'Choose a race for its +2' : `${nameOf(data(), build().race ?? '')} sets its bonuses`;
  return (
    <div class="trail-stats-wrap">
      <div class="trail-stats">
        <For each={ATTRIBUTES}>
          {(a) => (
            <div class={['trail-stat', { 'trail-stat--bonus': build().raceStat === a }]}>
              <span class="trail-stat__name">{SHORT[a]}</span>
              <span class={['trail-stat__value', { 'trail-stat__value--diff': props.diff?.(a) === true }]}>
                {value(a)}
              </span>
              <span class="trail-stat__mod">
                {attributeBonus(value(a)) >= 0 ? '+' : '−'}
                {Math.abs(attributeBonus(value(a)))}
              </span>
              <Show when={props.editing}>
                <span class="trail-stat__steps">
                  <button
                    type="button"
                    class="trail-stepper"
                    aria-label={`Lower ${a}`}
                    disabled={scores()[a] <= MIN_SCORE}
                    onClick={() => step(a, -1)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    class="trail-stepper"
                    aria-label={`Raise ${a}`}
                    disabled={scores()[a] >= MAX_SCORE}
                    onClick={() => step(a, 1)}
                  >
                    +
                  </button>
                </span>
                <button
                  type="button"
                  class={['trail-plus2', { 'trail-button--on': build().raceStat === a }]}
                  aria-pressed={build().raceStat === a ? 'true' : 'false'}
                  aria-label={`Racial +2 to ${a}`}
                  disabled={!selectable()}
                  onClick={() => props.trail.edit({ kind: 'raceStat', raceStat: a }, `Racial +2 to ${a}`)}
                >
                  +2
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
      <Show when={props.editing}>
        <p class="trail-note">
          {POINT_BUY - pointBuyCost(scores())} of {POINT_BUY} points left
          <Show when={!selectable()}> · {raceNote()}</Show>
        </p>
      </Show>
    </div>
  );
}
