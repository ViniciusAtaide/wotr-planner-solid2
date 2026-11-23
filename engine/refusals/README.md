# The Refusal (R)

Why the game refuses a choice, worded true for this Build (guide §4, GLOSSARY.md "Refusal", build ticket 04). W records each refusal as data (engine/walk/failure.ts); this feature is the only place its wording forms, so a change of wording leaves every status as it was. The UI and the MCP show R's words and never word a refusal of their own. The words are our own (ADR 0006): the game's display names, and nothing else of its text.

## Public entry

- `refusal(w, failed)` and `Refusal`: one refused choice, worded.
  - `rule`: the rule that refused it (W's `Rule` id).
  - `text`: why, in one sentence.
  - `unmet`: each prerequisite that didn't hold, one sentence each, in the game's order.
- `Wording`: what R reads besides the refusal: the data, G, and (optionally) the character, the `Unit`, the refusal was judged on.
- `ruleText(w, failed)`: one rule's reason, worded with the values it compared.
- `unmetText(w, unmet)`: one unmet prerequisite leaf, worded for this Build.
- `nameOf(data, guid)`: a blueprint's display name.
- `bareNameOf(data, guid)`: its bare name (`bareName`), or `nameOf` when it has none.
- `namesIn(data, guids)` and `listNames(data, guids)`: the names of a list, each bare unless two in the list would read the same, which keep their qualifiers. `namesIn` maps each GUID to its name; `listNames` gives the distinct names in order. R's own lists, the MCP's breaks and Synergy words, and the planner's Synergy lines and broken-pick names use them (QA pass 2).
- `statName(stat)`: a stat's name.
- `gearPlaceName(place)`: a Gear place in words ("Ring 1", "Main hand"). An item refused for its place is told where it goes: "It doesn't go in this place; it goes in a Ring 1 or Ring 2 place." (the places `PLACE_ITEM_TYPES` gives its type; MCP QA).
- `gearNote(data, items)`: the note an option allowed only with the Gear counted carries.
- `rankLevelRange`, `abilityScoreRange`, `skillRankRange` and `archetypeCount`: why a value no Build code holds is refused where it comes in (a Rank level outside 1–255, a score outside 7–18, skill ranks outside 0–255, more than one archetype for a class), with the value given.
- `LinkReason` and `linkDidNotOpen(on, reason)`: why a Share link didn't open, by its reason group (other game data, a newer planner, not a Build code) and by when (`load`: the planner starts empty; `paste`: it keeps the Build it had).
- `breaks(data, build, pick, G?)`: the later picks taking a pick would break.
- `opensAt(data, build, slot, option, G?)`: the first later place where a closed option opens.

- **Pick words** (`pick-words.ts`, moved from the planner in QA pass 8 so every surface names a pick one way): `nestedLabel(parent, child)`, the "Parent (Value)" form a chip shows; `qualifiedName` and `withValue`, a name with one level of parentheses; `paramWords`, a parametrized pick's value; `pickName(data, pick)`; `slotWords(data, build, slot)`, a slot's name ("Feat", or "Human bonus feat" and "Bonus feat" for a feat slot the race opened, read from the slot's `from`); and `pickWords(data, build, pick, among)`, a pick named for a list of cleared picks: a sub-choice whose parent is in `among` reads "<parent's slot>: <nestedLabel>" ("Human bonus feat: Skill Focus (Lore — Religion)"), since two parents of one feat at one level would otherwise read alike.
- `clearsLaterText(place)`: the note on an option already picked later: "Held at level 11; taking it here clears that pick." (QA pass 6).
- `groupedFailures(w, failures)` and `placesWords(places)`: failures with the same choice and the same words become one `FailureGroup` with all their places, so a class's alignment reason across nine levels reads once ("Levels 1–9: …"). `placesWords` writes runs of levels and ranks ("Levels 2 and 4–5; Rank 1"). The MCP's `breaks` and the planner's Cascade notice use them (QA pass 6).
- `refusalWords(w, failed)`: the rule's sentence followed by its unmet needs, on one line. The planner's notice and the MCP's breakage words use it, so a refused class says which prerequisites fail.

## Rules

- **Names in Refusals** are bare (`bareName`): "Allied Spellcaster", not the importer's globally qualified "Allied Spellcaster (feature)". A list keeps a qualifier only where two of its names would otherwise read the same (`namesIn`). `nameOf` stays the globally unique name for other callers.
- **A condition** (`PrerequisiteCondition`) is worded by what its options are: each shown fact in it, and the named grantors of each hidden one.
  - Ability grantors are left out: picks made through an ability are daily choices and never part of a Build (map tickets 24 and 26). An example is Mixed Bloodline.
  - **Family:** when the options' bare names share leading words, the condition reads as that family. The noun is the shown facts' shared bare name, or else the grantors' kind noun: "Needs a Draconic Bloodline", in the manner of map 30's family names. When the character holds a fact of the same specific kind, its name follows as "(yours: Abyssal Bloodline)".
  - **No family:** the condition lists at most three distinct bare names, then "and N more" (map 19's wording for nameless prerequisites). Two grantors with the same bare name satisfy it equally, so that name is listed once.
  - **Length:** every condition in the data words in 120 characters or fewer.
- **`refusal`** words a walk Failure or a picker's closed option. The unmet leaves of group All are a line each. The others (Any, and ForcedTrue for a feature), of which one would do, share one line: "One of these: …", or the leaf alone when there is only one. A class's failing ForcedTrue leaf never reaches R: the walk doesn't count it. A line the unmet leaves would repeat, such as two identical `PrerequisiteNoClassLevel` components, is worded once.
- **`gearNote`** (ADR 0002) names the worn items an option needs when it is allowed only with the Gear counted.
- **`nameOf`** gives the display name. A blueprint the game never names reads as its asset name marked "(internal)" (map 19); a GUID the data doesn't hold reads as itself.
- **`statName`** names an ability, a skill, the base attack bonus or a save. Saves drop their `Save` prefix; skills drop `Skill`, and the four whose names carry a subject in brackets (Knowledge (Arcana), Knowledge (World), Lore (Nature), Lore (Religion)) come from `BRACKETED_SKILL_NAMES`. Everything else is its identifier split into words (`camelWords`: `FooBar` as `Foo Bar`).
- **Names of facts in prerequisites** (`factName`, map 19). A shown fact reads as its display name. A fact the player never sees is named by what grants it:
  - when exactly one kind of thing grants it and that kind is a FeatureGroup (deities, bloodlines…), by that kind: "a deity that allows it", and when the character holds a fact of that kind, "(yours, Asmodeus, doesn't)". A blueprint type says too little to word by, so it never counts as such a kind. `GRANTOR_KIND_NOUN` turns a grantor kind (G's `grantorKind`: a FeatureGroup or a blueprint type) into a noun; one it doesn't list becomes its type name in lower-case words;
  - else as "one of" up to 3 grantors the Build can reach;
  - else as its asset name marked as internal.
- **Lists of names** (`shortList`) show up to 3 names, then "and N more".
- **`unmetText`** words one unmet leaf: what it asks and, where it counts, what the character has ("(yours: 10)"). An alignment leaf reads the alignment the walk judged (`Unmet.alignment`), so a proposed alignment reads as yours even when the wording's unit is the Build before the change (QA pass 6). A `forbids` leaf reads "Not with …". Each kind of prerequisite (fact, facts, class level, archetype level, stat, character level, Mythic rank, alignment, proficiency, caster type, class spell level, parametrized feature, weapon subcategory, selection still open, pet, is a pet, main character, story, spells in a spellbook, condition) has its own sentence. "N of" a list appears only when more than one is needed. Feats taken for a spell say they aren't in the planner yet.
- **`ruleText`** words each of W's rules, one sentence per `Rule` id, with the values the rule compared (`found` and `needed`). The ids name the game methods W ports (`BlueprintFeatureSelection.CanSelect:Ranks`, `StatsDistribution.CanAdd` and so on); the citations live with W in engine/walk, since R only words them. The ids that aren't game methods name our own decisions: `adr0003.rankOrder` (Mythic ranks in order), `map31.legendEndsAscensions`, `map31.devilFrom`, `map32.notAToggle`, `map32.notHeld`, `map12.notGear` and `data.unknownItem`.
- **`breaks`** lists the later picks that the walk refuses with the pick swapped into its slot but accepts now (`refusedSlotKeys` before and after, by slot key). It re-walks the Build, so it is worked out only when asked, for one option.
- **`opensAt`** finds the first later place where an option opens: the next slot of the same selection, in the Build's order, whose walk paused there accepts it. It is undefined when no later slot of this Build does.

None of these ports a game method itself, so this feature has no citations.

## Tests

R's wording is tested beside the pickers, in engine/pickers/pickers.test.ts ("R: the Refusal"), and through the MCP in engine/mcp/tools.test.ts.
