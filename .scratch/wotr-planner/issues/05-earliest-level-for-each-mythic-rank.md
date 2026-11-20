# Earliest character level for each Mythic rank

Type: research
Status: resolved
Parent: [map](../map.md)

## Question

What is the earliest character level at which each Mythic rank (1–10) can be taken, and can the dump show it (story etudes or actions granting mythic experience, against the XP table)? If it can't, what is the best cited source for a hand-kept table? `UnitProgressionData.CanLevelUpMythic` shows that ranks wait on mythic experience the story grants. The Rust planner has a rank table: find where its values came from.

## Answer

The game ships the table, so the planner doesn't need to keep one by hand. `MythicsSettings`
`3b8a6729da1e13a4e8e606e9f0fa38d8` (a `BlueprintMythicsSettings`) has a field `CharcaterLevelRestrictions`. For
Mythic ranks 1 to 10 it gives character levels 6, 7, 9, 11, 14, 15, 16, 17, 17, 19.

- **What enforces it:** only the respec and forced level-up window (`RespecWindowVM.UpdateProperties`). There, the
  next rank waits until the character reaches the table's level, as long as character levels are still owed.
- **Normal play:** `CanLevelUpMythic` checks only the mythic experience the story has granted, never the character
  level.
- **Deriving it from story grants:** not possible from the dump.
  - About 75 dialog cues, cutscene commands and etudes grant ranks. Most grant one rank, and many depend on the path
    or a dialog branch.
  - Character XP at each grant depends on enemies placed in scenes that are not in the dump, and on optional content.
- **The Rust planner's table:** the same values. It came from the user (ticket 10, "Facts the user gave"), backed by
  the community guide's approximate levels, and never cited the game.

Findings: [mythic-rank-timing.md](../research/mythic-rank-timing.md).
