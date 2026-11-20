# Design system

The Worldwound Planner design system, ported into Solid (build ticket 05a). It answers how the planner looks: the
tokens, the `ww-` component classes, and one Solid component per published component. The published system lives at
https://claude.ai/artifact/AZQZrmccbjpqzALbFzkugb; its tokens are copied in
`.scratch/wotr-planner-build/design-system/tokens.css`. Worldwound, the dark theme, is the only theme.

## Public entry

`index.ts` imports the three stylesheets and exports every component, both as its default export's name and with its
props types and helper types:

- `Badge`, `BadgeKind`: a status or link chip.
- `Button`, `ButtonVariant`: an action.
- `CascadePreview`: what a Cascade edit will clear, before it applies.
- `CompareToggle`: the segmented control that switches between compared Builds.
- `Kbd`: a keyboard hint.
- `LevelRow`, `Timeline`, `PickChips`, `PickChip`: the Timeline and its rows and chips.
- `PickerOption`, `OptionList`, `PickerHead`, `ClosedCount`, `OptionStatus`: the picker's parts.
- `PickerSheet`: the picker as a full-screen sheet on a phone.
- `RankMarker`: a Mythic rank in the Timeline.
- `Refusal`: why an option is closed.
- `ShareLink`: the Build's Share link.
- `StatBlock`, `Stat`: the six ability scores.
- `Gallery`: the body of the `/design` page.

## Components

- **Badge.** `kind` picks what it marks: `open`, `closed` and `gear` are statuses, `mythic` marks a Mythic option, and
  `link` is a Synergy link whose words the consumer gives as children ("→ enables 3", "← needs Power Attack"). A status
  badge shows its mark with its word (`STATUS_WORDS`: ✓ Open, ✕ Closed, ◈ Gear), so color is never the only signal.
- **Button.** The default look, or a `variant`: `primary` (gold, one per view), `ghost` (quiet: Undo, Cancel) or
  `danger` (an action that clears picks). Label it with the verb and its object; `kbd` adds the shortcut's hint and
  `label` its accessible name.
- **CascadePreview.** The one place a pick doesn't apply at once. It lists exactly what the Cascade edit clears (E's
  preview), says they're cleared, not moved, and applies on confirm; Esc cancels. `title` names the edit ("Swap Spell
  Focus"), `summary` says how many picks break and that they're cleared, not moved, and `clears` lists each pick to
  clear with its place ("Level 8"). It takes focus when it opens, so Esc and Tab reach it; `autofocus={false}` turns
  that off (the gallery shows it without).
- **CompareToggle.** A segmented control; `value` is the pressed segment. On a phone it switches which Build compare
  shows; on desktop it adds "Side by side". Four segments at most.
- **Kbd.** A key, for the keyboard-first planner's hints. Hidden on touch screens (the `pointer: coarse` rule in
  `components.css`).
- **Timeline, LevelRow, PickChips.** `Timeline` is the column of level rows and Mythic ranks. `LevelRow` is one
  character level: `level`, `characterClass` (the class's game name), `detail` (the class level and any ability
  increase, "4th level · Strength +1"), and a chip for every slot the walk opens there. `active` marks the level the
  picker is showing. Refusal text never goes in the Timeline; it belongs to the picker. `PickChips` renders a row's
  chips, and a `RankMarker` shows them under its title too. A `PickChip` is a slot and its pick, or a slot still to
  fill: `slot` is the slot's label ("Bonus feat"), `text` the pick's game name or, for an `empty` slot, what it waits
  for ("4 ranks to spend"), and `gear` marks a gear-dependent pick (ADR 0002), whose label adds "◈ Gear".
- **PickerOption, OptionList, PickerHead, ClosedCount.** `PickerOption` is one option at a slot, with its status from
  S (`OptionStatus`) and every line of its Refusal from R. `name` is the game name, with its parameter when it takes
  one; `selected` marks the Build's current pick at this slot; `links` are its Synergy links, worded ("Enables Weapon
  Specialization (Longsword) → and 3 more"); `gear` is R's gear-dependent note, for an open option that needs the Gear
  counted; `refusal` is R's lines, for a closed option. An open option is a button; a closed one stays focusable
  (`aria-disabled`) so its Refusal can be read. A gear-dependent option shows ◈ Gear beside ✓ Open, with R's note
  naming the items it counts. `OptionList` is the picker's list of options, `PickerHead` the picker panel's heading
  (the slot and its counts, "212 open · 1,034 closed"), and `ClosedCount` the closed options a list doesn't show,
  summed by reason.
- **PickerSheet.** On a phone, the picker as a full-screen sheet over the Timeline (map 13), closed by its back
  button. `title` is the slot heading ("Bonus feat · L4"). On desktop the picker is a side panel instead.
- **RankMarker.** A Mythic rank in the Timeline, between the character levels at its Rank level. `path` is the Mythic
  path's game name and `placed` the Rank level, when it differs from the `expected` level. A rank placed away from its
  Expected level is only a hint (ADR 0003): "Expected at level 6, placed at 8". Its title and picks sit in a
  `ww-level__body`, so they stack as a level row's body does.
- **Refusal.** Why an option is closed, one line per unmet need, as R words them. The lines are shown unchanged; a
  trailing "(yours: …)", what the character has, is only set apart in `ink-muted` (`YOURS_SUFFIX`), never reworded.
  With `gear`, it is the gear-dependent note instead.
- **ShareLink.** The Build's Share link, `/#b=<Build code>`, read-only, with one copy action. Copying says "Link
  copied."; when the clipboard refuses, the text is selected instead. The code is never shortened.
- **StatBlock.** The six ability scores at a level, from the walk, without Gear unless the Build opts in (ADR 0002).
  Six columns, or three on a phone. No hit points: the walk doesn't compute them. A `Stat` is one score as the walk
  computes it at a level: `name` is the short name ("STR"), and `diff` marks, in compare, a score that differs from the
  other Build's. Each score's modifier is the walk's `attributeBonus` (the game's attribute bonus, cited in
  `engine/walk`), shown signed, with a true minus sign. That is the design system's one engine import
  (`~engine/walk`), so the rule has one source.
- **Gallery.** The design gallery: every component in the states its published preview shows, with the same example
  content, so the port can be checked against the published system side by side. It is the living reference for the
  UI. Each `Card` shows a component's name, its line from the published system (`about`) and its preview states. The
  CompareToggle sits in a block, as the published preview sets it, so the segments keep their own width.

## Design notes

- `tokens.css` is the only file under `src/` that writes a color; everything else uses its custom properties
  (`colors.test.tsx` holds the rule). It sets `color-scheme: dark`, so native controls (selects, scrollbars, date
  pickers) draw dark too.
- `components.css` is the published `components/bundle.css`, unchanged apart from dropping its comments. Every value
  comes from `tokens.css`, and every class has the `ww-` prefix. Its sections follow the components: Button, Kbd,
  Badge, LevelRow (the Timeline, its rows and chips, and `ww-rank`, a Mythic rank at its Rank level), PickerOption,
  Refusal, the picker panel heading and the closed count, CascadePreview, ShareLink, CompareToggle, StatBlock and
  PickerSheet.
- `gallery.css` lays out the gallery page.

## Tests

- `design.test.tsx` checks that the components render the markup their published previews show: an open
  `PickerOption` is a button with ✓ Open that picks on click; a closed one stays focusable, with ✕ Closed and its
  Refusal lines unchanged, and what the character has is set apart, not reworded; a gear-dependent one shows ◈ Gear
  beside ✓ Open with R's note. `CascadePreview` lists what it clears, names the count on its primary action, and
  cancels on Esc.
- `colors.test.tsx` checks the color rule: no color literal in any file under `src/` outside `tokens.css`, which must
  hold its colors. A color literal (`COLOR_LITERAL`, `colorLiterals`) is a hex color of 3, 4, 6 or 8 digits, or an
  rgb, rgba, hsl, hsla or oklch color function. It plants one of each kind, and checks that a Share link's fragment
  is not taken for a color. It finds `src/` from the repo root vitest runs in, because jsdom gives `import.meta.url`
  no `file:` scheme.
