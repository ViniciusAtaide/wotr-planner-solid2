# Mythic classes on offer to the main character

Type: grilling
Status: resolved
Blocked by: none
Parent: [map](../map.md)

## Question

The planner's class lists offered every shown class, so creature classes (Animal, Dragon, Monstrous Humanoid) and every Mythic class appeared. The game's own lists are `ProgressionRoot.AvailableCharacterClasses`, `AvailableCharacterMythics` and `CharacterRaces`. The Mythic list still holds two classes that no data flag sets apart:

- `MythicCompanionClass` 530b6a79cb691c24ba99e1577b4beb6d, "Mythic Companion": the class companions level in. It has only generic Mythic Ability and Mythic Feat selections, with no path powers.
- `MythicShardsClass` 53cb5892d19e4c4586c9dd4d6337d943, "Shard Powers": a separate 3-rank class of Shard Boons and curses. Nothing else in the data names it.

The main character starts as Mythic Hero (`m_MythicStartingClass`) and takes a path when the story gives one (`CharGenClassPhaseVM.GetMythicClasses`, `NextObligatoryMythicClass`). Raised by the comparison with the Rust planner (ticket 05d's follow-up).

- (a) Offer the game's list, minus these two, as a named planner rule.
- (b) Offer the game's list as it is.

## Answer

The user, 2026-11-20: **(a).**

- Classes and races come from the root's lists (`engine/pickers` `offeredClasses`, `offeredRaces`).
- Mythic classes are `offeredMythicClasses`: `AvailableCharacterMythics` minus `NOT_MAIN_CHARACTER_MYTHICS`, which lists the two classes above.
