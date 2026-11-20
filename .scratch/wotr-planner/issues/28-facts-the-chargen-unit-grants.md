# Facts the character-creation unit grants

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

The game builds every custom main character from one unit blueprint: `BlueprintRoot.m_DefaultPlayerCharacter`, `StartGame_Player_Unit` 4391e8b9afbb0cf43aeba700c089f56d (`UI/MVVM/_VM/MainMenu/MainMenuChargenUnits.cs` makes its chargen unit from it). Its `AddFacts` gives `ForbiddenDeityFeature` c4403567ea9e5fe478ca38e3052fadc2, and nothing in the dump removes it. Areshkagal, Baphomet, Deskari, Kabriri, Pulura and the Lich deity (`LichDeityFeature`) each carry a `PrerequisiteNoFeature` on it, so the game refuses those deities to a main character. G didn't see this grant, so the planner offered them. This is no story grant ([Features only the story grants](25-story-granted-features.md)): the character holds the fact from creation. Does every Build hold it?

Found by build ticket 02b, while reasoning the prerequisite leaves that name a fact no Build can reach.

## Answer

User, 2026-11-20: **yes, model it.** G treats the character-creation unit's `AddFacts` as grants held from level 0, through the root: `BlueprintRoot.m_DefaultPlayerCharacter` is a root grant of that unit, which `data/` holds with only its `AddFacts`. Every Build holds `ForbiddenDeityFeature`, so the six deities that forbid it are refused.
