import express from 'express';
import pool from '../db/pool.js';
import { scrapeAirtable, getScraperStatus } from '../services/airtableScraper.js';

const router = express.Router();

// GET /api/airtable-deals — paginated list with optional filters
router.get('/', async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      state,
      min_price,
      max_price,
      industry,
      sort = 'airtable_added_at',
      order = 'desc',
    } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (state) {
      conditions.push(`state = $${idx++}`);
      params.push(state);
    }
    if (min_price) {
      conditions.push(`asking_price >= $${idx++}`);
      params.push(Number(min_price));
    }
    if (max_price) {
      conditions.push(`asking_price <= $${idx++}`);
      params.push(Number(max_price));
    }
    if (industry) {
      conditions.push(`$${idx++} = ANY(industries)`);
      params.push(industry);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist sortable columns
    const allowedSorts = [
      'airtable_added_at', 'airtable_updated_at', 'asking_price',
      'annual_revenue', 'annual_profit', 'profit_multiple',
      'revenue_multiple', 'years_established', 'name',
    ];
    const sortCol = allowedSorts.includes(sort) ? sort : 'airtable_added_at';
    const sortDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM airtable_deals ${where}`,
      params
    );

    params.push(safeLimit);
    params.push(safeOffset);

    const result = await pool.query(
      `SELECT * FROM airtable_deals ${where}
       ORDER BY ${sortCol} ${sortDir} NULLS LAST
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      deals: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit: safeLimit,
      offset: safeOffset,
    });
  } catch (err) {
    console.error('Airtable deals list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/airtable-deals/status — scraper health
router.get('/status', (_req, res) => {
  res.json(getScraperStatus());
});

// POST /api/airtable-deals/scrape — trigger a manual scrape
router.post('/scrape', async (_req, res) => {
  try {
    const result = await scrapeAirtable();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
