# Features only the story grants

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

Some features reach a character only through the story: dialogue cues and answers, etudes, Midnight Isles dungeon boons and crusade (kingdom) buffs. One example is Vow of Dahak, `CorruptedGoldenDragonFeature` 1e66cfb4f351466fb05636082bce50d6, which a dialogue cue gives and which `GoldDragonBreathDecaying` and `GoldDragonBreathAnnihilating` require. [Story-state prerequisites](21-story-state-prerequisites.md) covers checks of story *state*, not facts the story *grants*. Can a Build hold them?

## Answer

User, 2026-11-19: **no, story-granted features are out of scope.** No Build holds them, and a prerequisite leaf that needs one is unmet. The importer reports such leaves with this reason.
