# MCP tool surface

Type: grilling
Status: resolved
Blocked by: 01, 06
Parent: [map](../map.md)

## Question

Which tools does the MCP expose, and what does each return? Proposed set:
- `start_build`
- `next_slots`
- `options`: each option's status, with the Refusal when closed
- `pick` and `cascade_pick`
- `synergies`
- `search`
- `explain`
- `sheet`
- `gear_options` and `equip`

The proposal has no "plan the whole build" tool: the agent works `next_slots` → `options` → `pick`. Also decide how much text each tool returns, so agents don't run out of context: pagination, and how closed options are summarised.

## Answer

User, 2026-11-19. The MCP keeps no state ([Where an MCP Build lives between calls](06-where-an-mcp-build-lives.md)). Every changing tool returns `{ code, build }` or a Refusal.

| Tool | Takes | Returns |
| --- | --- | --- |
| `start_build` | optional name | empty Build |
| `set_start` | code, race/subrace, point buy, racial stat, alignment, background, deity | new code or Refusal |
| `level_up` | code, class, archetype (first level only) | new code with the level's new slots, or Refusal |
| `next_slots` | code | open slots in walk order (level or rank, band, slot kind) |
| `options` | code, slot, optional text filter, page | open options first (25 per page, with summary and synergy badges); closed ones as counts by refusal reason, listed only with `include_closed` |
| `pick` | code, slot, option, parameter, `mode`: `strict` / `preview` / `cascade` | new code, or the Refusal, or (in `preview`) what a cascade would clear |
| `set_skills` | code, level, ranks | new code or Refusal |
| `place_rank` | code, Mythic rank, character level | new code (noting when it's off the Expected level) or Refusal |
| `equip` | code, place, item, `mode` | new code or Refusal |
| `synergies` | code, optional slot | options that link to what the Build holds, by link kind, plus "won't stack" warnings |
| `search` | text, optional kind | blueprints with GUID, name and summary line |
| `explain` | GUID | full summary, prerequisite tree, grants, where it can be picked |
| `sheet` | code, level | the numbers the walk already computes: ability scores, BAB, saves, HP, skill ranks, caster levels |
| `compare` | 2–4 codes, checkpoint levels | the sheet numbers side by side, Synergy link counts, warnings, and the first level where the Builds diverge |

- **Cascade:** it's a `mode` on `pick` and `equip`, not a separate tool.
- **Planning:** there's no whole-build planning tool. The agent brings the theme and works `next_slots` → `options` → `pick`.
- **Judging builds:** whether a Build is good is left to a Build review skill shipped with the MCP, which comes after the web app.

## Amendment: the table meets the game-shaped Build (build ticket 05)

Coordinator, 2026-11-20, on ticket 05's questions and the user's standing instruction:
- **`start_build` takes nothing.** A Build and its code hold no name, so an agent keeps its own labels.
- **`set_start` sets race, racial stat, point buy and alignment.** Subrace (the heritage selection), background and deity are level-1 picks in the Build, made with `pick` once `level_up` has made level 1, so the walk judges every slot.
- **Mythic ranks:** `level_up` with a Mythic class adds the next rank at its Expected level (ADR 0003), or after the last character level if that comes later. `place_rank` moves it. An archetype given to `level_up` applies at the class's first level.
- **`synergies` and `compare`** count only the prerequisite-chain kind until build ticket 06 adds the other kinds and the "won't stack" warning.
- **`sheet` leaves out HP.** The table promised only numbers the walk already computes, and the walk computes no HP. No prerequisite reads HP. Build ticket 06 may add it from the game's method.
- **`search`** is case-insensitive over shown names (map 19), with an optional kind from the data's `kindOf`. Each hit gives its GUID, name and the basic description's first line.
- **Transport:** the official `@modelcontextprotocol/sdk` serves `/mcp` (streamable HTTP) and the stdio wrapper. The tools are plain engine functions.
- **`level_up` takes an optional `increase`:** the ability score raised at levels 4, 8, 12… No other tool in the table could set it (build ticket 05).
