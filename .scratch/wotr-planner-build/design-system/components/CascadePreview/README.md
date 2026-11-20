# CascadePreview

The one place a pick doesn't apply instantly. It lists what a Cascade edit will clear, and applies on confirm.

**Markup:** `.ww-cascade` holds:
- an `h3` naming the edit;
- a `p` saying how many picks break;
- a `ul` of the picks to clear, each with its level;
- `.ww-cascade__actions`.

It floats, with `shadow-sheet`.

**The consumer provides:** E's `breaksOf` list, which is exactly what the cascade will clear, and the two actions. The primary button names the count: "Clear 3 picks and apply".

**Do:**
- Say "cleared, not moved". Cascade edits never move a pick.
- Make Esc cancel.

**Don't:** show it for an edit that breaks nothing. That edit applies at once.
