# Shell

The app frame around every page (build ticket 05a): the ground, the header with the app's name linking home, and the
loading fallback while a page's data arrives.

## Public entry

`index.ts` imports `app.css` and exports `Shell` (`ShellProps`: `home`, the header link's target, and the page as
`children`).

## Design notes

- `app.css` styles the page around the components: the ground, the header and the page padding. Every value is a
  token from the design system's `tokens.css`; component looks stay in its `components.css`.
- Links read as text with a hairline underline, because gold stays for the primary action and the selected pick.
