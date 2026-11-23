import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

import { encodeDocument, FIELD_DEFAULTS } from '../../engine/compact/index.ts';
import { readDataDir } from '../../engine/data-dir/index.ts';

const VIRTUAL = 'virtual:data-document';
const RESOLVED = `\0${VIRTUAL}`;

export function dataDocument(): Plugin {
  let base = '/';
  let cached: { readonly fileName: string; readonly json: string } | undefined;
  const doc = () => {
    if (cached === undefined) {
      const { files, overrides } = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
      const json = JSON.stringify(encodeDocument(files, overrides, FIELD_DEFAULTS));
      const hash = createHash('sha256').update(json).digest('hex').slice(0, 12);
      cached = { fileName: `assets/data-${hash}.json`, json };
    }
    return cached;
  };
  const path = () => `${base}${doc().fileName}`;
  return {
    name: 'wotr-data-document',
    configResolved(config) {
      base = config.base;
    },
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return undefined;
      return `export default ${JSON.stringify(path())};`;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== path()) return next();
        res.setHeader('content-type', 'application/json');
        res.end(doc().json);
      });
    },
    generateBundle() {
      if (this.environment.name !== 'client') return;
      this.emitFile({ type: 'asset', fileName: doc().fileName, source: doc().json });
    },
  };
}
