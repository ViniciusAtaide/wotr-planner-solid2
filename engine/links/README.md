# Synergy links

Which blueprints build on which. This feature works out the prerequisite-chain kind of Synergy link (map 09, build ticket 05): "this needs" and "this enables", read from P (prerequisites) and G (grants). The other kinds of link (same weapon, spell school, energy type and so on) come in ticket 06.

## Public entry

- `linkIndex(data, G?)`: the chain links of every blueprint, built once per data and cached on it.
- `LinkIndex`: the index it returns, with two lookups:
  - `needs(guid)`: the shown blueprints that `guid`'s prerequisites require.
  - `enables(guid)`: the shown blueprints that require `guid`, or require something `guid` grants.

## Rules

- **Needs.** A blueprint needs every blueprint its `requires` prerequisites name, kept to the ones the game shows.
- **Enables.** A blueprint enables every blueprint whose prerequisites require it, or require a fact it grants. The grants are G's, with removals left out, and a blueprint never enables itself.

Neither rule ports a game method: the links are the planner's own reading of P and G, so this feature has no citations.

## Design notes

- Only shown blueprints are indexed, so a link never points at something the game never names (map 19).
- `describe` (engine/describe) and the MCP's `options`, `synergies` and `compare` read this index; the MCP's "builds on" badges are a slot option's `needs` that the Build already holds.
