import { createEffect, createSignal } from 'solid-js';
import type { Build } from '~engine/build';
import { encodeBuild } from '~engine/codec';
import type { Engine } from '~engine/mcp';

import type { ShareLinkProps } from '../design';

export type ShareCode =
  | { readonly kind: 'encoding' }
  | { readonly kind: 'current'; readonly code: string }
  | { readonly kind: 'failed'; readonly reason: string };

const ENCODING: ShareCode = { kind: 'encoding' };

export function createShareCode(engine: Engine, build: () => Build): () => ShareCode {
  const [code, setCode] = createSignal<ShareCode>(ENCODING);
  let latest = 0;
  createEffect(
    () => build(),
    (b) => {
      const n = ++latest;
      setCode(ENCODING);
      encodeBuild(engine.data, b).then(
        (c) => {
          if (n === latest) setCode({ kind: 'current', code: c });
        },
        (e: unknown) => {
          if (n === latest) setCode({ kind: 'failed', reason: e instanceof Error ? e.message : String(e) });
        },
      );
    },
  );
  return code;
}

export function shareLinkOf(code: ShareCode, origin: string): ShareLinkProps {
  switch (code.kind) {
    case 'encoding':
      return { state: 'making' };
    case 'current':
      return { state: 'ready', url: `${origin}/#b=${code.code}` };
    case 'failed':
      return { state: 'failed', reason: code.reason };
  }
}
