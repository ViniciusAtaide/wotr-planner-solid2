# Hand-written summaries

Status: open
Blocked by: 06b
Parent: [06](06-after-first-use.md)
Plan: [plan](../plan.md)

## Goal

Some generated Summaries read badly. For those, a hand-written summary in our own words replaces the generated one ([map 10](../../wotr-planner/issues/10-generating-summaries.md)).
- **Storage:** one file per blueprint, keyed by GUID with a readable name.
- **Fingerprint:** each file records a fingerprint of the components it describes, and the load check flags one that no longer matches the data.
- **Wording only:** hand-written summaries never create links ([map 09](../../wotr-planner/issues/09-synergy-link-kinds.md)).

## Done when

- The file format, the fingerprint and the load check exist, each with a test (a stale fingerprint is flagged).
- `describe` prefers a fresh hand-written summary.
