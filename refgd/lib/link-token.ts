/**
 * The `[label](url)` hyperlink grammar, in ONE place.
 *
 * A label is not plain text: anything the sender selected in the composer can
 * end up inside it, including a `[ce:<id>:<alt>]` custom emoji or an `[m:]`
 * mention token. So the label allows one level of nested brackets — without
 * it, `[[m:1:@Name]](https://t.me/name)` parsed as a link starting at the
 * INNER bracket and the message rendered as `[` + mention + `](url)`.
 *
 * Every consumer (renderer, composer edit bridge, preview-URL extraction,
 * row previews, mention rewriting) must use these sources so a label that
 * one layer accepts can never be mis-parsed by the next.
 */

/** One label unit: a bracketed token, or any char that isn't a bracket/newline. */
const LABEL_UNIT = "(?:\\[[^\\]\\n]*\\]|[^\\]\\n\\[])";

/** `[label](https://…)` — group 1 = label, group 2 = url. */
export const LINK_TOKEN_SRC = `\\[(${LABEL_UNIT}+?)\\]\\((https?:\\/\\/[^\\s)]+)\\)`;

/** Rose inline keyboard token — group 1 = label, 2 = url, 3 = optional ":same". */
export const BUTTON_URL_SRC = `\\[(${LABEL_UNIT}{1,64})\\]\\(buttonurl:\\/\\/([^\\s)]+?)(:same)?\\)`;

/** Either flavour, unanchored and uncaptured — for "skip this region" scans. */
export const ANY_LINK_TOKEN_SRC = `\\[(?:${LABEL_UNIT})+?\\]\\((?:https?|buttonurl):\\/\\/[^\\s)]*\\)`;

export const linkTokenRe = (flags = "") => new RegExp(LINK_TOKEN_SRC, flags);
export const buttonUrlRe = (flags = "") => new RegExp(BUTTON_URL_SRC, flags);
