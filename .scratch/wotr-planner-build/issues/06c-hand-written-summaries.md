# Hand-written summaries

Status: done
Session: ticket-03c-walk-fixes
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

## Outcome

- **Format:** a `summary` override, one file per blueprint, `data/overrides/<AssetName>.<guid>.summary.json`. It holds the `target`, our own `text`, the `reason` the generated one won't do, and the `fingerprint` of the components it describes, and nothing else, so it can never carry a link (map 09).
- **Fingerprint:** `fingerprintOf` (engine/data): 32-bit FNV-1a over the components' key-sorted JSON, eight hex digits.
- **The load check:** it refuses a summary without its text or fingerprint, or holding other fields. It also refuses one whose target's components changed, naming the old and the new fingerprint. So a re-import that changes a summarized blueprint stops until the summary is reread. The check holds in the browser too, since the summaries ride in the compact data document with the other overrides.
- **describe** prefers a hand-written summary (`summarySource: 'written'`) and keeps the generated `labels`. `summaryText` gives the MCP's `search` and `options` the same text.
- **The first one:** Danger Sense (Rogue). Its generated summary couldn't name traps (the trap marker fact is never shown), and it didn't say the bonuses grow with each rank.
- **Tests:** a fresh summary loads, a changed component is flagged with both fingerprints, malformed or link-carrying summaries are refused (`load.test.ts`), and describe prefers the written text (`labels.test.ts`).
- **Follow-up:** generated labels word a rank-scaled bonus at rank 1. Components that multiply by the fact's rank (Danger Sense, Weapon Training…) could say "per rank" when the blueprint has more than one rank.
