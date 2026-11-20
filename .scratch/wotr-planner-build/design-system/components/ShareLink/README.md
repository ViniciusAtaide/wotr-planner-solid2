# ShareLink

The Build's Share link, `/#b=<Build code>`, read-only, with one copy action.

**Markup:** `.ww-share` holds a read-only `input` set in `mono`, and a primary button.

**The consumer provides:** the current Build code from C. When copying succeeds, show "Link copied." If the clipboard refuses, select the text.

**Don't:** shorten the code or send it to a link service. The Build lives in the link.
