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
- `CompareToggle`: the segmented control that switches between compared Builds, generic over its segments.
- `FeatIcon`, `FeatCategory`, `FEAT_CATEGORY_NAMES`: a feat's category as a small line drawing.
- `Kbd`: a keyboard hint.
- `LevelRow`, `Timeline`, `PickChips`, `PickChip`: the Timeline and its rows and chips.
- `PickerOption`, `OptionList`, `PickerHead`, `ClosedCount`, `OptionStatus`: the picker's parts.
- `PickerSheet`: the picker as a full-screen sheet on a phone.
- `RankMarker`: a Mythic rank in the Timeline.
- `Refusal`: why an option is closed.
- `ShareLink`, `ShareLinkProps`: the Build's Share link, being made, ready or failed.
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
  clear with its place ("Level 8"). It is modal: it takes focus when it opens, so Esc and Tab reach it, keeps Tab
  and Shift+Tab cycling through its own buttons (`keepFocusInside`), and stops Esc from reaching the page's own key
  handler. The page makes everything behind it inert. `autofocus={false}` turns the focus off (the gallery shows it
  without).
- **CompareToggle.** A segmented control over its own segment type `S`: `value` is the pressed segment and
  `onChange` hands back an `S`, so a consumer maps segments through a `Record` with no cast. On a phone it switches
  which Build compare shows; on desktop it adds "Side by side". Four segments at most.
- **FeatIcon.** A feat's category as a line drawing on a 24×24 grid, `1.05em` square, stroked in the text's color
  (`ww-feat-icon`), so it follows its chip or option. The twelve drawings (Weapon, Ranged, Unarmed Combat, Armour and
  Shield, Combat Manoeuvres, Mounted Combat, Magic, Skill, Teamwork, Racial, Class, Miscellaneous) were drawn for the
  Rust planner (`~/code/wotr-planner`, `libs/ui/src/icons.rs`) and are copied here unchanged, in the same order. It is
  decorative (`aria-hidden`): the name beside it says what the pick is. The consumer decides the category.
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
  one; `selected` marks the Build's current pick at this slot, with the word "Current" beside its badges as well as the gold edge; `links` are its Synergy links, worded ("Enables Weapon
  Specialization (Longsword) → and 3 more"); `gear` is R's gear-dependent note, for an open option that needs the Gear
  counted; `refusal` is R's lines, for a closed option. `icon` puts a `FeatIcon` before the name. An open option is a button; a closed one stays focusable
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
- **ShareLink.** The Build's Share link, `/#b=<Build code>`, read-only, with one copy action. Its props are a union
  of its own, so a consumer can't show a half-made link: `making` shows "Making the link…" with Copy off, `ready`
  carries the `url`, and `failed` shows why there is no link, with Copy off. Copying says "Link copied." until the
  link changes; when the clipboard refuses, the text is selected instead. The code is never shortened. Its props are a
  union, so they are an exported type rather than an interface.
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

- `CascadePreview` never grows past the screen: the dialog is capped at the viewport's height, its list of cleared picks scrolls, and the actions stay pinned below it.

- `tokens.css` is the only file under `src/` that writes a color; everything else uses its custom properties
  (a convention, checked in review). It sets `color-scheme: dark`, so native controls (selects, scrollbars, date
  pickers) draw dark too.
- `components.css` is the published `components/bundle.css`, unchanged apart from dropping its comments. Every value
  comes from `tokens.css`, and every class has the `ww-` prefix. Its sections follow the components: Button, Kbd,
  Badge, LevelRow (the Timeline, its rows and chips, and `ww-rank`, a Mythic rank at its Rank level), PickerOption,
  Refusal, the picker panel heading and the closed count, CascadePreview, ShareLink, CompareToggle, StatBlock and
  PickerSheet.
- `gallery.css` lays out the gallery page.

## Tests

None of its own. The planner's tests (`src/planner/planner.test.tsx`) render these components in use.
