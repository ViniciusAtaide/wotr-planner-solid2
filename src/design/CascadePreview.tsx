import { createUniqueId, For, onSettled } from 'solid-js';

import Button from './Button';

export interface CascadePreviewProps {
  readonly title: string;
  readonly summary: string;
  readonly clears: readonly { readonly name: string; readonly place: string }[];
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly autofocus?: boolean;
}

export default function CascadePreview(props: CascadePreviewProps) {
  const id = createUniqueId();
  let dialog: HTMLDivElement | undefined;
  onSettled(() => {
    if (props.autofocus !== false) dialog?.focus();
  });
  const count = () => props.clears.length;
  return (
    <div
      ref={(el) => {
        dialog = el;
      }}
      class="ww-cascade ww-fade"
      role="dialog"
      aria-labelledby={id}
      tabindex="-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') props.onCancel();
      }}
    >
      <h3 id={id}>{props.title}</h3>
      <p>{props.summary}</p>
      <ul>
        <For each={props.clears}>
          {(clear) => (
            <li>
              <span>{clear.name}</span>
              <span>{clear.place}</span>
            </li>
          )}
        </For>
      </ul>
      <div class="ww-cascade__actions">
        <Button variant="ghost" kbd="Esc" onClick={() => props.onCancel()}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => props.onConfirm()}>
          Clear {count()} {count() === 1 ? 'pick' : 'picks'} and apply
        </Button>
      </div>
    </div>
  );
}
