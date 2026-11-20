# LevelRow

One row of the Timeline: a character level, its class, and a chip for each pick made there.

**Markup:** `.ww-timeline` holds the rows. Each row is `.ww-level`, with `.ww-level__num` (the level, in mono) and `.ww-level__body`, which holds `.ww-level__class` (the class name, then a `small` with the class level and any ability increase) and `.ww-level__picks`.

**Picks:** each is a `button.ww-pick` with its slot label in `.ww-pick__slot` and the pick's game name.
- `.ww-pick--empty` is a slot still to fill, with a dashed edge.
- `.ww-pick--gear` is a gear-dependent pick: its slot label adds "◈ Gear".

**States:** `.ww-level--active` is the level the picker is showing, on `surface-300` with a `gold` left edge.

**The consumer provides:** the level, the class name, and the slots with their picks, all from the walk. Clicking a pick opens the picker on that slot.

**Do:**
- Keep one row per character level.
- Show every slot the walk opens there, filled or empty.

**Don't:**
- Put Refusal text in the Timeline. It belongs to the picker.
