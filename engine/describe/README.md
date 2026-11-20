# Summaries

What the planner says about one blueprint. Until ticket 06 writes the Summaries, this feature gives the basic description of build ticket 05: what the data says of a blueprint, in our own words. That is its name, its prerequisites (worded by R), what it grants, where it can be picked, and its chain links. It never holds game text (ADR 0001, ADR 0006).

## Public entry

- `describe(data, guid, G?)`: a blueprint's basic description, or undefined when the data doesn't hold the blueprint or the game never shows it (map 19).
- `Description`: one blueprint, described.
  - `guid`, `name`, `kind`: which blueprint it is; the name is R's `nameOf`.
  - `summary`: the Summary, once ticket 06 writes it; `NO_SUMMARY` until then.
  - `prerequisites`: each prerequisite, worded by R.
  - `grants`: the shown facts it grants, each with the level it grants it at when the grant says so.
  - `pickedIn`: where it can be picked, that is the shown selections that list it.
  - `needs`, `enables`: its prerequisite-chain links (map 09), from engine/links.
- `NO_SUMMARY`: the placeholder text until a Summary is written.

## Rules

- **Prerequisites.** Each prerequisite is R's `unmetText` for that leaf, so the wording has one source. A leaf of group All keeps R's "Needs …"; a leaf of the other groups (Any, ForcedTrue), of which one would do, reads "Or: needs …".
- **Grants.** G's grants of the blueprint, less removals, less facts the game never shows, and less the grants that are really list membership (a selection's options, a class's archetypes): those are not what it grants but what can be picked in it.
- **Picked in.** The shown selections that list the blueprint among their options, each once.

None of these ports a game method, so this feature has no citations.

## Design notes

- The MCP's `explain` tool and its `search` and `options` results carry this description and its `NO_SUMMARY` placeholder.
