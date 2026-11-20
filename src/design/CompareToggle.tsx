import { For } from 'solid-js';

export interface CompareToggleProps<S extends string> {
  readonly segments: readonly S[];
  readonly value: S;
  readonly onChange?: (segment: S) => void;
}

export default function CompareToggle<S extends string>(props: CompareToggleProps<S>) {
  return (
    <div class="ww-segment" role="group" aria-label="Compare">
      <For each={props.segments}>
        {(segment) => (
          <button
            type="button"
            aria-pressed={props.value === segment ? 'true' : 'false'}
            onClick={() => props.onChange?.(segment)}
          >
            {segment}
          </button>
        )}
      </For>
    </div>
  );
}
