# Prerequisites (P)

P is the prerequisite view (guide §4). The game keeps a blueprint's prerequisites as a flat list of components, each in group `All`, `Any` or `ForcedTrue`; negation is either a field on the component or a component type of its own. So there is nothing to normalise. P only reads each component into one leaf shape, the `PrerequisiteLeaf`, that the walk, the refusals, the grant index and the "this enables / this needs" links all share, so that none of them interprets the component types on its own. One type, `PrerequisiteCondition`, carries a nested condition tree; its leaf names the tree (map ticket 20).

Every citation of the game's code lives in `cites.ts`, keyed by the identifier that ports it (`readers.PrerequisiteFeature`, `PrerequisiteLeaf.CheckInProgression`, …); paths there are relative to `decompiled/Assembly-CSharp/Kingmaker/`.

## Public entry

- `prerequisites(blueprint, blueprints)`: a blueprint's prerequisites as leaves, in the game's component order.
- `PrerequisiteLeaf`, `Named`, `Polarity`, `Lookup`: the leaf shape and what it names.
- `namedFacts`, `namedBlueprints`, `namedWithLevel`, `conditionFacts`: what a leaf (or a condition tree) names, for the importer and the links.
- `isDeityFeature`: whether a blueprint is a deity.
- `paramPrerequisites`: a parametrized feat's parameter checks.
- `prerequisiteTypes`: the component types P's readers read (the keys of its `readers` table).
- `isPrerequisite`, `paramPrerequisiteTypes`: re-exported from `engine/data`.
- `cites`: the citation registry.

`prerequisiteTypes`, `isPrerequisite` and `paramPrerequisiteTypes` now live in `engine/data` (`prerequisite-types.ts`), so the loader checks prerequisite types without depending on P. P re-exports the last two for its own callers, and keeps its own `prerequisiteTypes`, built from its `readers` table; both sets are typed over the same `Prerequisite` union, so they hold the same types.

## The leaf

A `PrerequisiteLeaf` keeps the fields every prerequisite component shares (the game's `Prerequisite` base class), under their own names:

- `Group`: `All`, `Any` or `ForcedTrue`.
- `CheckInProgression`: whether a progression's grant checks this leaf (the level-up helper that adds a progression's features reads it).
- `IsFeatureSelectionWhiteList`: whether a waived slot under `ExceptWhiteListed` still checks this leaf (`BlueprintFeature`'s prerequisite check reads it).
- `polarity`: `requires` when the leaf needs what it names, `forbids` when the character must not have it.
- `names`: what the leaf names (a `Named`).
- `component`: the component the leaf was read from.

`Lookup` is the set of blueprints a reader may look at besides the one whose list it reads: today only the deity test, which reads the listed features.

## What a leaf names (`Named`)

Each kind keeps its component's fields under the game's names, with each reference resolved to a GUID; the walk judges them. Where a component's own flag inverts it (`Not`, `m_RestrictIfNot`, `NoCompanion`, `Companion`), the flag becomes the leaf's polarity, and a negating type (`PrerequisiteNoFeature`) names what it forbids.

- `fact`: a fact held (`PrerequisiteFeature`, `PrerequisiteNoFeature`, `PrerequisitePlayerHasFeature`).
- `facts`: at least `Amount` facts of a list (`PrerequisiteFeaturesFromList`). `IsDeity` is the component's own property: when the list is all deities, one is enough, and a first level with no deity yet counts it as met.
- `classLevel`: at least `Level` levels of a class, counting the levels that `ClassLevelsForPrerequisites` lends (`PrerequisiteClassLevel`; `PrerequisiteNoClassLevel` forbids `Level` 1).
- `archetypeLevel`: at least `Level` levels of a class taken with an archetype (`PrerequisiteArchetypeLevel`; `PrerequisiteNoArchetype` forbids `Level` 1).
- `stat`: a stat's value, permanent (`PrerequisiteStatValue`) or full (`PrerequisiteFullStatValue`; the leaf's `component` tells them apart).
- `characterLevel`, `mythicLevel`: a character level or a Mythic level.
- `alignment`: an `AlignmentMaskType` flags value, with the component's first-level exception (`IngorePrerequisiteCheck`, the game's spelling) and its archetype exception (`ArchetypeAlignment`).
- `proficiency`: proficiency with any of the listed armour groups and weapon categories; forbidding it means lacking any of them.
- `casterType`: a spellbook of a caster type (`PrerequisiteCasterType`), and with a spell level (`PrerequisiteCasterTypeSpellLevel`); `RequiredSpellLevel` is null for the first.
- `classSpellLevel`: a class's spellbook reaching a spell level.
- `parametrizedFeature`: a parametrized feat held for a parameter (a weapon category or a school; spell parameters are out of v1).
- `weaponSubCategory`: a parametrized feat held for a weapon of a subcategory.
- `selectionPossible`: a selection with at least one option still open.
- `pet`: a pet of a type, from a held fact's `AddPet`.
- `isPet`: being a pet. A Build never is one.
- `mainCharacter`: being the main character. A Build always is.
- `story`: story state, always met (map ticket 21).
- `spellsInSpellbook`: a spell for a spell-parametrized feat; those feats are out of v1 (map ticket 22).
- `condition`: a nested And/Or/Not condition tree (map ticket 20).

## Rules

The `readers` table holds one reader per prerequisite component type, each porting that component's check (`CheckInternal`, or `CheckUnit` for the stat values):

- `PrerequisiteFeature`: the unit has the fact.
- `PrerequisiteNoFeature`: the unit lacks the fact.
- `PrerequisitePlayerHasFeature`: the main character has the fact.
- `PrerequisiteFeaturesFromList`: `Amount` facts of the list, or one when the list is all deities; `m_RestrictIfNot` inverts it.
- `PrerequisiteClassLevel`: at least `Level` levels in the class, or with `Not` fewer.
- `PrerequisiteNoClassLevel`: no level in the class.
- `PrerequisiteArchetypeLevel`: levels in the class taken with the archetype.
- `PrerequisiteNoArchetype`: the class is not taken with the archetype.
- `PrerequisiteStatValue` and `PrerequisiteFullStatValue`: the permanent and the full value of a stat.
- `PrerequisiteCharacterLevel`, `PrerequisiteMythicLevel`: the character level and the Mythic level.
- `PrerequisiteAlignment`: the alignment mask.
- `PrerequisiteProficiency`, `PrerequisiteNotProficient`: proficiency, and its lack.
- `PrerequisiteCasterType`, `PrerequisiteCasterTypeSpellLevel`: a caster type, and its spell level (the latter's helper computes that level).
- `PrerequisiteClassSpellLevel`: a class's spell level.
- `PrerequisiteParametrizedFeature`, `PrerequisiteParametrizedWeaponSubcategory`: a parametrized feat at a parameter (each also ports its `CheckFeature`).
- `PrerequisiteSelectionPossible`: an open option in a selection.
- `PrerequisitePet`: a pet of the type, or with `NoCompanion` none.
- `PrerequisiteIsPet`: being a pet, inverted by `Not`.
- `PrerequisiteMainCharacter`: being the main character, unless `Companion` asks for the opposite.
- `PrerequisiteEtude`: story state, always met.
- `PrerequisiteAnySpellsInSpellbook`: a spell for a spell-parametrized feat.
- `PrerequisiteCondition`: the condition tree holds.

Besides the readers:

- `isDeityFeature`: a blueprint is a deity when its `Groups` hold the `Deities` feature group; the game's deity test on a feature list and its "considered fulfilled" check both test this.
- `isDeity`: a feature list is a deity list when it has at least one feature and every one is a deity.
- `paramPrerequisites`: the parameter checks of a parametrized feat (components of the game's parameter-prerequisite interface), which the feat's own `CanSelect` runs per parameter. They are not prerequisites: they have no group and don't join the prerequisite check.

## Design notes

- `prerequisites` reads each blueprint's leaves once per `Lookup` and caches them (`leavesByLookup`), because the walk asks for the same lists many times. The load checks guarantee every prerequisite component is one P reads; a component that is not throws.
- `namedFacts`: the facts a leaf requires or forbids, and, inside a condition tree, every fact a has-fact or rank condition names (`conditionFacts`). The importer's grantor check and its name qualifier read it.
- `namedBlueprints`: every blueprint a leaf names that a Build gets through a grant: its facts, and the class and archetype of a class-level, archetype-level or class spell-level leaf. The importer's grantor check reads it, so a leaf on a class no Build can take is found like one on such a fact. An archetype-level leaf also names its class, which `namedWithLevel` leaves to the archetype.
- `namedWithLevel`: what a leaf names as a player reads it: its facts, the class of a class-level or class spell-level leaf, and the archetype of an archetype-level leaf (whose class the archetype already implies). A class-level or archetype-level leaf gives its level too. The importer's name qualifier reads it (build ticket 02g).

## Tests

- `prerequisites.data.test.ts` runs P on the committed `data/`: one game blueprint per reader that does more than name a fact. Each expectation is that blueprint's own component as the dump has it:
  - `MythicStartingClass` `247aa787806d5da4f89cfc3dff0b217f`: a `PrerequisiteClassLevel` with `Not`, so the class closes from its own 7th level on.
  - `CriticalMastery` `fc85925cd241dd0408ab2f4cb171b7e3`: two critical feats from its list (`Amount` 2).
  - `PaladinClass` `bfa11238e7ae3544bbeb4d0b92e897ec`: one of eight deities, all in the `Deities` group, with `Amount` 0, which `IsDeity` overrides (the game's check stops at the first one held).
  - `MagicDeceiverWayOfLivingGodProgression` `464ffaf88140474a949618bec7955e78`: `m_RestrictIfNot` forbids the list.
  - `DragonheirScionArchetype` `8dff97413c63c1147be8a5ca229abefc`: one `PrerequisiteCondition` leaf naming its tree, whose facts the data all holds.
  - `FinesseTrainingBite` `bcebc021271be1e45b012729f22dadcc`: its `PrerequisiteConditionForWeaponCategory` (for Bite) is a parameter check, kept out of the prerequisite list.
