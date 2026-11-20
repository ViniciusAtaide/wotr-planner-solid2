# Ticket 02 and 03 review fixes: the importer and names

Status: done
Session: ticket-02g-importer-fixes
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Close every importer and naming finding from the two-axis review of tickets 02 and 03 together (2026-11-20, `ed9752a...87386083`, `data/` left out). The user chose "Fix all first". Ticket [03c](03c-walk-review-fixes.md) takes the walk findings and runs alongside. This ticket owns `tools/`, `scripts/dump/`, `engine/data/` and `data/`; it reads G (`engine/grants*`) but doesn't change it.

## Scope

### Decisions to build

- **Finnean's stages are separate choices (Spec c3,** user, 2026-11-20, "Fix all first"; [map 29](../../wotr-planner/issues/29-telling-gear-items-apart.md) amended). The stages are different items in play (GameFAQs `items.txt`: +1 in chapter 1, +3 in chapter 3, +5 in chapter 5), so they must not be twins.
  - Keep what tells them apart: the enchantments' enhancement bonus, through an allowlisted field with its citation.
  - Then rule 3 splits them by itself, e.g. "Finnean the Talking Weapon (Bardiche +1)". Write the exact form rule 3 gives, and an override only if it falls short.
  - Check no other twin group changes. List any that do in the Outcome.
- **Twins are derived at load, not stored (Std judgement call,** guide §3.4: derived views are computed, never stored; map 29 amended).
  - Compute `CheckedData.twins` in `engine/data/` from the kept items, with map 29's rule 1, and delete `data/twins.json`.
  - The importer's report still lists the twin groups.
  - If computing them at load costs more than about 50 ms in the browser on the full data, stop and report to the coordinator instead.

### Correctness

- **The allowlist field test covers polymorphic values (02e Spec 1, partial).** Fields of conditions, evaluators and actions inside a kept field are read by their own cited methods. Give each variant a `cite` entry, not a comment, so the A test lists and checks its fields like any entry's. The fixture test fails when a variant drops a field its method reads.

### Standards smells

- **One reference walker.** `scripts/dump/census.ts` adds a fourth walker and a second `shortType`. Use `engine/data/types.ts` `references` and the existing `shortType`.
- **Split `qualify.ts` `settle`** (about 175 lines) into named steps, one per rule source, the way 02e split `runImport`.
- **`gear-names.ts` and `qualify.ts` share one implementation** of the shown name, compare, the override pass and the collisions step.
- **`qualify.ts` climbs with `G.climb`** everywhere, with no hand-rolled climbs left.
- **A type for `{ name; level }`,** which travels through `qualify.ts` (`itemOf`, `familyOf`). Moved from 03c by the coordinator.
- **`requiredNames` reads P's leaf kinds from one place,** not its own switch. Moved from 03c by the coordinator.
- **Delete the empty `awaitingArea`:** its export in `engine/areas.ts` (a one-off edit outside this ticket's area), and its import, reader and doc comment in `tools/importer/`. Moved from 03c by the coordinator.

### Records (no code)

- **02e Spec 2 and Spec 9:** the coordinator accepts 02e's reasoning (its Outcome, "Spec 2" and "Spec 9"). WinterWitchShamanHexSelection and LifeBondingFriendshipFeature1 find shown grantors through G's climb. No trimmed blueprint carries `AddFeatureOnAlignment`. No change.

## Done when

- Every item above is done.
- `npm run import -- --check` passes. Every change to `data/` is explained in the Outcome (guide §6, "Prove each form-only change"): the Finnean names, the enhancement field, and `twins.json`'s removal.
- Both gold builds pass with their listed gaps.
- `npm run check` passes, and the work is one commit by path through the hook, on branch `ticket/02g`.
- `Status: done` and an `## Outcome` that maps each finding to what closed it.

## Outcome

2026-11-20, in the worktree `ticket/02g`. One commit, "Ticket 02g: importer and naming review fixes". `npm run check` passes: 872 engine tests and 11 client tests, and `npm run import -- --check` (11,717 files).

### Decisions built

- **Finnean's stages are separate choices.**
  - The allowlist keeps `WeaponEnhancementBonus` (`EnhancementBonus`, `Stack`; `Designers/GameHelper.cs GetWeaponEnhancementBonus`) and `ArmorEnhancementBonus` (`EnhancementValue`; `GetArmorEnhancementBonus`).
  - An enchantment is held while it carries a kept component, so the enhancement enchantments are now written, and the items' `m_Enchantments` name them.
  - Gear names read them for map 29's rule 3 and nothing else does, so the A test's reader check gains a reader, "Gear names" (`gear-names.ts` `gearNameTypes`), agreed with the coordinator.
  - Rule 3 reads the bonus as the game does: a weapon's from its own and its type's enchantments (the highest that doesn't stack, plus those that do, up to 5 unless the highest is 5 or more), an armour's highest, and a shield's from its armour half.
  - Rule 3 now runs slot, type, enhancement ("+3"), then type and enhancement together ("Bardiche +3"), where neither tells an item apart alone.
  - The exact form for Finnean is the ticket's own: "Finnean the Talking Weapon (Bardiche +1)", "(Bardiche +3)", "(Bardiche +5)". Its 159 stages all settle by "type and enhancement", so no override is needed.
- **Twins are derived at load, not stored.**
  - `engine/data/twins.ts` `deriveTwins` holds map 29's rule 1, and `loadData` computes `CheckedData.twins` with it. `data/twins.json` is deleted, and a stored one is refused as "not a blueprint".
  - `gear-names.ts` reads `data.twins` rather than comparing again. The report still lists every twin under "Shared Gear names".
  - The importer checks that twins derived from the written names equal those derived before naming (`twinProblems`), so the pickers get what the report shows.
  - Cost: `deriveTwins` takes about 2 ms on the full data, measured in Node on the same V8 Chrome runs; `loadData` as a whole takes about 55 ms. That is well under the 50 ms stop line for the twins.
- **Other twin groups.** Before: 145 twins. After: 39.
  - 102 Finnean stages split, as intended.
  - "Radiance" changes too: RadianceMasterwork, RadiancePlus1ITem, RadiancePlus2 and the Yaniel_Longsword6 pair all collapsed into Yaniel_Longsword4HolyAvenger. Now the group reads Radiance, (+1), (+2), (+4) and (+6).
  - The two Yaniel pairs (HolyAvenger and BaneLiving, at +4 and at +6) stay twins: their kept fields are equal, since the Holy Avenger and Bane enchantments aren't kept. **Follow-up for the coordinator:** they are different items in play, as Finnean's stages were. This needs a map 29 call.
  - Every other twin group is unchanged (38 of the old 145).

### Correctness

- **The allowlist field test covers polymorphic values.**
  - `poly` variants carry their own `fields`, `cite` and `notKept`, like an entry. `spec.ts` exposes them through `list`, `orNull` and `lazy` as it does structs.
  - The grant actions (`ContextActionAddFeature`, `AddFact`, `ContextActionApplyBuff`, `Conditional`) are variants too.
  - The A test collects every variant reachable from the allowlist, 20 in all, and checks each like an entry. A fixture test drops `UnitClass`'s `LimitMaxLevel` and `MaxLevel` and fails.
  - `notKept`'s data check (`checkNotKept`) moved to `spec.ts` and now runs on variants as well.
  - What it found:
    - `ContextConditionIsWeaponEquipped` reads `RangeType` and `Category` in `CheckWeapon`, now cited.
    - `ContextConditionBuffRank.Buff` is not kept, because every kept condition sets `UseFactInsteadBuff`. A data check enforces it.
    - The story conditions' fields are not kept (map 21).
    - `ContextActionApplyBuff`'s `Permanent` is read in `CalculateDuration`, now cited. Its duration fields are not kept, because G counts only permanent buffs, and a data check enforces it. Its dispel, area-effect, parent and context fields aren't Build facts.
    - `ContextActionAddFeature.m_SetRankFrom` is now kept, typed, cited to `RunAction`, and null where older JSON omits it (no initializer). The coordinator chose to keep it over listing it as `awaiting`.
      - 34 kept Trickster Lore (Religion) domain features set their rank feature's rank from it. The walk adds that rank to the domain progression's level (`engine/walk/progression.ts`, `m_FeaturesRankIncrease`).
      - The walk doesn't apply it yet, so those domains still advance at rank 1. The type's doc comment says so, and 03c takes the walk side as its last item, after 02g merges.

### Standards smells

- **One reference walker.** `scripts/dump/census.ts` uses `references` and `spec.ts`'s `shortType`; its own walker and `shortType` are gone. Its output, and the leftovers file, are byte-identical before and after.
- **`settle` split.** `qualify.ts` `settleGroup` lists sources 0–6 as named steps: `classStaysBare`, `classStep`, `nearest` and `withLevel`. The override pass and the bare name follow in `qualifyNames`.
- **One implementation for both namers.** `tools/importer/name-groups.ts` holds what `qualify.ts` and `gear-names.ts` share: the group state, `candidatePass`, `runSteps`, `overridePass`, `lastBare`, `unusedOverrideProblems`, `byName`, `collisionsOf`, `shownName` and `compare`. Gear's rules are candidate passes like the others.
- **`qualify.ts` climbs with `G.climb`.** `routeFinder` climbs through feature selections with `G.climb`, and `onEveryRoute` is one `G.climb` that stops at the name. Both produce the same names as before.
  - `itemGrantor` keeps one hand-rolled climb, with a comment saying why (the coordinator's call): `G.climb` reaches only from the root, and a Gear-only feature's grantors are reached only from the Gear.
- **`{ name; level }`** is `CommonName`, read by `itemOf`, `familyOf`, `family`, `itemGrantor` and `withLevel` (moved from 03c).
- **`requiredNames` reads P's leaf kinds from one place** (moved from 03c).
  - P's `namedBlueprints` alone moved three names: an archetype-level leaf names its class too, and the class outranked the archetype. "Combat Style Feat (Ranger 6)" became "(Inquisitor 6)".
  - So `engine/prerequisites.ts` gains one new export, `namedWithLevel`, with no existing line touched, as the coordinator allowed. It gives each blueprint a leaf names as a player reads it (the archetype, not its class), with the level a class-level or archetype-level leaf needs.
  - `requiredNames` reads only that, and every name is as before.
- **`awaitingArea` deleted** (moved from 03c): the export and its two mentions in `engine/areas.ts`, the import and reader entry in `allowlist.test.ts`, and the mention in `allowlist.ts`'s `awaiting` doc comment.
  - For 03c: `engine/areas.test.ts` still uses "awaitingArea" as a reader label in its fixture, and `readerProblems`' message still says "no area awaits it". Both work as they are.
  - `engine/walk/areas.ts` line 3's comment still names `awaitingArea`.

### `data/` changes (guide §6, "Prove each form-only change")

- 19 enchantments added: Enhancement1–6, ArmorEnhancementBonus1–5, ShieldEnhancementBonus1–5, and the three Rusty armour enhancements. Each holds only its enhancement component.
- 2,333 item files changed:
  - 2,168 only gain their enhancement enchantments in `m_Enchantments`. No reference was removed.
  - 166 names changed: 159 Finnean stages, 6 Radiance and 1 Immaculate Petal ("(+1)"). The other Immaculate Petal ("(+4)") is now settled by rule 3, so its override, `SosielQuestHeavyShieldItemPlus4…name.json`, is deleted; its own reason said it stood in for the missing bonus.
- 49 blueprints gain `m_SetRankFrom` on their kept `ContextActionAddFeature` actions:
  - the 34 Trickster Lore (Religion) domain features, each naming TricksterLoreReligionDomainFeature c0e6f7e7a9fc4db386f5f84466c0195f;
  - and, as `null`, CompositeBlastBuff, BloodragerDragonPowerOfWyrms, MagicalTail and its nine archetype features, SpontaneousHealingFeature and SecondaryElementAir.
- `data/twins.json` deleted. `data/report.md` regenerated: the rule counts are twin 39, type 90, enhancement 6, type and enhancement 159, override 33 and bare 61.
- Proof: both gold builds walked, with Gear counted and without, on the old and the new `data/` with the same engine. Gains, failures, slots, gear-dependent marks, drops, held facts and attributes are byte-identical. The gold tests pass with their listed gaps.

### Records

- 02e Spec 2 and Spec 9: accepted as recorded; no change.
