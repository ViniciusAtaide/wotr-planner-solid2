The look of the Wrath of the Righteous build planner: a dense tool for trying Builds quickly, dressed in the game's dark fantasy. Iron-dark grounds, warm bone text, one brass accent, and Mythic power in orchid. Dark is the first theme (Worldwound); Parchment is its light twin.

## Content fundamentals

- **Use the game's own names.** Feats, classes, items and Mythic paths appear exactly as the game shows them: "Weapon Focus (Longsword)", "Azata", "Belt of Physical Might +4". Never paraphrase a game name, and never show the game's descriptions (only names, by ADR 0006).
- **Use the planner's terms** from the glossary: Build, Timeline, slot, pick, Refusal, Cascade edit, Rank level, Expected level, Gear, Share link. Write "pick", not "selection"; write "Refusal", not "error".
- **Refusals state what is missing and what the character has.** One short sentence per unmet need, in the second person: "Needs Strength 13 (yours: 10)." "Needs Power Attack." "Opens at level 6." Any-of needs share one line: "Needs one of Cleave or Great Cleave." Never apologise and never say "invalid".
- **Buttons say what happens:** "Apply", "Clear 3 picks", "Copy link", "Undo". Toasts confirm in the past tense: "Link copied."
- **Sentence case** everywhere except slot labels, which use the `label` style in capitals ("BONUS FEAT", "MYTHIC ABILITY").
- **Numbers are numerals:** "Level 4", "Rank 3", "+2".

## Visual foundations

### Color

- Set the page on `ground`. Panels (the Timeline, the side picker) sit on `surface-100`; parts inside a panel (a picker option, a menu) on `surface-200`; hover and the active row on `surface-300`.
- Body text is `ink`; secondary text `ink-muted`. `ink-subtle` is only for hints and counts on `ground`, `surface-100` and `surface-200`, never on `surface-300`.
- `gold` is the one accent. Spend it on the primary action, the selected pick and the current level marker. Never use it for status. Text on a gold fill is `on-gold`.
- `mythic` marks Mythic only: rank markers, Mythic class names, Mythic picks. Nothing else is orchid.
- Status has its own three colors, never the accent: `open`, `closed` and `gear`. Each always carries its mark and word (✓ Open, ✕ Closed, ◈ Gear), so color is never the only signal. `open` and `closed` differ in lightness as well as hue.
- Hairlines are `line`. The edge of anything you can operate (inputs, buttons, options) is `line-strong`, which holds 3:1 on its surfaces.
- Every text pair above holds at least 4.5:1 in both themes.

### Type

- **Grenze** (`display`) is the dark fantasy voice: a roman with blackletter bones. Use it only for `title`, `heading` and `rank`. Never set running text, options or numbers in it.
- **Alegreya Sans** (`body`) carries the interface: `body` for text and Refusals, `body-strong` for option and pick names, `small` for sources and detail, and `label` for slot labels in capitals.
- **IBM Plex Mono** (`mono`) is for `code` (Build codes, GUIDs, keyboard keys) and `number` (ability scores, BAB, saves), with tabular figures so columns line up.
- Load the three faces from Google Fonts: `components/bundle.css` imports them.

### Space, shape and depth

- The grid is 4px: `space-1` to `space-8`. A Timeline row and a picker option pad `space-3`; panels pad `space-4`; panels sit `space-6` apart.
- Corners are nearly square, like iron and stone: `radius-sm` for chips and keys, `radius-md` for buttons and options, `radius-lg` for panels and the phone sheet.
- Depth comes from surface steps and hairlines, not shadows. `shadow-sheet` is only for what floats over the page: the phone picker sheet, the Cascade preview, menus.

### States and motion

- **Focus:** a 2px solid `focus` ring, offset 2px, on every control. The planner is keyboard first, so focus is always visible.
- **Hover:** one surface step up (`surface-200` to `surface-300`). There's no hover-only information.
- **Selected:** a `gold` 2px inner edge on the left of the row plus `surface-300`, never a colored card border all round.
- **Closed options** stay readable: the name in `ink-muted`, never greyed below 4.5:1, with the Refusal in `closed` beneath it.
- **Motion:** none beyond 120ms fades for sheets and previews. Respect `prefers-reduced-motion`, and never animate the Timeline on a pick: picks apply instantly.

### Layout

- **Desktop:** the Timeline on the left (level rows, Mythic ranks at their Rank levels), the side picker on the right at 380–440px.
- **Phone:** one column. The Timeline fills the screen, and the picker opens as a full-screen sheet (`PickerSheet`) with a back button. Every action has a tap target of at least 44px.

## Iconography

There's no icon set and no logo: the name is set in `display` type. Status uses text marks, always beside a word: ✓ (Open), ✕ (Closed), ◈ (Gear), → (enables), ← (needs). Keyboard hints use `Kbd`. Don't add pictorial icons or emoji.

## Components

The components are CSS classes in `components/bundle.css` (prefix `ww-`), plain HTML with no framework. The planner's UI is Solid 2, so each component is ported as a Solid component that renders this markup. Each card's guideline lists the markup, its states, and what the consumer provides.
