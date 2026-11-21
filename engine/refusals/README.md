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
- `statName(stat)`: a stat's name.
- `gearNote(data, items)`: the note an option allowed only with the Gear counted carries.
- `rankLevelRange`, `abilityScoreRange`, `skillRankRange` and `archetypeCount`: why a value no Build code holds is refused where it comes in (a Rank level outside 1–255, a score outside 7–18, skill ranks outside 0–255, more than one archetype for a class), with the value given.
- `LinkReason` and `linkDidNotOpen(on, reason)`: why a Share link didn't open, by its reason group (other game data, a newer planner, not a Build code) and by when (`load`: the planner starts empty; `paste`: it keeps the Build it had).
- `breaks(data, build, pick, G?)`: the later picks taking a pick would break.
- `opensAt(data, build, slot, option, G?)`: the first later place where a closed option opens.

- `refusalWords(w, failed)`: the rule's sentence followed by its unmet needs, on one line. The planner's notice and the MCP's breakage words use it, so a refused class says which prerequisites fail.

## Rules

- **`refusal`** words a walk Failure or a picker's closed option. The unmet leaves of group All are a line each. The others (Any, and ForcedTrue for a feature), of which one would do, share one line: "One of these: …", or the leaf alone when there is only one. A class's failing ForcedTrue leaf never reaches R: the walk doesn't count it. A line the unmet leaves would repeat, such as two identical `PrerequisiteNoClassLevel` components, is worded once.
- **`gearNote`** (ADR 0002) names the worn items an option needs when it is allowed only with the Gear counted.
- **`nameOf`** gives the display name. A blueprint the game never names reads as its asset name marked "(internal)" (map 19); a GUID the data doesn't hold reads as itself.
- **`statName`** names an ability, a skill, the base attack bonus or a save. Saves drop their `Save` prefix; skills drop `Skill`, and the four whose names carry a subject in brackets (Knowledge (Arcana), Knowledge (World), Lore (Nature), Lore (Religion)) come from `BRACKETED_SKILL_NAMES`. Everything else is its identifier split into words (`camelWords`: `FooBar` as `Foo Bar`).
- **Names of facts in prerequisites** (`factName`, map 19). A shown fact reads as its display name. A fact the player never sees is named by what grants it:
  - when exactly one kind of thing grants it and that kind is a FeatureGroup (deities, bloodlines…), by that kind: "a deity that allows it", and when the character holds a fact of that kind, "(yours, Asmodeus, doesn't)". A blueprint type says too little to word by, so it never counts as such a kind. `GRANTOR_KIND_NOUN` turns a grantor kind (G's `grantorKind`: a FeatureGroup or a blueprint type) into a noun; one it doesn't list becomes its type name in lower-case words;
  - else as "one of" up to 3 grantors the Build can reach;
  - else as its asset name marked as internal.
- **Lists of names** (`shortList`) show up to 3 names, then "and N more".
- **`unmetText`** words one unmet leaf: what it asks and, where it counts, what the character has ("(yours: 10)"). A `forbids` leaf reads "Not with …". Each kind of prerequisite (fact, facts, class level, archetype level, stat, character level, Mythic rank, alignment, proficiency, caster type, class spell level, parametrized feature, weapon subcategory, selection still open, pet, is a pet, main character, story, spells in a spellbook, condition) has its own sentence. "N of" a list appears only when more than one is needed. Feats taken for a spell say they aren't in the planner yet.
- **`ruleText`** words each of W's rules, one sentence per `Rule` id, with the values the rule compared (`found` and `needed`). The ids name the game methods W ports (`BlueprintFeatureSelection.CanSelect:Ranks`, `StatsDistribution.CanAdd` and so on); the citations live with W in engine/walk, since R only words them. The ids that aren't game methods name our own decisions: `adr0003.rankOrder` (Mythic ranks in order), `map31.legendEndsAscensions`, `map31.devilFrom`, `map32.notAToggle`, `map32.notHeld` and `data.unknownItem`.
- **`breaks`** lists the later picks that the walk refuses with the pick swapped into its slot but accepts now (`refusedSlotKeys` before and after, by slot key). It re-walks the Build, so it is worked out only when asked, for one option.
- **`opensAt`** finds the first later place where an option opens: the next slot of the same selection, in the Build's order, whose walk paused there accepts it. It is undefined when no later slot of this Build does.

None of these ports a game method itself, so this feature has no citations.

## Tests

R's wording is tested beside the pickers, in engine/pickers/pickers.test.ts ("R: the Refusal"), and through the MCP in engine/mcp/tools.test.ts.
