# Path switches in detail

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

Which Mythic picks does each path switch (Gold Dragon, Swarm That Walks, Devil, Legend) keep, as the game applies it, and how does a Build express a switch? Raised by build ticket 03, which reached them in its last areas.

What the code does (WrathDecompiled 6ce4a6b; paths under `decompiled/Assembly-CSharp/Kingmaker/`):
- **Gold Dragon and Swarm That Walks** set `m_IsHigherMythic` (`GoldenDragonClass` daf1235b6217787499c14e4e32142523, `SwarmThatWalksClass` 5295b8e13c2303f4c88bdb3d7760a757). Taking either while holding a path calls `UnitLogic/UnitProgressionData.cs ReplaceAllMythicLevelsWithMythicHeroLevels` from `AddClassLevel`. That method:
  - records the Mythic Feat and Mythic Ability picks, with their nested picks (`GetMythicSelectionsData`);
  - removes every Mythic level after rank 2 (`RemoveMythicLevel`), so path features and path selections (an Azata's superpowers) go;
  - re-adds the recorded picks as facts;
  - refills the ranks with Mythic Hero levels (`AddFakeLevel`).
- **Devil and Legend** run through story actions (`Designers/EventConditionActionSystem/Actions/RemoveMythicLevels.cs`, which removes N levels). Their N lives in dialogue blueprints that `data/` doesn't hold.

## Answer

User, 2026-11-20 ("Accept both"; the details below as revised with "Yes, replace it"):
- **A Build expresses a switch as the rank's class** in its `ranks` (rank 8 is `GoldenDragonClass`). There is no separate switch field.
- **Gold Dragon and Swarm That Walks** are ported from `ReplaceAllMythicLevelsWithMythicHeroLevels`. The guide's open question, why some picks are re-keyed two ranks later, is answered from `GetMythicSelectionsData` when the walk builds it.
- **Devil and Legend** keep picks per the user's account, which the guide records and which is cited as the user's account:
  - Legend keeps the choices and Mythic feats of Mythic levels 1–2;
  - Devil keeps those of Mythic levels 1–7.
- **Dropped picks count until the switch,** and the walk records them as dropped there.

### Details from GameFAQs and the Rust planner, to check against the data

User, 2026-11-20 ("Yes, replace it"). Besides the game's own data, the sources of truth for path switches are:
- the saved GameFAQs pages in `~/code/wotr-planner/guide-cache/txt/` (`other-mythic-paths.txt`, `gold-dragon.txt`, `mythic-paths.txt`), read from disk and never fetched online;
- the Rust planner's `~/code/wotr-planner/libs/game-data/mythic/paths/*.ron`, and its GLOSSARY.md entry "Path switch".

Community wikis are not sources. What these say:
1. **Two thresholds per switch** (Rust `switch:` fields `kept_through_rank` and `path_kept_through_rank`). General picks (each rank's Mythic feat or ability) are kept through rank X; the old path's own grants are kept through rank Y.

   | Switch | General picks kept through | Path grants kept through | Further ranks |
   | --- | --- | --- | --- |
   | Gold Dragon | 7 | 2 | yes |
   | Swarm That Walks | 7 | 2 | yes |
   | Legend | 2 | 2 | no: the character holds rank 3 afterwards |
   | Devil | 7 | 7 | yes |

   Picks a switch takes away still count until the switch.
2. **Devil:**
   - begins at rank 8 (`other-mythic-paths.txt`: "begin at mythic rank 8"; Rust ranks 8–10);
   - is open only from Aeon or Azata (`devil.ron` `from: ["aeon", "azata"]`);
   - drops only the Azata's dragon companion and the Aeon's gaze abilities (`devil.ron` `dropped_features` aeon/enforcing-gaze-extra-gaze and azata/dragon-companion, `dropped_selections` aeon/enforcing-gaze 1–3). No source says summons or songs are lost.
3. **Legend:**
   - loses every rank 3–8 Mythic ability and feat, and the Mythic spellbook;
   - stays at rank 3;
   - grants +4 to every ability score and a level cap of 40 (`legend.ron` `level_cap: 40`, features legend/legend and legend/legends-corruption-resistance);
   - a Trickster keeps the feats Perception 2 unlocked before switching (Rust GLOSSARY "Path switch").
4. **Spellbooks** (`mythic-paths.txt`):
   - Gold Dragon and Swarm lose the previous Mythic spellbook, and Gold Dragon gains its own;
   - Devil keeps the existing Mythic spellbook, which stops advancing;
   - Legend loses it, a merged Angel or Lich spellbook included.

**How build ticket 03 settles these:**
- It checks each against the game's data first:
  - `DevilMythicClass` 211f49705f478b3468db6daa802452a2's prerequisites;
  - the removal components (`RemoveFeatureOnApply` and its kin) on the switch classes and progressions;
  - `ReplaceAllMythicLevelsWithMythicHeroLevels`.
- Where the data answers, it wins, and the blueprint is cited.
- Where it can't, the GameFAQs file and the Rust `.ron` are cited.
- The ticket records which source settled each point.

### Which source settled each point (build ticket 03, 2026-11-20)

- **Gold Dragon and Swarm, 7 / 2:** the data. `ReplaceAllMythicLevelsWithMythicHeroLevels` removes every Mythic level after rank 2 and re-adds the Mythic Feat and Ability picks (`GetMythicSelectionsData`). A recorded pick that is itself a selection (Extra Mythic Ability) gives back only its nested pick.
- **Switch rank 8:** the data. `GoldenDragonClass`, `SwarmThatWalksClass` and `DevilMythicClass` 211f49705f478b3468db6daa802452a2 each need `PrerequisiteMythicLevel` 7, so each is first taken at rank 8, not 9.
- **Devil only from Aeon or Azata:** GameFAQs `other-mythic-paths.txt` and `devil.ron` `from`.
  - `DevilMythicClass`'s condition requires Mythic rank 7 with Aeon or Azata levels, but only in a branch the main campaign doesn't reach: its first branch is two negated DLC etude checks.
  - So in the main campaign the limit is the story's, and the sources settle it; the data's own branch agrees.
- **Devil 7 / 7, and its drops:** `devil.ron` (`dropped_features`, `dropped_selections`) and GameFAQs, since the removals are story actions.
  - The drops are `DragonCompanion` cf36f23d60987224696f03be70351928, `AeonGazeFeature`, `AeonGazeFeatureExtraGaze`, and the three Aeon gaze selections with their picks.
- **Legend 2 / 2, ending the ascensions:** GameFAQs "Playing a Legend" and `legend.ron`. The level cap of 40 is the data's: `LegendClass`'s progression grants a feature that sets `LegendaryHero`, which `UnitProgressionData.MaxCharacterLevel` reads.
- **The Trickster's Perception 2 feats survive Legend:** they are picks in character-level slots, which no switch touches.
- **Spellbooks:** GameFAQs `mythic-paths.txt` for losing the Mythic spellbook (Gold Dragon, Swarm, Legend). The data gives Gold Dragon its own spellbook (`GoldenDragonClass.m_Spellbook`), and Devil's class has none, so a kept Mythic spellbook stops advancing.

## Note: when Legend is taken (coordinator, 2026-11-21, on build ticket 05e)

- **Legend is taken at rank 8, like the other three switches,** and the walk refuses it before (`map31.legendFromRank8`). The sources are the Rust planner's GLOSSARY "Path switch" ("at MR 8") and GameFAQs `other-mythic-paths.txt` "Playing a Legend" (a path followed to rank 8 first).
- **"Rank 3" describes the character afterwards:** Legend keeps ranks 1–2, so the character holds rank 3. It doesn't say when Legend is taken.
- **The data alone would allow rank 3 on:** `LegendClass` asks only for Mythic Hero level 2. The rank is the story's.
