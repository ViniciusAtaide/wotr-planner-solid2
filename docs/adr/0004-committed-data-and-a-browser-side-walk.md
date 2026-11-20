# Commit the imported data and run the walk in the browser

The importer turns the git-ignored dump into committed data files (one per blueprint, mechanical fields only), and the server hands the browser all of it as one content-hashed JSON document. The rules engine then runs entirely in the browser: picker options, picks and cascades never wait on the network, which is the point of a planner meant for trying ideas quickly. The MCP runs the same engine on the server. Committing the data makes every data change a reviewable diff, and lets tests and CI run without the 131 MB dump.

## Considered Options

- Read the dump at server start-up instead of committing data: rejected, because every machine and CI run would then need the dump, and data changes would be invisible in review.
- Run the walk on the server behind server functions: rejected, because every click would pay a round trip.

## Consequences

The first page load carries the whole data document. Its compressed size must be measured once the importer exists; if it proves too large, this decision is revisited.
