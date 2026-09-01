/**
 * Indicative SMB sector revenue-growth benchmarks for underwriting suggestions.
 * Not forecasts — starting points buyers can accept, tighten, or override.
 *
 * Ranges are annual revenue CAGR % (percent points, e.g. 4 = 4%/yr).
 */
import { matchIndustryKey, INDUSTRY_LABELS } from './industryMatcher.js';

function num(v, fallback = 0) {
  if (v == null || v === '') return fallback;
  if (typeof v === 'object' && v !== null && 'value' in v) return num(v.value, fallback);
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,%]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function unwrap(f) {
  return num(f);
}

/** @type {Record<string, { conservative: number, baseline: number, optimistic: number, note: string }>} */
export const SECTOR_GROWTH_BENCHMARKS = {
  restaurant: {
    conservative: 0,
    baseline: 3,
    optimistic: 6,
    note: 'Mature QSRs often track inflation; concept growth or new units drive upside.'
  },
  healthcare: {
    conservative: 2,
    baseline: 5,
    optimistic: 9,
    note: 'Dental / medspa / specialty clinics often mid-single-digit with provider capacity upside.'
  },
  saas: {
    conservative: 5,
    baseline: 15,
    optimistic: 30,
    note: 'Wide band — use contract ARR and churn; 15% is a tempered SMB SaaS baseline.'
  },
  services: {
    conservative: 2,
    baseline: 6,
    optimistic: 12,
    note: 'HVAC / plumbing / field services often grow with crews and route density.'
  },
  environmental: {
    conservative: 2,
    baseline: 7,
    optimistic: 14,
    note: 'Remediation / lab / soil testing can outgrow GDP when regs or territories expand.'
  },
  manufacturing: {
    conservative: 0,
    baseline: 3,
    optimistic: 7,
    note: 'Industrial demand is cyclical; baseline near GDP unless backlog supports more.'
  },
  construction: {
    conservative: -2,
    baseline: 4,
    optimistic: 10,
    note: 'Project businesses are lumpy — conservative should stress a soft bid year.'
  },
  auto: {
    conservative: 1,
    baseline: 4,
    optimistic: 8,
    note: 'Repair / car wash tend to track vehicle miles and local population.'
  },
  retail: {
    conservative: -1,
    baseline: 3,
    optimistic: 8,
    note: 'Brick-and-mortar slow; e-commerce can justify higher optimistic.'
  },
  franchise: {
    conservative: 1,
    baseline: 4,
    optimistic: 8,
    note: 'Often capped by territory; use franchisor system comps when available.'
  },
  generic: {
    conservative: 0,
    baseline: 4,
    optimistic: 8,
    note: 'Default SMB band when industry is unknown — refine once sector is set.'
  }
};

/**
 * CAGR of revenue across historical year rows.
 * @returns {{ cagrPct: number|null, yearsUsed: number, fromYear: number|null, toYear: number|null }}
 */
export function historicalRevenueCagr(historicals = []) {
  const rows = (historicals || [])
    .map((h) => ({
      year: num(h.year),
      revenue: unwrap(h.revenue)
    }))
    .filter((h) => h.year > 0 && h.revenue > 0)
    .sort((a, b) => a.year - b.year);

  if (rows.length < 2) {
    return { cagrPct: null, yearsUsed: rows.length, fromYear: null, toYear: null };
  }

  const first = rows[0];
  const last = rows[rows.length - 1];
  const periods = last.year - first.year;
  if (periods <= 0 || first.revenue <= 0) {
    return { cagrPct: null, yearsUsed: rows.length, fromYear: first.year, toYear: last.year };
  }

  const cagr = Math.pow(last.revenue / first.revenue, 1 / periods) - 1;
  return {
    cagrPct: Number.isFinite(cagr) ? Math.round(cagr * 1000) / 10 : null, // 1 decimal %
    yearsUsed: rows.length,
    fromYear: first.year,
    toYear: last.year,
    fromRevenue: first.revenue,
    toRevenue: last.revenue
  };
}

/**
 * Blend sector benchmark with deal historical CAGR when available.
 * Historical CAGR anchors baseline; conservative/optimistic stay sector-shaped around it.
 */
export function suggestGrowthAssumptions({ industry = '', historicals = [] } = {}) {
  const industryKey = matchIndustryKey(industry);
  const sector = SECTOR_GROWTH_BENCHMARKS[industryKey] || SECTOR_GROWTH_BENCHMARKS.generic;
  const hist = historicalRevenueCagr(historicals);

  let baseline = sector.baseline;
  let conservative = sector.conservative;
  let optimistic = sector.optimistic;
  const rationale = [];

  rationale.push({
    type: 'sector',
    industryKey,
    label: INDUSTRY_LABELS[industryKey] || industryKey,
    ...sector
  });

  if (hist.cagrPct != null) {
    rationale.push({
      type: 'historical_cagr',
      cagrPct: hist.cagrPct,
      fromYear: hist.fromYear,
      toYear: hist.toYear,
      yearsUsed: hist.yearsUsed,
      note: `Deal revenue CAGR ${hist.fromYear}–${hist.toYear}: ${hist.cagrPct}%/yr`
    });
    // Anchor baseline near historical, clamp to sensible underwriting band
    baseline = Math.round(Math.max(-5, Math.min(40, hist.cagrPct)) * 10) / 10;
    // Keep scenario spread similar to sector deltas
    const up = sector.optimistic - sector.baseline;
    const down = sector.baseline - sector.conservative;
    optimistic = Math.round((baseline + Math.max(2, up)) * 10) / 10;
    conservative = Math.round((baseline - Math.max(2, down)) * 10) / 10;
  } else {
    rationale.push({
      type: 'historical_cagr',
      cagrPct: null,
      note: 'Add 2+ years of historical revenue to compute deal CAGR and refine suggestions.'
    });
  }

  return {
    industryKey,
    industryLabel: INDUSTRY_LABELS[industryKey] || 'Generic',
    dealIndustry: industry || null,
    suggested: {
      growthConservativePct: conservative,
      growthBaselinePct: baseline,
      growthOptimisticPct: optimistic
    },
    sectorBenchmark: {
      growthConservativePct: sector.conservative,
      growthBaselinePct: sector.baseline,
      growthOptimisticPct: sector.optimistic,
      note: sector.note
    },
    historicalCagr: hist,
    rationale
  };
}
