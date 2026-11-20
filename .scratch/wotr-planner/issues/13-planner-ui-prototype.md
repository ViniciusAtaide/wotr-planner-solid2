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
