/**
 * Same listing syndicated across BizBuySell / DealStream / BusinessMart / etc.
 * Match on exact financials plus city/state. Rows without usable numbers+location
 * get a NULL fingerprint and are never collapsed.
 */
export function listingFingerprintSql(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `CASE
    WHEN ${p}asking_price > 0 AND ${p}annual_profit > 0 AND ${p}annual_revenue > 0
      AND (
        NULLIF(BTRIM(COALESCE(${p}city, '')), '') IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(${p}state, '')), '') IS NOT NULL
      )
    THEN concat_ws('|',
      ROUND(${p}asking_price)::bigint,
      ROUND(${p}annual_profit)::bigint,
      ROUND(${p}annual_revenue)::bigint,
      lower(BTRIM(COALESCE(${p}city, ''))),
      lower(BTRIM(COALESCE(${p}state, '')))
    )
    ELSE NULL
  END`;
}

export function listingDedupeKeySql(alias = '') {
  const idCol = alias ? `${alias}.id` : 'id';
  return `COALESCE(${listingFingerprintSql(alias)}, 'id:' || ${idCol}::text)`;
}
