# Planner UI for fast exploration

Type: prototype
Status: resolved
Blocked by: 11
Parent: [map](../map.md)

## Question

How should the planner look and behave so a user can try ideas quickly without ever reaching an impossible state? Prototype the proposed shape and react to it:
- a Timeline of level rows, with Mythic ranks at their Rank levels;
- a side picker: open options first, closed ones greyed out with their Refusal, Synergy badges;
- Cascade edits show a preview before applying; other picks apply instantly;
- undo/redo, fork and compare two Builds;
- keyboard first.

Decide also how it behaves on a phone.

## Answer

Coordinator, 2026-11-20, on the user's standing instruction to answer the simpler open tickets itself. No separate prototype is built. Build ticket 05 builds the UI to this shape, and the user reacts to the real thing.

- **The shape as proposed above,** unchanged:
  - the Timeline of level rows, with Mythic ranks at their Rank levels;
  - the side picker: open options first, closed ones greyed out with their Refusal and Synergy badges;
  - picks apply instantly, and only a Cascade edit previews;
  - undo/redo, fork and compare;
  - keyboard first.
- **On a phone:** one column. The Timeline fills the screen, and the picker opens as a full-screen sheet over it, closed by a back gesture or button. Compare shows one Build at a time, with a toggle between them. Every action keeps a tap target, since there's no keyboard.
- **Why no prototype:** every piece of the shape is already settled elsewhere (Refusal, Cascade edit, Synergy link, Share link). A throwaway prototype would cost a session and teach less than ticket 05's first build, which runs on real data.

## Amendment: how the UI is built (build ticket 05)

Coordinator, 2026-11-20, on ticket 05's questions and the user's standing instruction:
- **The data document:** a small Vite plugin emits `{ files, overrides }` at build time as one content-hashed static asset, and serves the same in dev. The page fetches it once and runs `loadData` and the walk in the browser (ADR 0004). No API route is needed, so the same build works as ticket 06's static site. Measured: 7.3 MB raw, 1.02 MB gzip, 0.55 MB brotli; loading takes 79 ms and building G 16 ms.
- **The Solid template's demo goes:** the users routes, `routes/api/users.ts`, the counter, and `server/session.ts` and `server/db.ts` with their test, unless the MCP route needs one of them.
- **One page:** the planner at `/`, with the Build in `#b=<code>`. Undo and redo walk a history of Builds, each one codable, fork opens the current code beside it, and compare shows the two sheets side by side. On a phone it is one column, with the picker as a full-screen sheet.
- **Styling** comes from the design system ("Worldwound Planner": dark fantasy, dark-first), ported into `src/` before the UI is built.

## Amendment: the levelling trail (user, 2026-11-21)

The UI built by ticket 05 was reviewed twice (a Rust UI comparison and a pristine skills audit, `ui-findings-combined.md` in the session notes). It scored 3/10 and cost about 438 clicks for a full Build. The user asked for a remake that is mobile first and has flavor: planning should feel like walking the character's path. A throwaway prototype (branch `ticket/prototype-levelling-flow`) tried four shapes, and the user picked **D, the trail with chips**:

- **The character card:** race, alignment, scores with their +2, and the character-wide picks.
- **The trail:** a stop per level, with every pick a chip that a tap opens in place. Mythic ranks are their own stops, and every 4th level is a milestone.
- **The flow:** the next step opens in place, each pick advances, and the next level is "Continue as <class>" in one tap. Small choices are buttons, lists are open with a filter, skills have a budget and "Same as before".
- **On phones,** the character card and finished chapters of four levels fold by themselves. From 900 px wide nothing folds.

This replaces the Timeline-plus-side-picker shape and its full-screen phone sheet. Refusals in lists, instant picks, the Cascade preview, undo, and fork and compare stay. Undo becomes a single line naming the last change, plus the keyboard. Fork, Share link and Export move into a menu. Built by build ticket 07.

## Amendment: inline or modal choice lists (user, 2026-11-21)

The trail keeps its choices inline by default. A ⋯ menu setting switches to "Modal first", where each choice opens in a large dialog (full screen on a phone) with a detail pane. The user hasn't chosen a default beyond inline yet, and wants both to try; build ticket 10 builds the setting and measures both modes.

## Amendment: archetypes in the class list, an optional Human bonus feat, the deity on the card (user, 2026-11-22)

The user made these changes to the trail directly, and they were recorded after review:

- **An archetype is a class.**
  - One list holds the classes and their archetypes. An archetype's row reads "Archetype · Class", for example "Two-Handed Fighter · Fighter", with the class after the dot.
  - At a class's first level, the level editor offers the plain class and each of its archetypes. At later levels of that class, it offers only the variant held. Taking a row sets the class and its archetype as one change, and the plain row clears the archetype.
  - There is no separate archetype list and no "No archetype" row.
  - A level's stop, its "Continue as" button and its Undo line use the archetype's name when one is held, for example "Two-Handed Fighter 1". The Archetype chip is gone. This amends build ticket 07's decision B.
- **The Human bonus feat is an optional Level 1 pick.** *Reversed 2026-11-23 (below): it is required.*
  - It sits on Level 1 with that level's other chips, not on the character card. Its chip reads "Human bonus feat", and "Optional" until it is filled.
  - Auto-advance passes it by. Level 1 counts as done without it, so the card folds and the next level is offered.
  - The level's own feat stays required. This answers build ticket 07's question 1.
  - The game's `LevelUpState.IsComplete` doesn't finish a level while a selection can still be picked. The MCP's `next_slots` still lists the slot as open. So this is a planner choice, not the game's rule, and the UI and the MCP disagree on when such a Build is finished.
- **The deity sits on the character card under the race,** above the background and the alignment.
- **The card's head shows only while the card is folded** (phones under 900 px). An open card, or any card from 900 px wide, has no "The character" heading or summary line.
- **The race field's label is visually hidden.** Screen readers still announce it.

## Amendment: the Human bonus feat is required (user, 2026-11-23)

This reverses the 2026-11-22 amendment's optional Human bonus feat.

- **Every open slot is required.** A Human's bonus feat is required like the level's own feat. Its chip on Level 1 reads "Human bonus feat" and has no "Optional" mark. Auto-advance stops at it, and Level 1 isn't done while it's empty.
- **One rule for the planner and the MCP.** The planner has no special case for the slot. A level or rank is done when the engine lists no open slot at its place, by the same logic `next_slots` uses. So the planner and the MCP agree on when a Build is finished, as the game's `LevelUpState.IsComplete` does.
