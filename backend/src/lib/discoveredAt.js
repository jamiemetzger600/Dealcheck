/**
 * saved_deals.discovered_at is BIGINT (epoch ms).
 * Overview edits send HTML date values like "2026-09-02".
 */
export function coerceDiscoveredAt(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{10}$/.test(s)) return Number(s) * 1000;
  if (/^\d{13}$/.test(s)) return Number(s);
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return parsed;
  console.warn('[deals] could not coerce discovered_at', { value });
  return null;
}
