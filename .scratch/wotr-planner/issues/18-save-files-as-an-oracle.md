# Save files as an oracle

Type: research
Status: resolved
Parent: [map](../map.md)

## Question

Can a WotR save file be read to recover the main character as the game applied it? That means:
- race;
- ability scores;
- class levels with archetypes;
- every held fact, with rank, source and level gained;
- selection records;
- Mythic path, ranks and switches;
- equipped items.

Answer:
- Where is the save format defined in `decompiled/`? Look at the save manager, the JSON serialization of units and facts, and any compression.
- Is the save plain JSON inside a zip, or binary?
- How do facts reference blueprints (by GUID)?
- What would a reader in TypeScript take?

If saves are readable, a few saves from different classes and paths become a check straight from the game, much stronger than the two gold write-ups ([Verification depth in v1](14-verification-depth.md)). The same check would also catch fields missing from the importer's allowlist (ADR 0005). Research only: no save files are committed, and the findings must not reproduce any save content beyond field names and GUIDs.

## Answer

Yes. A `.zks` is a plain ZIP of JSON (`header.json`, `player.json`, `party.json`, per-area files). The main character is `player.m_MainCharacter`, a unit inside `party.json`. Its `Progression` and fact list hold the race, class levels and order, archetypes, every selection by level, every held feature with rank, source, source level and parameter, the Mythic classes and the ability scores. Blueprints are bare 32-hex GUIDs (127 of 128 held features in one level-20 save are already in `data/`). A reader needs only a ZIP library, BOM-tolerant JSON and a file-wide `$id`/`$ref` resolver.

A save cannot show the order of choices inside a level, the alternatives not taken, respecs, or whether the state was legal (cheats, mods and old versions all write states the rules forbid). This machine already has 22 saves in the macOS folder, covering 8 classes and 3 Mythic paths. Recommendation: add saves as a second acceptance suite beside the gold builds, comparing held facts and picks per level, never order. Keep the saves out of git, commit only GUID-only derived fixtures, skip when absent, and have the user label which saves came from clean play.

Findings: [Save files as an oracle for the walk](../research/save-files.md)

## Follow-up decisions

Coordinator, 2026-11-20, on the user's standing instruction:
- **Derived fixtures are allowed.** Under ADR 0006 a fixture may hold blueprint GUIDs, levels, ranks, parameters and ability-score numbers taken from a save: they're facts and citations, not the game's text. A fixture never holds the save itself, a character or companion name, or any other string from the save. The saves stay on the user's machine and are never committed.
- **Which saves came from clean play is the user's call.** Several local characters reach level 20 and Mythic rank 10 within hours, which suggests a cheat or mod. Until the user marks saves as clean, none is an acceptance test.
- **Build ticket 03b** builds the suite. It's blocked by ticket 03 and by the user's list of clean saves.
