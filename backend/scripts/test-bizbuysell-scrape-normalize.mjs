#!/usr/bin/env node
/**
 * Test BizBuySell scrape → market_deals normalization against a scrape JSON file.
 *
 * Usage:
 *   node backend/scripts/test-bizbuysell-scrape-normalize.mjs [path-to-scrape.json]
 *
 * Default input: ~/bizbuysell-today-2026-07-02.json
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  normalizeBizBuySellScrape,
  validateMarketDealShape,
  parseBizBuySellLocation,
  SOURCE_KEY,
} from '../src/services/bizbuysellScrapeNormalizer.js';

const defaultInput = path.join(os.homedir(), 'bizbuysell-today-2026-07-02.json');
const inputPath = path.resolve(process.argv[2] || defaultInput);

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const result = normalizeBizBuySellScrape(payload);

console.log('=== BizBuySell → Aggregator normalization test ===');
console.log(`Input:  ${inputPath}`);
console.log(`Source: ${SOURCE_KEY}`);
console.log(`Scrape date: ${payload.date || '(none)'}`);
console.log(`Input listings:  ${result.inputCount}`);
console.log(`Output deals:    ${result.outputCount}`);
console.log(`Skipped:         ${result.skipped}`);

const invalid = [];
for (const deal of result.deals) {
  const check = validateMarketDealShape(deal);
  if (!check.valid) invalid.push({ id: deal.source_id, missing: check.missing });
}

if (invalid.length > 0) {
  console.error(`\n❌ ${invalid.length} deals failed shape validation`);
  console.error(invalid.slice(0, 5));
  process.exit(1);
}

console.log('\n✅ All deals match market_deals schema fields');

const withPrice = result.deals.filter((d) => d.asking_price != null).length;
const withProfit = result.deals.filter((d) => d.annual_profit != null).length;
const withLocation = result.deals.filter((d) => d.city || d.county || d.state).length;
const franchises = result.deals.filter((d) => d.franchise === 'Yes').length;

const typeCounts = {};
for (const deal of result.deals) {
  const tag = deal.industries?.[0] || 'Unknown';
  typeCounts[tag] = (typeCounts[tag] || 0) + 1;
}

console.log('\n--- Coverage ---');
console.log(`Asking price:   ${withPrice}/${result.outputCount}`);
console.log(`Annual profit:  ${withProfit}/${result.outputCount}`);
console.log(`Location parsed: ${withLocation}/${result.outputCount}`);
console.log(`Franchises:     ${franchises}`);
console.log('Listing types:', typeCounts);

console.log('\n--- Sample normalized deals (first 5) ---');
for (const deal of result.deals.slice(0, 5)) {
  console.log(JSON.stringify({
    source: deal.source,
    source_id: deal.source_id,
    name: deal.name,
    listing_url: deal.listing_url,
    industries: deal.industries,
    asking_price: deal.asking_price,
    annual_profit: deal.annual_profit,
    profit_multiple: deal.profit_multiple,
    city: deal.city,
    county: deal.county,
    state: deal.state,
    franchise: deal.franchise,
    source_added_at: deal.source_added_at,
  }, null, 2));
  console.log('---');
}

console.log('\n--- Location parser samples ---');
for (const loc of ['Seattle, WA', 'Kitsap County, WA', 'Pennsylvania', 'Available Nationwide']) {
  console.log(`${loc} →`, parseBizBuySellLocation(loc));
}

const outPath = path.join(path.dirname(inputPath), `vettr-${path.basename(inputPath)}`);
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`\nWrote normalized output: ${outPath}`);
