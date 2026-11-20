// The typed env schema (probed by the plugin from the project root). The planner reads no variable yet: the MCP and
// the UI need none. `server` vars come through `virtual:solid-env/server`, read from process.env at boot; `client`
// vars carry the VITE_ prefix and are baked into the bundle.
export default {
  server: {},
  client: {},
};
