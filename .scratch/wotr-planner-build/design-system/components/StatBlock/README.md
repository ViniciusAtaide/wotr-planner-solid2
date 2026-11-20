# StatBlock

The six ability scores at a level, as the walk computes them, in `number` type with their modifiers.

**Markup:** `.ww-stats` holds six `.ww-stat`, each with `__name`, `__value` and `__mod`. In compare, `.ww-stat__value--diff` marks a score that differs from the other Build, in `gold`.

It's six columns, or three on a phone.

**The consumer provides:** the scores from the walk at the chosen level. Show them without Gear unless the Build opts in (ADR 0002).

**Don't:** show hit points. The walk doesn't compute them yet.
