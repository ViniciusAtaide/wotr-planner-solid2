# Shell

The app frame around every page (build ticket 05a): the ground, the header with the app's name linking home, the
loading fallback while a page's data arrives, and the footer with the Open Game License credit. Under 600 px the
header's name reads "WP" (its accessible name stays "Worldwound Planner"), so a phone's top bar isn't crowded (build
ticket 11). The header is three columns: the name, a centre slot (`#app-header-center`) a page may fill (the planner
puts the Build's name there through a `Portal`), and an empty end column that keeps the slot centred.

## Public entry

`index.ts` imports `app.css` and exports `Shell` (`ShellProps`: `home`, the header link's target, and the page as
`children`). `Shell.tsx` also exports `LICENCE_PATH`, the licence's address, for its test.

## Design notes

- `app.css` styles the page around the components: the ground, the header and the page padding. Every value is a
  token from the design system's `tokens.css`; component looks stay in its `components.css`.
- Links read as text with a hairline underline, because gold stays for the primary action and the selected pick.
- The footer is one muted line under every page (map 17): who the mechanics come from, that the planner is a fan tool,
  and a link to `public/open-game-license.txt`, the licence with its designation and Section 15. The link is named
  under Vite's base, so it works at `/` and under the static site's `/wotr-planner-solid2/`. The test checks the
  credit, the link and the licence file's key lines.
