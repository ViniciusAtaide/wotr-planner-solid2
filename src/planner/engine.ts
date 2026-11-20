// The engine in the browser (ADR 0004): the data document fetched once, checked, and indexed. Every pick, picker and
// cascade then runs here, with no round trip.
import dataPath from 'virtual:data-document';
import { loadData, type DataFile } from '~engine/data/load';
import { engineOf, type Engine } from '~engine/mcp/tools';

let loading: Promise<Engine> | undefined;

/** The engine over the data document, loaded on first use and shared after. */
export function loadEngine(): Promise<Engine> {
  loading ??= fetch(dataPath)
    .then((r) => r.json() as Promise<{ files: DataFile[]; overrides: DataFile[] }>)
    .then((doc) => engineOf(loadData(doc.files, doc.overrides)));
  return loading;
}
