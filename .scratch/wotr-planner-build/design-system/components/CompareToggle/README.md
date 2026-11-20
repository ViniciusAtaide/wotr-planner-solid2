# CompareToggle

A segmented control. On a phone it switches which Build compare shows. On desktop it adds "Side by side".

**Markup:** `.ww-segment` holds buttons with `aria-pressed`. The pressed one sits on `surface-300` with a `gold` underline.

**The consumer provides:** the Builds being compared (a Build and its fork) and the current view.

**Don't:** use it for more than four segments.
