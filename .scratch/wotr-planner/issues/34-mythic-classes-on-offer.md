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

## Amendment: the Legend choice class, and every switch on offer

Coordinator, 2026-11-21, on 05e (the user's standing instruction):

- **`FakeLegendClass` b82f1fbd191e1f2498266ca41f05027f is never on offer and never a Build's class.**
  - It is the root's `m_MythicLegenFake`: the class the story's level-up offers at the summit to choose the Legend path. Taking it only marks the path chosen (`LevelUpController.Commit` ensures `UnitPartLegendPathSelected`).
  - Its only gates are story state:
    - `PrerequisiteEtude` `GoddessesSummit` playing and `LegendSelectedSummit` not playing;
    - the `MythicClassLockComponent` lock `LegendUnlocked`, read by `BlueprintMythicsSettings.IsMythicClassUnlocked`.

    Map 21 treats story state as met, so without this rule it was open at every rank.
  - A Build expresses the switch as `LegendClass` at its rank (map 31). So `offeredMythicClasses` leaves the root's `m_MythicLegenFake` out, and the walk refuses it at any rank (`map34.legendChoiceClass`).
  - A patch override clears its display name. That keeps it out of every list and out of `LegendClass`'s name group, so `LegendClass` reads "Legend", not "Legend (Mythic Hero)".
- **Every path switch the walk takes is on offer.** `offeredMythicClasses` adds the walk's `pathSwitchClasses` to the root's list. The root doesn't list Gold Dragon, which now reads "Gold Dragon": a patch override restores its name's string key from `GoldDragonSpellbook`'s. The walk judges each switch open from rank 8. Built by build ticket 05e.
