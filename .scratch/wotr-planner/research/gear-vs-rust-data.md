# Rust gear data against the dump's equipment set

Compares the Rust planner's hand-curated items (`~/code/wotr-planner/libs/game-data/gear/`, `planner/gear/` and `weapons/`) with the equipment set worked out in [obtainable-items.md](obtainable-items.md): 4,542 equipment blueprints in `blueprints_raw_2.7.0x_0.binz`, of which 3,397 trace to a source in play. Done 2026-11-19 with throwaway Python over the pickles from that research (session scratchpad, not kept). The terms "obtainable", "leftover category" and the source labels (chest, vendor, scripted…) are the ones defined there.

## Summary

| Question | Count | Entries |
| --- | --- | --- |
| Rust gear entries | 93 | 92 in `gear/`, each citing a blueprint GUID; 1 in `planner/gear/` with none |
| Cited GUIDs missing from the dump | 0 | Every one of the 92 resolves |
| Rust equipment entries matched to an obtainable blueprint | 82 | 81 by cited GUID, plus `robe-of-angelic-presence` by stats |
| (a) Not in the dump under the Rust name | 1 | `robe-of-angelic-presence` |
| (b) In the dump but outside the 3,397 | 11 | 1 equipment item (`colossus-ring`, worn by NPCs only), 10 usables (outside the 4,542 by type) |
| (c) Ambiguous: several blueprints share the name | 0 | None, by display name, display-name key or asset-name variant |
| Other discrepancies (not gaps) | 7 | 3 slot mismatches, 2 name spellings, 2 items that only the Midnight Isles give |
| Obtainable dump items the Rust data doesn't cover | 3,315 | Of 3,397. 2,221 distinct named items, 728 unnamed generics |
| Weapon categories used by obtainable weapons, missing from Rust `weapons/` | 2 | `SpikedHeavyShield`, `SpikedLightShield` (18 weapons) |
| Weapon types used by obtainable weapons, missing from Rust `weapons/` | 17 | Composite bows, the second ends of two double weapons, DLC2 rusty and sham copies, the torch, the spiked shields, and the companions' empty hand (plus Armag's Blade, whose type isn't in the dump) |

## 1. Rust items the obtainable set misses

### (a) Not in the dump at all

No cited GUID is missing. One entry has no GUID:

| Rust entry | What the dump has | Likely reason |
| --- | --- | --- |
| `robe-of-angelic-presence` (`planner/gear/`, slot Robe; its `why` says no blueprint matches the name) | `RobeOfAngelicPrudenceItem` 1c2fc5c3b82e428ab6b06dab81ef01dd, `BlueprintItemEquipmentShirt`, display name "Robe of Angelic Prudence". Obtainable: crusade and dungeon sources. | **Guide naming error.** The blueprint matches the Rust entry exactly: enchantments `Charisma4` 4dcb81fcbfb11714db17ece0c152ed8b and `Wisdom4` c3c2a133c0aa12240ade34762c146664 (Cha +4, Wis +4 enhancement), and it references the ability `AngelicAspectGreater`, the entry's "at will" effect. No other item blueprint has "angel" in its asset or display name with these bonuses. The entry can cite this GUID and move to `gear/`. |

### (b) In the dump but outside the 3,397

| Rust entry | Blueprint | Leftover category | Likely reason |
| --- | --- | --- | --- |
| `colossus-ring` (Ring) | `RingofConstitution` 6c7f785bab7bd1243a43e365dc2089bd, `BlueprintItemEquipmentRing` | **Worn by NPC only** (also on `DungeonLootExclude`, which gives nothing) | **Scene-placed NPC the dump can't see.** No container, vendor, action or companion gives it. It sits in `m_Ring2` of `DLC4_ShifterMythicDemonBoss` 00f35416b8cc46279fe3a556064a72ca, of its two cutscene copies (`DLC4_ShifterMythicDemonBoss_cutscene` b3d2581373294a92b330b07493e613fb, `DLC4_ShifterGryffon_cutscene` 45436eb5dac84688a0c6d6a8ff883bad), and in `m_Ring1` of the test pregen `SeelahTestLevel20`. The boss is a dialogue speaker in ten `BlueprintCue`s, so a scene places it, and it has no `Unlootable` component, so its worn ring goes into its corpse's inventory. The guide lists the ring, which fits a drop from that fight. Keep it, and add it to the hand-kept allow list. |
| `elixir-of-inconceivable-transmutations-of-body-and-soul-and-also-mind` (Usable) | `ElixirMasterpiece` 5219d5846529ae949b88c87858c1bb9e | Usable, not equipment | Outside the 4,542 by type. Reachable by the same rules (chest, crusade). |
| `manual-of-bodily-health-2` (Usable) | `ManualOfBodilyHealthPlus2` 2d4d510a69da09c48893f945ec197210 | Usable | Same; chest, vendor, scripted. |
| `manual-of-gainful-exercise-2` (Usable) | `ManualOfGainfulExercisePlus2` 7a7b1dfa67aa4544aa468d0558b1f667 | Usable | Same; chest, vendor, scripted. |
| `manual-of-quickness-of-action-2` (Usable) | `ManualOfQuicknessOfActionPlus2` b8ea6d2f787c7004c9cab9f519f687f8 | Usable | Same; chest, vendor. |
| `potion-of-humanity` (Usable) | `PotionOfHumanityItem` d13cdbccd89d4e7c8396d076a73d731e | Usable | Same; chest. |
| `tome-of-ancient-perfection` (Usable) | `TomeOfPerfection` 0574c938014f45cb82d43b90439e380f | Usable | Same; chest, dungeon. |
| `tome-of-clear-thought-2` (Usable) | `TomeOfClearThoughtPlus2` 3584c2a2f8b5b1b43ae11128f0ff1583 | Usable | Same; chest, vendor, scripted. |
| `tome-of-leadership-and-influence-2` (Usable) | `TomeOfLeadershipAndInfluencePlus2` 37e2f09923a96234ca486bc9db0b6ad6 | Usable | Same; chest, vendor. |
| `tome-of-understanding-2` (Usable) | `TomeOfUnderstandingPlus2` 419a486154514594c99193da785d4302 | Usable | Same; chest, vendor. |
| `trusted-friend` (Necklace) | `TokenOfHonor` 905ec00744cd4627b0e00f187e215d4b, `BlueprintItemEquipmentUsable` | Usable | Same; scripted. The Rust data keeps the guide's Necklace slot on purpose (`libs/game-data/notes/293-items.md`), but the game's item is a quick-slot usable, not a neck item. |

So the only real miss is `colossus-ring`. The ten usables show that our candidate Gear, if it should hold permanent-bonus books and elixirs, has to take in the 1,148 reachable usables (or the subset with a stat effect), not just the 4,542.

### (c) Ambiguous

None. For each of the 92 cited blueprints I looked for other item blueprints with the same display-name key, the same display name (exact or loosened: case, punctuation, "the", "of"), the Rust entry's own name, or an asset name that differs only by an `Item` / `_…` suffix or prefix. None turned up. The Rust entries are named uniques and stat items, which the game gives one blueprint each. Shared names live among generic weapons and armour (Hellknight plate copies, +N weapons, Finnean's forms), which the Rust data doesn't model.

### Other discrepancies

These are not gaps, but a converter from Rust keys to dump GUIDs will meet them:

| Rust entry | Rust says | Dump says |
| --- | --- | --- |
| `broken-trickster` | slot Headwear | `DLC3_BrokenTricksterGlassesArtifactItem` 692b59ae0433471aa675b5b1b80db863 is `BlueprintItemEquipmentGlasses` |
| `razmirs-mask` | slot Headwear | `RazmirMask` 9338510a8d5c4b43b1284470b706128d is `BlueprintItemEquipmentGlasses` |
| `trusted-friend` | slot Necklace | `TokenOfHonor` is a usable (above) |
| `battlemages-headband` | name "Battlemage's Headband" | display name "Battle Mage's Headband" (`BattleMagesHeadbandItem` 229111433080fe247800e95385c9af20) |
| `ustlavic-pride` | name "Ustlavic Pride" | display name "Ustalavic Pride" (`FullplateOfUstalavianOfficerArmorItem` 59a33c8783ad4de8b547022ec274c930) |
| `belt-of-thunderous-charging` | — | `BeltOfThunderousChargingItem` b59c3948cc32e3c43b519ecd7e618155: obtainable only through the Midnight Isles dungeon |
| `mangling-frenzy` | — | `ManglingFrenzyItem` 5d855652aad04a9cad2fb1e70735ac7e: obtainable only through the Midnight Isles dungeon |

## 2. The reverse: obtainable dump items the Rust data doesn't cover

Counts only. "Covered" means a Rust gear entry cites the blueprint (the Angelic Prudence robe counted as covered). "Distinct named" counts distinct display names among the uncovered items, minus names a covered item already has. "`…Item` assets" is the rough unique-item proxy from obtainable-items.md.

| Slot (dump type) | Obtainable | Covered by Rust | Not covered | Not covered, distinct named | Not covered, `…Item` assets |
| --- | --- | --- | --- | --- | --- |
| Weapon | 2,182 | 2 | 2,180 | 1,274 | 439 |
| Armour | 474 | 4 | 470 | 326 | 149 |
| Shield | 121 | 0 | 121 | 94 | 47 |
| Ring | 108 | 2 | 106 | 104 | 77 |
| Head | 104 | 31 | 73 | 71 | 56 |
| Neck | 86 | 2 | 84 | 83 | 47 |
| Belt | 62 | 28 | 34 | 34 | 24 |
| Gloves | 56 | 3 | 53 | 52 | 50 |
| Shoulders (cloak) | 55 | 1 | 54 | 45 | 43 |
| Shirt (robe) | 53 | 3 | 50 | 50 | 41 |
| Wrist (bracers) | 41 | 1 | 40 | 40 | 25 |
| Glasses | 28 | 3 | 25 | 23 | 21 |
| Feet (boots) | 27 | 2 | 25 | 25 | 20 |
| **all** | **3,397** | **82** | **3,315** | **2,221** | **1,039** |

728 obtainable blueprints have no display name (generic `Standard…`, `…PlusN` weapons and shields that take their name from the type), so they count in "not covered" but not in "distinct named". The weapon row includes `WeaponEmptyHand`, which obtainable-items.md already says to drop. Among usables, the Rust data covers 10 of the 1,148 reachable.

Coverage is thickest in belts (28 of 62) and headwear (31 of 104), the ability-score slots. Everything else is close to empty.

## 3. Weapons: does Rust `weapons/` cover the obtainable weapons?

Rust `weapons/` has 72 entries, one `BlueprintWeaponType` each, with 72 distinct `Category` values, plus a `planner/weapons/kinetic-blast` placeholder with no blueprint. The 2,182 obtainable weapons use 77 weapon types in 63 categories.

**Categories: covered except spiked shields.**

| Gap | Weapon type | Obtainable weapons | Stats | Notes |
| --- | --- | --- | --- | --- |
| `SpikedHeavyShield` | `SpikedHeavyShield` a1b85d048fb5003438f34356df938a9f | 11 | 1d6, ×2, one-handed | Bash weapon of spiked heavy shields (`m_WeaponComponent` of `DLC5_SunlessShieldItem`, the Hellknight heavy shields…), and loose `SpikedHeavyShieldPlusN` from random-encounter trash. Rust has only `heavy-shield-bash` (1d4). |
| `SpikedLightShield` | `SpikedLightShield` 98a0dc03586a6d04791901c41700e516 | 7 | 1d4, ×2, light | Bash weapon of spiked light shields (`TalionKeeperItem`, the Gowrow shields…), plus loose `+N` copies. Rust has only `light-shield-bash` (1d3). |
| no category | `1e460a2dc830cf546939b2723aa875e7`, not in the dump | 1 | — | `ArmagsBladeItem` ce0842546b73aa34b8fcf40a970ede68 (dungeon) points at a weapon type the dump doesn't hold. A dump gap, not a Rust one, but our importer will have to special-case it. |

**Types: 15 more types sit inside covered categories but aren't cited by Rust.** Rust keys weapons by type GUID, so a lookup by an item's `m_Type` misses these:

| Type | GUID | Obtainable weapons | Differs from the Rust type of its category |
| --- | --- | --- | --- |
| `CompositeLongbow` | 1ac79088a7e5dde46966636a3ac71c35 | 34 | Same dice and crit; adds the `StrengthComposite` enchantment |
| `CompositeShortbow` | 011f6f86a0b16df4bbf7f40878c3e80b | 17 | Same |
| `DwarvenUrgroshSpearHead` | c4e95e3c489721e4382fd8514a522f9d | 32 | The urgrosh's second end (`m_SecondWeapon`): 1d6 ×3, against the head's 1d8 ×3 |
| `GnomeHookedHammerHook` | 018ad48ffd3460d47900491656d2ff26 | 31 | The hooked hammer's second end: 1d6 ×4, against the head's 1d8 ×3 |
| `DCL2_Bardiche_Rusty`, `DLC2_Dagger_Rusty`, `DLC2_Flail_Rusty`, `DLC2_Longsword_Rusty`, `DLC2_Shortsword_Rusty` | 746d652ff6d444239a867f3037fe4f22, 90ba10e82a7a4135bb380234a255f5ae, d88579a82e3a40979804472ba6d83e36, f222f63bf92d4a43afded2f184cdcbb5, bfaf9d2cb3d342b8808bb12b4b36d841 | 1 each | Same stats; no type name of their own |
| `DCL2_LightCrossbow_Fake`, `DLC2_Shortspear_Fake2`, `DLC2_Shortsword_Fake` | a9a9a907dc704e1ca13f1b7714e3c172, fafab7412f4847879eb36a292cd93b8e, e531187e84cd4000be34f8d32fd9e864 | 1 each | Same stats |
| `DLC2_Shortbow_Fake` | 43f8474e1ef9456a9eec66eaed2b2737 | 1 | Crit ×2 instead of ×3 |
| `TorchType` | cf47423b22cbc2641ab5599adc1d1ce7 | 1 | Club category, but 1d3 with a fire-damage enchantment and no fighter group (`StandardTorch`) |
| `EmptyHand` | a8b38f6b734daa44087ec0ec2e80c1cd | 1 | `WeaponEmptyHand`, natural; drop it as obtainable-items.md says |

The orc double axe and two-bladed sword use one type for both ends, so they need nothing extra.

**Rust types no obtainable weapon uses** (13): `bite`, `bomb`, `claw`, `gore`, `hoof`, `rays`, `slam`, `spike`, `tail`, `talon`, `touch-attacks`, `unarmed-strike`, `wing`. These are natural, spell and bomb attacks. That's expected: they serve features, not gear. Categories on weapon types that neither Rust nor any obtainable weapon has: `OtherNaturalWeapons`, `Sting`, `Tentacle` (natural), and `KineticBlast` (Rust's placeholder).

**Verdict.** At category level the Rust data covers every obtainable weapon except the two spiked-shield bash categories (18 weapons) and Armag's Blade, whose type the dump lacks. At type level, composite bows (51 weapons) and the second ends of the urgrosh and hooked hammer (63) are the gaps that matter. The bows only add a Strength-to-damage enchantment. The second ends have their own dice and crit. The DLC2 rusty and sham copies and the torch are one-offs.

## Limits

- Reachability, the leftover categories, and their blind spots (no scene data, one-step reachability) are those of obtainable-items.md.
- The `colossus-ring` source is an inference: the dump shows a scene-placed, lootable boss wearing it. It can't show that the fight happens or that the body is lootable at that point.
- Name matching used the game's English display names, resolved from the dump's localisation chunk in the scratchpad. Only item names appear here.
