# After first use: summaries, more links, the published site

Status: open
Blocked by: 05
Plan: [plan](../plan.md)

## Goal

The polish that waits until the planner is in use. Split this ticket up when it starts, if that helps.

## Scope

- **Summaries** ([ADR 0001](../../../docs/adr/0001-generated-summaries-not-game-text.md), [How Summaries are generated](../../wotr-planner/issues/10-generating-summaries.md)):
  - label the top 50 component types, chosen from the importer's report, each with a role and a sentence template in our own words;
  - hand-written summaries, one file per GUID, with a fingerprint that the load check flags when stale.
- **The other Synergy link kinds** ([Synergy link kinds](../../wotr-planner/issues/09-synergy-link-kinds.md)):
  - ability score;
  - weapon category or group, including the weapon or school chosen for a parametrized pick;
  - spell school;
  - energy type;
  - a short, hand-picked descriptor list;
  - the "won't stack" warning for a shared bonus type.

  There are no critical-hit, flanking or condition links.
- **Yaniel's Radiance at +4 and +6** (from ticket 02g, coordinator, 2026-11-20). The Holy Avenger and Bane Living items at each bonus are different items in play, as Finnean's stages are ([map 29](../../wotr-planner/issues/29-telling-gear-items-apart.md)'s amendment). They stay twins because the enchantments that tell them apart aren't kept. Keep what tells them apart (cited), so they split under rule 3 or take an override. Nothing a Build holds differs between them, so this can't make a Build impossible, and it waits until after 05.
- **The static site** ([Hosting](../../wotr-planner/issues/17-hosting.md)): server rendering off, the data document saved as a file, published on GitHub Pages with the OGL notice and its Section 15 credit.

## Done when

- Each of the top 50 component types has a label, and a test produces its sentence from a real blueprint.
- Links of every listed kind appear on the gold builds where the data supports them.
- The static build works from GitHub Pages with no server, Share links included, and shows the OGL notice.
