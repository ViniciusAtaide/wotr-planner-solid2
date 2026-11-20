# One grant reader

Status: done
Blocked by: 02b, with its work committed
Plan: [plan](../plan.md)

## Goal

G is the only index of grants, complete over every grant type the allowlist keeps, and the importer stops keeping its own copy of the grant rules. Every grant type G indexes is one the walk applies, or one a named module applies.

## Why

Decided with the user on 2026-11-20, from an architecture review before ticket 03 went past its first area:

- **The importer reads grants on its own.** `rawGrants` (`tools/importer/import.ts`) repeats G's component switch on the dump's JSON, so that `carriers` and `conditionCarriers` can choose which Grant carriers to hold. The two copies have already drifted: `rawGrants` doesn't read `AddFeatureParametrized`, `AddUnitFeatureEquipment` or `AddUnitFactEquipment`. The grant actions are read in three places (the allowlist's `grantActions`, `rawGrants`, G's `actionGrants`).
- **G isn't complete the way P is.** P's readers are keyed by every `Prerequisite['$type']`, and an A test keeps the allowlist and P equal. G's switch is open (`Component.$type` is a `string`, so each case casts), and an allowlisted grant type G doesn't read is silently ignored.
- **The walk applies grants on its own, as the game does,** from each held fact's components (`activate`, `refresh` and `conditional` in `engine/walk/walk.ts`), and its switch is open too. A grant type G indexes but the walk never applies (`AddUnitFeatureEquipment`, `AddUnitFactEquipment` and the Gear unlocks, today) passes unnoticed.

Amended the same day, after reading ticket 03's walk: the first draft also had every Grant keep its component and conditions, for the walk to judge. The walk reads each held fact's components itself, so nothing would call that, and it was dropped.

## Scope

- **Two complete reader tables in G** (`engine/grants.ts`), in the shape of P's `readers`:
  - one keyed by every `Blueprint['$type']`. A type that grants nothing says so, and the worn item types come from `kindOf` instead of a hand-written list;
  - one keyed by a new `GrantComponent` union in `engine/data/types.ts`, with an exported `grantTypes` set, beside `Prerequisite` and `prerequisiteTypes`.
- **`Grant` and `GrantKind` stay as they are.**
- **The walk applies what G indexes:** a check that every grant type G indexes is applied by the walk, or listed with the module that applies it and why (the equipment grants and Gear unlocks by ticket 03's Gear checks, `AbilityApplyFact` by the daily choices). The walk exports the set of grant types it applies, as G exports `grantTypes`.
- **Allowlisted types nobody reads yet:** `engine/areas.ts` maps each allowlisted component type that no module reads yet to the ticket 03 area that will read it (`AddMechanicsFeature`, `NoSelectionIfAlreadyHasFeature`, `AddStatBonus*`, `EquipmentRestriction*`, `ReplaceStatForPrerequisites`, and any others the A test finds). As each area lands it exports its own set of types and its entries leave the map, which is empty when ticket 03 is done. This is not `not-needed.ts`, which lists the types the allowlist leaves out.
- **The A test:** P's set, G's set, the area sets and the map in `engine/areas.ts` together equal the allowlisted component types, with no type in two of them.
- **One keep rule in the importer.** The first pass holds every reachable buff, ability and toggle (the grant actions the allowlist keeps depend on what is held, so carriers have to be held before filtering, not found afterwards). G is built on that, and the keep rule decides what stays: *a Grant carrier is kept when it lies on a grant path from the root or from Gear to a blueprint kept for its own sake, which is a reachable blueprint that isn't a carrier, or one a kept field names.* The last clause keeps the buff a `BuffExtraEffects` checks, and through it the Shifter toggle that applies that buff. `rawGrants`, `carriers` and `conditionCarriers` are deleted.
- **Fallback:** if the keep rule can't reproduce `data/`, and a difference can't be explained, keep the current fixpoint over the dump but have it call G's component readers on the raw components. The duplicate grant rules still go.
- **Design text:** guide §3 point 5 states the keep rule; the allowlist's `grantActions` comment no longer points at `rawGrants`.

## Done when

- `npm run import -- --check` writes nothing: `data/` is unchanged. Any difference is explained line by line in the Outcome before it is accepted (guide §6, "Prove each form-only change").
- The coverage check passes, and fails on a fixture where G indexes a grant type that neither the walk nor a listed module applies.
- A test of the keep rule on hand-built data, needing no dump, covering a carrier that leads to a kept fact, a carrier that leads nowhere, and a toggle kept through a checked buff.
- The A test above passes, and fails on a fixture that allowlists a grant type G doesn't read.
- `npm run check` passes, and the work is committed by path.
- `Status: done` and an `## Outcome`: what was deleted, the data diff (none, or each line explained), and whether the fallback was needed.

## Outcome

2026-11-20. One commit, "Ticket 02d: one grant reader". The fallback wasn't needed. `data/` changed by 11 files written and 2 removed, each explained below.

**G, complete** (`engine/grants.ts`). Two reader tables in the shape of P's:
- `blueprintReaders` is keyed by every `Blueprint['$type']`. Each type that grants nothing by its own fields says so (`nothing`). The worn places' items are read by `wornItem`, chosen through `kindOf`.
- `componentReaders` is keyed by the new `GrantComponent` union (`engine/data/types.ts`, beside `Prerequisite`), with no casts. It exports `grantTypes` and `isGrant`.
- Each reader cites its method. A script compared old and new G on all of `data/`: the same 22,974 grants in the same order.
- G also exports `removes(grant)`.

**The walk** exports `appliedGrantTypes`. `activate` and `conditional` now switch over narrowed `GrantComponent` types: the casts are gone, and a default that never compiles (`unapplied`) ties each listed type to its case. Behaviour is unchanged, and the gold builds pass with their listed gaps.

**`engine/areas.ts`:**
- `grantsAppliedElsewhere`: the Gear unlocks and equipment grants (ticket 03's Gear checks) and `AbilityApplyFact` (the daily choices), each with why.
- `awaitingArea`: 15 allowlisted types with the ticket 03 area that will read them, noting where the walk's first cut reads them already.
- The two checks, as functions: `readerProblems` and `grantCoverageProblems`.

**Checks:**
- The A test (`allowlist.test.ts`): P's set (`prerequisiteTypes` and `paramPrerequisiteTypes`), `grantTypes` and `awaitingArea` together equal the allowlisted component types, with no type in two. It fails on a fixture that allowlists `AddFeatureToPet`.
- The coverage check (`engine/areas.test.ts`) passes. It fails when G reads a type that neither the walk nor a listed module applies, and on a stale listing.
- The keep rule's test (`import.test.ts`, hand-built data) covers a chain of two carriers to a kept fact, a carrier that leads nowhere, a toggle kept through a checked buff, and a toggle nothing checks.

**Deleted:** `rawGrants`, `carriers` and `conditionCarriers`, along with the type → kind `CARRIER_KINDS` map and the separate enchantment probe.

**The keep rule** (`keptSet`; guide §3 point 5 now states it). Every reachable buff, ability and toggle is held first, and G is built on that. Two things the ticket's wording left implicit had to be pinned down, both on the data and both within its rule:
- **What a kept field names.** Holding every carrier first means a `heldRefs` list or a grant action keeps a reference to a carrier that is later trimmed, so naming can't come from the form alone.
  - Only a strict reference (`ref`, `refOrNull`) names a carrier. The filter records these through a new `KeepContext.names`.
  - `requiresHeld` fields and grant actions don't name, since they drop an unheld target. A reference to a non-carrier still names as before.
  - A kept field drops what isn't kept, so the rule runs again on the kept set's forms until nothing more goes. An enchantment whose kept form is empty leaves in that loop.
  - Only the last filter's problems count. The earlier ones fed G, and most of their problems were on carriers the rule trims.
- **Toggles.** G reads a toggle's `m_Buff` (`ActivatableBuff`). Following it everywhere would keep every toggle a Build can reach, which a first run showed as 118 new files (Shroud of Water, Ring of Aroden, the Griffon aspect…). So a grant path crosses a toggle into its buff only when that buff is kept, as for the buff a kept `BuffExtraEffects` checks (ADR 0005). The old code followed a toggle only that way too.

**The data diff** (`npm run import -- --check` passes on the new `data/`):
- **Removed (2):** `StandartRageActivateableAbility` df6a2cce8e3a9bd4592fb1968b83f730 and `StandartRageBuff` da8ce41ac3cd74742b80984ccc3c9613, the barbarian's rage toggle and its buff.
  - The old two steps held the buff as a condition carrier for a `BuffExtraEffects` whose extra buff was held at that point. The trim then dropped that `BuffExtraEffects`, but G's reach kept the toggle and the buff, whose written form had no components.
  - Nothing kept checks the buff, so the rule drops both. `RageFeature` 2479395977cfeeb46b482bc3385f4647 loses the toggle from its `AddFacts` (`m_Facts` is now empty).
- **Added: chains of two or more carriers.** `carriers()` grew one carrier at a time from held facts, each having to grant something already held, so it could never find these.
  - `PrimalistRagePowersFeature` c846fed2d31e1734ebad07a64f72df2f gains its `BuffExtraEffects`: while `BloodragerStandartRageBuff` is on, it adds `PrimalistRagePowersBuff` ecc22ca1eea1bf6488a0d7c6ee2527d8 (new).
  - That buff applies `AnimalFuryRageBuff` a67b51a8074ae47438280be0a87b01b6 (new) when `AnimalFuryFeature` 25954b1652bebc2409f9cb9d5728bceb is held. It in turn holds `FleshEaterAnimalFuryFeature` d463f24e214b41748a2bd2afe17ac15d (new) when `CrushAndTearFeature` 68684e91025d4ebf892e8c0469d14b03 is held.
  - The component omits `m_ExceptionFact`, which has no C# initializer (`BuffExtraEffects.cs`), so the allowlist now gives it a `null` default.
  - `BloodragerStandartRageBuff` 5eac31e457999334b98f98b60fc73b2f was already written as the buff the bloodline `BuffExtraEffects` check. It gains its `AddFactContextActions`: with `BloodragerHagBloodline` c5d57f425eec48beb1f43719e92db1c1 held, it applies `BloodragerHagBloodlineBaseBuff` 19ec2bacbafc452883abc91a4a630266 (new).
  - That buff applies `BloodragerHagBloodlineCurseConduitBuff` e8473665806543c1a79c7f15725ba5cb (new; `AddFacts` of `NegativeEnergyImmunityFeature` 59fea514ade4b474d8f6e8e618ff123e, new) with `BloodragerHagBloodlineCurseConduitFeature` 2aefef394cb6491f9191a2d67ebb6b86.
  - It also applies `BloodragerHagBloodlineHagFortitudeBuff` b513e8056e68419ab21b1b45b0af3a5e (new; two `AddFeatureOnClassLevel`) with `BloodragerHagBloodlineHagFortitudeFeature` 7e203e1a7d3b42bfbd5c1b0dedcdf58f.
- **`report.md`:**
  - Written by kind: activatables 13 → 12, buffs 67 → 71, features 6,029 → 6,031.
  - The keep rule's line: 13,763 → 24,764 held before trimming (every reachable carrier is now held first), 11,692 → 11,697 kept.
  - `not-needed.ts` follows: `ForbidSpellCasting`, `BuffParticleEffectPlay` and `ActionPanelLogic` left, since only the removed pair carried them. `AddSecondaryAttacks` joined "In play" (on `AnimalFuryRageBuff`). `AddContextStatBonus` went 206 → 205 (`StandartRageBuff`).
  - The dropped counts move by what the removed pair and the newly kept components carry: `AddFactContextActions` 125 → 123, `BuffExtraEffects` 286 → 285, `AddFacts.m_Facts` 2,176 → 2,177, `ContextActionChangeSharedValue` 7 → 6, `ContextActionSpawnFx` 3 → 2. Also a new field line, `BuffExtraEffects.m_ExceptionFact: 1 of 51` defaulted.
- None of the added chains changes a Build today. The walk doesn't turn toggles on, so it never holds `BloodragerStandartRageBuff`.

**Check:** `npm run check` passes: 515 engine tests and 11 client tests. The import check takes about 6.5 s (was about 8 s).

**For ticket 03:**
- `awaitingArea`'s entries leave as each area lands and exports its set; add that set to the A test's readers.
- The coverage check is over grant components. G's blueprint-field grants the walk doesn't apply are not in it: a toggle's buff (`ActivatableBuff`, the Shifter aspects, so `BuffExtraEffects` never fires in the walk today), `itemEnchantment` and `shieldPart`. They belong to the aspect group size and Gear areas.
