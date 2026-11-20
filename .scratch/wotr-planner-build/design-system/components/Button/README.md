# Button

**Variants:**
- `--primary` (`gold` with `on-gold`): one per view, for the main action.
- The default (`surface-200`): everything else.
- `--ghost`: quiet actions like Undo and Cancel.
- `--danger`: an action that clears picks.

**States:** disabled drops to `ink-subtle` on `surface-100`. Height is 36px, or 44px on touch screens.

**Do:**
- Label with the verb and its object ("Clear level 4").
- Add a `Kbd` hint when there's a shortcut.

**Don't:** use `--danger` for anything that can be undone without loss. Undo covers those.
