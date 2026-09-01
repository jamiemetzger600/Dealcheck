#!/usr/bin/env node
import pool from '../src/db/pool.js';
import { dedupeMarketDeals } from '../src/services/marketDealsDedupe.js';

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const summary = await dedupeMarketDeals(client);
  await client.query('COMMIT');
  console.log('[dedupe-market-deals] done', summary);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('[dedupe-market-deals] failed', err);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
