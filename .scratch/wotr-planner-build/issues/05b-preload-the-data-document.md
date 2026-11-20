# Preload the data document

Status: open
Blocked by: 05 (the UI that fetches the document); runs after the user's queued review work (user, 2026-11-20)
Plan: [plan](../plan.md)

## Goal

The browser starts downloading the data document with the HTML, not after the page's script has run (user, 2026-11-20). Ticket 05 serves `data/` as one content-hashed static asset (`vite/data-document.ts`, map 13's amendment), and `src/planner/engine.ts` fetches it once the planner mounts. Until that fetch starts, the planner waits on about 1 MB gzipped that could already be in flight.

## Scope

The rearchitecture (`baf59949`, ADR 0008) moved files into feature folders after this ticket was written: find the data-document plugin under `vite/data-document/` and the planner's fetch under `src/planner/`, and keep to the declared import edges.


- `src/Document.tsx` adds `<link rel="preload" href={dataPath} as="fetch" type="application/json" crossorigin="anonymous">` in `<head>`, with `dataPath` from `virtual:data-document`, so dev and the build name the same hashed file.
- The fetch in `src/planner/engine.ts` uses the same URL and credentials mode as the preload (`crossorigin` must match), so the browser reuses the preloaded response instead of downloading twice.
- Nothing else changes. The document stays a static asset, with no server function or API route (ADR 0004, map 13). The walk still runs in the browser.

## Done when

- In the built app (`bun run build && bun start`), the network panel shows the document requested once, starting with the HTML, and the planner's fetch is served from the preload with no second request and no "preloaded but not used" warning.
- The same holds under `bun run dev`.
- `bun run check` passes, and the work is one commit by path through the hook. Don't push.
- `Status: done` and an `## Outcome`, with the request timing before and after.
