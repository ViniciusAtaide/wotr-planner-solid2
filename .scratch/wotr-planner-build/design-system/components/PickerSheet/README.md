# PickerSheet

On a phone, the picker opens as a full-screen sheet over the Timeline (map 13). A back button or back gesture closes it.

**Markup:** `section.ww-sheet` holds:
- `.ww-sheet__bar`: a back button and the slot heading;
- `.ww-sheet__body`: scrolls, and holds `PickerOption`s.

It floats, with `shadow-sheet`.

**The consumer provides:** the slot's options, as on desktop.

**Do:** keep every tap target at least 44px tall.

**Don't:** use the sheet on desktop. There, the picker is a side panel beside the Timeline.
