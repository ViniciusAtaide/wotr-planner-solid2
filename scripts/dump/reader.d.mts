// Types for reader.mjs, so the TypeScript importer can stream the dump through the same reader the scripts use.

export interface RawRecord {
  /** The index of the Blueprints chunk the record came from. */
  readonly chunk: number;
  readonly guid: string;
  /** The asset name. */
  readonly name: string;
  /** The full .NET type name, `Namespace.ClassName`. */
  readonly type: string;
  readonly jsonOffset: number;
  readonly jsonLength: number;
  /** The record's JSON as UTF-8 bytes; valid only until the reader moves to the next chunk. */
  readonly json: Uint8Array;
}

export function blueprints(
  path: string,
  options?: { want?: (record: RawRecord) => boolean },
): AsyncGenerator<RawRecord, void, undefined>;

/** The localised strings, keyed by localisation key. Only display names may leave the importer (ADR 0006). */
export function strings(path: string): Promise<Map<string, string>>;

/** Every blueprint with the GUIDs of the blueprints that reference it (the dump's chunk 33/1). */
export function backReferences(
  path: string,
): AsyncGenerator<{ readonly guid: string; readonly referrers: readonly string[] }, void, undefined>;
