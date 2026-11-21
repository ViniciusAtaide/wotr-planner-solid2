# The other Synergy link kinds

Status: done
Session: ticket-03c-walk-fixes
Blocked by: none for the data-ready kinds; 06a for energy and descriptors
Parent: [06](06-after-first-use.md)
Plan: [plan](../plan.md)

## Goal

The link kinds of [map 09](../../wotr-planner/issues/09-synergy-link-kinds.md), exposed through S and the MCP's `synergies`:
- ability score;
- weapon category or group, including a parametrized pick's weapon;
- spell school, including a parametrized pick's school;
- energy type;
- a short descriptor list;
- the "won't stack" warning.

## Progress

- **`6b14a569`, from data already kept:** ability score, weapon category, spell school and "won't stack".
  - engine/links `topics.ts` reads the topics, and `stackable` ports `ModifierDescriptorHelper.IsStackable`.
  - S puts `synergy` on picker options, and the MCP words it as `shares` and `wontStack`.
  - Tested on real data and on both gold Builds.
- **After 06a (this commit):** energy type, the descriptor list and weapon group, read from the Summary carriers.

## Outcome

- **All six kinds of map 09** are read by engine/links' `topicsOf`: ability score, weapon category or group, spell school, energy type, the short descriptor list (`LINKED_DESCRIPTORS`: fear, mind-affecting, compulsion, charm, emotion, poison, disease, death, sleep, paralysis, curse), and "won't stack".
- **Groups:** a parametrized pick's weapon category brings its fighter groups (`weaponGroupsOf`, from the weapon types `data/` holds). So Weapon Focus (Dagger) shares thrown weapons with Weapon Training (Thrown).
- **Energy** comes from resistances, immunities and vulnerability, and from the energy bits of spell descriptors (Elemental Focus, draconic arcana). Descriptor decoding (`spellDescriptors`) moved from engine/describe to engine/links, which describe already depends on.
- **The MCP** words the new kinds in `shares` ("thrown weapons, like Weapon Focus", "fire, like …", "mind-affecting effects, like …").
- **Tests:** each new kind on a real blueprint, the Dagger-to-group link through `synergyOf`, and Jack's pickers now showing ability, descriptor, energy, school and weapon links.
- **The UI:** `Topic` gains the `group`, `energy` and `descriptor` kinds (the UI session has the shape).
