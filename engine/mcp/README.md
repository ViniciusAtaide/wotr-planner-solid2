# The agent tools (MCP)

The MCP's tools (map 08, map 06, build ticket 05): a thin, stateless layer over the engine, which agents call through the MCP server and the planner UI calls as its engine API. Every tool that reads a Build takes its Build code; every tool that changes one returns the new code beside the Build, or a Refusal worded by R. The server keeps nothing between calls. The tools are plain functions, so the tests drive them directly; the HTTP and stdio transports (src/mcp/) only route calls here.

## Public entry

From `registry.ts`:

- `TOOLS` and `ToolDef`: the tools as the protocol lists them, in map 08's order: each tool's name, description and JSON Schema, and the call that runs it. Both transports (HTTP at /mcp, and stdio) serve this one list. The `description` strings are what the agents read about each tool and its inputs.
- `INSTRUCTIONS` (`instructions.ts`): the server's instructions, which the initialize result carries and clients such as Claude Code put in front of the agent. Where each description covers one tool, the instructions give the workflow, so "make a <idea> Build and report its code and Share link" is enough: the server keeps nothing and each call takes the latest code; the order of the tools from `start_build` to `equip`, with each Mythic rank taken when `mythicRankDue` says the character has reached it; GUIDs come from `search` or `options`; the planner's rules come from the game's data and win over the agent's memory of the game; the repo holds names, not descriptions (ADR 0006), so a `summary` can be empty and the agent says when it describes an ability from its own knowledge; skill points count Intelligence for every level so far; a Refusal means choose again; `clears`; `pick`'s and `equip`'s modes; when a Build is finished; and the Share link. Both transports serve them.

From `tools.ts`, the shared shapes:

- `Engine` and `engineOf(data)`: what every tool reads, the checked data and its grant index.
- `Changed`: a changed Build, its code (also a Share link, `/#b=<code>`) and the Build itself. Over the MCP (`TOOLS`), the Build becomes `brief`, one line (`brief(e, build)`: name, race, classes, Mythic path, picks, Gear), since an agent goes on from the code and reads the rest with `next_slots` and `sheet`; late in a Build the whole Build was 10–13 KB a call (MCP QA).
- `ToolRefusal`: a tool's refusal: R's `reason` and `unmet` lines, and `breaks`, what the change would break (each pick with its slot, or another choice with R's reason, one line per reason with its places: R's `groupedFailures`).
- `Mode`: the `mode` of `pick` and `equip`. `strict` refuses a change that breaks later picks, `preview` lists what a cascade would clear, `cascade` clears it (GLOSSARY.md "Cascade edit").
- `SlotView`: an open slot as `next_slots` and `level_up` list it; its `kind` is the selection's blueprint type (a feature selection, a parametrized feat or a Mythic spellbook).
- `OptionView`: one option as `options` lists it. `buildsOn` holds its Synergy badges (map 09, the chain kind), what the Build holds that the option builds on; `gear` is ADR 0002's note for an open option that needs the Gear counted; `refusal` is R's words for a closed option.
- `Sheet`: the numbers the walk computes at a character level.
- `expectedLevel(data, rank)` and `divergence(builds)`, exported for the UI (below).

The 14 tools, in map 08's order:

- `start_build`: an empty Build, with an optional name (ticket 11). A name over 60 characters is refused in R's words; a blank one leaves the Build nameless.
- `set_start`: the race, its chosen +2, the point buy and the alignment; each one left out stays as it is. With scores set, `pointBuy` gives the points `spent` of the total (`of`).
- `level_up`: one more level of a class, returning the new code with the slots the level opened. A character level also returns its `skillPoints` (the walk's budget for it) and `mythicRankDue`; a Mythic rank returns its `characterLevel`. When the new class itself is closed there (its prerequisites, the rank cap, a path switch off rank 8), it is refused with R's reason and unmet needs for that class, not as a break of other choices (MCP QA).
- `next_slots`: the open `slots`, in walk order, `skillPointsLeft` (the last character level and its points) when that level still has skill points to spend, `raceStatToChoose` when the race gives +2 to an ability of your choice and none is chosen (S's `raceStatPending`; QA pass 6), and `mythicRankDue` (the next rank and its Expected level) once the Build's character levels reach that Expected level and no taken rank ended the ascensions: the planner UI's `mythicDue`, without its "later" choice. Skill points carry from level to level as the game pools them, so only the last level's budget is left to spend; a Build is finished when the first three are empty, and `mythicRankDue` too unless it skips Mythic ranks (MCP QA).
- `options`: a slot's options. An option the Build already picks later, where taking it here clears that pick, carries `clears` in R's words (QA pass 6).
- `pick`: an option in a slot.
- `set_skills`: a character level's skill ranks, replacing that level's, with `skillPointsLeft` when that level's budget isn't all spent (the points carry to the next level). A skill is named as `sheet` shows it ("Mobility", "Knowledge (Arcana)", any case) or by its game key (`SkillMobility`); an unknown name is refused with the list of skills (MCP QA).
- `place_rank`: a Mythic rank's character level (ADR 0003).
- `equip`: an item in a Gear place, or none to take it off, with `pick`'s modes. A worn item whose bonus won't stack with one the Build holds or wears elsewhere (a second Ring of Protection's deflection) carries `wontStack`, in links' words, naming the other item or fact (MCP QA).
- `synergies`: at a slot, or at every open slot, the open options that link to what the Build holds, each row with the `slot`, `feature` and `param` that `pick` takes and the `place` spelled as `next_slots` spells it ("L11", "M9"; MCP QA): `buildsOn` (the chain kind), `shares` (an ability score, weapon or group, spell school, energy or descriptor it shares with held facts, "Shares Dexterity with Two-Weapon Fighting") and `wontStack` (a bonus of a type already given to the same stat). `options` carries `shares` and `wontStack` on each option too.
- `search`: the shown blueprints whose name holds the text, of one kind when asked, by name, 50 a page; items only as Gear offers them, without parts of other items or twins (QA pass 5); with `total` and `pages` so an agent knows when a list is cut (MCP QA).
- `explain`: a blueprint's description (engine/describe): its Summary and `labels` (06b), prerequisites, grants, where it can be picked and its chain links. `search` hits and `options` carry the Summary too.
- `sheet`: the Build's name, if it has one, the numbers at a character level, the Build's last by default, and the whole Build (`build`), which changes no longer return (map 08's amendment after the MCP QA pass). `compare`'s sheets leave the Build out.
- `compare`: 2 to 4 Builds' sheets at checkpoint levels, their chain link counts, and the first place they diverge.

## Rules

Citations for these live in `cites.ts`.

- **`expectedLevel`** reads the Mythic settings' level table: a Mythic rank's Expected level (ADR 0003), and 0 for a rank outside the table.
- **`level_up`**: a Mythic class adds the next Mythic rank, placed at its Expected level (ADR 0003), as the planner UI places it, however many character levels the Build already has; never before the last rank's level, and, for a rank outside the table, at the last character level. When the Expected level would break other choices and the Build goes past it, the rank goes at the last character level instead, with a `note` naming what the Expected level would break (`place_rank` moves it once that is mended). Archetypes apply at the class's first level, at most one per class (the game's level-up screen holds one; `ClassChoice.archetypes` in `engine/build`): more than one is refused with R's `archetypeCount`. An ability increase goes with the level it comes at; the game grants the point at every fourth character level when a non-Mythic class is taken.
- **Skill points** are the walk's (`Walk.skillPoints`, engine/walk): a level's budget counts the Intelligence points of every level so far at the current score, and what earlier levels left unspent, so an Intelligence increase adds points to the level it comes at for the levels before it.

## Design notes

- **Synergy words** are engine/links' `sharedWords` and `stackWords`, the same the planner shows.
- **Names in lists.** What a change breaks or clears, `buildsOn`, `shares` and `wontStack` name blueprints bare, keeping a qualifier only where two names in the same list would read the same (R's `namesIn`), so "Seize the Moment", not "Seize the Moment (feature)" (QA pass 2). An option's own name stays the full display name.
- **Plain edits.** `plainEdit` applies one edit through E's `allows`: the new code, or a refusal naming what it breaks. `plainEdits` treats several edits (as `set_start` and `level_up` make) as one plain edit, refused when the Build after all of them breaks anything. `pick` and `equip` go through their `mode` instead.
- **What breaks, in words.** `breaksInWords` lists what an edit breaks, each line R's: a pick reads as `pickInWords` gives it (`L3 Feat: Power Attack`), and another choice as its place, its kind and R's reason.
- **`options`** lists only the options the game shows, open ones first, `OPTIONS_PER_PAGE` (25) a page, filtered by name. Closed ones are counts by R's reason (a reason that names one value, such as "Needs proficiency with Trident", is counted under one wording for its rule: `PER_VALUE_REASONS`, 64 keys down to 6 on a feat slot; MCP QA), and are listed one by one only with `include_closed`, paged like the open ones (the same `page`), so a page never repeats another's (MCP QA). `openTotal`, `closedTotal` and `pages` say how much there is. An option's name (`optionName`) is the feature's, with its parameter in brackets.
- **`pick`** refuses a closed option with R's words; otherwise `mode` decides, as above.
- **`set_skills`** and **`equip`** first refuse with R's words what the walk refuses at that level or for that item. Then `set_skills` makes a plain edit, and `equip` goes through its `mode`.
- **`place_rank`** notes when the rank is off its Expected level (ADR 0003).
- **Sheets.** A sheet at a character level walks the Build cut to that level (`buildUpToLevel`): its levels to there, and the Mythic ranks and picks placed at or before it. `scores` are the permanent scores prerequisites read; `scoresWithGear` adds worn Gear's enhancement (the walk's `wornEnhancement`) when the Gear isn't already counted. Each save is `base` (the class tables), `ability` (its ability modifier) and `withAbility`; the walk doesn't sum feats', Gear's or other bonuses to saves, so the sheet doesn't claim a total (MCP QA).
- **`compare`** counts, for each Build, the chain links among the facts it holds. `divergence` gives the first place where the Builds' choices differ: a level's class or picks, then the ranks, in Build order.

## Tests

`tools.test.ts` drives the tools end to end (build ticket 05):

- An agent takes Jack-in-the-Green from `start_build` to level 20 and Mythic rank 10 through the tools alone, with no pick failing validation. It walks Jack's places in order (`timeline`: each level, then the ranks placed at it), and after every step checks that the step's code opens the Build it returned (its picks in slot order, as the code holds them). Jack's known gap (map 22) is left out: SpellSpecializationFirst f327a765a4353d04f872482ef3e48c35 at L11, and the slot it opens.
- `options` lists open options first, 25 a page, and closed ones by reason; `pick` refuses PowerAttackFeature 9972f33f977fc724c838e59641b2fca5 with R's words, since it needs Strength 13 and an empty Build's scores are 10.
- `search`, `explain` and `sheet`: FighterClass's base attack table gives 1 at level 1.
- A Fighter taken to level 20 before any rank: `mythicRankDue` appears at rank 1's Expected level and not before, and Mythic Hero then lands at that level, not at 20.
- A Human Arcanist with Intelligence 19 spends 5 points a level: the budgets read 5, 5, 5 and then 7 at level 4, where Intelligence reaches 20, and `set_skills` and `next_slots` give the 2 left.
- An Arcanist holding Holy Water Jet at L15, which a Lich can't take: the Lich rank goes at L20, and its note names the exploit.
