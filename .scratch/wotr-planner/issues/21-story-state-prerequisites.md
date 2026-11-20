# Story-state prerequisites

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

Some prerequisites test the playthrough rather than the character:
- `PrerequisiteEtude` (10 written blueprints; `Blueprints/Classes/Prerequisites/PrerequisiteEtude.cs` `CheckInternal`);
- inside `PrerequisiteCondition` trees ([Nested prerequisite conditions](20-nested-prerequisite-conditions.md)), the `EtudeStatus`, `CompanionInParty` and `IsCampaign` leaves.

A Build holds no story state. How does the planner judge them?

## Answer

User, 2026-11-19: **always met.** Story state counts as reachable, as the guide already treats which Mythic paths open ("Offer every path at its rank"). The option is offered, and a Refusal never cites story state.
