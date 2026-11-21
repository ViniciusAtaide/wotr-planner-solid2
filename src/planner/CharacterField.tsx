import type { JSX } from '@solidjs/web';
import { Show } from 'solid-js';

import { ChoiceDialog } from './ChoiceDialog';
import type { FieldMode } from './ChoiceList';
import type { TrailApi } from './steps';
import { stepKey, type Step } from './trail-state';

export interface CharacterFieldProps {
  readonly trail: TrailApi;
  readonly step: Step;
  readonly title: string;
  readonly field: FieldMode;
  readonly modal: boolean;
  readonly list: (field: FieldMode | undefined) => JSX.Element;
}

export function CharacterField(props: CharacterFieldProps) {
  const key = () => stepKey(props.step);
  const live: FieldMode = {
    get label() {
      return props.field.label;
    },
    get value() {
      return props.field.value;
    },
    get placeholder() {
      return props.field.placeholder;
    },
    get target() {
      return props.field.target;
    },
    get arrive() {
      return props.field.arrive;
    },
  };
  const shown = () => props.trail.state().dialog === key() && props.trail.planner.session().kind !== 'confirming';
  let returning = false;
  const openDialog = () => {
    if (!returning) props.trail.send({ kind: 'dialog', step: key() });
  };
  return (
    <Show when={props.modal} fallback={props.list(live)}>
      <label
        class={[
          'trail-field',
          { 'trail-field--unset': props.field.value === undefined, 'trail-field--target': props.field.target },
        ]}
      >
        <span class="trail-field__label">{props.field.label}</span>
        <input
          class="trail-filter trail-field__input"
          type="search"
          readonly
          aria-haspopup="dialog"
          value={props.field.value ?? ''}
          placeholder={props.field.placeholder}
          onFocus={openDialog}
          onClick={openDialog}
        />
      </label>
      <Show when={shown()}>
        <ChoiceDialog
          title={props.title}
          line=""
          onClose={() => {
            returning = true;
            props.trail.send({ kind: 'dialog', step: undefined });
            setTimeout(() => {
              returning = false;
            }, 0);
          }}
        >
          {props.list(undefined)}
        </ChoiceDialog>
      </Show>
    </Show>
  );
}
