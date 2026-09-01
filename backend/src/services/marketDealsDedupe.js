/**
 * Collapse duplicate market_deals rows (same listing URL, source+source_id,
 * or syndicated copies with the same financials + location).
 * Repoints saved_deals.market_deal_id before delete so CRM FK is not violated.
 */

import { listingFingerprintSql } from '../lib/listingFingerprint.js';

function fingerprintKeepOrderSql(alias = 'md') {
  const p = alias ? `${alias}.` : '';
  return `
    CASE WHEN saved.market_deal_id IS NOT NULL THEN 0 ELSE 1 END,
    CASE WHEN ${p}listing_url ILIKE '%bizbuysell.com%' THEN 0 ELSE 1 END,
    ${p}source_added_at DESC NULLS LAST,
    ${p}id DESC
  `;
}

function urlPartitionExpr(alias = 'md') {
  return `lower(trim(split_part(${alias}.listing_url, '#', 1)))`;
}

export async function repointSavedDealsForSourceIdDuplicates(client, source = null) {
  const sourceFilter = source ? 'WHERE md.source = $1' : '';
  const params = source ? [source] : [];
  const result = await client.query(
    `UPDATE saved_deals sd
     SET market_deal_id = d.keep_id
     FROM (
       SELECT md.id AS dup_id,
         MAX(md.id) OVER (PARTITION BY md.source, md.source_id) AS keep_id
       FROM market_deals md
       ${sourceFilter}
     ) d
     WHERE sd.market_deal_id = d.dup_id
       AND d.dup_id <> d.keep_id`,
    params
  );
  return result.rowCount ?? 0;
}

export async function repointSavedDealsForUrlDuplicates(client, source = null) {
  const sourceFilter = source ? 'AND md.source = $1' : '';
  const params = source ? [source] : [];
  const result = await client.query(
    `UPDATE saved_deals sd
     SET market_deal_id = d.keep_id
     FROM (
       SELECT md.id AS dup_id,
         MAX(md.id) OVER (PARTITION BY ${urlPartitionExpr('md')}) AS keep_id
       FROM market_deals md
       WHERE md.listing_url IS NOT NULL AND trim(md.listing_url) <> ''
       ${sourceFilter}
     ) d
     WHERE sd.market_deal_id = d.dup_id
       AND d.dup_id <> d.keep_id`,
    params
  );
  return result.rowCount ?? 0;
}

export async function deleteSourceIdDuplicateMarketDeals(client, source = null) {
  const sourceFilter = source ? 'AND source = $1' : '';
  const params = source ? [source] : [];
  const result = await client.query(
    `DELETE FROM market_deals md
     WHERE md.id IN (
       SELECT id FROM (
         SELECT id,
           ROW_NUMBER() OVER (PARTITION BY source, source_id ORDER BY id DESC) AS rn
         FROM market_deals
         WHERE 1=1 ${sourceFilter}
       ) sub WHERE rn > 1
     )`,
    params
  );
  return result.rowCount ?? 0;
}

export async function deleteUrlDuplicateMarketDeals(client, source = null) {
  const sourceFilter = source ? 'AND source = $1' : '';
  const params = source ? [source] : [];
  const result = await client.query(
    `DELETE FROM market_deals md
     WHERE md.id IN (
       SELECT id FROM (
         SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY ${urlPartitionExpr('market_deals')}
             ORDER BY id DESC
           ) AS rn
         FROM market_deals
         WHERE listing_url IS NOT NULL AND trim(listing_url) <> ''
         ${sourceFilter}
       ) sub WHERE rn > 1
     )`,
    params
  );
  return result.rowCount ?? 0;
}

export async function repointSavedDealsForFingerprintDuplicates(client, source = null) {
  const fp = listingFingerprintSql('md');
  const sourceFilter = source ? 'AND md.source = $1' : '';
  const params = source ? [source] : [];
  const result = await client.query(
    `UPDATE saved_deals sd
     SET market_deal_id = d.keep_id
     FROM (
       SELECT md.id AS dup_id,
         FIRST_VALUE(md.id) OVER (
           PARTITION BY (${fp})
           ORDER BY ${fingerprintKeepOrderSql('md')}
         ) AS keep_id
       FROM market_deals md
       LEFT JOIN (
         SELECT DISTINCT market_deal_id
         FROM saved_deals
         WHERE market_deal_id IS NOT NULL
       ) saved ON saved.market_deal_id = md.id
       WHERE (${fp}) IS NOT NULL
       ${sourceFilter}
     ) d
     WHERE sd.market_deal_id = d.dup_id
       AND d.dup_id <> d.keep_id`,
    params
  );
  return result.rowCount ?? 0;
}

export async function deleteFingerprintDuplicateMarketDeals(client, source = null) {
  const fp = listingFingerprintSql('md');
  const sourceFilter = source ? 'AND md.source = $1' : '';
  const params = source ? [source] : [];
  const result = await client.query(
    `DELETE FROM market_deals md
     WHERE md.id IN (
       SELECT id FROM (
         SELECT md.id,
           ROW_NUMBER() OVER (
             PARTITION BY (${fp})
             ORDER BY ${fingerprintKeepOrderSql('md')}
           ) AS rn
         FROM market_deals md
         LEFT JOIN (
           SELECT DISTINCT market_deal_id
           FROM saved_deals
           WHERE market_deal_id IS NOT NULL
         ) saved ON saved.market_deal_id = md.id
         WHERE (${fp}) IS NOT NULL
         ${sourceFilter}
       ) sub WHERE rn > 1
     )`,
    params
  );
  return result.rowCount ?? 0;
}

/** Full FK-safe dedupe pass. Idempotent when already clean. */
export async function dedupeMarketDeals(client, { source = null } = {}) {
  const repointedSource = await repointSavedDealsForSourceIdDuplicates(client, source);
  const deletedSource = await deleteSourceIdDuplicateMarketDeals(client, source);
  const repointedUrl = await repointSavedDealsForUrlDuplicates(client, source);
  const deletedUrl = await deleteUrlDuplicateMarketDeals(client, source);
  const repointedFp = await repointSavedDealsForFingerprintDuplicates(client, source);
  const deletedFp = await deleteFingerprintDuplicateMarketDeals(client, source);
  const summary = {
    repointedSource,
    deletedSource,
    repointedUrl,
    deletedUrl,
    repointedFp,
    deletedFp,
    totalDeleted: deletedSource + deletedUrl + deletedFp
  };
  if (summary.totalDeleted > 0 || repointedSource + repointedUrl + repointedFp > 0) {
    console.log('[marketDealsDedupe]', summary);
  }
  return summary;
}
