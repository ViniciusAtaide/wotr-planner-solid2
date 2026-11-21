# The other Synergy link kinds

Status: in-progress
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
- **Waiting for 06a:** energy type, the descriptor list and weapon group.
