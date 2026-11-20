# WotR Planner

A build planner and agent toolset for Pathfinder: Wrath of the Righteous at patch 2.7.0x. It lets people and agents put together characters level by level, and every choice it offers is one the game would allow.

## Language

### Sources

**Blueprint**:
A typed game record identified by its GUID. Classes, feats, selections and items are all blueprints. Names repeat across blueprints, but GUIDs are unique.
_Avoid_: Asset, entry (for game objects)

**Component**:
A piece of behaviour attached to a blueprint, such as a prerequisite, a grant or a stat bonus.

**Grant**:
One place that gives a fact: the grantor, how it gives it, and the level and parameter where they apply.
_Avoid_: Source (that is where a held fact came from in a Build)

**Grant carrier**:
A buff, ability or toggle the planner holds only because it passes grants on to held facts. No Build picks one.
_Avoid_: Hidden grant, carrier buff

**Dump**:
The BubblePrintsData export of every blueprint at the pinned patch. It is the source of all game data.
_Avoid_: Blueprints file, data dump

**Summary**:
A blueprint's description in the planner's own words: generated from its components, or written by hand where a generated one reads badly. The game's own description text is never shown.
_Avoid_: Description, tooltip text

**Display name**:
A blueprint's name as the game shows it, with a qualifier added where two blueprints a player can reach share a name ("Air Domain (Separatist)"). It is the only game text the planner holds.
_Avoid_: Label, title, asset name (that is the internal name)

### Builds and levels

**Build**:
The main character's choices from creation to the level cap and Mythic rank 10: race, ability scores, each level's class and picks, skill ranks, its Gear, and the Mythic path with its ranks and switch. Companions and mercenaries are never Builds.
_Avoid_: Character, plan, sheet

**Incomplete**:
A Build that still has slots with no pick. An incomplete Build is still possible; the planner never holds an impossible one.
_Avoid_: Invalid, broken (those name states the planner never holds)

**Build code**:
A Build written as one compact string that holds every one of its choices. People and agents pass Builds around as their Build codes.
_Avoid_: Build id, save string

**Share link**:
The planner's URL with a Build code in it, which opens that Build.
_Avoid_: Permalink, build URL

**Gold build**:
A real player's Build, known to work in the game, that the planner must reproduce gain for gain.
_Avoid_: Golden test, sample build

**Level-up**:
Everything chosen at one character level: the class, any ability increase, skill ranks, and the picks for that level's slots.
_Avoid_: Level entry, level step

**Class choice**:
What a Build fixes for a class when that class is first taken, such as its archetype. It belongs to the class, so moving the class's first level doesn't lose it.
_Avoid_: Archetype level

**Character level**:
The character's total level: 1–20, or 1–40 on the Legend path.
_Avoid_: Level (unqualified), total level

**Class level**:
The number of character levels taken in one class.
_Avoid_: Level in class

**Counts as**:
One class's levels counting as another class's levels, for one specific purpose only, such as a feat's prerequisites or one feature of the other class.
_Avoid_: Stacks with (unqualified), effective level

**Prerequisite floor**:
The minimum value a held feature makes a prerequisite see, without changing the sheet's numbers (Perfect Mind: base attack bonus 15).
_Avoid_: Minimum, override

### Choices

**Fact**:
A blueprint as held by a character in a Build. Each feature is held once, at some rank.

**Rank**:
How many times a character has gained a fact. A fact can never be held at a rank above its blueprint's cap.

**Progression**:
A feature whose level entries grant other features as its own level rises. Classes, bloodlines, domains and the character-level feats are all progressions.

**Selection**:
A feature that asks for one pick from a fixed list.

**Slot**:
An open place in a Build where a selection's pick goes. A pick that is itself a selection opens a nested slot at the same level.

**Pick**:
The option a Build puts in a slot.
_Avoid_: Choice (when it means a single slot's option)

**Picker**:
Every option a slot can take, each with whether it is open and, when closed, why, judged at the point in the Build where the slot is filled.
_Avoid_: Dropdown, option list

**Granted feat**:
A feature a level gives outright, with no slot and no pick. It is held whatever its prerequisites.
_Avoid_: Bonus feat (that is a slot)

**Extra pick**:
One more slot of an existing selection, given by a feat each time it is taken (Extra Hex, Extra Rogue Talent, Extra Mythic Ability).
_Avoid_: Extra slot feat

**Parametrized feat**:
A feat taken for a chosen weapon category, spell school, skill or spell, such as Weapon Focus or Spell Focus. It can be taken once for each parameter.
_Avoid_: Feat variant, feat with a subtype

**Parameter**:
What one pick of a parametrized feat is taken for. It is part of the pick.
_Avoid_: Subtype, argument

**Band**:
One of the fixed stages a level-up applies its choices in (race, class, archetype, attributes, skills, mythic ability, path, features…). Each choice is judged with every earlier band's choices already applied.

**Waiver**:
The rule that some selections skip their picks' prerequisites, while still checking list membership, rank cap and proficiency.
_Avoid_: Ignore-prerequisites (in prose)

**Daily choice**:
A pick the game asks for again each day (a wandering spirit, a wandering hex, a mixed bloodline). It is never part of a Build; what needs one of its options is met while the character holds the feature that offers it.
_Avoid_: Rest choice, temporary pick

**Aspect kept on**:
A Shifter aspect a Build keeps switched on, as many at once as its group size allows. What the aspect adds while it is on counts as held.
_Avoid_: Active aspect, toggled aspect

**Story-granted feature**:
A feature only the story gives, through a dialogue, an event or a dungeon boon. No Build holds one.
_Avoid_: Quest reward, story feat

### Rules and edits

**Prerequisite**:
A condition a blueprint sets on being taken. A blueprint's prerequisites are a flat list, each member in group All, Any or ForcedTrue; one kind of member holds a nested condition of its own (all of, any of, not).

**Refusal**:
The explanation for why a pick can't go in a slot: the unmet prerequisites as they stand for this Build, the later picks it would break, and where it would become available.
_Avoid_: Error, validation message

**Cascade edit**:
An edit that also clears every pick it would break, after showing exactly which ones. A cleared pick leaves its slot empty and is never moved to another slot. A plain edit that would break a pick is refused instead.
_Avoid_: Force edit, auto-fix

**Synergy link**:
A mechanical connection between two blueprints, worked out from the game data: they affect the same weapon, spell school, energy type, ability score or listed descriptor, or one grants what the other requires. It is never a hand-written theme tag.
_Avoid_: Combo, theme tag

### Gear

**Gear**:
The items a Build wears: one in each worn place, plus a main hand and an off hand holding a weapon or a shield. Gear belongs to no level, and single-use items are not Gear.
_Avoid_: Equipment, inventory, loadout

**Item restriction**:
A condition an item sets on being worn, such as a class, an alignment, a minimum stat or being the main character. It is separate from proficiency.

**Proficiency**:
Being trained in a weapon category or an armour group, so the item can be used without penalty.

**Gear-dependent**:
A pick, class level or archetype whose stat prerequisite is met only with the Build's Gear counted, or that rests on such a pick. It is allowed only when the Build opts into counting Gear, and it is marked with the items it needs: those that raise the score it reads, or those of the pick it rests on.

### Mythic

**Mythic rank**:
A character's mythic level, from 1 to 10. Story progress grants mythic ranks, independently of character level.
_Avoid_: Mythic tier, mythic level (in prose)

**Rank level**:
The character level a Build takes a Mythic rank at. Any level is allowed, as long as ranks come in order; it starts at the rank's Expected level.

**Expected level**:
The character level a character usually has on reaching a Mythic rank, from the game's own table. It is a hint and a default, never a rule.
_Avoid_: Minimum level, required level, earliest level

**Mythic ascension**:
Everything chosen at one Mythic rank: a mythic ability or mythic feat, plus any path-specific picks.
_Avoid_: Mythic level-up, tier-up

**Mythic path**:
A Mythic class chosen at Mythic rank 3 (Angel, Demon, Lich, Trickster…).

**Path switch**:
A late change of Mythic path (Gold Dragon, Swarm That Walks, Legend, Devil). It replaces the path's ranks, keeping some earlier Mythic picks and dropping others.
_Avoid_: Path change, respec
