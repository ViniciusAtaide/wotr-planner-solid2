import { Show, type ParentProps } from 'solid-js';

import Badge from './Badge';
import FeatIcon, { type FeatCategory } from './FeatIcon';
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
  readonly marked?: boolean;
  readonly expanded?: boolean | undefined;
  readonly mythic?: boolean;
  readonly icon?: FeatCategory | undefined;
  readonly links?: string | undefined;
  readonly summary?: string | undefined;
  readonly linked?: boolean;
  readonly clash?: boolean;
  readonly held?: string | undefined;
  readonly detailKey?: string | undefined;
  readonly gear?: string | undefined;
  readonly refusal?: readonly string[];
  readonly onPick?: () => void;
}

export default function PickerOption(props: PickerOptionProps) {
  const badges = () => (
    <span class="ww-option__badges">
      <Show when={props.selected === true}>
        <span class="ww-option__current">Current</span>
      </Show>
      <Show when={props.expanded !== undefined}>
        <span class="ww-option__expand" aria-hidden="true">
          {props.expanded ? '▾' : '▸'}
        </span>
      </Show>
      <Show when={props.mythic}>
        <Badge kind="mythic" />
      </Show>
      <Show when={props.linked === true}>
        <Badge kind="link">Synergy</Badge>
      </Show>
      <Show when={props.clash === true}>
        <Badge kind="clash">Won't stack</Badge>
      </Show>
      <Show when={props.held}>
        <Badge kind="clash">Held later</Badge>
      </Show>
      <Show when={props.status === 'open' && props.gear}>
        <Badge kind="gear" />
      </Show>
      <Show when={props.status === 'closed'}>
        <Badge kind="closed" />
      </Show>
    </span>
  );
  return (
    <Show
      when={props.status === 'open'}
      fallback={
        <div
          class="ww-option ww-option--closed"
          role="button"
          aria-disabled="true"
          tabindex="0"
          data-detail-key={props.detailKey}
        >
          <span class="ww-option__name">
            <Show when={props.icon}>{(c) => <FeatIcon category={c()} />}</Show>
            {props.name}
          </span>
          {badges()}
          <Show when={props.held ?? props.summary ?? props.links}>
            {(meta) => <span class="ww-option__meta">{meta()}</span>}
          </Show>
          <Refusal lines={props.refusal ?? []} />
        </div>
      }
    >
      <button
        type="button"
        class={[
          'ww-option',
          {
            'ww-option--selected': props.selected === true,
            'ww-option--marked': props.marked === true,
            'ww-option--held': props.held !== undefined,
          },
        ]}
        aria-current={props.selected === true ? 'true' : undefined}
        aria-expanded={props.expanded === undefined ? undefined : props.expanded ? 'true' : 'false'}
        data-detail-key={props.detailKey}
        onClick={() => props.onPick?.()}
      >
        <span class="ww-option__name">
          <Show when={props.icon}>{(c) => <FeatIcon category={c()} />}</Show>
          {props.name}
        </span>
        {badges()}
        <Show when={props.held ?? props.summary ?? props.links}>
          {(meta) => <span class="ww-option__meta">{meta()}</span>}
        </Show>
        <Show when={props.gear}>{(gear) => <Refusal gear lines={[gear()]} />}</Show>
      </button>
    </Show>
  );
}
