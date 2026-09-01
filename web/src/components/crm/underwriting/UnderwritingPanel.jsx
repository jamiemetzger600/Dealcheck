import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmAPI } from '../../../utils/api';
import './underwriting.css';

const MONEY = (n) => {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
};

const PCT = (n, digits = 1) => {
  if (n == null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
};

const X = (n) => (n == null || Number.isNaN(n) ? '—' : `${Number(n).toFixed(2)}x`);

function val(shared, key, fallback = '') {
  const v = shared?.[key];
  if (v && typeof v === 'object' && 'value' in v) return v.value ?? fallback;
  return v ?? fallback;
}

export default function UnderwritingPanel({
  dealId,
  canWrite = true,
  layout = 'crm',
  forcedTab = null,
  forcedStep = null,
  onMeta = null
}) {
  const isApp = layout === 'app';
  const [workbook, setWorkbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [pathId, setPathId] = useState(null);
  const [scenario, setScenario] = useState('base');
  const [tab, setTab] = useState('guided'); // guided | compare | sheets | outputs | import
  const [msg, setMsg] = useState('');
  const [importProposals, setImportProposals] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [selectedMappings, setSelectedMappings] = useState([]);
  const [unmappedSheets, setUnmappedSheets] = useState([]);
  const [reportPreview, setReportPreview] = useState(null); // { title, html, filename }

  const load = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError('');
    try {
      const res = await crmAPI.getUnderwriting(dealId);
      setWorkbook(res.workbook);
      const baseline = res.workbook.paths?.find((p) => p.isBaseline) || res.workbook.paths?.[0];
      setPathId(baseline?.id || null);
      setScenario(res.workbook.settings?.scenarioKey || 'base');
      if (!isApp) setTab('guided');
      console.log('[underwriting] loaded', { dealId, modelId: res.workbook.id, layout });
    } catch (err) {
      console.error('[underwriting] load failed', err);
      setError(err.message || 'Failed to load underwriting');
    } finally {
      setLoading(false);
    }
  }, [dealId, isApp, layout]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (forcedTab) setTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    if (forcedStep != null && Number.isFinite(Number(forcedStep))) {
      setStep(Number(forcedStep));
    }
  }, [forcedStep]);

  const activePath = useMemo(
    () => workbook?.paths?.find((p) => p.id === pathId) || workbook?.paths?.[0],
    [workbook, pathId]
  );

  const pathOutput = useMemo(() => {
    if (!workbook?.outputs?.pathResults || !activePath) return null;
    const byId = workbook.outputs.pathResults[activePath.id];
    return byId?.[scenario] || null;
  }, [workbook, activePath, scenario]);

  const evidenceCoverage = useMemo(() => {
    const links = workbook?.evidenceLinks || [];
    if (!links.length) return { total: 0, verified: 0, pct: 0 };
    const verified = links.filter((l) => l.status === 'verified' || l.status === 'received').length;
    return { total: links.length, verified, pct: Math.round((verified / links.length) * 100) };
  }, [workbook]);

  useEffect(() => {
    if (!onMeta || !workbook) return;
    onMeta({
      id: workbook.id,
      dealName: workbook.dealName,
      paths: workbook.paths,
      updatedAt: workbook.updatedAt,
      pathOutput,
      evidenceCoverage,
      canWrite,
      reload: load
    });
  }, [onMeta, workbook, pathOutput, evidenceCoverage, canWrite, load]);

  const persistShared = async (patch) => {
    if (!workbook || !canWrite) return;
    setSaving(true);
    setMsg('');
    try {
      const sharedInputs = { ...workbook.sharedInputs, ...patch };
      const res = await crmAPI.patchUnderwriting(workbook.id, { sharedInputs });
      setWorkbook(res.workbook);
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const persistPath = async (patch) => {
    if (!workbook || !activePath || !canWrite) return;
    setSaving(true);
    try {
      const res = await crmAPI.patchUwPath(workbook.id, activePath.id, { pathInputs: patch });
      setWorkbook(res.workbook);
    } catch (err) {
      setError(err.message || 'Path save failed');
    } finally {
      setSaving(false);
    }
  };

  const setUiMode = async (uiMode) => {
    if (!workbook || !canWrite) return;
    const res = await crmAPI.patchUnderwriting(workbook.id, { uiMode });
    setWorkbook(res.workbook);
  };

  const setScenarioKey = async (key) => {
    setScenario(key);
    if (!workbook || !canWrite) return;
    const res = await crmAPI.patchUnderwriting(workbook.id, {
      settings: { ...(workbook.settings || {}), scenarioKey: key }
    });
    setWorkbook(res.workbook);
  };

  const duplicatePath = async () => {
    if (!workbook || !activePath || !canWrite) return;
    setSaving(true);
    try {
      const res = await crmAPI.createUwPath(workbook.id, {
        duplicateFromId: activePath.id,
        name: `${activePath.name} variant`
      });
      setWorkbook(res.workbook);
      const newest = res.workbook.paths[res.workbook.paths.length - 1];
      setPathId(newest?.id);
      setTab('compare');
      setMsg('Duplicated structure path — tweak seller note, rates, or equity and compare.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveRevision = async () => {
    if (!workbook || !canWrite) return;
    setSaving(true);
    try {
      const res = await crmAPI.saveUwRevision(workbook.id, {
        label: `Saved ${new Date().toLocaleString()}`,
        changeSummary: `Scenario ${scenario}; path ${activePath?.name}`
      });
      setWorkbook(res.workbook);
      setMsg('Revision saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const requestEvidence = async (inputPath, title) => {
    if (!workbook || !canWrite) return;
    try {
      const res = await crmAPI.requestUwEvidenceDd(workbook.id, { inputPath, title });
      setWorkbook(res.workbook);
      setMsg(`DD item requested for ${inputPath}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const addCustomSheet = async () => {
    if (!workbook || !canWrite) return;
    const res = await crmAPI.upsertUwCustomSheet(workbook.id, {
      name: 'Custom sheet',
      rows: [{ label: 'Line item', value: 0, note: '', mapsTo: '' }]
    });
    setWorkbook(res.workbook);
    setTab('sheets');
  };

  const shareLive = async () => {
    if (!workbook || !canWrite) return;
    try {
      const res = await crmAPI.createUwShareLink(workbook.id, {
        label: 'Live underwriting',
        preferredPathId: activePath?.id
      });
      const url = `${window.location.origin}/underwriting/${res.link.token}`;
      await navigator.clipboard?.writeText(url);
      setMsg(`Live link copied: ${url}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const buildReportHtml = (mode) => {
    const cmp = workbook?.outputs?.comparison || [];
    const su = pathOutput?.sourcesAndUses;
    const ret = pathOutput?.returns;
    const title =
      mode === 'bank'
        ? 'Bank one-pager'
        : mode === 'compare'
          ? 'Structure path comparison'
          : 'Underwriting report';
    const slug =
      mode === 'bank' ? 'bank-one-pager' : mode === 'compare' ? 'path-comparison' : 'underwriting-report';
    const rows =
      mode === 'compare'
        ? `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px">
            <thead><tr><th>Metric</th>${cmp.map((c) => `<th>${c.name}</th>`).join('')}</tr></thead>
            <tbody>
              <tr><td>Purchase price</td>${cmp.map((c) => `<td>${MONEY(c.purchasePrice)}</td>`).join('')}</tr>
              <tr><td>Equity check</td>${cmp.map((c) => `<td>${MONEY(c.equityCheck)}</td>`).join('')}</tr>
              <tr><td>Seller mode</td>${cmp.map((c) => `<td>${c.sellerNoteMode}</td>`).join('')}</tr>
              <tr><td>Y1 DSCR</td>${cmp.map((c) => `<td>${X(c.year1Dscr)}</td>`).join('')}</tr>
              <tr><td>Y1 CoC</td>${cmp.map((c) => `<td>${PCT(c.year1Coc)}</td>`).join('')}</tr>
              <tr><td>Sponsor IRR</td>${cmp.map((c) => `<td>${PCT(c.sponsorIrr)}</td>`).join('')}</tr>
              <tr><td>Sponsor MOIC</td>${cmp.map((c) => `<td>${X(c.sponsorMoic)}</td>`).join('')}</tr>
              <tr><td>Exit equity</td>${cmp.map((c) => `<td>${MONEY(c.exitEquityValue)}</td>`).join('')}</tr>
            </tbody>
          </table>`
        : `<h2>${activePath?.name || 'Baseline'} · ${scenario}</h2>
           <p>Purchase ${MONEY(su?.purchasePrice)} · Equity ${MONEY(su?.equityAmount)} · SBA ${MONEY(su?.sbaAmount)} · Seller ${MONEY(su?.sellerAmount)}</p>
           <p>Sources ${MONEY(su?.sourcesTotal)} / Uses ${MONEY(su?.usesTotal)} ${su?.balanced ? '✓ balanced' : '⚠ unbalanced'}</p>
           <p>Y1 DSCR ${X(ret?.year1Dscr)} · CoC ${PCT(ret?.year1Coc)} · FCF ${MONEY(ret?.year1Fcf)}</p>
           <p>Investor IRR ${PCT(ret?.investor?.irr)} / MOIC ${X(ret?.investor?.moic)} · Sponsor IRR ${PCT(ret?.sponsor?.irr)} / MOIC ${X(ret?.sponsor?.moic)}</p>
           <p>Exit equity ${MONEY(pathOutput?.exit?.exitEquityValue)}</p>
           ${mode === 'bank' ? '<p><em>Confidential — for lending discussion only.</em></p>' : ''}`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body{font-family:Georgia,serif;padding:32px;color:#111;background:#fff}
        h1{font-size:22px;margin:0 0 12px}
        h2{font-size:16px;margin:0 0 12px}
        table{margin-top:16px}
        @media print{body{padding:12px}}
      </style>
      </head><body><h1>${title}</h1>${rows}</body></html>`;
    return { title, html, filename: `${slug}-${dealId || 'deal'}.html` };
  };

  const downloadReportHtml = (filename, html) => {
    // Never call window.print() here — it crashes Cursor's embedded browser (Electron).
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const openReport = (mode) => {
    if (!workbook) {
      setError('Underwriting workbook is not loaded yet');
      return;
    }
    const report = buildReportHtml(mode);
    setError('');
    setReportPreview(report);
    downloadReportHtml(report.filename, report.html);
    setMsg(`${report.title} ready — HTML downloaded. Open the file in Chrome/Safari and use File → Print for PDF.`);
    console.log('[underwriting] report export (no window.print)', { mode, filename: report.filename });
  };

  const onImportFile = async (file) => {
    if (!file || !workbook) return;
    setImportFileName(file.name);
    try {
      let res;
      if (/\.xlsx?$/i.test(file.name)) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const xlsxBase64 = btoa(binary);
        res = await crmAPI.previewUwImport(workbook.id, [], { xlsxBase64 });
      } else {
        const text = await file.text();
        const rows = text.split(/\r?\n/).map((line) => line.split(',').map((c) => c.replace(/^"|"$/g, '')));
        res = await crmAPI.previewUwImport(workbook.id, [{ name: file.name, rows }]);
      }
      setImportProposals(res.proposals || []);
      setSelectedMappings(res.proposals || []);
      setUnmappedSheets(res.unmappedSheets || []);
      setTab('import');
      setMsg(`Found ${(res.proposals || []).length} proposed mappings — review before applying.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const applyImport = async () => {
    if (!workbook || !canWrite) return;
    setSaving(true);
    try {
      const res = await crmAPI.applyUwImport(workbook.id, {
        mappings: selectedMappings,
        unmappedSheets,
        fileName: importFileName
      });
      setWorkbook(res.workbook);
      setMsg('Import applied — values flagged for your verification.');
      setTab('guided');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="uw-muted">Loading underwriting workbook…</p>;
  if (error && !workbook) {
    return (
      <div className="uw-panel">
        <p className="uw-error">{error}</p>
        <button type="button" className="btn-secondary" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!workbook) return null;

  const shared = workbook.sharedInputs || {};
  const warnings = pathOutput?.warnings || [];
  const dscr = pathOutput?.returns?.year1Dscr;
  const lendable = dscr != null && dscr >= 1.25;

  return (
    <div className={`uw-panel${isApp ? ' uw-panel--app' : ''}`}>
      {!isApp ? (
        <header className="uw-header">
          <div>
            <h3 className="uw-title">Underwriting</h3>
            <p className="uw-muted">
              One workbook for this deal · {workbook.paths?.length || 0} structure path(s)
              {evidenceCoverage.total ? ` · Evidence ${evidenceCoverage.verified}/${evidenceCoverage.total} (${evidenceCoverage.pct}%)` : ''}
            </p>
          </div>
          <div className="uw-header-actions">
            <select
              className="modal-input uw-select"
              value={workbook.uiMode || 'guided'}
              disabled={!canWrite}
              onChange={(e) => setUiMode(e.target.value)}
              aria-label="UI mode"
            >
              <option value="guided">Guided</option>
              <option value="expert">Expert</option>
            </select>
            <select
              className="modal-input uw-select"
              value={scenario}
              onChange={(e) => setScenarioKey(e.target.value)}
              aria-label="Operating scenario"
            >
              <option value="base">Base</option>
              <option value="optimistic">Optimistic</option>
              <option value="downturn">Downturn</option>
            </select>
            <button type="button" className="btn-secondary" disabled={!canWrite || saving} onClick={saveRevision}>
              Save revision
            </button>
          </div>
        </header>
      ) : (
        <div className="uw-path-bar" style={{ marginBottom: 10 }}>
          <label>
            Structure path
            <select
              className="modal-input"
              value={activePath?.id || ''}
              onChange={(e) => setPathId(Number(e.target.value))}
            >
              {(workbook.paths || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.isBaseline ? ' (baseline)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scenario
            <select
              className="modal-input"
              value={scenario}
              onChange={(e) => setScenarioKey(e.target.value)}
            >
              <option value="base">Base</option>
              <option value="optimistic">Optimistic</option>
              <option value="downturn">Downturn</option>
            </select>
          </label>
          <button type="button" className="btn-secondary" disabled={!canWrite} onClick={duplicatePath}>
            Duplicate path
          </button>
        </div>
      )}

      {msg ? <p className="uw-msg">{msg}</p> : null}
      {error ? <p className="uw-error">{error}</p> : null}

      {!isApp ? (
        <nav className="uw-tabs" aria-label="Underwriting sections">
          {[
            ['guided', 'Model'],
            ['compare', 'Compare paths'],
            ['sheets', 'Custom sheets'],
            ['import', 'Import'],
            ['outputs', 'Outputs']
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`uw-tab${tab === id ? ' uw-tab--active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      ) : null}

      {tab === 'guided' && (
        <div className="uw-guided">
          {!isApp ? (
            <div className="uw-path-bar">
              <label>
                Structure path
                <select
                  className="modal-input"
                  value={activePath?.id || ''}
                  onChange={(e) => setPathId(Number(e.target.value))}
                >
                  {(workbook.paths || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.isBaseline ? ' (baseline)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn-secondary" disabled={!canWrite} onClick={duplicatePath}>
                Duplicate path
              </button>
              {activePath && !activePath.isBaseline && canWrite ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => crmAPI.patchUwPath(workbook.id, activePath.id, { isBaseline: true }).then((r) => setWorkbook(r.workbook))}
                >
                  Set baseline
                </button>
              ) : null}
            </div>
          ) : null}

          {!isApp ? (
            <div className="uw-steps">
              {['Financing', 'Historicals', 'Projections', 'Returns', 'Results'].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`uw-step${step === i ? ' uw-step--active' : ''}`}
                  onClick={() => setStep(i)}
                >
                  {i + 1}. {label}
                </button>
              ))}
            </div>
          ) : (
            <p className="uw-hint">
              {forcedStep === 1
                ? 'Historicals (M2c will add P&L YoY + tax-return cross-check).'
                : forcedStep === 3
                  ? 'Returns / waterfall inputs.'
                  : forcedStep === 4
                    ? 'Projection results — full debt schedule depth lands in M2e.'
                    : 'Quick Underwrite inputs — denser SOIL parity in M2b.'}
            </p>
          )}

          {step === 0 && (
            <div className="uw-grid">
              <Field
                label="Purchase price"
                value={activePath?.purchasePrice ?? val(shared, 'purchasePrice')}
                disabled={!canWrite}
                onChange={(v) => persistPath({ purchasePrice: Number(v) || 0 })}
                onRequestEvidence={canWrite ? () => requestEvidence('purchasePrice', 'Purchase price support') : null}
              />
              <Field label="Equity %" value={activePath?.equityPercent} disabled={!canWrite} onChange={(v) => persistPath({ equityPercent: Number(v) || 0 })} />
              <Field label="SBA %" value={activePath?.sbaPercent} disabled={!canWrite} onChange={(v) => persistPath({ sbaPercent: Number(v) || 0 })} />
              <Field label="Seller %" value={activePath?.sellerPercent} disabled={!canWrite} onChange={(v) => persistPath({ sellerPercent: Number(v) || 0 })} />
              <Field label="SBA rate %" value={activePath?.sbaRate} disabled={!canWrite} onChange={(v) => persistPath({ sbaRate: Number(v) || 0 })} />
              <Field label="SBA term (yrs)" value={activePath?.sbaTermYears} disabled={!canWrite} onChange={(v) => persistPath({ sbaTermYears: Number(v) || 10 })} />
              <Field label="Seller rate %" value={activePath?.sellerRate} disabled={!canWrite} onChange={(v) => persistPath({ sellerRate: Number(v) || 0 })} />
              <Field label="Seller term (yrs)" value={activePath?.sellerTermYears} disabled={!canWrite} onChange={(v) => persistPath({ sellerTermYears: Number(v) || 5 })} />
              <label className="uw-field">
                <span>Seller note mode <em className="uw-why">Why: changes DSCR and cash flow timing</em></span>
                <select
                  className="modal-input"
                  disabled={!canWrite}
                  value={activePath?.sellerNoteMode || 'amortizing'}
                  onChange={(e) => persistPath({ sellerNoteMode: e.target.value })}
                >
                  <option value="amortizing">Amortizing</option>
                  <option value="interest_only">Interest only</option>
                  <option value="standby">Standby then amort</option>
                  <option value="balloon">Interest only + balloon</option>
                </select>
              </label>
              {(activePath?.sellerNoteMode === 'standby') && (
                <Field label="Standby years" value={activePath?.standbyYears} disabled={!canWrite} onChange={(v) => persistPath({ standbyYears: Number(v) || 0 })} />
              )}
              {(activePath?.sellerNoteMode === 'balloon') && (
                <Field label="Balloon year" value={activePath?.balloonYear} disabled={!canWrite} onChange={(v) => persistPath({ balloonYear: Number(v) || 5 })} />
              )}
              <Field label="Closing costs" value={activePath?.closingCosts ?? val(shared, 'closingCosts')} disabled={!canWrite} onChange={(v) => persistPath({ closingCosts: Number(v) || 0 })} />
              <Field label="WC injection" value={activePath?.workingCapitalInjection ?? val(shared, 'workingCapitalInjection')} disabled={!canWrite} onChange={(v) => persistPath({ workingCapitalInjection: Number(v) || 0 })} />
            </div>
          )}

          {step === 1 && (
            <div className="uw-grid">
              <Field
                label="Starting revenue"
                value={val(shared, 'startingRevenue')}
                disabled={!canWrite}
                onChange={(v) => persistShared({ startingRevenue: Number(v) || 0 })}
                onRequestEvidence={canWrite ? () => requestEvidence('historicals.revenue', 'Tax return / P&L — revenue') : null}
              />
              <Field
                label="Starting EBITDA / SDE"
                value={val(shared, 'startingEbitda')}
                disabled={!canWrite}
                onChange={(v) => persistShared({ startingEbitda: Number(v) || 0 })}
                onRequestEvidence={canWrite ? () => requestEvidence('historicals.ebitda', 'Tax return — EBITDA/SDE') : null}
              />
              <Field
                label="EBITDA margin (decimal)"
                value={val(shared, 'ebitdaMargin')}
                disabled={!canWrite}
                onChange={(v) => persistShared({ ebitdaMargin: Number(v) || 0 })}
              />
              <Field
                label="Owner salary (annual)"
                value={val(shared, 'ownerSalary')}
                disabled={!canWrite}
                onChange={(v) => persistShared({ ownerSalary: Number(v) || 0 })}
              />
              <p className="uw-hint">
                Tip: Request tax returns from here — they create DD checklist items and keep evidence linked to this underwrite.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="uw-grid">
              <Field label="Hold years" value={activePath?.holdYears} disabled={!canWrite} onChange={(v) => persistPath({ holdYears: Number(v) || 10 })} />
              <Field label="Exit multiple" value={activePath?.exitMultiple} disabled={!canWrite} onChange={(v) => persistPath({ exitMultiple: Number(v) || 4.5 })} />
              <Field label="Capex % of revenue" value={val(shared, 'capexPercent')} disabled={!canWrite} onChange={(v) => persistShared({ capexPercent: Number(v) || 0 })} />
              <p className="uw-hint">Operating scenario toggle (Base / Optimistic / Downturn) is in the header — it reshapes growth and margins for every path.</p>
            </div>
          )}

          {step === 3 && (
            <div className="uw-grid">
              <Field label="Preferred return %" value={activePath?.preferredReturnPercent} disabled={!canWrite} onChange={(v) => persistPath({ preferredReturnPercent: Number(v) || 0 })} />
              <Field label="Investor equity % of check" value={activePath?.investorEquityPercent} disabled={!canWrite} onChange={(v) => persistPath({ investorEquityPercent: Number(v) || 0 })} />
              <Field label="Investor profit share %" value={activePath?.investorProfitShare} disabled={!canWrite} onChange={(v) => persistPath({ investorProfitShare: Number(v) || 0 })} />
              <Field label="Sponsor profit share %" value={activePath?.sponsorProfitShare} disabled={!canWrite} onChange={(v) => persistPath({ sponsorProfitShare: Number(v) || 0 })} />
            </div>
          )}

          {step === 4 && (
            <div className="uw-results">
              <div className={`uw-verdict${lendable ? ' uw-verdict--ok' : ' uw-verdict--warn'}`}>
                {dscr == null
                  ? 'Enter financing and cash flow to see DSCR'
                  : lendable
                    ? `DSCR ${X(dscr)} — at/above typical 1.25x lendable threshold`
                    : `DSCR ${X(dscr)} — below 1.25x; adjust price, structure, or earnings`}
              </div>
              <div className="uw-kpi-row">
                <Kpi label="Equity check" value={MONEY(pathOutput?.sourcesAndUses?.equityAmount)} />
                <Kpi label="Y1 CoC" value={PCT(pathOutput?.returns?.year1Coc)} />
                <Kpi label="Y1 FCF" value={MONEY(pathOutput?.returns?.year1Fcf)} />
                <Kpi label="Sponsor IRR" value={PCT(pathOutput?.returns?.sponsor?.irr)} />
                <Kpi label="Sponsor MOIC" value={X(pathOutput?.returns?.sponsor?.moic)} />
                <Kpi label="Exit equity" value={MONEY(pathOutput?.exit?.exitEquityValue)} />
              </div>
              {warnings.map((w) => (
                <p key={w.code} className="uw-warn">{w.message}</p>
              ))}
              <div className="uw-year-table-wrap">
                <table className="uw-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Revenue</th>
                      <th>EBITDA</th>
                      <th>DSCR</th>
                      <th>FCF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pathOutput?.years || []).map((y) => (
                      <tr key={y.year}>
                        <td>{y.year}</td>
                        <td>{MONEY(y.revenue)}</td>
                        <td>{MONEY(y.ebitda)}</td>
                        <td>{X(y.dscr)}</td>
                        <td>{MONEY(y.fcf)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn-primary" disabled={!canWrite} onClick={() => { duplicatePath(); }}>
                Compare structures
              </button>
            </div>
          )}

          <div className="uw-nav-btns">
            <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
            <button type="button" className="btn-primary" disabled={step === 4} onClick={() => setStep((s) => s + 1)}>Next</button>
          </div>
        </div>
      )}

      {tab === 'compare' && (
        <div className="uw-compare">
          <p className="uw-hint">Side-by-side structure paths · operating scenario: <strong>{scenario}</strong></p>
          <div className="uw-year-table-wrap">
            <table className="uw-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {(workbook.outputs?.comparison || []).map((c) => (
                    <th key={c.id}>{c.name}{c.isBaseline ? ' ★' : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Purchase price', (c) => MONEY(c.purchasePrice)],
                  ['Equity check', (c) => MONEY(c.equityCheck)],
                  ['SBA', (c) => MONEY(c.sbaAmount)],
                  ['Seller', (c) => MONEY(c.sellerAmount)],
                  ['Seller mode', (c) => c.sellerNoteMode],
                  ['Y1 DSCR', (c) => X(c.year1Dscr)],
                  ['Y1 CoC', (c) => PCT(c.year1Coc)],
                  ['Y1 FCF', (c) => MONEY(c.year1Fcf)],
                  ['Investor IRR', (c) => PCT(c.investorIrr)],
                  ['Sponsor IRR', (c) => PCT(c.sponsorIrr)],
                  ['Sponsor MOIC', (c) => X(c.sponsorMoic)],
                  ['Exit equity', (c) => MONEY(c.exitEquityValue)]
                ].map(([label, fn]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    {(workbook.outputs?.comparison || []).map((c) => (
                      <td key={c.id}>{fn(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="uw-bars">
            {(workbook.outputs?.comparison || []).map((c) => (
              <div key={c.id} className="uw-bar-row">
                <span>{c.name}</span>
                <div className="uw-bar-track">
                  <div
                    className="uw-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, (c.sponsorIrr || 0) * 100 * 2))}%` }}
                    title={PCT(c.sponsorIrr)}
                  />
                </div>
                <span>{PCT(c.sponsorIrr)} IRR</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'sheets' && (
        <div className="uw-sheets">
          <button type="button" className="btn-secondary" disabled={!canWrite} onClick={addCustomSheet}>
            Add custom sheet
          </button>
          {(workbook.customSheets || []).map((sheet) => (
            <CustomSheetEditor
              key={sheet.id}
              sheet={sheet}
              canWrite={canWrite}
              onSave={async (next) => {
                const res = await crmAPI.upsertUwCustomSheet(workbook.id, next);
                setWorkbook(res.workbook);
              }}
              onDelete={async () => {
                const res = await crmAPI.deleteUwCustomSheet(workbook.id, sheet.id);
                setWorkbook(res.workbook);
              }}
            />
          ))}
          {!workbook.customSheets?.length ? (
            <p className="uw-muted">Custom sheets are additive — map a row to a whitelisted input only when you want it to feed the engine.</p>
          ) : null}
        </div>
      )}

      {tab === 'import' && (
        <div className="uw-import">
          <p className="uw-hint">Upload CSV (recommended) exported from your Excel workbook. Review mappings before applying.</p>
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            disabled={!canWrite}
            onChange={(e) => onImportFile(e.target.files?.[0])}
          />
          {importProposals.length > 0 && (
            <>
              <table className="uw-table">
                <thead>
                  <tr>
                    <th>Use</th>
                    <th>Label</th>
                    <th>Maps to</th>
                    <th>Value</th>
                    <th>Confidence</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {importProposals.map((p, idx) => {
                    const checked = selectedMappings.some((m) => m.mapsTo === p.mapsTo && m.sourceLabel === p.sourceLabel);
                    return (
                      <tr key={`${p.mapsTo}-${idx}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedMappings((prev) => [...prev.filter((x) => x.mapsTo !== p.mapsTo), p]);
                              else setSelectedMappings((prev) => prev.filter((x) => !(x.mapsTo === p.mapsTo && x.sourceLabel === p.sourceLabel)));
                            }}
                          />
                        </td>
                        <td>{p.label}</td>
                        <td>{p.mapsTo}</td>
                        <td>{p.value}</td>
                        <td>{p.confidence}</td>
                        <td>{p.sourceLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button type="button" className="btn-primary" disabled={!canWrite || saving} onClick={applyImport}>
                Apply import
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'outputs' && (
        <div className="uw-outputs">
          <p className="uw-muted">
            Exports download an HTML file and open a preview. Use File → Print in Chrome/Safari for PDF
            (system print is disabled inside Cursor’s browser preview).
          </p>
          <div className="uw-output-actions">
            <button type="button" className="btn-secondary" onClick={() => openReport('report')}>Export underwriting report</button>
            <button type="button" className="btn-secondary" onClick={() => openReport('bank')}>Export bank one-pager</button>
            <button type="button" className="btn-secondary" onClick={() => openReport('compare')}>Export path comparison</button>
            <button type="button" className="btn-primary" disabled={!canWrite} onClick={shareLive}>Copy live private link</button>
          </div>
          {(workbook.shareLinks || []).length > 0 && (
            <ul className="uw-share-list">
              {workbook.shareLinks.map((l) => (
                <li key={l.id}>
                  <a href={`/underwriting/${l.token}`} target="_blank" rel="noreferrer">{l.label || l.token}</a>
                  {canWrite ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => crmAPI.revokeUwShareLink(workbook.id, l.id).then((r) => setWorkbook(r.workbook))}
                    >
                      Revoke
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {(workbook.revisions || []).length > 0 && (
            <div>
              <h4>Revisions</h4>
              <ul className="uw-rev-list">
                {workbook.revisions.map((r) => (
                  <li key={r.id}>{r.label} · {new Date(r.createdAt).toLocaleString()}</li>
                ))}
              </ul>
            </div>
          )}
          {(workbook.evidenceLinks || []).length > 0 && (
            <div>
              <h4>Evidence links</h4>
              <ul className="uw-rev-list">
                {workbook.evidenceLinks.map((e) => (
                  <li key={e.id}>
                    {e.inputPath} · {e.status}
                    {e.ddItemId ? ` · DD #${e.ddItemId}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {saving ? <p className="uw-muted">Saving…</p> : null}

      {reportPreview ? (
        <div
          className="uw-report-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={reportPreview.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReportPreview(null);
          }}
        >
          <div className="uw-report-modal">
            <div className="uw-report-modal-head">
              <h3>{reportPreview.title}</h3>
              <div className="uw-report-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => downloadReportHtml(reportPreview.filename, reportPreview.html)}
                >
                  Download HTML again
                </button>
                <button type="button" className="btn-primary" onClick={() => setReportPreview(null)}>
                  Close
                </button>
              </div>
            </div>
            <iframe
              className="uw-report-frame"
              title={reportPreview.title}
              srcDoc={reportPreview.html}
              sandbox=""
            />
            <p className="uw-muted">
              To print or save PDF: open the downloaded HTML in Chrome or Safari, then File → Print.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange, disabled, onRequestEvidence }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);
  return (
    <label className="uw-field">
      <span>
        {label}
        {onRequestEvidence ? (
          <button type="button" className="uw-evidence-btn" onClick={onRequestEvidence} title="Request via DD">
            DD
          </button>
        ) : null}
      </span>
      <input
        className="modal-input"
        type="number"
        step="any"
        disabled={disabled}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (String(local) !== String(value ?? '')) onChange?.(local);
        }}
      />
    </label>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="uw-kpi">
      <div className="uw-kpi-label">{label}</div>
      <div className="uw-kpi-value">{value}</div>
    </div>
  );
}

function CustomSheetEditor({ sheet, canWrite, onSave, onDelete }) {
  const [name, setName] = useState(sheet.name);
  const [rows, setRows] = useState(sheet.rows || []);
  useEffect(() => {
    setName(sheet.name);
    setRows(sheet.rows || []);
  }, [sheet]);

  return (
    <div className="uw-custom-sheet">
      <div className="uw-custom-sheet-head">
        <input className="modal-input" disabled={!canWrite} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" className="btn-secondary" disabled={!canWrite} onClick={() => onSave({ id: sheet.id, name, rows })}>
          Save sheet
        </button>
        <button type="button" className="btn-secondary" disabled={!canWrite} onClick={onDelete}>Delete</button>
      </div>
      <table className="uw-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
            <th>Maps to</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td>
                <input
                  className="modal-input"
                  disabled={!canWrite}
                  value={row.label || ''}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, label: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <input
                  className="modal-input"
                  type="number"
                  disabled={!canWrite}
                  value={row.value ?? 0}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, value: Number(e.target.value) || 0 };
                    setRows(next);
                  }}
                />
              </td>
              <td>
                <select
                  className="modal-input"
                  disabled={!canWrite}
                  value={row.mapsTo || ''}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, mapsTo: e.target.value };
                    setRows(next);
                  }}
                >
                  <option value="">(none)</option>
                  <option value="startingRevenue">startingRevenue</option>
                  <option value="startingEbitda">startingEbitda</option>
                  <option value="ebitdaMargin">ebitdaMargin</option>
                  <option value="ownerSalary">ownerSalary</option>
                  <option value="closingCosts">closingCosts</option>
                  <option value="workingCapitalInjection">workingCapitalInjection</option>
                  <option value="purchasePrice">purchasePrice</option>
                  <option value="capexPercent">capexPercent</option>
                </select>
              </td>
              <td>
                <input
                  className="modal-input"
                  disabled={!canWrite}
                  value={row.note || ''}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, note: e.target.value };
                    setRows(next);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {canWrite ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setRows([...rows, { label: '', value: 0, mapsTo: '', note: '' }])}
        >
          Add row
        </button>
      ) : null}
    </div>
  );
}
