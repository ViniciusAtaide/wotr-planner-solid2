# Ticket 02 review fixes

Status: done
Session: ticket-02e-fixes
Blocked by: ticket 03's second checkpoint (`d3dfe57`), now committed
Plan: [plan](../plan.md)

## Goal

Close every finding the user picked from the two-axis review of ticket 02 (2026-11-20). The review compared `ed9752a` with `a7d41fb`; `data/` and ticket 03's own files were left out. Each item below names the review finding it closes. Spec findings are "Spec N" and Standards findings "Std N".

## Scope

### Correctness

- **The allowlist field test (A) finds dropped fields (Spec 1).** Today `tools/importer/allowlist.test.ts` only checks that kept fields are cited and appear in the method. It never finds a field the cited method reads that the allowlist leaves out: `BuffExtraEffects.CheckHadPrerequiredBuff` reads `m_CheckedBuffList`, which isn't kept, and the test passes. For each entry, list every field its cited methods read, and fail when one isn't kept or isn't listed as not needed with a reason. Nested struct fields count (Std 3).
- **Hidden is treated like nameless everywhere (Spec 2,** map 27 as amended on 2026-11-20).
  - G's `namedGrantorsByKind` / `isNamed` and `tools/importer/grantors.ts` test `isShown`, not `name !== undefined`.
  - The report's "nameless prerequisites with no named grantor" gains `WinterWitchShamanHexSelection` and `LifeBondingFriendshipFeature1`.
  - No qualifier names a blueprint that exists only hidden. Six do today, e.g. "Hunter (Wanderer)" and "Summon Wild Hunt (Mythic Summons 5)".
- **Every prerequisite leaf is checked for a grantor (Spec 3),** class-level leaves included, not only the facts `namedFacts` returns. The Barding Proficiency feats need `AnimalClass` / `AnimalCompanionClass` levels, which no Build reaches, so they belong in the report with a reason.
- **The keep rule doesn't depend on order (Spec 5).** In `keptSet`, a carrier first reached late (through `reach(next)` after a toggle's buff is kept) must still have its grants looked at. Add a test on hand-built data that fails on today's order dependence. Say in the Outcome whether today's `data/` changes.

### Standards

- **P keeps the game's names and owns the deity rule (Std 1–2).**
  - Leaves keep the game's field names: `IngorePrerequisiteCheck`, `IsFeatureSelectionWhiteList`, `Type`, `m_CharacterClass`, `Amount` and the rest.
  - `PrerequisiteFeaturesFromList` reads `IsDeity` in P, as its cited `CheckInternal` does, and `walk/check.ts` uses P's answer instead of interpreting the component itself.
  - Coordinate the walk side with ticket 03: these are leaves the walk reads.
- **Every reader cites a method (Std 3).** G's blueprint readers (`BlueprintRoot`, `BlueprintCharacterClass`, `BlueprintArchetype`, `BlueprintFeatureSelection`, `BlueprintActivatableAbility`), `AbilityApplyFact` (which cites a property), and the allowlist's nested `BlueprintRoot` fields each cite the method that reads them. `AddFeatureParametrized` keeps only what its cited method reads, or cites the method that reads `BlueprintParameterVariants`.
- **Tests assert game facts, and code uses glossary terms (Std 4–5).** Replace `expect(items).toHaveLength(3397)` in `engine/data/data.test.ts` with game facts, such as named items present or absent for a cited reason. Replace "carrier buff" with the glossary's term at `grants.ts:74` and `allowlist.ts:213` and `:710`.
- **Duplicated code (review smells).**
  - One recursive reference walker instead of three (`load.ts` `references`, `import.ts` `refsIn`, `items.ts` `references`), and one `isRecord`.
  - The root's progression fields defined once, not in `ROOT_FIELDS`, the allowlist struct and G's reader.
  - The grant-action switch in one place (see Spec 7 below).
  - `Override.change` as one discriminated union instead of three lists.
  - `qualify.ts`'s `ancestorFinder` reusing G's climb.

### Smaller items and decisions

- **The item set follows map 12 through overrides (Spec 4).**
  - `WeaponEmptyHand` (20375b5a0c9243d45966bd72c690ab74) is dropped by a cited override file, not as a side effect of the natural-weapon rule.
  - `ArmagsBladeItem`'s removal goes to the map as a question for the user before anything drops it.
  - The Outcome states the item count and how each departure from the research's 3,397 is accounted for.
- **Coverage includes field grants, and `grantActions` is folded into G (Spec 6–7).** The coverage check covers grants that come from blueprint fields (`ActivatableBuff`, `itemEnchantment`, `shieldPart`), not only grant components. The allowlist's `grantActions` stops deciding on its own which actions grant; G's `actionGrants` is the single answer.
- **Gear-only feature names reach a naming ticket (Spec 8).** Add the 8 groups where Gear-only features share a name with root features (16 Gear-only features, e.g. "Poison Immunity", "Freedom of Movement", "Magic Domain") to map ticket 29 or 30, whichever fits, and say which in the Outcome.
- **A real-data test for `AddFeatureOnAlignment` again (Spec 9),** citing a game blueprint that the trimmed data still holds, in place of the hand-made fixture.

### Remaining smells

- **Split `runImport`** (about 250 lines): the pipeline, the keep loop and the three "this list stays honest" checks (no grantor, unreachable, shared names) each in their own function or module.
- **Clearer names:**
  - `keep.ts` versus `keptSet`;
  - `GrantKind`'s planner names (`levelEntry`, `GearUnlock`, `ActivatableBuff`, `FactSinglifyRemove`) named for what they are, or documented as planner names;
  - `scripts/dump/granted-by.mjs`, which prints references;
  - the stale `namedFacts` comment (`prerequisites.ts:238`).
- **Gold aliases stop hard-coding qualifiers.** `engine/gold/gold.ts` `ALIASES` currently spell out importer qualifiers ("Menacing (Ranger 6)"). Match a gold line on its bare name plus the GUID, so a qualifier rule change doesn't touch the gold builds.

## Done when

- Every item above is done, or has moved to the map with the user's decision recorded.
- The allowlist field test fails on a fixture whose allowlist drops a field the cited method reads, and passes on the real allowlist.
- `npm run import -- --check` passes. Every change to `data/` is explained line by line in the Outcome (guide §6, "Prove each form-only change").
- Both gold builds pass with their listed gaps, and no gap is added.
- `npm run check` passes, and the work is one commit by path through the hook.
- `Status: done` and an `## Outcome` that maps each review finding to what closed it.

## Outcome

2026-11-20. One commit, "Ticket 02e: review fixes". `npm run check` passes: 743 engine tests and 11 client tests. Both gold builds pass with their listed gaps unchanged (only Jack's map 22 line). `npm run import -- --check` passes.

### Correctness

- **Spec 1 (the A test finds dropped fields).**
  - `tools/importer/csharp.ts` reads the decompiled sources: each class's serialized fields (public or `[SerializeField]`, not `[NonSerialized]`), down its base classes and into nested types, and method bodies.
  - `allowlist.test.ts` now lists every field of an entry's class that a cited method reads, and every field of a kept struct's class too (Std 3). It fails on one the entry neither keeps nor lists. Entries gain two lists:
    - `notKept`: fields the engine doesn't need, each with its reason. A reason that rests on the data carries a `holds` check, and the importer fails when a kept blueprint breaks it (`filter.ts` `checkNotKept`).
    - `awaiting`: fields the engine needs that no area reads yet, like `awaitingArea`.
  - The test also fails on a stale listing. `spec.ts` structs now expose their fields, which replaces parsing `describe` strings.
  - Two fixture tests: dropping `BuffExtraEffects.m_CheckedBuffList` fails, and listing a kept field fails.
  - What it found, across 14 entries:
    - **Not needed, with reasons.** False matches, where the method reads another object's member of the same name (`BlueprintSpellbook.m_CharacterClass`, `BlueprintFeatureSelection.m_Features`, `BlueprintRoot.CharGen`, `name`). Story state (`PrerequisiteEtude`, map 21) and spell parameters (map 22). Save or log details (`AddFacts.CasterLevel`, `DoNotRestoreMissingFacts`). `BlueprintRace.Size`. `ContextRankConfig`'s other base types, which `preFilter` drops. The experience tables. Data-dependent ones with `holds`: `ReplaceStatBaseAttribute.ReplaceMod` (AsIs), `AddContextStatBonus.Restrictions` (empty), `ActivateTrigger.m_Once` (false), and the ContextValue fields `Calculate` reads only for ValueTypes other than Simple and Rank.
    - **Awaiting ticket 03.** These went to the coordinator and are now ticket 03's first items:
      - `AddStatBonusIfHasFact.Value.ValueRank` and `ContextRankConfig.m_FeatureList`. TieflingHeritageClassic c82bc8134f3a6e24994b8ef70fb4014a and TieflingHeritageDevil 02a2c984494a9734ba8b01927dcf96e2 take a Racial Charisma −2 that the walk skips today: a real bug.
      - `BlueprintWeaponType.m_AttackType` (FighterOnHandedGrip).
      - `BuffExtraEffects.m_CheckedBuffList`, which map 32 as amended keeps like `m_CheckedBuff`.
  - Not covered: the fields of polymorphic values (conditions, evaluators, actions) inside a kept field. Their variants are cited only in comments, not as `cite` entries.
- **Spec 2 (hidden is treated like nameless everywhere).**
  - G's `namedGrantorsByKind` and `grantors.ts` use `isShown`.
  - `qualify.ts` names only shown grantors and shown prerequisite targets, and climbs through hidden ones. 16 names changed, the six the review named among them (listed below).
  - The report section "Nameless prerequisites with no named grantor" doesn't gain WinterWitchShamanHexSelection 4e760c5034fafb2438993d8a192150b9 or LifeBondingFriendshipFeature1. Both are now unshown, but G climbs through their hidden grantors, as it climbs through nameless ones, and finds shown ones: WinterWitchSpellbookSelection, and AzataMythicClass. The review's expectation came from changing `grantors.ts` alone. The section does gain GoldenDragonClass daf1235b6217787499c14e4e32142523: Spec 3's class leaves name it, and only BlueprintRoot grants it.
- **Spec 3 (class-level leaves).**
  - P's new `namedBlueprints` adds the class and archetype of class-level, archetype-level and class spell-level leaves, and the grantor check reads it.
  - The Barding Proficiency feats' AnimalClass 4cd1757a0eea7694ba5c933729a53920 and AnimalCompanionClass 26b10d4340839004f960f9816f6109fe are in `no-grantor.ts`, reasoned as a pet's classes.
  - MonstrousHumanoidClass 8a3c86893f383214da070e9c84c1e95b is in `unreachable.ts` (Indomitable Mount names it).
- **Spec 5 (keep order).**
  - In `keptSet` (now `keep-rule.ts`), `reach` also keeps a carrier that grants something already kept.
  - A hand-built test, a carrier reached late through a kept toggle buff, tried in both orders, failed on the old code and passes now.
  - `data/` doesn't change.

### Standards

- **Std 1–2 (P).**
  - Leaves keep the game's names: `Group`, `CheckInProgression` and `IsFeatureSelectionWhiteList` on the leaf. Each `Named` kind keeps its component's fields (`m_Feature`, `m_Features`, `Amount`, `m_CharacterClass`, `Level`, `Alignment`, `IngorePrerequisiteCheck`, `ArchetypeAlignment`, `ArmorProficiencies`, `IsArcane`, `RequiredSpellLevel`, `Type`, `Condition`…), with references as GUIDs. The `stat` kind dropped its planner `full` flag, since the leaf's component says which.
  - P reads `PrerequisiteFeaturesFromList.IsDeity` as the component's property does, so `prerequisites(bp, blueprints)` now takes a lookup.
  - Tests: PaladinClass bfa11238e7ae3544bbeb4d0b92e897ec is a deity list with Amount 0.
- **Std 3 (citations).**
  - G's blueprint readers each cite a method: the root's fields, ApplyClassMechanics.Apply, AddArchetype.Check, CalculateLevelEntries, CanSelect and ReapplyBuff. AddFeatureParametrized cites ExtractSelectionItems for the variants.
  - AbilityApplyFact cites AbilityData.GetConversions.
  - The root's nested fields each cite their reading method. The A test's citation pattern now allows `_` in paths, for the UI view models.
- **Std 4–5.**
  - `data.test.ts` asserts named items present (by source) and absent (by the research's reasons) in place of the count.
  - "Grant carrier" replaces "carrier buff" in `grants.ts` and `allowlist.ts`.
- **Duplicated code.**
  - One reference walker, `references` in `engine/data/types.ts`, and one `isRecord`, used by `load.ts`, the keep rule and `items.ts`.
  - The root's fields are listed once, as `progressionRootFields`, keyed by every field of `ProgressionRoot`. The importer's walk and G read that list, and the allowlist's specs are tied to the type.
  - G's `grantField` is the one answer for which actions grant (Spec 7). The allowlist's `grantActions` asks it and keeps only each action's fields.
  - `Override` is a discriminated union.
  - `qualify.ts` climbs with G's new `climb`, which `namedGrantorsByKind` also uses.

### Smaller items and decisions

- **Spec 4 (the item set).**
  - The natural-weapon rule left the sourcing. WeaponEmptyHand 20375b5a0c9243d45966bd72c690ab74 is now dropped by its own cited override, `data/overrides/WeaponEmptyHand.20375b5a0c9243d45966bd72c690ab74.json` (map 12's hand-kept list). The import fails on any natural weapon no override drops.
  - ArmagsBladeItem stays dropped by its existing override, unchanged, as [map 33](../../wotr-planner/issues/33-armags-blade.md) settles.
  - Count: the dump traces **3,398** items, the research's 3,397 plus ArmagsBladeItem, the one weapon the research's set lacked (02b). The hand-kept list removes ArmagsBladeItem and WeaponEmptyHand and adds RingofConstitution, so `data/` holds **3,397** items, the same files as before.
- **Spec 6.**
  - G exports `fieldGrantKinds` and the walk `appliedFieldGrants`.
  - The coverage check covers both, with `ActivatableBuff` in the new `grantsAwaitingArea` (map 32).
  - It fails when the walk stops applying `shieldPart`.
- **Spec 8.** On the current data, with hidden blueprints unshown, the Gear-only names are 5 groups and 6 features: Dispelling Touch, Freedom of Movement, Magic Domain, Poison Immunity, Undead. The review's 8 groups / 16 features counted hidden ones. The coordinator added them to [map 29](../../wotr-planner/issues/29-telling-gear-items-apart.md) (qualified by their item as grantor), and 02f builds it. The list is in the shared notes, `ticket-02e-gear-only-names.txt`.
- **Spec 9.**
  - No real-data test is possible. No blueprint the trimmed data holds carries `AddFeatureOnAlignment`: its one grant of a held feature, RuinFeature 128a392be53575946bd907727eda3720, is on an item nothing gives.
  - The test now asserts that on the committed data, then keeps the fixture of RuinFeature's shape.

### Remaining smells

- `runImport` is a pipeline of named steps: `holdReachable`, `parseWanted`, `holdItems`, `makeFilter`, `trim`, `writtenProblems` and `tallyContext`. The three list checks sit beside their lists: `noGrantorProblems`, `unreachableProblems`, `sharedNameProblems`.
- Names:
  - `keep.ts` is now `filter.ts`, the generic filter. The keep rule is `keep-rule.ts`.
  - `GrantKind`'s planner names are documented as such.
  - `scripts/dump/granted-by.mjs` is `referrer-tree.mjs`, with the guide updated.
  - The `namedFacts` comment is fixed.
- Gold: `matchesName` accepts a line's bare name plus any qualifier the importer writes, and the fixture's GUID says which blueprint it is. 13 alias entries that spelled out qualifiers are gone, and 11 more lost their qualified names.

### The data diff

All from Spec 2, apart from the report lines Spec 3 and Spec 4 add. A qualifier no longer names a hidden blueprint, so these 16 names changed, each re-settled by ticket 27's sources:

| Was | Now |
| --- | --- |
| Summon Hamadryad (Mythic Summons) | Summon Hamadryad (Azata) |
| Hunter (Wanderer) | Hunter (Background Selection) |
| Nomad (Wanderer) | Nomad (Background Selection) |
| Scholar — Nature (Scholar) | Scholar — Nature (Background Selection) |
| Strength of the Abyss (level 17) | Strength of the Abyss (Abyssal Bloodline 17) |
| Snakeskin (level 17) | Snakeskin (Serpentine Bloodline 17) |
| Griffon Shape (level 9), (level 14) | Griffon Shape (Griffon Aspect 9), (Griffon Aspect 14) |
| Summon Wild Hunt (Mythic Summons 5), (7) | Summon Wild Hunt (Trickster 5), (7) |
| Combat Casting Adept (Arcane Bloodline 15), (level 15) | Combat Casting Adept (Sage Sorcerer 9), (Sage Sorcerer 15) |
| Ascension (Celestial Bloodline) | Ascension (Empyreal Bloodline) |
| Claws (Abyssal 12) | Claws (Abyssal) |
| Flesh of Stone (Earth Blast) | Flesh of Stone (Earth) |
| Searing Flesh (Fire Blast) | Searing Flesh (Expanded Defense) |

`report.md`:
- Those names, in its group list. The blueprints by source go: grantor 1019 → 1020, level 581 → 576, prerequisite 27 → 21, some grantor 118 → 124, some grantor level 49 → 53.
- The three pet and monster classes under no grantor and unreachable, and GoldenDragonClass under nameless.
- 3,398 traced, companion gear 257 → 258, and the WeaponEmptyHand removal.

The Combat Casting Adept and Claws labels come from the "some grantor" fallback, which 02f replaces (map 30).

### For ticket 03 (what changed in the walk)

- `walk/check.ts` reads P's renamed leaves, and the `facts` case uses P's `IsDeity`.
- `ConsiderFulfilled` now runs before polarity, as `Prerequisite.Check` does. Before, a forbidding deity list at the first level would have been refused; the data holds no such leaf today (its two deity lists both require), so no gold line moved.
- `prerequisites()` takes `unit.data.blueprints` everywhere in the walk.
- `walk.ts` exports `appliedFieldGrants`.
- The four `awaiting` fields above are 03's first items. When an area lands, move each into the entry's kept fields and delete its `awaiting` line. The A test fails until both are done.
- `ActivatableBuff` leaves `grantsAwaitingArea` when aspects kept on land.
