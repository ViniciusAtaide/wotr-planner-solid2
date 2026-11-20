import { For, Show } from 'solid-js';

/** A line's "(yours: …)": what the character has, which the Refusal sets apart in `ink-muted`. */
const HAVE = /^(.*?) (\(yours: [^)]*\))(\.?)$/;

/**
 * Refusal (design system): why an option is closed, one line per unmet need, as R words them. The lines are shown
 * unchanged; a trailing "(yours: …)" is only set apart, never reworded. `gear` is the gear-dependent note instead.
 */
export default function Refusal(props: { readonly lines: readonly string[]; readonly gear?: boolean }) {
  return (
    <ul class={['ww-refusal', { 'ww-refusal--gear': props.gear === true }]}>
      <For each={props.lines}>
        {(line) => (
          <Show when={HAVE.exec(line)} fallback={<li>{line}</li>}>
            {(m) => (
              <li>
                {m()[1]} <span class="ww-refusal__have">{m()[2]}</span>
                {m()[3]}
              </li>
            )}
          </Show>
        )}
      </For>
    </ul>
  );
}
