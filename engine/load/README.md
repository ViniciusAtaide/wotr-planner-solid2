# Load

The loader and its load-time checks (guide §3 point 8, "When loading"). `loadData` takes the committed data as parsed files and returns checked data, or throws one `LoadError` listing every problem. The engine takes only checked data. The loader reads no files itself, so it runs the same in the browser, the MCP server and the tests; reading a data root from disk is `engine/data-dir`'s job, on Node only.

## Public entry

- `loadData(files, overrideFiles)`: the `CheckedData`, or a `LoadError`.
- `CheckedData`: the blueprints by GUID, the overrides, and Gear's `twins`.
- `LoadError`: every problem the checks found, at once.
- `blueprintRoot(data)`: the data's `BlueprintRoot`, whose settings every Build starts from, found once per data.
- `DataFile`: re-exported from `engine/data`.
- `cites`: the citation registry.

## Rules

`loadData` checks, and reports every failure in one `LoadError`:

- each blueprint file is a blueprint (`$type`, `guid`, `assetName` and `Components`), of a `$type` the engine reads, at the path its kind, asset name and GUID give;
- no two files share a GUID;
- every reference names a blueprint the data holds;
- every prerequisite component is of a type P reads (`prerequisiteTypes` and `isPrerequisite`, from `engine/data`, so the loader does not depend on P);
- each override has its reason, a target GUID and a known change (`add`, `remove`, `patch`, `name` or `alias`); a patch has its ops, a name override its qualifier, and an alias the old GUID it is from;
- a removal's target is gone from the data, and every other override's target is held;
- an alias's old GUID is one the data no longer holds, so a live GUID is never read as another.

`CheckedData.twins` holds Gear's twins (map ticket 29's rule 1, `deriveTwins`): items equal in all but GUID and asset name, each mapped to the one the pickers offer in its place. A Build code naming a twin decodes to that one. They are derived at load, never stored.

## Tests

- `load.test.ts` checks each load check against the hand-written fixture in `fixtures/small/` (JSON blueprints and one override), changed one file at a time through `fixtureEdited`. The prerequisite-type check uses `PrerequisiteLoreMaster`, a game prerequisite no written blueprint carries, so P doesn't read it. The twins tests build items after Adamantine Full Plate +2 (`AdamantineFullplateStandartPlus2` `b067c338ede1bfc45be97d2d9ab934e8`) and its Hellknight copy (`29f9eb542c9985f4b904add8d843caf1`): equal in all but GUID and asset name.
- `data.test.ts` checks the committed `data/` itself: everything the importer wrote passes every load check. It runs without the dump, so CI checks the data it ships. Its expectations:
  - The root classes the walk starts from: `FighterClass` `48ac8db94d5de7645906c7d0ad3bcfbd` and `BasicFeatsProgression` `5b72dd2ca2cb73b49903806ee8986325`.
  - Each Mythic rank's Expected level: `MythicsSettings` `3b8a6729da1e13a4e8e606e9f0fa38d8`'s `CharcaterLevelRestrictions`, indexed by rank (ADR 0003).
  - Items (map ticket 12), each from a source the research names (`obtainable-items.md`): the Aeon path's cloak `Artifact_AeonCloakItem` `b24d6185acea1f949b026c3b58e47947`, Legendary Bracers `LegendaryBracersItem` `3dec5ad0800c41b2aff99cdeceabf00a` and Draven's Hat `DravensHatItem` `0160c8eabe704db41b6309af0d26a8e0`. The hand-kept list adds `RingofConstitution` `6c7f785bab7bd1243a43e365dc2089bd` (Colossus Ring), which only a scene-placed boss wears. It removes `WeaponEmptyHand` `20375b5a0c9243d45966bd72c690ab74`, the empty hand, a natural weapon a companion brings (natural weapons are never looted: the game's weapon entity says they aren't lootable), and `ArmagsBladeItem` `ce0842546b73aa34b8fcf40a970ede68`, whose weapon type the dump lacks.
  - No equipment the dump traces to no source: the research's leftovers, the natural weapon `SlamLarge2d6` `5ed9cc5be301fae44b24824074edea0f`, the test bow `OverPoweredTestBow` `37f82ab8449ad3341af335a23a27ceba`, `HeadbandOfBigBrainsItem` `0a64791fd9ad3d645aa80149b0144435`, which nothing references, and `WarpaintedSkullItem` `5d343648bb8887d42b24cbadfeb36991`, which no source reaches.
  - What proficiency reads: `AdamantineFullplateStandart` `4a72801171b0cca44b1989b4622b5820` is `FullplateType` `afd9065539b3ac5499eddca923654c4b`, heavy armour; `Longbow` `7a1211c05ec2c46428f41e3c0db9423f` is a weapon type of the Longbow category.
  - The restrictions a main character meets: no druid levels on the full plate (`DruidClass` `610d836f3a3a9ed42a4349b62f002e96`); Robe of Virtue `17c5e2686dbb5a843b5ba859f22aeea1` needs Monk levels (`MonkClass` `e8f21e5b58e0569468e420ebea456124`) and a good alignment; Mask of Nothing `8344b46a6e404227b72d129073383a6c` is for the main character only.
  - The Enhancement bonus an item gives, which ADR 0002 counts only under its opt-in: `BeltOfStrength2` `c354de364a714ee4dbe2cfee628df267`, an Enhancement bonus of 2 to Strength.
  - No description written as a name: `CertaintyOfDeathSecondItem` `1050ae1293421e24f84a0208fdf0d114`'s name key points at a description (its override).
