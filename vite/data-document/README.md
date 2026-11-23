# Data document

The Vite plugin that serves the data document (ADR 0004; map 13's amendment; build ticket 05): the committed `data/`
as one content-hashed JSON file, which the browser fetches once and walks itself. Since build ticket 05c the file is
the compact document `engine/compact` encodes (shape tables, GUIDs once, the allowlist's defaults dropped, no file
wrappers); its README describes the format.

## Public entry

`index.ts` exports `dataDocument`, the plugin. Its runtime imports keep the `.ts` extension, for Vite's native config
loader.

## Design notes

- The build emits the document as a static asset named by its content's hash (`assets/data-<hash>.json`), and the
  dev server answers the same path. The path the app fetches starts with Vite's `base`, so the static site serves it
  under `/wotr-planner-solid2/` like any other asset.
- `virtual:data-document` exports that path; the planner's engine loader fetches it.
- Only the client's static assets hold the document: the server never fetches it.
