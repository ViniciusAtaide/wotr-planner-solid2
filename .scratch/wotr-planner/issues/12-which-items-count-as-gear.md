# Which items count as Gear

Type: grilling
Status: resolved
Blocked by: 04
Parent: [map](../map.md)

## Question

Which items can a Build's Gear hold?
- (a) every equipment blueprint with a display name;
- (b) only items the game hands out, per the dump;
- (c) a hand-kept allow list.

And which worn slots and weapon sets does Gear model?

Proposed: (b), plus a small exclusion list with a reason for each entry.

## Context from research

- [obtainable-items.md](../research/obtainable-items.md): the dump traces 3,397 of 4,542 equipment blueprints to a source in play.
- [gear-vs-rust-data.md](../research/gear-vs-rust-data.md) compares that set with the Rust planner's gear list:
  - Its only real miss is `colossus-ring` (`RingofConstitution` 6c7f785bab7bd1243a43e365dc2089bd). Only a scene-placed DLC4 boss wears it, and the dump can't see scenes. This is exactly the kind of item the hand-kept list would have to add.
  - Ten Rust entries are usables: tomes, manuals, an elixir and a potion. They're outside the 4,542 by type, but they have sources in play. Decide whether Gear holds usables too.
  - At weapon-category level, the Rust weapon list lacks only the two spiked-shield categories and `ArmagsBladeItem`, whose weapon type is missing from the dump itself.

## Answer

User, 2026-11-19.

- **Items offered:**
  - every equipment blueprint the dump traces to a source in play: 3,397, Midnight Isles included;
  - plus a small hand-kept list of additions, one file each with its reason. `colossus-ring` (`RingofConstitution` 6c7f785bab7bd1243a43e365dc2089bd) is the first.
  - The hand-kept list also drops `WeaponEmptyHand` (20375b5a0c9243d45966bd72c690ab74).
  - "Midnight Isles only" is a UI filter, not a data cut.
- **Places:** one item in each worn place (head, glasses, neck, shoulders, shirt, armour, belt, wrists, gloves, feet, two rings) plus one main hand and one off hand, where the off hand holds a weapon or a shield. There is a single weapon set.
- **Usables** (tomes, manuals, elixirs, potions) are out of v1 Gear. Their bonuses are inherent, so they never meet prerequisites. They come back with the sheet's numbers.
- **Checks per item:** proficiency, plus the item restrictions that apply to a main character: no druid levels, a required class or path, an alignment mask and main character only (always passes).
