export interface RawRecord {
  readonly chunk: number;
  readonly guid: string;
  readonly name: string;
  readonly type: string;
  readonly jsonOffset: number;
  readonly jsonLength: number;
  readonly json: Uint8Array;
}

export function blueprints(
  path: string,
  options?: { want?: (record: RawRecord) => boolean },
): AsyncGenerator<RawRecord, void, undefined>;

export function strings(path: string): Promise<Map<string, string>>;

export function backReferences(
  path: string,
): AsyncGenerator<{ readonly guid: string; readonly referrers: readonly string[] }, void, undefined>;
