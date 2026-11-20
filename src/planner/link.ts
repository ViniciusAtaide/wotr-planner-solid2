import type { Build } from '~engine/build';
import { decodeBuild } from '~engine/codec';
import type { Engine } from '~engine/mcp';

export const EMPTY: Build = { levels: [], picks: [] };

export async function buildFromHash(engine: Engine, hash: string): Promise<{ build: Build; stale: boolean }> {
  const code = /^#b=(.+)$/.exec(hash)?.[1];
  if (code === undefined) return { build: EMPTY, stale: false };
  try {
    return { build: await decodeBuild(engine.data, code), stale: false };
  } catch {
    return { build: EMPTY, stale: true };
  }
}
