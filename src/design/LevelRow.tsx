import { For, Show, type ParentProps } from 'solid-js';

export interface PickChip {
  readonly slot: string;
  readonly text: string;
  readonly empty?: boolean;
  readonly gear?: boolean;
  readonly onSelect?: () => void;
}

export interface TimelineProps extends ParentProps {}

export function Timeline(props: TimelineProps) {
  return <div class="ww-timeline">{props.children}</div>;
}

export interface PickChipsProps {
  readonly picks: readonly PickChip[];
}

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
  readonly characterClass: string;
  readonly detail?: string;
  readonly active?: boolean;
  readonly picks?: readonly PickChip[];
}

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
