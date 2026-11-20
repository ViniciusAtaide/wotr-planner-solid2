# PickerOption

One option at a slot, with its status, from the paused walk. Open options come first, and closed ones follow, greyed only in name, each with its Refusal.

**Markup:** `.ww-option` holds:
- `.ww-option__name`: the game name;
- `.ww-option__badges`: status badges;
- `.ww-option__meta`, optional: Synergy links;
- a `.ww-refusal` list, optional.

**States:**
- **Open:** a `button.ww-option` with `✓ Open`.
- **Selected:** `.ww-option--selected` is the Build's current pick at this slot.
- **Gear-dependent:** `◈ Gear` beside `✓ Open`, plus a `.ww-refusal--gear` line naming the items it counts.
- **Closed:** `.ww-option--closed` with `aria-disabled="true"`, still focusable so its Refusal can be read, and `✕ Closed` with its Refusal.
- `.ww-count` sums the closed options it doesn't list, by reason.

**The consumer provides:** the options and their status from S, and every Refusal's text from R. Never write Refusal text in the UI.

**Do:**
- Keep the name readable when closed (`ink-muted`).
- Put the open count in the heading.

**Don't:**
- Hide closed options entirely. They teach what a Build needs.
