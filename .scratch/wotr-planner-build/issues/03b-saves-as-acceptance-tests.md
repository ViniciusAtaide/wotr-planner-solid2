# Saves as a second acceptance suite

Status: open
Blocked by: 03; the user's list of clean saves ([map 18](../../wotr-planner/issues/18-save-files-as-an-oracle.md))
Plan: [plan](../plan.md)

## Goal

Real play as an acceptance test beside the two gold builds: for each save the user marks as clean, the walk holds what the game held, level by level.

## Scope

Follows [map 18](../../wotr-planner/issues/18-save-files-as-an-oracle.md) and [the research](../../wotr-planner/research/save-files.md).

- **A save reader** in `tools/saves/` (server side only, never in the browser). It handles ZIP, BOM-tolerant JSON, and a file-wide `$id`/`$ref` resolver. It finds the main character through `player.m_MainCharacter` in `party.json`.
- **A one-time conversion of each clean save into a GUID-only fixture:**
  - race, the class levels in order, archetypes, picks by level with their parameters, the Mythic classes and ranks, and base ability scores;
  - the held facts, with rank, source, source level and parameter, as the expected side.

  No names or other strings from the save. Saves stay out of git.
- **The suite:** build each fixture's Build and compare, per level, the held facts and picks as sets, never their order. Known differences are listed, each with its reason or ticket, and the list can only shrink. The suite skips with a notice when no fixtures exist.
- **A coverage report:** held features a save names that `data/` lacks. Today one DLC feature is missing, which is an allowlist or keep-rule gap to raise.

## Done when

- Each clean save the user listed has a fixture, and the suite passes apart from listed differences.
- `bun run check` runs the suite.
- One commit by path through the hook, `Status: done` and an `## Outcome`.
