import { For, Show, type ParentProps } from 'solid-js';

/** One chip in a Timeline row: a slot and its pick, or a slot still to fill. */
export interface PickChip {
  /** The slot's label ("Bonus feat"). */
  readonly slot: string;
  /** The pick's game name, or for an empty slot what it waits for ("4 ranks to spend"). */
  readonly text: string;
  readonly empty?: boolean;
  /** A gear-dependent pick (ADR 0002): its label adds "◈ Gear". */
  readonly gear?: boolean;
  readonly onSelect?: () => void;
}

export interface TimelineProps extends ParentProps {}

/** The Timeline (design system): the column of level rows and Mythic ranks. */
export function Timeline(props: TimelineProps) {
  return <div class="ww-timeline">{props.children}</div>;
}

export interface PickChipsProps {
  readonly picks: readonly PickChip[];
}

/** A row's pick chips, which a RankMarker shows under its title too. */
export function PickChips(props: PickChipsProps) {
  return (
    <div class="ww-level__picks">
      <For each={props.picks}>
        {(pick) => (
          <button
            type="button"
            class={['ww-pick', { 'ww-pick--empty': pick.empty === true, 'ww-pick--gear': pick.gear === true }]}
            onClick={() => pick.onSelect?.()}
          >
            <span class="ww-pick__slot">
              {pick.slot}
              {pick.gear ? ' ◈ Gear' : ''}
            </span>
            {pick.text}
          </button>
        )}
      </For>
    </div>
  );
}

export interface LevelRowProps {
  readonly level: number;
  /** The class's game name. */
  readonly characterClass: string;
  /** The class level and any ability increase ("4th level · Strength +1"). */
  readonly detail?: string;
  readonly active?: boolean;
  readonly picks?: readonly PickChip[];
}

/**
 * LevelRow (design system): one character level of the Timeline, with its class and a chip for every slot the walk
 * opens there. `active` is the level the picker is showing. Refusal text never goes here; it belongs to the picker.
 */
export default function LevelRow(props: LevelRowProps) {
  return (
    <div class={['ww-level', { 'ww-level--active': props.active === true }]}>
      <div class="ww-level__num">{props.level}</div>
      <div class="ww-level__body">
        <div class="ww-level__class">
          {props.characterClass}
          <Show when={props.detail}>
            {(detail) => (
              <>
                {' '}
                <small>{detail()}</small>
              </>
            )}
          </Show>
        </div>
        <Show when={(props.picks?.length ?? 0) > 0}>
          <PickChips picks={props.picks ?? []} />
        </Show>
      </div>
    </div>
  );
}
