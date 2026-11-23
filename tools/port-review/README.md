# Port review

Asks a model whether each engine port keeps the meaning of the game method it cites, using jev-lint's relations API (`jev-lint/relations`, `docs/relations-api.md` in the package). Every engine rule already names the C# it ports in its feature's `cites.ts`, and `tools/decompiled` checks that each cited member exists and reads its cited fields. This feature turns each citation into one comparison: the C# member is the specification, the TypeScript declaration the key names is the target. It is advisory and is not part of `bun run check`.

```bash
bun run review:ports -- prerequisites --dry-run   # pair and count, no request
bun run review:ports -- prerequisites             # ask, then write .jev-lint/ports/engine-prerequisites.json
```

It needs the local `decompiled/` sources and, for a live run, `OPENROUTER_API_KEY`. The pilot registry is `engine/prerequisites`; another feature joins by adding its `cites` to `REGISTRIES` in `main.ts` and to this feature's dependencies in `tools/repo-checks/features.ts`.

## Public entry

`index.ts` exports:

- `portPairs(feature, sources, sha, runId)`: a feature's relation input, its unpaired citations and a label per relation (key, cite, target line). `PortFeature`, `FeatureFile`, `PortPairs`, `PairLabel` and `Unpaired` are its types.
- `openRouterClient(apiKey, model?, intervalMs?)`, `pacedTransport`, `FREE_DECIDER`, `OPENROUTER_DECISIONS`: the model client.
- `DECOMPILED_ROOT`, `REPOSITORY`: the path prefix of the C# sources and the repository name the input carries.

`main.ts` is the command line.

## How a citation becomes a comparison

For each key of the registry and each of its citations (`Path/File.cs Member (Field, …)`):

- **Claim:** the cited member's lines in the C# file, quoted whole: every overload of a method or property (`memberSpans`), or the whole declaration of a cited type (`typeSpan`). Its statement says the port keeps the meaning of every condition, comparison, negation and default the member applies to the cited fields, "applied there or carried in its result for the step that applies it": P's readers only read a component into a leaf, and the walk applies it later, so a statement that the reader decides the check would make every reader look incomplete.
- **Target:** the TypeScript declaration the key names, found in the feature's syntax tree (not `cites.ts`, not tests): a top-level function, variable, class, interface, type or enum for `name`, and a member of it for `name.member` (an object literal's property, an interface or type member, a class member, an enum member).
- **Context:** the feature's `README.md`, which says what the feature ports and what it leaves to others; up to five same-file C# members the cited member calls (16,000 characters at most), so a check that delegates to a private helper brings it along; and, on the same terms, the top-level declarations in the port's own file that the target calls (`either`, `requires`, `guid`), so a one-line reader isn't judged without the helper that gives it its meaning.

A citation whose C# file or member can't be found, or whose key names no declaration, stays an expected claim with no comparison: the report counts it as unplanned, and `main.ts` prints why and exits 3. jev-lint rejects a source over 128,000 characters, so such a C# file is unpaired too.

Sources go in as `observed` code (only documentation can be `reference` or `approved` in the API), each pinned to the current `HEAD`; the content is the working tree's. That makes every resolution `needs_decision`: read the judgment, not the resolution.

## The model client

`scanRelations` builds a TypeSafe client unless it is handed one, and jev-lint 0.10.0 doesn't export its own OpenRouter client (Bun refuses `jev-lint/dist/model.js`). `openRouterClient` is the exported `Jev` class with its transport pointed at OpenRouter's decisions endpoint, which is what jev-lint's own wrapper does, and spaced at 3.3 seconds a request for the free model. The endpoint is OpenRouter's `alpha` API, so a jev-lint or OpenRouter upgrade can move it.

## Reading a report

The command prints one line per comparison, contradictions first: the choice (`supports`, `contradicts`, `unrelated`, `insufficient_context`) and its probability, the claim judgment (whether the C# lines support the generated statement), the target line, and the key and citation. The report (`.jev-lint/ports/<feature>.json`) holds the full probability vectors and the quoted evidence, which is decompiled code, so `.gitignore` keeps the folder out of the repo (ADR 0006).

`complete` means every planned comparison got a usable answer, not that the ports are right. `insufficient_context` usually means the decision happens somewhere the evidence doesn't reach: a C# helper in another file, or the walk step that applies a reader's leaf. A `contradicts` is a lead to check by hand against the C# and the README, not a finding.

## Tests

`port-review.test.ts` pairs a small invented C# class with a small invented port: the claim quotes the cited member's lines and the target the keyed object property; the context carries the README and the private helper the member calls; a cited type quotes its whole declaration and resolves to an interface member; a key with no declaration and a member the file doesn't declare stay expected claims with no comparison, each with its reason, and the input passes `parseRelationInput`. The transport test checks that requests go to the decisions endpoint, spaced by the interval. With `decompiled/` present, every citation in `engine/prerequisites` pairs with its port.

## Results

All runs: 2026-11-23, `engine/prerequisites` at 163e5d67, `perplexity/pplx-decider-v1.3:free` (served as `perplexity/pplx-decider-v1.3-20261112`), one request per comparison, no answer missing.

**The real code.** 44 citations, 44 comparisons. Before the port's own helpers were added as context: 12 `supports`, 32 `insufficient_context`, 0 `contradicts`. After: 22 `supports`, 22 `insufficient_context`, 0 `contradicts`, 0 `unrelated`. The report's `insufficientContext` coverage stays at 32 because it also counts comparisons whose claim judgment was `insufficient_context`. With no known port mistake in this feature, these numbers say how often the model can decide, not whether it is right.

**Planted mistakes.** Single-line changes to a copy of `prerequisites.ts` held in memory, each asked once with the unchanged reader as its control. The first three were planted before the port's helpers became context, and the miss among them is why they did; the last three were added after, to test the change on cases it wasn't made for.

| Planted change | Without port helpers | With port helpers | Control, with helpers |
| --- | --- | --- | --- |
| `NoClassLevel`: `forbids` → `requires` | `contradicts` 0.587 | `contradicts` 0.672 | `supports`; `contradicts` 0.013 |
| `CharacterLevel`: `Level` → `Level + 1` | `contradicts` 0.630 | `contradicts` 0.650 | `supports`; 0.011 |
| `IsPet`: `either(c.Not, …)` → `either(!c.Not, …)` | missed: `supports`, 0.138 | missed: `supports`, 0.059 | `supports`; 0.028 |
| `Pet`: drops `NoCompanion` | | `contradicts` 0.740 | `supports`; 0.294 |
| `StatValue`: `Value` → `Value - 1` | | `insufficient_context`; `contradicts` 0.401 | `insufficient_context`; 0.014 |
| `MainCharacter`: `either(c.Companion, …)` → `either(!c.Companion, …)` | | missed: `supports`, 0.069 | `supports`; 0.094 |

Three of six planted mistakes came back `contradicts`, and no control did. Changed values and dropped conditions were caught; both negation flips were missed, and seeing `either`'s definition made the model more sure the flipped reader was fine, not less. A negated polarity is the mistake this review can't be trusted to see, so a test that runs the readers holds it instead: `engine/prerequisites/prerequisites.data.test.ts` pins every reader's polarity to its game check, and fails on each of these flips. Six cases on one feature are a probe, not a rate.
