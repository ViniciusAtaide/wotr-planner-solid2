import { For } from 'solid-js';

/**
 * CompareToggle (design system): a segmented control. On a phone it switches which Build compare shows; on desktop
 * it adds "Side by side". Four segments at most.
 */
export default function CompareToggle(props: {
  readonly segments: readonly string[];
  /** The pressed segment. */
  readonly value: string;
  readonly onChange?: (segment: string) => void;
}) {
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
