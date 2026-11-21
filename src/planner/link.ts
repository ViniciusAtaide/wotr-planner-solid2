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

export const CODE_VERSION = 1;

function bytesOf(code: string): Uint8Array<ArrayBuffer> | undefined {
  try {
    const plain = code.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(plain + '='.repeat((4 - (plain.length % 4)) % 4)), (c) => c.charCodeAt(0));
  } catch {
    return undefined;
  }
}

async function inflates(body: Uint8Array<ArrayBuffer>): Promise<boolean> {
  try {
    const stream = new Response(body).body?.pipeThrough(new DecompressionStream('deflate-raw'));
    if (stream === undefined) return false;
    await new Response(stream).arrayBuffer();
    return true;
  } catch {
    return false;
  }
}

export async function looksNewer(code: string): Promise<boolean> {
  const bytes = bytesOf(code);
  const version = bytes?.[0];
  return bytes !== undefined && version !== undefined && version > CODE_VERSION && (await inflates(bytes.subarray(1)));
}

export async function openHash(engine: Engine, hash: string): Promise<Opened> {
  const code = /^#b=(.+)$/.exec(hash)?.[1];
  if (code === undefined) return { kind: 'opened', build: EMPTY };
  try {
    return { kind: 'opened', build: await decodeBuild(engine.data, code) };
  } catch (e) {
    const reason = linkReason(e);
    return { kind: 'didNotOpen', reason: reason === 'newerPlanner' && !(await looksNewer(code)) ? 'notACode' : reason };
  }
}
