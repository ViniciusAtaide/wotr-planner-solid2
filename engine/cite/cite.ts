export type Cite = `${string}.cs ${string}`;

export type Cites = Readonly<Record<string, readonly Cite[]>>;

export interface Citation {
  readonly file: string;
  readonly method: string;
  readonly fields: readonly string[];
}

const CITATION = /^([\w/]+\.cs) (\w+)(?: \(([\w, ]+)\))?$/;

export function parseCite(cite: string): Citation {
  const m = CITATION.exec(cite);
  const [, file, method, fields] = m ?? [];
  if (file === undefined || method === undefined) throw new Error(`not a citation: ${cite}`);
  return { file, method, fields: fields?.split(', ') ?? [] };
}
