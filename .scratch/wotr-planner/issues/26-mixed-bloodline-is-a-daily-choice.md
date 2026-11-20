# Mixed Bloodline is a daily choice

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

The Mixed-Blooded Bloodrager (`MixedBloodRagerArchetype` 10d92d54d19e4a59b5bbd4259ec0974f) gets `MixedBloodlineFeature` 2c2283f5735d4e278f4088d9ff90edbb at Bloodrager level 1 and `MixedBloodlineFeature2` cd9ba53d5b144fd4aad4fc6b717ecd50 at level 4, both through the archetype's `AddFeatures`. Each gives an ability (`MixedBloodlineAbility` 352b4e8bb5ca4301b6e6084304a86546, `MixedBloodlineAbility2`) whose `AbilityApplyFact` applies one of 21 "wandering" bloodline features, and only while the character holds none of them (`m_Restriction: CasterHasNoFact`). The Rust planner marked it a daily choice. Is it one, like the [wandering spirit](24-wandering-spirit-is-a-daily-choice.md)?

## Answer

User, 2026-11-19, revised the same day. **A daily choice, not part of a Build**, like the [wandering spirit](24-wandering-spirit-is-a-daily-choice.md).
- The first answer was "an archetype choice, part of the Build". Checking the game reversed it:
  - `UnitLogic/UnitHelper.cs Replenish` refills every ability resource on rest, so the ability can be used again each day.
  - `UnitLogic/Abilities/Components/AbilityApplyFact.cs Apply` removes this ability's previous pick before applying the new one.
  - The Fextralife wiki's Mixed Bloodline page also describes it as chosen once per day.
- The archetype grants the two abilities at Bloodrager levels 1 and 4 (`AddFeatures`). No Mythic feat is involved.
- The importer holds the abilities as choice carriers (an `abilities` kind), so G sees the 21 bloodline features as their options.
