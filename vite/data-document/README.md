# Data document

The Vite plugin that serves the data document (ADR 0004; map 13's amendment; build ticket 05): the committed `data/`
as one content-hashed JSON file, `{ files, overrides }`, which the browser fetches once and walks itself.

## Public entry

`index.ts` exports `dataDocument`, the plugin. Its runtime imports keep the `.ts` extension, for Vite's native config
loader.

## Design notes

- The build emits the document as a static asset named by its content's hash (`/assets/data-<hash>.json`), and the
  dev server answers the same path.
- `virtual:data-document` exports that path; the planner's engine loader fetches it.
- Only the client's static assets hold the document: the server never fetches it.
