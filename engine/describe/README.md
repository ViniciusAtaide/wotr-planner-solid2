# Summaries

What the planner says about one blueprint: its Summary (ticket 06b), and the basic description of build ticket 05: its name, its prerequisites (worded by R), what it grants, where it can be picked, and its chain links. All in our own words; it never holds game text (ADR 0001, ADR 0006).

## Public entry

- `describe(data, guid, G?)`: a blueprint's description, or undefined when the data doesn't hold the blueprint or the game never names it (map 19). A named blueprint hidden from the character screen (`HideInUI`) is still described, since a selection can offer it: the background groups Scholar, Noble and Street Urchin are (MCP QA).
- `Description`: one blueprint, described.
  - `guid`, `name`, `kind`: which blueprint it is; the name is R's `nameOf`.
  - `summary`: the Summary: the hand-written summary when there is one (06c), else the labelled components' sentences joined (`summaryOf`), else `NO_SUMMARY`.
  - `summarySource`: where `summary` comes from: `written`, `labels` or `none`.
  - `labels`: the same sentences, each with its `Role`, for a UI that groups or marks them.
  - `prerequisites`: each prerequisite, worded by R.
  - `grants`: the shown facts it grants, each with the level it grants it at when the grant says so, and `when`, the condition of a conditional grant: "at Cleric, Inquisitor or Warpriest level 1" (`AddFeatureOnClassLevel`), "with Weapon Focus" (`AddFeatureIfHasFact`), "while the alignment is Good" (`AddFeatureOnAlignment`). Desna's starknife proficiency is a cleric's, not every worshipper's (MCP QA).
  - `pickedIn`: where it can be picked, that is the shown selections that list it.
  - `needs`, `enables`: its prerequisite-chain links (map 09), from engine/links, each a `NamedLink` (`guid` and the name R's `namesIn` gives it in that list).
- `NO_SUMMARY`: "No summary yet.", the Summary of a blueprint with nothing labelled (map 10). Never a guess or a raw component name.
- `summaryOf(labels)`: the Summary text of a list of labels.
- `writtenSummary(data, guid)`, `summaryText(data, guid, G?)` and `summaryLabels(data, guid, G?)`: a blueprint's hand-written summary, if any; its Summary text, the hand-written one first; and the labels behind it. The MCP's `search` and `options` use `summaryText`.
- `labelOf(data, component)` and `labelsOf(data, guid)`: a component's `Label` (06b), or undefined for a component no label covers; and a blueprint's labels, in component order, each distinct sentence once.
- `Label`: `role` and `text`. `Role` is one of `bonus`, `save`, `immunity`, `resistance`, `weakness`, `requirement` and `trigger` (map 10's roles, with `weakness` for a vulnerability).
- `summaryComponentTypes`: the 50 carriers 06a keeps for the Summaries, the importer's reader set for them.
- `cites`: the game methods whose mechanics a sentence states.

## Rules

- **Prerequisites.** Each prerequisite is R's `unmetText` for that leaf, so the wording has one source. A leaf of group All keeps R's "Needs …"; a leaf of the other groups (Any, ForcedTrue), of which one would do, reads "Or: needs …".
- **Grants.** G's grants of the blueprint, less removals, less facts the game never shows, and less the grants that are really list membership (a selection's options, a class's archetypes): those are not what it grants but what can be picked in it.
- **Picked in.** The shown selections that list the blueprint among their options, each once.

- **Labels** (06b). Each of the 50 carriers has one sentence template, written in our own words from what the component's kept fields say:
  - **Values.** A plain value reads as a signed number ("+4"). A value the game computes from a rank or another property reads as "a bonus that grows with level", not a guess at the number.
  - **Bonus types.** A typed bonus names its type ("+2 dodge bonus"); an untyped one (`None`, `UntypedStackable`) names none.
  - **Facts.** A fact a component names reads as its bare name ("against Reptilian Humanoid"). A fact the game never names reads as "certain foes" (or "certain sources" for a save), never an asset name.
  - **Descriptors and lists.** Spell descriptors, energies, conditions, maneuvers and weapon groups read as plain words, listed with "or".
  - **Mechanics.** Where a sentence states what the game does (an arcana's +1 per die, Spell Specialization's +2 caster level, a mythic Weapon Focus's +2, a vulnerability's half again as much damage, the doubled threat range of Improved Critical), it cites the method (`cites`).
  - **Ranks.** Where the game multiplies a bonus by the fact's rank (`RANK_SCALED`, and `ManeuverBonus` unless it ignores the rank), a blueprint of more than one rank says so: "+1 dodge bonus to AC against certain foes, per rank (up to 6)."
  - A component that names nothing a sentence can say (a descriptor immunity with no descriptor) gets no label.
- **The Summary** is the blueprint's labels in component order, each distinct sentence once.
- **Items.** An item's own components carry nothing a label reads; what it does sits on the facts its enchantments grant when worn. Its Summary is theirs, composed in the walk's grant order (G's `equipmentGrants`, the same list the walk's `wear` gains) with each sentence once. A granted fact's hand-written summary stands in for its labels. Each fact is worded at one rank, the rank one worn item gives, even when the fact allows more so that copies stack. An item's own hand-written summary, if any, comes first. Each enchantment's own equipment bonuses come before what it grants: the stat bonuses (`AddStatBonusEquipment`, `IncreaseStatEquipment`), weapon and armor enhancement, and mithral (`EQUIPMENT_LABELLED`, cited), the components the walk already keeps for Gear. Of 2669 shown items, 2077 have a Summary (none before item Summaries, 320 from granted facts alone).
- **Hand-written summaries** (06c, map 10) replace a generated one that reads badly. Each is a `summary` override in `data/overrides/<AssetName>.<guid>.summary.json`: the target GUID, our own `text`, the `reason` the generated one won't do, and the `fingerprint` of the components it describes. The load check refuses a summary whose components changed since it was written, naming both fingerprints. It is wording only: `labels` stay the generated ones, and no link is read from it.

## Design notes

- The MCP's `explain` tool carries this description, and its `search` and `options` results carry the Summary.
