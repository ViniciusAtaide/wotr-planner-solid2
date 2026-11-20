import dataPath from 'virtual:data-document';
import { decodeDocument, type CompactDocument } from '~engine/compact';
import { loadData } from '~engine/load';
import { engineOf, type Engine } from '~engine/mcp';

const SAME_AS_PRELOAD: RequestInit = { mode: 'cors', credentials: 'same-origin' };

let loading: Promise<Engine> | undefined;

export function loadEngine(): Promise<Engine> {
  loading ??= fetch(dataPath, SAME_AS_PRELOAD)
    .then((r) => r.json() as Promise<CompactDocument>)
    .then((doc) => {
      const { files, overrides } = decodeDocument(doc);
      return engineOf(loadData(files, overrides));
    })
    .catch((e: unknown) => {
      loading = undefined;
      throw e;
    });
  return loading;
}
