# Show generated summaries, never the game's description text

The UI and the agent tools need to say what a blueprint does, but the game's text strings are not ours to commit or publish. So each blueprint's Summary is generated from its components ("+2 dodge AC while wielding a shield"), and a hand-written summary in our own words replaces it only where the generated one reads badly. The same component reading feeds the Synergy links, so describing an effect and linking it to others come from one source.

## Considered Options

- Serve the game's descriptions from the local, uncommitted dump: rejected, because deploying the site would publish the text anyway.
- Hand-write every summary: rejected, because thousands of blueprints would be a permanent backlog and drift from the data.
