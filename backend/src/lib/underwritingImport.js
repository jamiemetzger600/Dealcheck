/**
 * Mapping from parsed spreadsheet sheets → underwriting shared/path inputs.
 * Includes B-SOIL Quick Underwrite / P&L YoY sheet-aware extraction.
 * sheets: [{ name, rows: string[][] }]  (AOA)
 */

const LABEL_MAP = [
  { re: /purchase\s*price|asking\s*price|enterprise\s*value|^price$/i, mapsTo: 'purchasePrice', confidence: 'high' },
  { re: /starting\s*revenue|^(total\s*)?revenue|gross\s*sales|net\s*sales|ttm/i, mapsTo: 'startingRevenue', confidence: 'high' },
  { re: /adjusted\s*ebitda|^ebitda$|sde|seller.?s?\s*discretionary/i, mapsTo: 'startingEbitda', confidence: 'high' },
  { re: /ebitda\s*margin|margin\s*%/i, mapsTo: 'ebitdaMargin', confidence: 'medium' },
  { re: /owner\s*salary|owner\s*comp/i, mapsTo: 'ownerSalary', confidence: 'medium' },
  { re: /closing\s*cost/i, mapsTo: 'closingCosts', confidence: 'medium' },
  { re: /working\s*capital/i, mapsTo: 'workingCapitalInjection', confidence: 'medium' },
  { re: /sba\s*(interest\s*)?rate|bank\s*rate/i, mapsTo: 'sbaRate', confidence: 'medium' },
  { re: /seller\s*note\s*rate|seller\s*rate/i, mapsTo: 'sellerRate', confidence: 'medium' },
  { re: /exit\s*multiple\s*\(?\s*scenario\s*1|exit\s*multiple\s*#?\s*1/i, mapsTo: 'exitMultiple', confidence: 'high' },
  { re: /exit\s*multiple\s*\(?\s*scenario\s*2|exit\s*multiple\s*#?\s*2/i, mapsTo: 'exitMultiple2', confidence: 'high' },
  { re: /exit\s*multiple|sale\s*multiple/i, mapsTo: 'exitMultiple', confidence: 'medium' },
  { re: /preferred\s*return/i, mapsTo: 'preferredReturnPercent', confidence: 'medium' },
  { re: /investor\s*profit\s*share/i, mapsTo: 'investorProfitShare', confidence: 'medium' },
  { re: /owner\s*profit\s*share|sponsor\s*profit\s*share/i, mapsTo: 'sponsorProfitShare', confidence: 'medium' },
  { re: /revenue\s*growth/i, mapsTo: 'growthRate', confidence: 'medium' },
  { re: /capex|capital\s*expend/i, mapsTo: 'capexPercent', confidence: 'low' },
  { re: /\bqoe\b|quality\s*of\s*earnings/i, mapsTo: 'dealCostQoe', confidence: 'medium' },
  { re: /^legal\b/i, mapsTo: 'dealCostLegal', confidence: 'medium' },
  { re: /due\s*dill?igence/i, mapsTo: 'dealCostDd', confidence: 'medium' }
];

function parseNumber(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw).trim();
  if (!s || s === '-' || s === '—') return null;
  const neg = /^\(.*\)$/.test(s);
  const n = parseFloat(s.replace(/[$,%\s]/g, '').replace(/^\((.*)\)$/, '$1'));
  if (!Number.isFinite(n)) return null;
  let v = neg ? -n : n;
  if (/%/.test(s) && Math.abs(v) > 1) v = v / 100;
  return v;
}

function findSheet(sheets, re) {
  return (sheets || []).find((s) => re.test(String(s.name || '')));
}

function cell(rows, r, c) {
  return rows?.[r]?.[c];
}

/**
 * B-SOIL Quick Underwrite layout (labels in col A, values in col B; deal costs in D/E).
 */
export function extractSoilQuickUnderwrite(sheet) {
  const rows = sheet?.rows || [];
  const proposals = [];
  const push = (mapsTo, value, label, confidence = 'high', r = 0, c = 1) => {
    if (value == null || !Number.isFinite(value)) return;
    proposals.push({
      mapsTo,
      value,
      confidence,
      sourceLabel: `${sheet.name}!R${r + 1}C${c + 1}`,
      label,
      sheetHint: 'Quick Underwrite'
    });
  };

  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const label = String(cell(rows, r, 0) ?? '').trim();
    if (!label) continue;
    const b = parseNumber(cell(rows, r, 1));
    const c = parseNumber(cell(rows, r, 2));

    if (/^purchase\s*price/i.test(label) && b != null) push('purchasePrice', b, label, 'high', r, 1);
    if (/sba\s*interest\s*rate/i.test(label) && b != null) {
      push('sbaRate', b <= 1 ? b * 100 : b, label, 'high', r, 1);
    }
    if (/sba\s*term/i.test(label) && b != null) push('sbaTermYears', b, label, 'high', r, 1);
    if (/seller\s*note\s*rate/i.test(label) && b != null) {
      push('sellerRate', b <= 1 ? b * 100 : b, label, 'high', r, 1);
    }
    if (/seller\s*note\s*term/i.test(label) && b != null) push('sellerTermYears', b, label, 'high', r, 1);
    if (/starting\s*revenue/i.test(label) && b != null) push('startingRevenue', b, label, 'high', r, 1);
    if (/revenue\s*growth/i.test(label) && b != null) push('growthRate', b > 1 ? b / 100 : b, label, 'high', r, 1);
    if (/ebitda\s*margin/i.test(label) && b != null) push('ebitdaMargin', b > 1 ? b / 100 : b, label, 'high', r, 1);
    if (/^owner\s*salary/i.test(label) && b != null) push('ownerSalary', b, label, 'medium', r, 1);
    if (/^ebitda$/i.test(label) && b != null) push('startingEbitda', b, label, 'high', r, 1);
    if (/preferred\s*return/i.test(label) && b != null) {
      push('preferredReturnPercent', b <= 1 ? b * 100 : b, label, 'high', r, 1);
    }
    if (/investor\s*profit\s*share/i.test(label) && b != null) {
      push('investorProfitShare', b <= 1 ? b * 100 : b, label, 'high', r, 1);
    }
    if (/owner\s*profit\s*share/i.test(label) && b != null) {
      push('sponsorProfitShare', b <= 1 ? b * 100 : b, label, 'high', r, 1);
    }
    if (/exit\s*multiple.*scenario\s*1|exit\s*multiple\s*#?\s*1/i.test(label) && b != null) {
      push('exitMultiple', b, label, 'high', r, 1);
    }
    if (/exit\s*multiple.*scenario\s*2|exit\s*multiple\s*#?\s*2/i.test(label) && b != null) {
      push('exitMultiple2', b, label, 'high', r, 1);
    }

    // Stack % — prefer parenthetical in label (e.g. "SBA Loan (90%)"), else column C decimal
    const pctInLabel = label.match(/\((\d+(?:\.\d+)?)\s*%\)/);
    if (/aci\s*equity|^(buyer\s*)?equity\s*\(/i.test(label)) {
      const pct = pctInLabel ? Number(pctInLabel[1]) : c != null ? (c <= 1 ? c * 100 : c) : null;
      if (pct != null) push('equityPercent', pct, label, 'high', r, pctInLabel ? 0 : 2);
    }
    if (/sba\s*loan\s*\(/i.test(label)) {
      const pct = pctInLabel ? Number(pctInLabel[1]) : c != null ? (c <= 1 ? c * 100 : c) : null;
      if (pct != null) push('sbaPercent', pct, label, 'high', r, pctInLabel ? 0 : 2);
    }
    if (/seller\s*note\s*\(/i.test(label)) {
      const pct = pctInLabel ? Number(pctInLabel[1]) : c != null ? (c <= 1 ? c * 100 : c) : null;
      if (pct != null) push('sellerPercent', pct, label, 'high', r, pctInLabel ? 0 : 2);
    }

    // Deal costs in cols D/E
    const dLabel = String(cell(rows, r, 3) ?? '').trim();
    const eVal = parseNumber(cell(rows, r, 4));
    if (/^qoe/i.test(dLabel) && eVal != null) push('dealCostQoe', eVal, dLabel, 'high', r, 4);
    if (/^legal/i.test(dLabel) && eVal != null) push('dealCostLegal', eVal, dLabel, 'high', r, 4);
    if (/closing\s*cost/i.test(dLabel) && eVal != null) push('dealCostClosing', eVal, dLabel, 'high', r, 4);
    if (/due\s*dill?igence/i.test(dLabel) && eVal != null) push('dealCostDd', eVal, dLabel, 'high', r, 4);
    if (/working\s*capital/i.test(dLabel) && eVal != null) {
      push('workingCapitalInjection', eVal, dLabel, 'high', r, 4);
    }
  }

  return proposals;
}

/**
 * Lightweight P&L YoY → historical year stubs (gross revenue + tax return cols when present).
 */
export function extractSoilPnLYoY(sheet) {
  const rows = sheet?.rows || [];
  const proposals = [];
  // Row 4 in sample: Gross Revenue annual in col C (2023) and tax in col E; 2024 block starts col G
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const a = String(cell(rows, r, 0) ?? '').trim();
    if (/gross\s*revenue|gross\s*income/i.test(a)) {
      const y1 = parseNumber(cell(rows, r, 2));
      const tax1 = parseNumber(cell(rows, r, 4));
      const y2 = parseNumber(cell(rows, r, 8)) ?? parseNumber(cell(rows, r, 7));
      if (y1 != null) {
        proposals.push({
          mapsTo: 'historicalRevenue',
          value: y1,
          yearHint: new Date().getFullYear() - 2,
          confidence: 'medium',
          sourceLabel: `${sheet.name}!R${r + 1}C3`,
          label: a,
          sheetHint: 'P&L YoY'
        });
      }
      if (tax1 != null) {
        proposals.push({
          mapsTo: 'historicalTaxRevenue',
          value: tax1,
          yearHint: new Date().getFullYear() - 2,
          confidence: 'medium',
          sourceLabel: `${sheet.name}!R${r + 1}C5`,
          label: 'TAX RETURN NUMBER',
          sheetHint: 'P&L YoY'
        });
      }
      if (y2 != null) {
        proposals.push({
          mapsTo: 'historicalRevenue',
          value: y2,
          yearHint: new Date().getFullYear() - 1,
          confidence: 'low',
          sourceLabel: `${sheet.name}!R${r + 1}`,
          label: `${a} (later year)`,
          sheetHint: 'P&L YoY'
        });
      }
      // Also seed starting revenue from latest available
      const latest = y2 ?? y1;
      if (latest != null) {
        proposals.push({
          mapsTo: 'startingRevenue',
          value: latest,
          confidence: 'medium',
          sourceLabel: `${sheet.name}!gross`,
          label: 'Gross Revenue → startingRevenue',
          sheetHint: 'P&L YoY'
        });
      }
      break;
    }
  }
  return proposals;
}

export function proposeMappingsFromSheets(sheets = []) {
  const proposals = [];
  const seen = new Set();
  const unmappedSheets = [];

  const quick = findSheet(sheets, /quick\s*underwrite/i);
  const pnl = findSheet(sheets, /p\s*&\s*l\s*yoy|p&l\s*yoy|profit\s*&\s*loss\s*yoy/i);

  if (quick) {
    for (const p of extractSoilQuickUnderwrite(quick)) {
      const key = p.mapsTo + (p.yearHint || '');
      if (seen.has(key) && p.confidence !== 'high') continue;
      seen.add(key);
      proposals.push(p);
    }
  }
  if (pnl) {
    for (const p of extractSoilPnLYoY(pnl)) {
      const key = p.mapsTo + (p.yearHint || '') + (p.sourceLabel || '');
      if (seen.has(p.mapsTo) && !p.yearHint) continue;
      seen.add(key);
      proposals.push(p);
    }
  }

  for (const sheet of sheets) {
    const name = String(sheet.name || '');
    const known =
      /quick\s*underwrite/i.test(name) ||
      /p\s*&\s*l\s*yoy|p&l\s*yoy/i.test(name) ||
      /executive\s*summary/i.test(name) ||
      /amortization/i.test(name) ||
      /roi-/i.test(name);
    if (!known) {
      unmappedSheets.push({ name, rowCount: (sheet.rows || []).length });
    }

    // Generic label scan (skip if already covered by SOIL extractor for same key)
    const rows = sheet.rows || [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const label = String(row[c] ?? '').trim();
        if (!label || label.length > 80) continue;
        for (const rule of LABEL_MAP) {
          if (!rule.re.test(label)) continue;
          if (seen.has(rule.mapsTo)) continue;
          let value = parseNumber(row[c + 1]);
          let sourceLabel = `${sheet.name}!R${r + 1}C${c + 2}`;
          if (value == null && rows[r + 1]) {
            value = parseNumber(rows[r + 1][c]);
            sourceLabel = `${sheet.name}!R${r + 2}C${c + 1}`;
          }
          if (value == null) continue;
          if (rule.mapsTo === 'ebitdaMargin' && value > 1) value = value / 100;
          if (rule.mapsTo === 'capexPercent' && value > 1) value = value / 100;
          if (rule.mapsTo === 'sbaRate' && value <= 1) value = value * 100;
          if (rule.mapsTo === 'sellerRate' && value <= 1) value = value * 100;
          if (rule.mapsTo === 'preferredReturnPercent' && value <= 1) value = value * 100;
          if (rule.mapsTo === 'investorProfitShare' && value <= 1) value = value * 100;
          if (rule.mapsTo === 'sponsorProfitShare' && value <= 1) value = value * 100;
          seen.add(rule.mapsTo);
          proposals.push({
            mapsTo: rule.mapsTo,
            value,
            confidence: rule.confidence,
            sourceLabel,
            label,
            sheetHint: sheet.name
          });
        }
      }
    }
  }

  return { proposals, unmappedSheets, detectedSoil: Boolean(quick || pnl) };
}

/** Convert CSV text to sheets AOA */
export function parseCsvToSheet(name, text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.length);
  const rows = lines.map((line) => {
    const cells = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === ',' && !inQ) {
        cells.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    cells.push(cur);
    return cells;
  });
  return { name: name || 'Sheet1', rows };
}
