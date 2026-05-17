export const GUEST_PREVIEW_CHAR_LIMIT = 120;

export function truncateDescription(text, limit = GUEST_PREVIEW_CHAR_LIMIT) {
  const full = String(text || '').replace(/\s+/g, ' ').trim();
  if (!full || full.length <= limit) return full;
  let cut = limit;
  const lastSpace = full.lastIndexOf(' ', limit);
  if (lastSpace > limit * 0.6) cut = lastSpace;
  return full.slice(0, cut).trim();
}

/** Redact listing + broker fields for unauthenticated API consumers. */
export function sanitizeMarketDealRow(row, isAuthenticated) {
  if (isAuthenticated || !row) return row;
  const out = { ...row };
  const rawDesc = String(out.description || '').replace(/\s+/g, ' ').trim();
  const truncated = truncateDescription(out.description);
  out.description = truncated;
  out.description_truncated = Boolean(rawDesc && truncated.length < rawDesc.length);
  out.listing_url = null;
  out.broker_name = null;
  out.broker_company = null;
  out.broker_email = null;
  out.broker_contact = null;
  return out;
}
