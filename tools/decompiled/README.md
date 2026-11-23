# Decompiled sources

Reading the game's decompiled C# for module A (guide §4): the fields a class declares, and the fields a method reads;
and checking every engine `cite` registry against those sources. The sources are git-ignored (`decompiled/`, at
WrathDecompiled 6ce4a6b), so the tests that read them run only where they are present.

## Public entry

`index.ts` re-exports `csharp.ts` and `cites.ts`.

- `readSources(root)`: the decompiled sources under `root` (the `decompiled/` folder), or `undefined` when they aren't
  there. Its `Sources` gives `file(path)`, the text of a file under `Assembly-CSharp/Kingmaker/` or `undefined` when it
  is missing, and `fields(name, near)`, the serialized fields of a class or struct and of every base class the sources
  hold, nearest first. A type nested in another is found from that type's files (`near`).
- `ClassFields`: a class's serialized instance fields, by name, with the C# type each is declared with.
- `body(source, name)`: the bodies of every method or property named `name` in C# `source`, overloads included: a
  block by brace matching, or an expression-bodied member up to its `;`. A declaration counts only with an access
  modifier.
- `reads(code, field)`: whether C# `code` reads `field`, directly or through its property (`m_Spellbook` through
  `Spellbook`).
- `elementType(declared)`: the element type of a field's declared type: `LevelEntry[]` and `List<LevelEntry>` are
  `LevelEntry`.
- `codeNames`, `featureNames`, `citeFormatProblems`, `declares`, `citeSourceProblems`: the cite checks below.

## Rules

- **Serialized fields** (`declaredFields`): Unity serializes a public field unless it is `[NonSerialized]`, and any
  other field only with `[SerializeField]`; the dump holds exactly those. `SERIALIZABLE_FIELD_LINE` matches an instance
  field declaration (not static, const, an event or an abstract, override or virtual member), and readonly fields are
  left out. The type's own members sit one tab deeper than its declaration, so a nested type's members are skipped.
- **File order.** A directory listing's order differs between runtimes, and some class names live in several folders
  (`CompanionInParty.cs` is in both `Conditions/` and `Evaluators/`), so each class's files are read in path order.

## Cite checks

`cites.ts` checks a feature's `cite` registry: each key's first segment is an identifier in the feature's code, and
each key has at least one citation, and each citation parses as `Path/File.cs Method (Field, …)`
(`citeFormatProblems`). The identifiers come from oxc-parser's syntax tree of every `.ts`, `.tsx` and `.mjs` file but
`cites.ts` (`codeNames`, `featureNames`), so a name that appears only inside a string or a comment doesn't count. It
is an identifier check, not name resolution: any identifier of that name passes, whatever it is bound to.

Against the sources, the cited file exists under `Kingmaker/` and declares the member (`citeSourceProblems`,
`declares`): a method or property `body` finds, or a class, struct, enum or interface of that name. Each cited field
must then be read (`reads`, which also accepts the field's property, `m_Spellbook` through `Spellbook`) by the cited
method's own body, not by a helper it calls; a field read in a helper is cited on the helper
(`ContextActionApplyBuff.cs CalculateDuration (Permanent)`). A cited type is read as its whole file, so for a type the
check only says the field is named somewhere in that file.

## Tests

`cites.test.ts` runs the cite checks over every engine registry: every engine feature with a `cites.ts` is checked,
each cite is well formed under a key the feature's code names, and, when `decompiled/` is present, each names a file
that declares the cited member, which reads each cited field. That last test is skipped when `decompiled/` is absent.
Synthetic cases cover a key named only inside a string, a field read only by a helper, a field no code reads, and a
cited type.
