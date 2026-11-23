interface Level {
  readonly class: string;
}

interface Build {
  readonly levels: readonly Level[];
  readonly archetypes: Readonly<Record<string, readonly string[]>>;
}

type Edit = { readonly kind: 'class'; readonly level: number; readonly class: string };

interface Data {
  readonly archetypesOf: ReadonlyMap<string, ReadonlySet<string>>;
}

export function apply(build: Build, edit: Edit): Build {
  return {
    ...build,
    levels: build.levels.map((l, i) => (i === edit.level - 1 ? { class: edit.class } : l)),
  };
}

export function applyWith(data: Data, build: Build, edit: Edit): Build {
  const after = apply(build, edit);
  const held = new Set(after.levels.map((l) => l.class));
  const archetypes = Object.fromEntries(Object.entries(after.archetypes).filter(([cls]) => held.has(cls)));
  return { ...after, archetypes };
}

declare function encode(build: Build): Promise<string>;

export async function levelClass(build: Build, level: number, cls: string): Promise<string> {
  return encode(apply(build, { kind: 'class', level, class: cls }));
}
