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
 * Ranking, among the rows that do match: a hit in the first field (by
 * convention the title) outweighs a hit in a later field, and a hit nearer the
 * start of a field outweighs one further in. The returned score is the mean of
 * the per-token bests, so it stays comparable regardless of token count.
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

  const fields = (
    keywords && keywords.length > 0 ? keywords : [value]
  ).map((field) => field.toLowerCase());
  const tokens = query.split(/\s+/);

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    fields.forEach((field, index) => {
      const at = field.indexOf(token);
      if (at === -1) return;
      const fieldWeight = index === 0 ? 2 : 1;
      const positionScore = 1 / (1 + at);
      best = Math.max(best, fieldWeight * positionScore);
    });
    if (best === 0) return 0;
    total += best;
  }

  return total / tokens.length;
}
