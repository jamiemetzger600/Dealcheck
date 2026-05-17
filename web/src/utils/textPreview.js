export function normalizePreviewText(text) {
  if (text == null) return '';
  return String(text).replace(/\s+/g, ' ').trim();
}
/**
 * @returns {{ visible: string, remainder: string, hasMore: boolean, isTruncated: boolean, full: string }}
 * `isTruncated` is true when text hits the char limit (including API-truncated rows with no tail in the payload).
 */
export function truncateWithOverflow(text, limit = 120) {
  const full = normalizePreviewText(text);
  if (!full) {
    return { visible: '', remainder: '', hasMore: false, isTruncated: false, full: '' };
  }
  if (limit == null || limit <= 0) {
    return { visible: full, remainder: '', hasMore: false, isTruncated: false, full };
  }
  if (full.length <= limit) {
    const atCap = full.length >= limit;
    return {
      visible: full,
      remainder: '',
      hasMore: false,
      isTruncated: atCap,
      full,
    };
  }
  let cut = limit;
  if (full[limit] && full[limit] !== ' ') {
    const lastSpace = full.lastIndexOf(' ', limit);
    if (lastSpace > limit * 0.6) cut = lastSpace;
  }
  const visible = full.slice(0, cut).trim();
  const remainder = full.slice(cut).trim();
  return {
    visible,
    remainder,
    hasMore: remainder.length > 0,
    isTruncated: true,
    full,
  };
}
