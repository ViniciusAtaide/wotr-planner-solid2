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
