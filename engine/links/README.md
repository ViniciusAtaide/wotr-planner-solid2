# Synergy links

Which blueprints build on which. This feature works out the prerequisite-chain kind of Synergy link (map 09, build ticket 05): "this needs" and "this enables", read from P (prerequisites) and G (grants). Ticket 06 adds the topic kinds that the data already holds: ability score, weapon category, spell school, and the "won't stack" warning (`topics.ts`). Energy type and the descriptor list wait until the importer keeps the components that name them.

## Public entry

- `linkIndex(data, G?)`: the chain links of every blueprint, built once per data and cached on it.
- `LinkIndex`: the index it returns, with two lookups:
  - `needs(guid)`: the shown blueprints that `guid`'s prerequisites require.
  - `enables(guid)`: the shown blueprints that require `guid`, or require something `guid` grants.

- `topicsOf(data, guid, param?)`, `Topic` and `topicKey`: what a blueprint is about.
  - An ability score its stat bonuses raise (`AddStatBonus`, `AddStatBonusIfHasFact`, `AddContextStatBonus`) or that it replaces (`ReplaceStatBaseAttribute`).
  - An ability score its prerequisites ask for above the average 10. The game's many "Intelligence 3" prerequisites only keep animals out, so they aren't a link.
  - A weapon category its prerequisites name (`PrerequisiteParametrizedFeature`, `PrerequisiteConditionForWeaponCategory`) or its proficiencies grant.
  - The weapon category, spell school or skill a parametrized pick was taken for (its parameter).
- `bonusesOf(data, guid)` and `StatBonus`: its stat bonuses, by stat and bonus type.
- `stackable(descriptor)` and `STACKING_DESCRIPTORS`: whether bonuses of that type stack. This ports the game's `ModifierDescriptorHelper.IsStackable` (`cites.ts`). Any other type counts once per stat, the highest.
- `heldIndex(data, held)` and `synergyOf(data, index, option)`, returning a `Synergy`:
  - **`shared`:** the topics the option shares with facts the character holds, each with those facts;
  - **`wontStack`:** its non-stacking bonuses that a held fact already gives the same stat with the same type ("won't stack", map 09).

  S puts it on every shown picker option, and the MCP words it.

## Rules

- **Needs.** A blueprint needs every blueprint its `requires` prerequisites name, kept to the ones the game shows.
- **Enables.** A blueprint enables every blueprint whose prerequisites require it, or require a fact it grants. The grants are G's, with removals left out, and a blueprint never enables itself.

Neither rule ports a game method: the links are the planner's own reading of P and G, so this feature has no citations.

## Design notes

- Only shown blueprints are indexed, so a link never points at something the game never names (map 19).
- `describe` (engine/describe) and the MCP's `options`, `synergies` and `compare` read this index; the MCP's "builds on" badges are a slot option's `needs` that the Build already holds.
