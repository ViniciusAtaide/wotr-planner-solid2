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
  if (m === null) throw new Error(`not a citation: ${cite}`);
  return { file: m[1], method: m[2], fields: m[3]?.split(', ') ?? [] };
}
