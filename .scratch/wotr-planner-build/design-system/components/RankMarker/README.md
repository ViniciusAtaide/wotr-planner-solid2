# RankMarker

A Mythic rank in the Timeline, placed between the character levels at its Rank level.

**Markup:** `.ww-rank` holds two parts.
- `.ww-rank__mark` shows "M" and the rank number.
- `.ww-rank__title` shows the rank in `display` type, then a `small` with the Mythic path and its Expected level (ADR 0003).

Everything Mythic is in `mythic`. The row sits on `ground`, so the rank reads as a break between levels.

**The consumer provides:**
- the rank number;
- the Mythic path's game name;
- the Rank level, which sets where the row goes;
- the Expected level.

The rank's own picks render as `.ww-pick` chips inside a `.ww-level__picks` under the title.

**Don't:** mark a rank placed away from its Expected level as an error. It's only a hint, so show it in the `small` text: "Expected at level 6, placed at 8".
