/// <reference types="vite/client" />
/// <reference types="@solidjs/vite-plugin/boundary-modules" />
/// <reference types="../file-routes.d.ts" />

/** The data document's path (vite/data-document.ts): `{ files, overrides }` as one content-hashed JSON file. */
declare module 'virtual:data-document' {
  const path: string;
  export default path;
}
