import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

const ALLOWED_SORTS = [
  'source_added_at', 'source_updated_at', 'asking_price',
  'annual_revenue', 'annual_profit', 'profit_multiple',
  'revenue_multiple', 'years_established', 'name',
];

/** Build ORDER BY from `sort_spec=col:dir,col:dir` (whitelist only; skips unknown / duplicate columns). */
function buildOrderByFromSortSpec(sortSpec) {
  if (sortSpec == null || typeof sortSpec !== 'string') return null;
  const raw = sortSpec.trim();
  if (!raw) return null;
  const segments = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const parts = [];
  const used = new Set();
  for (const seg of segments) {
    const colon = seg.indexOf(':');
    if (colon <= 0) continue;
    const rawCol = seg.slice(0, colon).trim();
    const rawDir = seg.slice(colon + 1).trim();
    if (!ALLOWED_SORTS.includes(rawCol)) continue;
    if (used.has(rawCol)) continue;
    used.add(rawCol);
    const dir = rawDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    parts.push(`${rawCol} ${dir} NULLS LAST`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/** Build ORDER BY with optional secondary key (legacy `sort2` / `order2`). */
function buildMarketDealsOrderBy(sort, order, sort2, order2) {
  const col1 = ALLOWED_SORTS.includes(sort) ? sort : 'source_added_at';
  const dir1 = String(order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const parts = [`${col1} ${dir1} NULLS LAST`];

  if (sort2 && ALLOWED_SORTS.includes(String(sort2))) {
    const col2 = String(sort2);
    if (col2 !== col1) {
      const dir2 = String(order2 || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      parts.push(`${col2} ${dir2} NULLS LAST`);
    }
  }

  return parts.join(', ');
}

const MAX_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 50;

// GET /api/market-deals — server-side paginated, filtered, sorted, searchable
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      per_page = DEFAULT_PER_PAGE,
      search,
      source,
      state,
      min_price,
      max_price,
      min_revenue,
      max_revenue,
      min_profit,
      max_profit,
      industry,
      min_years,
      max_years,
      franchise,
      remote,
      sort = 'source_added_at',
      order = 'desc',
      sort_spec,
      sort2,
      order2,
      exclude_ids,
      exclude_keywords,
      updated_after,
      ids,
      first_seen_after,
      first_seen_before,
    } = req.query;

    const conditions = ['is_active = true'];
    const params = [];
    let idx = 1;

    const restrictIds = ids
      ? String(ids)
          .split(',')
          .map((n) => Number(String(n).trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
          .slice(0, 400)
      : [];
    if (restrictIds.length > 0) {
      conditions.push(`id = ANY($${idx++})`);
      params.push(restrictIds);
    }

    // Text search (trigram ILIKE on name + description)
    if (search && search.trim()) {
      const terms = search.trim().split(/\s*&\s*/).filter(Boolean);
      for (const term of terms) {
        conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
        params.push(`%${term}%`);
        idx++;
      }
    }

    // Source filter
    if (source) {
      const sources = source.split(',').map(s => s.trim()).filter(Boolean);
      if (sources.length === 1) {
        conditions.push(`source = $${idx++}`);
        params.push(sources[0]);
      } else if (sources.length > 1) {
        conditions.push(`source = ANY($${idx++})`);
        params.push(sources);
      }
    }

    // State filter (comma-separated)
    if (state) {
      const states = state.split(',').map(s => s.trim()).filter(Boolean);
      if (states.length === 1) {
        conditions.push(`state = $${idx++}`);
        params.push(states[0]);
      } else if (states.length > 1) {
        conditions.push(`state = ANY($${idx++})`);
        params.push(states);
      }
    }

    // Price range
    if (min_price) {
      conditions.push(`asking_price >= $${idx++}`);
      params.push(Number(min_price));
    }
    if (max_price) {
      conditions.push(`asking_price <= $${idx++}`);
      params.push(Number(max_price));
    }

    // Revenue range
    if (min_revenue) {
      conditions.push(`annual_revenue >= $${idx++}`);
      params.push(Number(min_revenue));
    }
    if (max_revenue) {
      conditions.push(`annual_revenue <= $${idx++}`);
      params.push(Number(max_revenue));
    }

    // Profit range
    if (min_profit) {
      conditions.push(`annual_profit >= $${idx++}`);
      params.push(Number(min_profit));
    }
    if (max_profit) {
      conditions.push(`annual_profit <= $${idx++}`);
      params.push(Number(max_profit));
    }

    // Industry (match against TEXT[] column)
    if (industry) {
      const industries = industry.split(',').map(s => s.trim()).filter(Boolean);
      if (industries.length === 1) {
        conditions.push(`$${idx++} = ANY(industries)`);
        params.push(industries[0]);
      } else if (industries.length > 1) {
        conditions.push(`industries && $${idx++}`);
        params.push(industries);
      }
    }

    // Years established range
    if (min_years) {
      conditions.push(`years_established >= $${idx++}`);
      params.push(Number(min_years));
    }
    if (max_years) {
      conditions.push(`years_established <= $${idx++}`);
      params.push(Number(max_years));
    }

    // Franchise filter
    if (franchise) {
      conditions.push(`franchise ILIKE $${idx++}`);
      params.push(franchise === 'yes' ? '%Yes%' : '%No%');
    }

    // Remote filter
    if (remote) {
      conditions.push(`remote_relocatable ILIKE $${idx++}`);
      params.push(remote === 'yes' ? '%Yes%' : '%No%');
    }

    // Exclude hidden deal IDs
    if (exclude_ids) {
      const ids = exclude_ids.split(',').map(Number).filter(n => !Number.isNaN(n) && n > 0);
      if (ids.length > 0) {
        conditions.push(`id != ALL($${idx++})`);
        params.push(ids);
      }
    }

    // Exclude listings whose name, description, industries, or location fields contain any keyword
    // (case-insensitive substring; aligns with shared/buyBoxMatcher dealPassesExcludeFilter)
    let excludeKeywordList = [];
    if (exclude_keywords && typeof exclude_keywords === 'string') {
      try {
        const parsed = JSON.parse(exclude_keywords);
        if (Array.isArray(parsed)) {
          excludeKeywordList = parsed
            .map((k) => String(k).trim())
            .filter(Boolean)
            .slice(0, 40)
            .map((k) => k.slice(0, 120));
        }
      } catch {
        /* ignore malformed JSON */
      }
    }
    if (excludeKeywordList.length > 0) {
      conditions.push(`NOT EXISTS (
        SELECT 1
        FROM unnest($${idx}::text[]) AS kw
        WHERE length(trim(kw)) > 0
          AND position(lower(trim(kw)) IN lower(concat_ws(' ',
            coalesce(market_deals.name, ''),
            coalesce(market_deals.description, ''),
            coalesce(array_to_string(market_deals.industries, ' '), ''),
            coalesce(market_deals.city, ''),
            coalesce(market_deals.state, ''),
            coalesce(market_deals.county, ''),
            coalesce(market_deals.country, '')
          ))) > 0
      )`);
      params.push(excludeKeywordList);
      idx++;
    }

    // Delta mode
    if (updated_after) {
      const ts = new Date(updated_after);
      if (!Number.isNaN(ts.getTime())) {
        conditions.push(`(source_added_at > $${idx} OR source_updated_at > $${idx})`);
        params.push(ts.toISOString());
        idx++;
      }
    }

    if (first_seen_after) {
      const ts = new Date(first_seen_after);
      if (!Number.isNaN(ts.getTime())) {
        conditions.push(`first_seen_at >= $${idx++}`);
        params.push(ts.toISOString());
      }
    }
    if (first_seen_before) {
      const ts = new Date(first_seen_before);
      if (!Number.isNaN(ts.getTime())) {
        conditions.push(`first_seen_at < $${idx++}`);
        params.push(ts.toISOString());
      }
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const specSql = buildOrderByFromSortSpec(sort_spec);
    const orderBySql =
      specSql || buildMarketDealsOrderBy(sort, order, sort2, order2);

    const safePage = Math.max(Number(page) || 1, 1);
    const safePerPage = Math.min(Math.max(Number(per_page) || DEFAULT_PER_PAGE, 1), MAX_PER_PAGE);
    const offset = (safePage - 1) * safePerPage;

    // Count total matching rows
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM market_deals ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch page
    params.push(safePerPage);
    params.push(offset);
    const result = await pool.query(
      `SELECT * FROM market_deals ${where}
       ORDER BY ${orderBySql}
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    // Compute max updated timestamp for delta sync
    let maxUpdatedAt = null;
    if (result.rows.length > 0) {
      const dates = result.rows
        .flatMap(r => [r.source_added_at, r.source_updated_at].filter(Boolean))
        .map(d => new Date(d).getTime());
      if (dates.length) maxUpdatedAt = new Date(Math.max(...dates)).toISOString();
    }

    res.set('Cache-Control', 'public, max-age=30');
    res.json({
      deals: result.rows,
      pagination: {
        page: safePage,
        per_page: safePerPage,
        total,
        total_pages: Math.ceil(total / safePerPage),
      },
      ...(maxUpdatedAt && { max_updated_at: maxUpdatedAt }),
    });
  } catch (err) {
    console.error('Market deals list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/market-deals/sources — list active sources with deal counts
router.get('/sources', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT source_key, display_name, source_type, scrape_enabled,
              scrape_cron, last_scrape_at, last_scrape_result, deal_count, created_at
       FROM deal_sources ORDER BY created_at`
    );
    res.json({ sources: result.rows });
  } catch (err) {
    console.error('Deal sources error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/market-deals/stats — quick summary for dashboard header
router.get('/stats', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_deals,
        COUNT(*) FILTER (WHERE source_added_at > NOW() - INTERVAL '24 hours') AS new_today,
        MAX(GREATEST(source_added_at, source_updated_at)) AS newest_deal_at
      FROM market_deals
      WHERE is_active = true
    `);

    const bySource = await pool.query(`
      SELECT source, COUNT(*) AS count
      FROM market_deals
      WHERE is_active = true
      GROUP BY source
      ORDER BY count DESC
    `);

    const row = result.rows[0];
    res.json({
      total_deals: parseInt(row.total_deals, 10),
      new_today: parseInt(row.new_today, 10),
      newest_deal_at: row.newest_deal_at,
      by_source: bySource.rows,
    });
  } catch (err) {
    console.error('Market deals stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
