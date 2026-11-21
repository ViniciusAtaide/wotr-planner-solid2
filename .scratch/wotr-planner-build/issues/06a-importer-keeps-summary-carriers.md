# The importer keeps the Summary carriers

Status: in-progress
Session: ticket-03c-walk-fixes
Blocked by: none
Parent: [06](06-after-first-use.md)
Plan: [plan](../plan.md)

## Goal

`data/` keeps only the component types the walk needs. The components a Summary describes (bonuses, saves, immunities, resistances, spell DCs, triggers) are dropped as "In play" (`data/report.md`). Keep the top 50 of them, with their fields, so 06b can label them and 06d can link on them.

## Decisions (coordinator, 2026-11-21)

- **"Top 50"** is the top 50 *carriers of a readable value* (a bonus, a save, an immunity, a resistance, a DC, a trigger on a weapon or school), as [map 10](../../wotr-planner/issues/10-generating-summaries.md) counted them in [component-vocabulary.md](../../wotr-planner/research/component-vocabulary.md). It is not the top 50 In-play types by count, which plumbing dominates (`AddAbilityResources`, `RecalculateOnStatChange`, `ContextCalculateSharedValue`, `BindAbilitiesToClass`).
- **The list** is chosen from `data/report.md`'s In-play counts, carriers only, and written in this ticket's Outcome.
- **Work family by family, one commit each.** Each commit holds the types, field specs, enums and citations (ADR 0005), the re-import with every `data/` change explained, and the compact-document defaults.

## Baseline

The data document before 06a: raw 2.046 MB, gzip 0.478 MB, brotli 0.380 MB (`encodeDocument` over `data/`, gzip level 9, brotli quality 11).

## Guardrails

- **The data document's size** (raw, gzip and brotli) is measured after each family. If gzip passes about 0.65 MB (0.5 MB at the start), stop and report before the next family: ADR 0004's first-load budget is at stake.
- **Both gold Builds** walk unchanged.
- **The picker sweep** stays at 0 disagreements at the end.

## Done when

- The 50 carriers are kept, each with cited fields.
- Each family's commit records its size measurement.
- The checks pass, and the Outcome lists the 50 and the sizes.
