# Synergy links

Which blueprints build on which. This feature works out the prerequisite-chain kind of Synergy link (map 09, build ticket 05): "this needs" and "this enables", read from P (prerequisites) and G (grants). Ticket 06d adds the topic kinds (`topics.ts`): ability score, weapon category or group, spell school, energy type, a short descriptor list, and the "won't stack" warning.

## Public entry

- `linkIndex(data, G?)`: the chain links of every blueprint, built once per data and cached on it.
- `LinkIndex`: the index it returns, with two lookups:
  - `needs(guid)`: the shown blueprints that `guid`'s prerequisites require.
  - `enables(guid)`: the shown blueprints that require `guid`, or require something `guid` grants.
- `enablesWith(data, guid, param, G?)`: what a value of a parametrized pick enables. A dependent whose prerequisite fixes another value (Aldori Swordlord: Weapon Focus with a dueling sword), or a weapon subcategory the value's weapon isn't in (Fencing Grace: one-handed piercing), is left out, so Weapon Focus (Bardiche) enables neither (QA pass 4). Without a parameter it is `enables`.

- `topicsOf(data, guid, param?)`, `Topic` and `topicKey`: what a blueprint is about.
  - An ability score its stat bonuses raise (`AddStatBonus`, `AddStatBonusIfHasFact`, `AddContextStatBonus`) or that it replaces (`ReplaceStatBaseAttribute`). A Racial bonus isn't one: a race's or heritage's +2 is no Synergy with every feat that needs the score (QA pass 4).
  - An ability score its prerequisites ask for above the average 10. The game's many "Intelligence 3" prerequisites only keep animals out, so they aren't a link.
  - A weapon category its prerequisites name (`PrerequisiteParametrizedFeature`). Proficiencies aren't weapon topics: one grants 16 to 56 weapons and floods every Weapon Focus option. Nor is `PrerequisiteConditionForWeaponCategory`, a gate on special parameters (tentacle, sting, ray…) that says nothing of the feat's weapon (MCP QA).
  - The weapon category, spell school or skill a parametrized pick was taken for (its parameter). A weapon category also brings the fighter groups its weapon types belong to (`weaponGroupsOf`), marked `fromWeapon`. Such a group links only to a group-based pick (Weapon Training, a group bonus), never to another weapon's group: Weapon Focus (Dagger) shares thrown weapons with Weapon Training (Thrown), but Weapon Focus (Longsword) shares nothing with Improved Critical (Falchion), though both are heavy blades (QA pass 4). `HeldIndex.byWeaponGroup` keeps those groups apart.
  - A weapon group its group bonuses name (`WeaponGroupAttackBonus`, `WeaponGroupDamageBonus`), and the weapon and ability a damage-stat replacement names.
  - A spell school its school saves, DCs and caster levels name.
  - An energy type its resistances, immunities and vulnerability name, or that its spell descriptors name (fire, cold, acid, electricity, sonic: an Elemental Focus, a draconic arcana).
  - A descriptor from the short hand-picked list (`LINKED_DESCRIPTORS`, map 09: fear, mind-affecting, compulsion, charm, emotion, poison, disease, death, sleep, paralysis and curse) that its saves, immunities, DCs, caster levels or arcana name. Other descriptors aren't links.
  - **Sides:** a school, energy or descriptor topic is either about your own spells (DCs, caster levels, an arcana, a school parameter) or marked `against`: saves, immunities, resistances and vulnerability that defend you from it. A topic links only to the same side, so Spell Focus (Enchantment) shares nothing with Elven Immunities' saves against Enchantment, but does share with Improved Elven Immunities, which also raises Enchantment DCs (QA pass 5). The `against` side reads "saves against Enchantment spells", "defences against fear effects" and "defences against fire".
- `weaponGroupsOf(data, category)`: the fighter groups of a weapon category, gathered from the weapon types the data holds.
- `linkNames(data, guids)`: the names a link list shows: each blueprint's bare name, each distinct name once. A link never shows a qualifier, so a selection's "(with Dodge)" stays out of Dodge's links (QA pass 4).
- `topicWords(topic)`, `sharedWords(data, shared)` and `stackWords(data, clash)`: the Synergy words, one source for the planner and the MCP: "Shares fire with Elemental Focus", "Its insight bonus to Strength won't stack with …". Names come from `linkNames`. When both bonuses are fixed numbers, `stackWords` adds which one counts: "…won't stack with Ring of Protection +1; the higher, +3, counts", or "both are +1, so only one counts" (QA pass 5).
- `words`, `GROUP_WORDS` and `descriptorWord`: the plain words for identifiers, weapon groups and spell descriptors that the Synergy words and describe's labels share.
- `spellDescriptors(wrapper)` and `SPELL_DESCRIPTORS`: the names of the spell descriptor flags a 64-bit `SpellDescriptorWrapper` sets, read as an unsigned 64-bit number so the sign bit (`AnomalyDistortion`) counts.
- `bonusesOf(data, guid)` and `StatBonus`: its stat bonuses, by stat and bonus type: `AddStatBonus`, `AddStatBonusIfHasFact`, `AddContextStatBonus`, and an item enchantment's `AddStatBonusEquipment`, `IncreaseStatEquipment` and `AllSavesBonusEquipment` (all three saves). Each carries its `value` when the game's value is a fixed number (a plain `Value`, or a `Simple` context value, times `AddContextStatBonus`'s `Multiplier`); a rank- or property-based value has none. `highestOf` is the highest of some values, or none when any is unknown; `clashOf` builds a `StackClash` with the option's `value` and the highest `held` one when both are known.
- `stackable(descriptor)` and `STACKING_DESCRIPTORS`: whether bonuses of that type stack. This ports the game's `ModifierDescriptorHelper.IsStackable` (`cites.ts`). Any other type counts once per stat, the highest.
- `heldIndex(data, held)` and `synergyOf(data, index, option)`, returning a `Synergy`:
  - **`shared`:** the topics the option shares with facts the character holds, each with those facts;
  - **`wontStack`:** its non-stacking bonuses that a held fact already gives the same stat with the same type ("won't stack", map 09).

  S puts it on every shown picker option, and the MCP words it.

## Rules

- **Needs.** A blueprint needs every blueprint its `requires` prerequisites name, kept to the ones the game shows.
- **Enables.** A blueprint enables every blueprint whose prerequisites require it, or require a fact it grants. The grants are G's, with removals left out, and a blueprint never enables itself.

Neither rule ports a game method: the chain links are the planner's own reading of P and G. The topic kinds cite where the game reads what they link on (`cites.ts`): the descriptor flags, a weapon type's groups, a group bonus's group, a descriptor DC's descriptors and a resistance's energy.

## Design notes

- Only shown blueprints are indexed, so a link never points at something the game never names (map 19).
- `describe` (engine/describe) and the MCP's `options`, `synergies` and `compare` read this index; the MCP's "builds on" badges are a slot option's `needs` that the Build already holds.
