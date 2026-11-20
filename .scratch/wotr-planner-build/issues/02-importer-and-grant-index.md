# The importer, with the grant index

Status: done
Blocked by: 01
Plan: [plan](../plan.md)

## Goal

Committed, checked, game-shaped `data/`: everything the planner holds, nothing it doesn't, and unchanged by a rerun. It also produces the one place that answers "who grants X?" (module G). Expect several sessions, one or two areas each; tick them off below.

## Scope

- **The generic filter** (module I, guide §3 point 5):
  - walk the set reachable from `ProgressionRoot` by following every `!bp_` reference;
  - write features, classes, archetypes, progressions, selections, races, items, and the settings blueprints the rules read;
  - keep allowlisted fields only.
- **Measure the size first.** As soon as reachability works, gzip a rough projection of the planned fields and record the browser document's expected compressed size in the Outcome. The static site leaves ADR 0004 no server fallback ([Hosting](../../wotr-planner/issues/17-hosting.md)). If the size looks too large, stop and raise it on the map.
- **Names** ([ADR 0006](../../../docs/adr/0006-display-names-yes-descriptions-never.md), [Display names](../../wotr-planner/issues/19-display-names.md)):
  - write the English display name into `name`;
  - neutralise template tokens;
  - give shared names a qualifier: from the grantor, else from the prerequisite that tells them apart, else from an override;
  - never write a description;
  - nameless blueprints have no `name`.
- **G, the grant index**, in `engine/`, built by the loader from `data/`. It covers progression entries, archetype adds and removes, selection lists, `AddFacts`, `AddFeatureOnClassLevel`, `AddFeatureIfHasFact`, `AddFeatureOnApply`, race features and Mythic switch grants. It answers three queries:
  - the grantors of a fact;
  - what an entry grants;
  - the slots a selection opens.

  For a nameless fact, it returns the named grantors grouped by kind (deity, bloodline…), so Refusals can say "Needs a deity that allows it". The importer's grantor check uses G, so there is a single answer to "who grants X?". The half that knows about a specific Build comes with the walk (ticket 03).
- **Checks against the dump** (guide §3 point 8):
  - every allowlisted field is present;
  - every value has its declared type;
  - every reference points to a blueprint of the expected kind;
  - every prerequisite leaf finds a grantor through G.
- **The report lists:**
  - component types the allowlist lacks;
  - every name collision, with the source that settled it;
  - every template name;
  - nameless prerequisites with no named grantor (four are known; see ticket 19).
- **`refs` / `granted-by`** in `scripts/dump/`, added the first time an area needs to trace a grant chain in the raw dump (chunk 33/1).
- **Module A:** for every allowlist entry, a test that every field its cited C# method reads is kept.
- **Areas, in order.** Each lands with its allowlist entries and A tests.
  - [x] classes, with their BAB and save tables and their progressions
  - [x] archetypes
  - [x] races
  - [x] selections, with their lists
  - [x] hidden grant carriers
  - [x] prerequisites (all 28 types)
  - [x] Mythic paths, and MythicsSettings for the Expected levels ([ADR 0003](../../../docs/adr/0003-mythic-rank-levels-are-expected-not-required.md))
  - [ ] items ([Which items count as Gear](../../wotr-planner/issues/12-which-items-count-as-gear.md)): the 3,397 sourced equipment blueprints; the hand-kept list (`colossus-ring` added, `WeaponEmptyHand` dropped); and the `EquipmentRestriction*` components

## Done when

- Every blueprint the planner holds has an entry, and every reference resolves.
- Every prerequisite leaf finds a grantor through G, or is in the report with a reason.
- For `ChannelPositiveAllowed` (8c769102f3996684fb6e09a2c4e7e5b9), G returns one "deity" group.
- The report of missing component types has been reviewed: each one is allowlisted or noted as not needed.
- A second run on the same dump writes nothing.
- No file in `data/` holds game text other than `name`.
- The browser document's compressed size is recorded in the Outcome.
- `npm run check` runs the importer's checks and the A tests.

## Progress

### Size measurement (2026-11-19, before any area)

Measured with a scratch script over the dump, as soon as reachability from `ProgressionRoot` worked.

- **Reachable set.** The roots are `BlueprintRoot` 2d77316c72b9ed44f888ceefc2a131f6 `Progression`: `m_FeatsProgression`, `m_BasicFeatSelection`, `m_CharacterClasses`, `m_MythicStartingClass`, `m_MythicLegenFake`, `m_MythicLegen`, `m_CharacterMythics`, `m_CharacterRaces` and `m_DeitySelection`. Following every `!bp_` reference reaches 115,713 of the 236,660 blueprints. The walk reaches story content too: `MythicStartingClass` names `Dlc5Campaign`, which leads to areas, dialogs and units. So 9,374 rules blueprints are reachable (7,621 of them `BlueprintFeature`); a walk that stops at story and unit types reaches 7,293.
- **Projection.** Every reachable rules blueprint (features, selections, progressions, classes, archetypes, races, parametrized features, spellbooks, spell tables, stat tables), plus all 4,542 equipment items. Each one keeps every header field except text, icons, editor bookkeeping and `IsPrerequisiteFor`. Components are cut to a generous candidate list (prerequisites, grants, the summary-labelled bonus types, `EquipmentRestriction*`). The result is minified JSON.
- **Result:** 13,916 blueprints, 14.6 MB raw, **1.37 MB gzip**, 0.65 MB brotli. Keeping every component of the rules blueprints gives 1.59 MB gzip without items. Stopping the walk at story types saves about 0.15 MB.
- **Verdict:** not too large for one browser document. The real document keeps only allowlisted fields and drops defaults, so this is an upper bound. GitHub Pages serves gzip, so plan on about 1 MB or less on the first load, cached after that.

### The generic filter and the classes area (2026-11-19)

- **Importer** (`tools/importer/`): `npm run import` writes `data/`; `npm run import -- --check` (in `npm run check`) fails when an import check fails or `data/` differs from a fresh import, and skips when the dump is absent, so CI runs without it. It runs through Vite's `runnerImport` (`run.mjs`), so it needs no build step and no new dependency. One run takes about 3.6 s.
  - `import.ts` indexes the dump (each blueprint's type and references), walks from the roots, decides the written set (reachable, of an allowlisted type, plus override adds, minus removes), and filters each blueprint through `keep.ts`.
  - `spec.ts`: each allowlisted field has a spec whose type must match the hand-written TypeScript type exactly (an invariant `Spec<T>`). The specs carry the import checks: value type, enum member, reference kind (the target must be held, in an expected kind), and presence. A field some blueprints omit takes its C# initializer through `orDefault`, which the allowlist states, and the field must still occur on at least one written blueprint of its type. `heldRefs` exists for lists such as `AddFacts.m_Facts`, whose C# type admits abilities and buffs; it isn't used yet (see "Open questions").
  - `overrides.ts`: `add`, `remove`, and `patch` as RFC 6902 `remove`/`replace` operations on the dump's JSON before filtering. The loader now also checks that a patch has its ops.
  - `report.ts` writes `data/report.md`: blueprints written by kind, unlisted component types on written blueprints (review notes go in `not-needed.ts`), defaulted fields and dropped references.
  - `scripts/dump/reader.mjs` gained `strings()` (chunk 34), read only for display names, and a `.d.mts` so TypeScript can import it.
- **First override:** `ScalykindDomainProgressionSeparatist` 3a5f747801a4420fb3e8d820985d4615 `Components[3]`, a `PrerequisiteNoFeature` naming a GUID the dump lacks; removing it keeps the game's behaviour (the reason is cited in the file).
- **Classes area:** `BlueprintCharacterClass` with its four `BlueprintStatProgression` tables, `m_Spellbook` with `BlueprintSpellbook` and its `BlueprintSpellsTable`, plus `DontAddCasterLevels`. Every `BlueprintFeature` subclass a progression or selection names is held: plain, parametrized, `FeatureReplaceSpellbook`, `FeatureSelectMythicSpellbook` and `BlueprintRace`, so every reference resolves. `ClassSkills` is the full `StatType`, because `StalwartDefenderClass` lists `CheckIntimidate`.
- **A tests** (`allowlist.test.ts`): each citation is `<file> <method> (<fields>)`. Every kept field must appear in a citation, and when `decompiled/` is present, each cited method must exist and mention each cited field (or its property). They found three fields no rule reads, now dropped: the selection's `Group2` (only `Group` is read, by `GetGroup`) and the class's `IsDivineCaster`/`IsArcaneCaster` (read only by UI and ability code).
- **Counts:** 9,166 files (7,907 features, 595 progressions, 453 selections, 70 classes, 59 spellbooks, 52 tables, 29 races, plus the report). A second run writes nothing. `engine/data/data.test.ts` loads all of `data/` through the loader's checks.

### Archetypes, races, selections and grant carriers (2026-11-19)

- **Archetypes:** `BlueprintArchetype` (adds and removes as level entries, spellbook replace and remove, replacement tables, class skills, `AddSkillPoints`), and the class's `m_Archetypes`. 209 written.
- **Races:** `m_Features` and `SelectableRaceStat` (`SelectRace.Apply`). Also `AddStatBonus` and `AddStatBonusIfHasFact` (with `ContextValue`'s type and constant), the racial ability modifiers that `PrerequisiteStatValue` reads through the permanent value. ElfRace's −2 Constitution is the `IfHasFact` one, lifted by `DestinyBeyondBirthMythicFeat`.
- **Selections:**
  - `Obligatory`, `NoSelectionIfAlreadyHasFeature` (`IsSelectionProhibited`), and `IsFeatureSelectionWhiteList` on every prerequisite. It is absent on 1,012 prerequisite components, as ticket 01 suspected; the C# initializer is false.
  - Parametrized feats: `ParameterType`, `WeaponSubCategory`, `RequireProficiency`, `m_Prerequisite`, `HasNoSuchFeature`, `IgnoreParameterFeaturePrerequisites`, `BlueprintParameterVariants`. Spell variants (abilities) are dropped from that list; the report counts 24,602.
  - `BlueprintFeatureReplaceSpellbook.m_Spellbook` and `BlueprintFeatureSelectMythicSpellbook.m_AllowedSpellbooks`.
- **Hidden grant carriers:** `AddFacts` (with its difficulty gate), `AddFeatureOnClassLevel`, `AddFeatureIfHasFact`, `AddFeatureOnApply` and `RemoveFeatureOnApply`.
  - Abilities, buffs and activatables aren't written (guide §3 point 5). A grant list drops references to them; the report counts 3,452 in `AddFacts.m_Facts`.
  - A component whose single grant or check names one (or null) is dropped whole: 168 `AddFeatureIfHasFact`, 10 `AddFeatureOnClassLevel`, 32 `RemoveFeatureOnApply`. A null `AddFeatureOnClassLevel.m_Class` means the character level and is kept.
  - A scratch census found 337 grants of held features carried by buffs, and 200 held features with at least one buff or ability grantor. G and its grantor check will show which prerequisite leaves, if any, depend on those.

### Prerequisites, Mythic settings, carriers, G and the grantor check (2026-11-19)

- **Prerequisites:** all 28 types on written blueprints are allowlisted and read by P (`engine/prerequisites.ts`), along with `ClassLevelsForPrerequisites`, `ReplaceStatForPrerequisites` and `AddPet`.
  - Each leaf gives its group, its polarity (from `Not`, `m_RestrictIfNot`, `NoCompanion` and the No- types) and what it names (`Named`: fact, facts, class level, archetype level, stat, levels, alignment, proficiency, caster type, parametrized feat, pet, story, condition tree…).
  - `PrerequisiteCondition` is one leaf naming its And/Or/Not tree ([map ticket 20](../../wotr-planner/issues/20-nested-prerequisite-conditions.md)). Story leaves keep only `Not` and are always met ([21](../../wotr-planner/issues/21-story-state-prerequisites.md)).
  - `PrerequisiteConditionForWeaponCategory` is a parameter check (`IParamPrerequisite`), outside the group combination (`paramPrerequisites`).
  - `namedFacts(leaf)` is the one answer to "which facts does this leaf need".
  - Fields some components omit take their C# initializer; the report lists each with counts.
- **Mythic settings:** a `settings` kind holds `BlueprintRoot` (its `Progression` roots, `SystemMechanics` selections and settings reference) and `MythicsSettings`' `CharcaterLevelRestrictions`: `[0, 6, 7, 9, 11, 14, 15, 16, 17, 17, 19]`, the Expected levels (ADR 0003). `AddMechanicsFeature` is allowlisted (Legend's `LegendaryHero`).
- **Grant carriers** ([map ticket 23](../../wotr-planner/issues/23-grants-carried-by-buffs-and-actions.md)):
  - A `buffs` kind holds the 46 buffs that a held fact grants and that grant held features, found by fixpoint.
  - `AddFactContextActions.Activated` and `ActivateTrigger` keep only their grant actions (`ContextActionAddFeature`, permanent `ContextActionApplyBuff`, `AddFact`) under their `Conditional` trees.
  - A grant behind a condition the spec doesn't model (`ContextConditionSharedValueHigher` 62, `ContextConditionDifficultyHigherThan` 2) is dropped and counted.
- **G** (`engine/grants.ts`): edges from the root, class progressions and archetype options, level entries, archetype adds and removes, selection options, race features, the grant components and the grant actions.
  - Queries: `grantorsOf`, `grantsOf`, `slotsOpenedBy`, `namedGrantorsByKind` (reachable named grantors only), plus `reachableFromRoot` (6,356 blueprints a Build can reach).
- **Grantor check** (`tools/importer/grantors.ts`, in the import): every requiring leaf on a reachable blueprint names facts with a grantor, or the fact is in `no-grantor.ts` with a cited reason; otherwise the import fails. 15 facts are reported: 9 wandering spirits ([map ticket 24](../../wotr-planner/issues/24-wandering-spirit-is-a-daily-choice.md)), 3 companion pregen lists, `MythicTestFeature`, the Mongrel race and Vow of Dahak (story-granted, see "Open questions"). The import also runs every load check on what it would write.
- **`ChannelPositiveAllowed`** 8c769102f3996684fb6e09a2c4e7e5b9: G returns two groups, not one. They are `Deities` (18 reachable deity features) and `BlueprintArchetype`: `PriestOfBalanceArchetype` a4560e3fb5d247d68fb1a2738fcc0855 grants it too, through `AddFeatures`. This is the game's data, so the test asserts it, and map ticket 19's mixed-kinds wording covers it. This "Done when" item's expectation was wrong.
- **Names:** template tokens are neutralised; only `LichDeityFeature` has them ("Lord/Lady of Death"). The report lists it.
- **Dump tools:** `scripts/dump/refs.mjs <guid|name>` reads the back-reference chunk 33/1 (about 3 s); `granted-by.mjs <guid|name> [depth]` climbs it to classes, races and the root. `reader.mjs` exports `backReferences` and `strings`.
- **Report** (`data/report.md`) also lists defaults filled, prerequisites with no grantor and their reasons, nameless prerequisites with no named grantor, and the 94 spell-parametrized feats ([map ticket 22](../../wotr-planner/issues/22-spell-parametrized-feats.md)).
- **Real size, without items:** 9,423 blueprints, 5.09 MB minified, **0.71 MB gzip**, 0.36 MB brotli. That is before the compact encoding drops defaults.
- **Check:** `npm run check` passes: format, lint, types, the import check (about 4 s with the dump), 308 engine tests and 11 template tests.

### Grant routes found by the leftover census (2026-11-19)

The census sorts every written blueprint a Build can't reach by what refers to it in the raw dump. Its script and output are in the shared notes folder, `ticket-02-leftover-census.*`. It found grant routes G couldn't see, now modelled:
- **Choice-carrying abilities** ([map ticket 26](../../wotr-planner/issues/26-mixed-bloodline-is-a-daily-choice.md)): an `abilities` kind holds the 23 abilities that a held fact gives and whose `AbilityApplyFact` applies held features. G edge kind `AbilityApplyFact`.
  - Every pick made through these abilities is a daily choice, not part of a Build: Mixed Bloodline ×2, Wandering Spirit ×3, Wandering Hex ×3, Minor Spirit ×6, Wandering Skills, Wandering Mythic Trick ×2, Companion Animal ([map tickets 24](../../wotr-planner/issues/24-wandering-spirit-is-a-daily-choice.md) and [26](../../wotr-planner/issues/26-mixed-bloodline-is-a-daily-choice.md)). `UnitHelper.Replenish` refills their resources on rest.
  - In play, not choices: Cavalier Tactician ×2, Greater Wyrmshifter ×3.
- **Gear-conditioned grants:** `MonkNoArmorFeatureUnlock`, `MonkNoArmorAndMonkWeaponFeatureUnlock` and `HasArmorFeatureUnlock` (G edge kind `GearUnlock`). Their weapon- and armour-type lists join with the items area. Flag fields keep the game's raw bits when no names express them (`-1`, `0`).
- **Shifter aspects** (user, 2026-11-19): a Build can keep an aspect on (Final Aspect makes it free), so what `BuffExtraEffects` adds while an aspect is on counts as held.
  - `BuffExtraEffects` is kept where its extra buff carries a grant. The aspect buffs it checks are held, along with the toggles a held fact gives that apply them, in an `activatables` kind (13).
  - G edge kinds: `BuffExtraEffects` and `ActivatableBuff`. Heart of Earth and Wolf Scent's four features are now reachable.
  - `m_CheckedBuffList` is set on no written blueprint, so it isn't kept.
- **Not needed:** `OnSpawnBuff` (buffs summoned creatures), with its reason in `not-needed.ts`.
- **No-grantor list:** the wandering spirits left it, since G now sees their ability. `ShamanNatureSpiritWanderingProgression` joined it as dead content. The import now fails on any entry whose fact has a grantor.
- **Story-granted features** are out of scope ([map ticket 25](../../wotr-planner/issues/25-story-granted-features.md)).
- **Census after:** 2,938 leftovers (was 3,013). 128 are reached only through unheld buffs, abilities or units (was 168), mostly polymorph and pets. 28 prerequisite leaves name an unreachable fact (was 46).

### Left to do

Moved on 2026-11-19 into [02a](02a-hidden-grants-and-unlisted-types.md), [02b](02b-items-gear-data-and-trimming.md), [02c](02c-shared-names.md) and ticket 03's areas; see the Outcome.

### Open questions (for the user, then the map)

- **Features only the story grants** (Vow of Dahak, `CorruptedGoldenDragonFeature` 1e66cfb4f351466fb05636082bce50d6, from a dialogue cue). Map ticket 21 covers story *state*, not story-granted facts, and Gold Dragon breaths need it. The grantor check reports it as unmet until this is decided.
- **`PrerequisiteFeaturesFromList.IsDeity`** (a deity list needs one, not `Amount`) reads the listed features' `Groups`. P keeps `Amount` raw; ticket 03's walk must apply `IsDeity`, or P must take a lookup.
- **Commits:** none yet, by the user's choice (2026-11-19). Ticket 01's files are still only staged, and another session's tooling (oxfmt, the pre-commit hook) is uncommitted in the same folder. Note that oxfmt's `data/` ignore pattern also matches `engine/data/`, so those files are never format-checked.

## Outcome

2026-11-19. Closed on a split: the remaining work outgrew one ticket ([review-before-03.md](../review-before-03.md)), so it moved to [02a](02a-hidden-grants-and-unlisted-types.md) (hidden grants, the unlisted types), [02b](02b-items-gear-data-and-trimming.md) (items, Gear data, trimming), [02c](02c-shared-names.md) (shared names) and ticket 03's areas (what the walk reads). The "Progress" sections above are the detailed record.

**Built:**
- The generic importer (`tools/importer/`): `npm run import` writes `data/`, and `npm run import -- --check` runs in `npm run check`. It follows every reference from `ProgressionRoot` and keeps allowlisted fields, through specs tied to the hand-written types (value type, reference kind, presence, C# defaults). It applies cited overrides, writes `data/report.md` and runs the load checks on its own output. A second run writes nothing.
- Areas 1–7: classes with their tables and spellbooks, archetypes, races, selections, all 28 prerequisite types (read by P), and Mythic paths with MythicsSettings' Expected levels.
- Grant carriers: buffs and action trees (map 23), the abilities behind daily choices (map 24, 26), and the toggles behind Shifter aspects kept on.
- G (`engine/grants.ts`): grantors, grants, slots, named grantors by kind, and what a Build can reach. The importer's grantor check passes, with 7 facts reported with their reasons.
- A tests check every citation against its decompiled method. `scripts/dump/refs.mjs` and `granted-by.mjs` read the dump's back-reference table.

**Measured:**
- `data/`: 9,504 blueprints.
- Browser document without items: 5.09 MB minified, **0.71 MB gzip**. The early projection, an upper bound with items, was 1.37 MB gzip. ADR 0004 holds; 02b records the final size.
- 337 engine tests.

**"Done when", as it stands:**
- Holds: references resolve, every prerequisite finds a grantor or a reason, the second run writes nothing, no game text but `name`, and `npm run check` runs the import checks and A tests.
- **`ChannelPositiveAllowed`'s expectation was wrong.** G returns `Deities` and `BlueprintArchetype` (`PriestOfBalanceArchetype` a4560e3fb5d247d68fb1a2738fcc0855 grants it through its `AddFeatures`). That's the game's data, and the test asserts it.
- Moved: the unlisted-type review (02a), items and the final size (02b).

**Decisions made on the way** (map 20–27; ADRs 0005 and 0006 amended; glossary: Daily choice, Story-granted feature):
- nested conditions are one leaf;
- story state is always met;
- spell-parametrized feats wait for phase 2;
- grant carriers are written;
- every pick made through an ability is a daily choice;
- story-granted features are out;
- shared names are qualified blueprint by blueprint.

