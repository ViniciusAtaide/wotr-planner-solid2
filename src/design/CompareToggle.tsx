import { For } from 'solid-js';

export interface CompareToggleProps {
  readonly segments: readonly string[];
  readonly value: string;
  readonly onChange?: (segment: string) => void;
}

export default function CompareToggle(props: CompareToggleProps) {
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
