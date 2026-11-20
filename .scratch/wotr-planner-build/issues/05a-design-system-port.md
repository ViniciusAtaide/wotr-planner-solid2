# Port the design system into the app

Status: open
Blocked by: none (05's MCP checkpoint is in)
Plan: [plan](../plan.md)

## Goal

The UI that ticket 05 builds gets its look from one place: the "Worldwound Planner" design system (user, 2026-11-20: dark fantasy, dark-first). It's published at https://claude.ai/artifact/AZQZrmccbjpqzALbFzkugb. Its files, as published, are copied in [design-system/](../design-system/): `README.md` (the brand book), `tokens.json`, `tokens.css`, `components/bundle.css`, and each component's `README.md` and `preview.html`. Read the brand book and every component README first. They are the spec.

## Scope

- **Tokens.** `src/styles/tokens.css` holds the design system's `tokens.css`, unchanged in values:
  - dark on `:root` and `[data-theme="dark"]`, light under `[data-theme="light"]`;
  - `<html>` starts with `data-theme="dark"`;
  - a header toggle switches the theme and remembers it in `localStorage`, guarded with try/catch.

  This file is the only place a color, font stack, space or radius is written. Everything else uses its custom properties.
- **Component styles.** `src/styles/components.css` holds `components/bundle.css`, keeping the `ww-` classes and the Google Fonts import.
- **Solid 2 components.** One per design component, in `src/components/design/`, each rendering exactly the markup its README and preview show:
  - Timeline: `LevelRow` (with its pick chips) and `RankMarker`;
  - Picker: `PickerOption`, `Refusal`, `Badge` and `PickerSheet`;
  - Edits: `CascadePreview` and `Button`;
  - Build: `ShareLink`, `CompareToggle`, `StatBlock` and `Kbd`.

  Props carry the data the README says "the consumer provides". The components hold no engine logic: Refusal text comes in as R's strings, and statuses come from S. Follow `AGENTS.md`: Solid 2 is neither React nor Solid 1.x.
- **A gallery at `/design`.** It renders every component in the states its preview shows, with the same example content, plus a theme toggle, so the port can be checked against the published system side by side. Keep it in the app as the living reference.
- **The template's look goes:** `src/App.css`, `src/logo.svg`, and any template styling `src/Document.tsx` or `src/App.tsx` carry. The template's demo routes are ticket 05's to remove (map 13's amendment), but this ticket may remove them too if they get in the way.
- **A check that holds the rule:** a client test fails when a file under `src/` other than `src/styles/tokens.css` contains a hex, `rgb(`, `hsl(` or `oklch(` color literal.

## Done when

- `/design` shows all 12 components in their preview states, in both themes, matching the published previews.
- Keyboard focus shows the 2px `focus` ring on every control in the gallery.
- At 375px wide, the gallery has no horizontal scroll and `PickerSheet` fills the width.
- The color-literal check passes, and fails on a planted literal.
- A render test for at least `PickerOption` (open, closed with its Refusal, gear-dependent) and `CascadePreview`.
- `bun run check` passes, and the work is one commit by path through the hook. Don't push; the coordinator pushes.
- `Status: done` and an `## Outcome` listing each component and any departure from the published system, with its reason.
