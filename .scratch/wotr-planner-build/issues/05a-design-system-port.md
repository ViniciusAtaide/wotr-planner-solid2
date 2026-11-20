# Port the design system into the app

Status: done
Session: ticket-03c-walk-fixes
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

## Outcome

2026-11-20. One commit.

**Ported**
- `src/styles/tokens.css` holds the published `tokens.css` with its values unchanged, under a header comment. It is the only file under `src/` that writes a color: `src/styles/colors.test.tsx` fails on any hex, `rgb(`, `hsl(` or `oklch(` elsewhere, and a planted literal of each kind is caught.
- `src/styles/components.css` holds `bundle.css` unchanged, with its `ww-` classes and the Google Fonts import.
- `src/styles/app.css` is the page around the components (the ground, the header, the gallery's grid, links), written in tokens only.
- **Themes:** `<html data-theme="dark">`. A header toggle (`src/components/ThemeToggle.tsx`) switches between "Worldwound" and "Parchment" and remembers the choice in `localStorage` under try/catch. `public/theme.js` applies the remembered theme before the first paint.
- **The 12 components** in `src/components/design/`:
  - `LevelRow` (with `Timeline` and `PickChips`) and `RankMarker`;
  - `PickerOption` (with `OptionList`, `PickerHead` and `ClosedCount`), `Refusal`, `Badge` and `PickerSheet`;
  - `CascadePreview` and `Button`;
  - `ShareLink`, `CompareToggle`, `StatBlock` and `Kbd`.

  Each renders its preview's markup from props, with no engine logic.
- **The gallery at `/design`** shows every component in its preview's states, with the same content.
  - Checked in the browser in both themes.
  - At 375px there is no horizontal scroll, and the sheet fills the content width.
  - Tabbing through every control showed the 2px `focus` ring, offset 2px, on each. The one exception was the dev server's own Solid devtools button, which isn't part of the app.
- **Render tests** (`design.test.tsx`): `PickerOption` open, closed with its Refusal, and gear-dependent; `CascadePreview`'s list, its count label, and Esc.
- **The template went:** `App.css`, `logo.svg`, the users routes and API, `lib/users.ts`, `Counter`, `server/session.ts`, `server/db.ts` and their test (map 13's amendment), with `SESSION_SECRET` (`env.ts`, `.env.example`, the README's setup line). The MCP needs none of them.

**Departures from the published system, each with its reason**
- `LevelRow` takes the class name as `characterClass`: the Solid lint refuses a component prop named `className`.
- `RankMarker` wraps its title and picks in `.ww-level__body`, so the picks sit under the title as its README asks (the preview has none).
- A selected `PickerOption` adds `aria-current="true"`, so the selection isn't shown by color alone.
- `Refusal` sets a trailing "(yours: …)" apart in `.ww-refusal__have`, as the preview does, without changing R's words.
- `CascadePreview` takes focus when it opens, so Esc and Tab reach it. The gallery turns that off (`autofocus={false}`) so the page doesn't scroll to it.
- `ShareLink`'s button reads "Link copied." after copying, which is where its README puts the confirmation.
- `Kbd` hints are hidden under `(pointer: coarse)` in `app.css`, as its README asks. The bundle itself is unchanged.
- The gallery wraps `CompareToggle` in a block, as the preview does, so the segments keep their own width inside a flex card.
- The **Cover** card isn't ported. It isn't one of the 12 components, and its fixed 960px width can't fit a phone.
