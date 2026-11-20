import type { Build } from '~engine/build';
import { decodeBuild, DecodeError } from '~engine/codec';
import type { Engine } from '~engine/mcp';
import type { LinkReason } from '~engine/refusals';

export const EMPTY: Build = { levels: [], picks: [] };

export type Opened =
  | { readonly kind: 'opened'; readonly build: Build }
  | { readonly kind: 'didNotOpen'; readonly reason: LinkReason };

export function linkReason(e: unknown): LinkReason {
  if (!(e instanceof DecodeError)) return 'notACode';
  switch (e.reason) {
    case 'unknownKey':
      return 'otherData';
    case 'version':
      return 'newerPlanner';
    case 'empty':
    case 'base64':
    case 'decompress':
    case 'format':
      return 'notACode';
  }
}

export async function openHash(engine: Engine, hash: string): Promise<Opened> {
  const code = /^#b=(.+)$/.exec(hash)?.[1];
  if (code === undefined) return { kind: 'opened', build: EMPTY };
  try {
    return { kind: 'opened', build: await decodeBuild(engine.data, code) };
  } catch (e) {
    return { kind: 'didNotOpen', reason: linkReason(e) };
  }
}
