# Keep the game's data shape, filtered by a hand-written allowlist

The importer doesn't translate blueprints into a planner-friendly model. It copies the reachable blueprints in the game's own shape and field names, keeping only what a hand-written allowlist names. Each allowlist entry is one `$type`, the fields the engine reads, a TypeScript type and a citation to the decompiled class. The engine then ports each rule straight from its C# method, so there's no model to keep in sync with the game. Mapping area by area into the Rust planner's guide-shaped model produced thousands of differences to reconcile.

## Considered Options

- **A planner-shaped model, filled area by area:** rejected, because each mapping is a place for our model and the game's to drift.
- **Generating types from the decompiled C#** (tree-sitter or Roslyn): rejected for now. It would type hundreds of classes the engine never reads. The dump itself shows every field, enum value and reference target, so a check against it catches more than a parser would. Revisit if the allowlist grows past a couple of hundred types.

## Consequences

This is the best of the options compared, but it's unproven until the first importer runs. Its known costs, with mitigations:

- **Reachability can miss grant carriers** hidden in components that aren't allowlisted. Discovery follows every reference, but only features, classes, selections and items are written. The importer fails if any prerequisite finds no grantor.
- **A field missing from the allowlist gives wrong rules silently.** Each entry cites the C# method that reads it, and a test checks that every field that method reads is kept. A save-file oracle (ticket 18) would catch what slips past.
- **Derived views come back in code:** archetype merges, level calculations and selection trees are built at load time in the browser. They're derived, so they can't drift, but their start-up cost has to be measured.
- **The game's shape is verbose,** which makes ADR 0004's size risk worse. The browser gets a compact encoding produced at serve time, while `data/` stays readable.
- **Game quirks come along unchanged** (misspelled fields, dead or test content). Fixes go in a small override layer, one cited file per correction.
- **Some rules exist only in code or story scripts:** the Trickster waiver, path-switch keep rules, Legend's level cap and the obligatory mythic queue. These are hand-coded with citations.
- **Publishing a pruned copy of the dump's structure sits closer to the copyright line** than our own model would. The allowlist keeps `data/` minimal; revisit before the site goes public.

## Amended 2026-11-19: what the importer writes

The first importer run found grants and rules that the game keeps outside features, classes, selections and items. The game-shaped allowlist itself still stands, but `data/` now also holds:
- the buffs that carry grants of held features, and the grant actions in `AddFactContextActions` and `ActivateTrigger` ([map 23](../../.scratch/wotr-planner/issues/23-grants-carried-by-buffs-and-actions.md));
- the abilities through which the game offers a daily choice ([map 24](../../.scratch/wotr-planner/issues/24-wandering-spirit-is-a-daily-choice.md), [26](../../.scratch/wotr-planner/issues/26-mixed-bloodline-is-a-daily-choice.md));
- the toggles behind Shifter aspects a Build keeps on;
- the settings blueprints the rules read.

One prerequisite type, `PrerequisiteCondition`, holds a nested condition, which P reads as one leaf ([map 20](../../.scratch/wotr-planner/issues/20-nested-prerequisite-conditions.md)). The "Reachability can miss grant carriers" cost above was real: the importer's grantor check found these, as intended.

