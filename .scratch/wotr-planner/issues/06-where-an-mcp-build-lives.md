# Where an MCP Build lives between calls

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

Does the MCP keep no state, with every tool call taking the Build's code and returning the new code? Or does the server keep draft Builds by id and change them in place?

Proposed in the grilling session: no state. Calls replay cleanly and can be repeated safely, an agent branches a Build by keeping two codes, and the code doubles as the UI's share link.

## Answer

User, 2026-11-19: no state.

- Every tool that reads a Build takes a Build code, and every tool that changes one returns the new Build code beside structured JSON describing the result.
- The server stores no drafts, ids or sessions.
- An agent branches a Build by keeping two codes and backtracks by reusing an earlier one.
- Every returned code is also a Share link, so any step of an agent's work opens in the UI.
