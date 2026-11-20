import { Show, type ParentProps } from 'solid-js';

import Badge from './Badge';
import Refusal from './Refusal';

export type OptionStatus = 'open' | 'closed';

export interface OptionListProps extends ParentProps {}

export function OptionList(props: OptionListProps) {
  return <div class="ww-options">{props.children}</div>;
}

export interface PickerHeadProps {
  readonly title: string;
  readonly counts?: string;
}

export function PickerHead(props: PickerHeadProps) {
  return (
    <div class="ww-picker-head">
      <h2>{props.title}</h2>
      <Show when={props.counts}>{(counts) => <span>{counts()}</span>}</Show>
    </div>
  );
}

export interface ClosedCountProps {
  readonly text: string;
}

export function ClosedCount(props: ClosedCountProps) {
  return <div class="ww-count">{props.text}</div>;
}

export interface PickerOptionProps {
  readonly name: string;
  readonly status: OptionStatus;
  readonly selected?: boolean;
  readonly mythic?: boolean;
  readonly links?: string | undefined;
  readonly gear?: string | undefined;
  readonly refusal?: readonly string[];
  readonly onPick?: () => void;
}

export default function PickerOption(props: PickerOptionProps) {
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
