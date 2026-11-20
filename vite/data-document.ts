// The data document (ADR 0004; map 13's amendment; build ticket 05): the committed data/ as one content-hashed JSON
// file, `{ files, overrides }`, which the browser fetches once and walks itself. The build emits it as a static asset
// named by its content's hash; the dev server answers the same path. `virtual:data-document` exports that path.
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

import { readDataDir } from '../engine/data/read-dir.ts';

const VIRTUAL = 'virtual:data-document';
const RESOLVED = `\0${VIRTUAL}`;

export function dataDocument(): Plugin {
  let cached: { readonly path: string; readonly json: string } | undefined;
  const doc = () => {
    if (cached === undefined) {
      const { files, overrides } = readDataDir(fileURLToPath(new URL('../data', import.meta.url)));
      const json = JSON.stringify({ files, overrides });
      const hash = createHash('sha256').update(json).digest('hex').slice(0, 12);
      cached = { path: `/assets/data-${hash}.json`, json };
    }
    return cached;
  };
  return {
    name: 'wotr-data-document',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return undefined;
      return `export default ${JSON.stringify(doc().path)};`;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== doc().path) return next();
        res.setHeader('content-type', 'application/json');
        res.end(doc().json);
      });
    },
    generateBundle() {
      // The client's static assets only: the server never fetches the document.
      if (this.environment.name !== 'client') return;
      this.emitFile({ type: 'asset', fileName: doc().path.slice(1), source: doc().json });
    },
  };
}
