# Armag's Blade

Type: grilling
Status: resolved
Blocked by: none
Parent: [map](../map.md)

## Question

`ArmagsBladeItem` (ce0842546b73aa34b8fcf40a970ede68) is a sourced item, but its `m_Type` names weapon type 1e460a2dc830cf546939b2723aa875e7, which the dump doesn't hold. So its weapon category, proficiency and hand checks can't be read, and a strict reference to it can't resolve. [Which items count as Gear](12-which-items-count-as-gear.md) never decided its removal. Build ticket 02b dropped it by an override, and the ticket 02 review flagged that as undecided. Raised by build ticket 02e.

- (a) Keep dropping it by its override; the Gear picker never offers it.
- (b) Hold it with a hand-written weapon type (Bastard Sword, as the `WeaponFocusBastardSwordOversized` feats suggest): our own data, not the game's.
- (c) Hold it with no Gear checks, which breaks "never impossible".

## Answer

Coordinator, 2026-11-20, on the user's standing instruction: **(a).**

- The planner can't judge an item whose type the game data lacks, so offering it would break the promise that a Build is never impossible.
- (b) would invent a game fact.
- The existing remove override stays as it is, with its reason citing this ticket. The Outcome of the ticket that touches it next notes the link.
