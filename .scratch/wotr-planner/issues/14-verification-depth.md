# Verification depth in v1

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

How much of the guide's checking against the game ships in v1? The extra checks are:
- K and L: a game check of our data against the dump, with an owner recorded for every difference;
- N: a record of every rule where we refuse something the game allows;
- X: the list of old Builds we expect to refuse;
- a corpus of about 2,000 generated Builds plus a few real players' Builds.

Options:
- (a) all of it;
- (b) tests that cite the game for each rule, plus the corpus self-checks (every picker agrees with the walk, every Build round-trips through its code);
- (c) tests only.

Proposed: (b), with K and L added once the importer settles.

## Answer

User, 2026-11-19: for now, the only check against real play is the Rust planner's two gold builds: Jack-in-the-Green and the Enforcer, in `~/code/wotr-planner/libs/seeds/tests/game_data/gold/` (`source.txt` and one `.ron` per build). There is no generated corpus and none of the guide's K/L/N/X checks yet.

- **Unit tests:** each rule's tests still cite the game's code or blueprint, as the guide asks. That's how the engine is built, not an extra check.
- **What the gold builds assert:** carry over the Rust ticket's rules (`~/code/wotr-planner/.scratch/wotr-planner/issues/160-gold-builds.md`). Every gain the write-up lists at a level or rank is gained there; a refusal is never the write-up's fault; known engine gaps are listed, each with a ticket, and the list can only shrink.
- **Later:** the corpus and K/L/N/X come back as their own tickets when the engine and importer settle.
