import dataPath from 'virtual:data-document';
import { loadData, type DataFile } from '~engine/load';
import { engineOf, type Engine } from '~engine/mcp';

let loading: Promise<Engine> | undefined;

export function loadEngine(): Promise<Engine> {
  loading ??= fetch(dataPath)
    .then((r) => r.json() as Promise<{ files: DataFile[]; overrides: DataFile[] }>)
    .then((doc) => engineOf(loadData(doc.files, doc.overrides)));
  return loading;
}
