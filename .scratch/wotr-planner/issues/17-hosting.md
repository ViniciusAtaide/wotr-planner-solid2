# Hosting

Type: grilling
Status: resolved
Blocked by: 16
Parent: [map](../map.md)

## Question

Where does the Solid server with `/mcp` run? Local only, a home server, or a hosted platform (Node on a VPS, Fly, Render, Cloudflare)? Is a static UI build also wanted, for example on GitHub Pages like the Rust planner? How do agents reach the MCP: the stdio wrapper locally, or the hosted `/mcp` over the network? Publishing the site also needs the OGL notice and its Section 15 credit.

## Answer

User, 2026-11-19.

- **Published UI:** a static site on GitHub Pages, as the Rust planner does. Server rendering is off, and the content-hashed data document is saved as a file, so the planner and every Share link work with no server. The site carries the OGL notice and its Section 15 credit.
- **During development:** `npm start` serves the UI and `/mcp` locally.
- **MCP:** local only, through the stdio wrapper or the local `/mcp`. Because it keeps no state, it can move to a hosted server later without a design change, once someone other than the user's own agents needs it.
