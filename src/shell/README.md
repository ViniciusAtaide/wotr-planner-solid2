# Shell

The app frame around every page (build ticket 05a): the ground, the header with the app's name linking home, and the
loading fallback while a page's data arrives. Under 600 px the header's name reads "WP" (its accessible name stays
"Worldwound Planner"), so a phone's top bar isn't crowded (build ticket 11). The header is three columns: the name,
a centre slot (`#app-header-center`) a page may fill (the planner puts the Build's name there through a `Portal`),
and an empty end column that keeps the slot centred.

## Public entry

`index.ts` imports `app.css` and exports `Shell` (`ShellProps`: `home`, the header link's target, and the page as
`children`).

## Design notes

- `app.css` styles the page around the components: the ground, the header and the page padding. Every value is a
  token from the design system's `tokens.css`; component looks stay in its `components.css`.
- Links read as text with a hairline underline, because gold stays for the primary action and the selected pick.
