// The Share link's Build (map 13): `#b=<Build code>` opened with C, the same code the MCP returns.
import type { Build } from '~engine/build';
import { decodeBuild } from '~engine/codec';
import type { Engine } from '~engine/mcp/tools';

/** An empty Build: nothing chosen yet. */
export const EMPTY: Build = { levels: [], picks: [] };

/** The Build a Share link holds (`#b=<code>`), or an empty one, with whether a link was there but didn't open. */
export async function buildFromHash(engine: Engine, hash: string): Promise<{ build: Build; stale: boolean }> {
  const code = /^#b=(.+)$/.exec(hash)?.[1];
  if (code === undefined) return { build: EMPTY, stale: false };
  try {
    return { build: await decodeBuild(engine.data, code), stale: false };
  } catch {
    return { build: EMPTY, stale: true };
  }
}
