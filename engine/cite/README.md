# Cite

How the engine cites the game's decompiled C#. Every rule in `engine/` ports a method of the game's code (CODING_STANDARDS.md "Ported, cited rules"), and the citation lives in code as data, not in a comment.

## Public entry

- `Cite`: one citation, written `Path/File.cs Method` or `Path/File.cs Method (Field, Field)`. The path is relative to `decompiled/Assembly-CSharp/Kingmaker/`; `Method` is the cited member, or the type the file declares when the citation names no member; the fields are the ones the ported rule reads.
- `parseCite(cite)`: a `Citation` (`file`, `method`, `fields`), or a throw when the text isn't in that format.
- `Cites`: a registry, a record from a key to its citations.

## The registries

Each engine feature that ports rules has a `cites.ts` exporting `cites`, a `Cites` (`satisfies Cites`), and re-exports it from its `index.ts`. A key is the identifier in the feature that ports the rule (a function, const, table, type or interface), or `Name.member` for one entry, field or member of it (`readers.PrerequisiteFeature`, `LevelUp.increase`). Keys follow the order the code declares them.

`tools/decompiled/cites.test.ts` checks every registry: that each engine feature with a `cites.ts` is listed; that each citation has the format above under a key whose first segment names something in the feature's code; and, where the decompiled sources are present, that the cited file exists and declares the cited member.
