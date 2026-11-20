import { For, Show } from 'solid-js';

const YOURS_SUFFIX = /^(.*?) (\(yours: [^)]*\))(\.?)$/;

export interface RefusalProps {
  readonly lines: readonly string[];
  readonly gear?: boolean;
}

export default function Refusal(props: RefusalProps) {
  return (
    <ul class={['ww-refusal', { 'ww-refusal--gear': props.gear === true }]}>
      <For each={props.lines}>
        {(line) => (
          <Show when={YOURS_SUFFIX.exec(line)} fallback={<li>{line}</li>}>
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
