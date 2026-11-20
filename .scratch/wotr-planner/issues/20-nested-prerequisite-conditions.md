# Nested prerequisite conditions

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

The guide (§2, §4) says a blueprint's prerequisites are a flat list with no nesting. Build ticket 02 found one type that breaks this. `PrerequisiteCondition` (`Blueprints/Classes/Prerequisites/PrerequisiteCondition.cs` `CheckInternal`) holds a `Condition` that is a nested `OrAndLogic` And/Or/Not tree. It sits on 162 written blueprints: 115 progressions (mostly bloodlines, as on `BloodragerAbyssalBloodline`), 12 classes, 13 selections, 18 features and 4 archetypes. Its leaves:
- 4,184 `ContextConditionHasFact`, every one naming a held feature, selection or progression;
- `ContextConditionCharacterClass` and `UnitClass` (class levels);
- `IsUnitMythicLevel`;
- `ContextConditionBuffRank` (a fact's rank);
- `ContextConditionIsMainCharacter`;
- the story-state leaves of [Story-state prerequisites](21-story-state-prerequisites.md).

`PrerequisiteConditionForWeaponCategory`, a parameter prerequisite on weapon-category feats, holds the same kind of tree, with `ContextConditionIsWeaponEquipped` and class leaves.

How should P read it?

## Answer

User, 2026-11-19: **as a tree leaf.** P gives the component one leaf with its group, as for any prerequisite. What that leaf names is the condition tree: And/Or/Not nodes over fact, class, mythic-level and the other leaves. The walk and R evaluate it, and G and the importer's grantor check see every fact inside it. This amends the guide's "flat list": the list stays flat, and one leaf type carries a tree.
