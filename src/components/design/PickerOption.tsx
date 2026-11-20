import { Show, type ParentProps } from 'solid-js';

import Badge from './Badge';
import Refusal from './Refusal';

/** The picker's list of options. */
export function OptionList(props: ParentProps) {
  return <div class="ww-options">{props.children}</div>;
}

/** The picker panel's heading: the slot and its counts ("212 open · 1,034 closed"). */
export function PickerHead(props: { readonly title: string; readonly counts?: string }) {
  return (
    <div class="ww-picker-head">
      <h2>{props.title}</h2>
      <Show when={props.counts}>{(counts) => <span>{counts()}</span>}</Show>
    </div>
  );
}

/** The closed options a list doesn't show, summed by reason. */
export function ClosedCount(props: { readonly text: string }) {
  return <div class="ww-count">{props.text}</div>;
}

/**
 * PickerOption (design system): one option at a slot, with its status from S and every line of its Refusal from R.
 * An open option is a button; a closed one stays focusable (`aria-disabled`) so its Refusal can be read. A
 * gear-dependent option shows ◈ Gear beside ✓ Open, with R's note naming the items it counts.
 */
export default function PickerOption(props: {
  /** The game name, with its parameter when it takes one. */
  readonly name: string;
  readonly status: 'open' | 'closed';
  /** The Build's current pick at this slot. */
  readonly selected?: boolean;
  readonly mythic?: boolean;
  /** Synergy links, worded ("Enables Weapon Specialization (Longsword) → and 3 more"). */
  readonly links?: string;
  /** R's gear-dependent note, for an open option that needs the Gear counted. */
  readonly gear?: string;
  /** R's lines, for a closed option. */
  readonly refusal?: readonly string[];
  readonly onPick?: () => void;
}) {
  const badges = () => (
    <span class="ww-option__badges">
      <Show when={props.mythic}>
        <Badge kind="mythic" />
      </Show>
      <Show when={props.status === 'open' && props.gear}>
        <Badge kind="gear" />
      </Show>
      <Badge kind={props.status} />
    </span>
  );
  return (
    <Show
      when={props.status === 'open'}
      fallback={
        <div class="ww-option ww-option--closed" role="button" aria-disabled="true" tabindex="0">
          <span class="ww-option__name">{props.name}</span>
          {badges()}
          <Show when={props.links}>{(links) => <span class="ww-option__meta">{links()}</span>}</Show>
          <Refusal lines={props.refusal ?? []} />
        </div>
      }
    >
      <button
        type="button"
        class={['ww-option', { 'ww-option--selected': props.selected === true }]}
        aria-current={props.selected === true ? 'true' : undefined}
        onClick={() => props.onPick?.()}
      >
        <span class="ww-option__name">{props.name}</span>
        {badges()}
        <Show when={props.links}>{(links) => <span class="ww-option__meta">{links()}</span>}</Show>
        <Show when={props.gear}>{(gear) => <Refusal gear lines={[gear()]} />}</Show>
      </button>
    </Show>
  );
}
