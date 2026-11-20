/// <reference types="vite/client" />
/// <reference types="@solidjs/vite-plugin/boundary-modules" />
/// <reference types="../file-routes.d.ts" />

declare module 'virtual:data-document' {
  const path: string;
  export default path;
}
