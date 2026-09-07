/**
 * Stricter replacement for cmdk's default subsequence scorer, used by the
 * command palette.
 *
 * cmdk's built-in filter scores loose subsequence matches, so a short query
 * like "test" matches almost every row (its letters appear scattered through
 * most titles / content previews). This instead requires every
 * whitespace-separated token in the query to appear as a literal,
 * case-insensitive **substring** of one of the row's fields; a row missing any
 * token is filtered out entirely (score 0).
 *
 * Matching is **binary** — every row that matches gets the same score. cmdk
 * sorts visible rows by descending score, so a graded score reorders the list
 * on every keystroke (a title hit jumping above a body hit, an earlier match
 * jumping above a later one), which reads as flicker. With one score for all
 * matches that sort is a no-op and rows keep the order they were rendered in:
 * items newest-first, then collections.
 *
 * Signature matches cmdk's `filter` prop: `(value, search, keywords?)`. When a
 * row supplies `keywords` those are the fields searched (the raw `value` is
 * ignored); otherwise `value` is the sole field.
 */
export function commandFilter(
  value: string,
  search: string,
  keywords?: string[],
): number {
  const query = search.trim().toLowerCase();
  if (!query) return 1;

  // Tokens never contain whitespace, so joining the fields with a space can't
  // let a token match across a field boundary — this stays a per-field
  // substring test, just without per-field ranking.
  const haystack = (keywords && keywords.length > 0 ? keywords : [value])
    .join(" ")
    .toLowerCase();

  const tokens = query.split(/\s+/);
  return tokens.every((token) => haystack.includes(token)) ? 1 : 0;
}
