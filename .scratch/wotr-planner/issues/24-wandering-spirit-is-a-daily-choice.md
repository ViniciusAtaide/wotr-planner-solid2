# The Shaman's wandering spirit is a daily choice

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

A Shaman picks a wandering spirit in play, each rest, through an ability (`ShamanWanderingSpiritAbility` 709db7ec794271b43b9c416b520d765c, `AbilityApplyFact`). 19 prerequisite leaves on hexes a Build can reach name a wandering-spirit feature (`ShamanBattleSpiritWanderingFeature` 82ec7a49f3ab65a44bbf4177dfdfe469 and its siblings), which nothing a Build holds grants. Is the wandering spirit a Build choice?

## Answer

User, 2026-11-19: **a daily choice, as in the Rust planner** (`daily_choice` on its Wandering Spirit, Mixed Bloodline and similar features). It is not part of a Build. A prerequisite leaf that needs a wandering spirit counts as met when the Shaman holds the Wandering Spirit feature. The importer's report lists these leaves with that reason; the walk (build ticket 03) applies the rule.

## Every ability-made pick is daily (2026-11-19)

User, 2026-11-19. Every pick the game makes through an ability's `AbilityApplyFact` is a daily choice, not part of a Build. `UnitLogic/UnitHelper.cs Replenish` refills ability resources on rest, and `AbilityApplyFact.cs Apply` replaces the ability's previous pick. The online wikis agree for each. The abilities, all held as choice carriers in `data/abilities/`:
- Wandering Spirit: `ShamanWanderingSpiritAbility`, `UnswornShamanWanderingSpiritAbility 1` and `2`.
- Wandering Hex: `ShamanWanderingHexAbility`, `ShamanWanderingHexAbility2`, `WitchWanderingHexAbility`.
- Minor Spirit: `UnswornShamanMinorSpiritAbility 1`–`6`.
- Wandering Skills: `PossessedShamanWanderingSkillsAbility`.
- Wandering Mythic Trick: `WanderingMythicTrickAbility1` and `2`.
- Companion Animal: `ShamanNatureSpiritWanderingTrueAbility`.
- Mixed Bloodline: `MixedBloodlineAbility` and `2` ([map ticket 26](26-mixed-bloodline-is-a-daily-choice.md)).

A prerequisite leaf that needs one of their options counts as met while the character holds the ability's feature. Cavalier Tactician and Greater Wyrmshifter also sit in `data/abilities/`, but they are in-play effects (Tactician buffs allies; Wyrmshifter is a polymorph), not choices.
