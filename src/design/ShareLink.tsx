import { createSignal, Show } from 'solid-js';

import Button from './Button';

export interface ShareLinkProps {
  readonly url: string;
}

export default function ShareLink(props: ShareLinkProps) {
  let input: HTMLInputElement | undefined;
  const [copied, setCopied] = createSignal(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.url);
      setCopied(true);
    } catch {
      input?.select();
    }
  };
  return (
    <div class="ww-share">
      <input
        ref={(el) => {
          input = el;
        }}
        readonly
        value={props.url}
        aria-label="Share link"
      />
      <Button variant="primary" onClick={() => void copy()}>
        <Show when={copied()} fallback="Copy link">
          Link copied.
        </Show>
      </Button>
    </div>
  );
}
