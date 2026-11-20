# Coding standards

These are judgement rules a reviewer applies to a diff. Anything a tool can check belongs in `bun run check` instead: formatting, lint, types, the `engine/` import boundary, and the importer's checks against the dump. Each rule says what to look for and why.

## Fidelity to the game

- **Ported, cited rules.** Every rule in `engine/` ports one decompiled C# method onto the fields that method reads, and a comment cites the file and method (`Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites`). A rule with no citation, or one that reads a field its cited method doesn't, is a finding. The game is the spec, so a rule the reviewer can't trace to it can't be checked.
- **The game's own names.** Data types and engine code use the dump's field names (`m_AllFeatures`, `LevelEntries`) unrenamed, and the game's own shape (ADR 0005). A planner-side rename or reshaping is a finding: it starts a second model that drifts from the first.
- **Expectations from the game.** A test's expected value comes from the game, cited by blueprint name and GUID or by method, and asserts game facts rather than counts of our own data. When a test and the engine disagree, the engine moves toward the game, not the test toward the engine.
- **Corrections only through overrides.** A correction to the game's data is a `data/overrides/` file with its reason, never an edit to imported data or a special case in code.

## One answer per question

- **Single source.** Each question has one module that answers it: P reads prerequisites, G answers who grants what, W judges legality, R words a Refusal, C encodes a Build. A second place computing the same answer (a picker re-checking prerequisites itself, a surface wording its own refusal) is a finding.
- **Refusal text comes only from R.** The UI and the MCP show R's answer. Status is behaviour and wording is presentation.

## Scope and boundaries

- **Decisions stay on the map.** A diff that settles a design question no ticket or ADR settled is a finding; the question goes to the user and a new map ticket.
- **Game text.** Nothing from the game's text enters the repo except display names (ADR 0006): no descriptions, no copied decompiled code, no dump JSON in tests or docs.
- **Terms.** Code, tests and docs use `GLOSSARY.md`'s words (Build, Pick, Slot, Refusal, Gear…), not their listed `_Avoid_` alternatives.

## Conventions

- A component's props are an exported `interface <Component>Props`; no inline prop types.
