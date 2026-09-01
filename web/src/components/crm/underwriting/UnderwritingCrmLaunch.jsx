import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { crmAPI } from '../../../utils/api';
import { openUnderwritingPopout, MONEY, X } from '../../../pages/underwriting/underwritingNav';
import '../../../pages/underwriting/underwritingApp.css';

/**
 * CRM underwriting section — summary + launch into standalone app (M2a).
 * Full editing lives at /app/underwriting/:dealId
 */
export default function UnderwritingCrmLaunch({ dealId, canWrite = true }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError('');
    try {
      const res = await crmAPI.getUnderwriting(dealId);
      const wb = res.workbook;
      const baseline = wb.paths?.find((p) => p.isBaseline) || wb.paths?.[0];
      const scenario = wb.settings?.scenarioKey || 'base';
      const byId = baseline ? wb.outputs?.pathResults?.[baseline.id] : null;
      const pathOutput = byId?.[scenario] || null;
      const links = wb.evidenceLinks || [];
      const verified = links.filter((l) => l.status === 'verified' || l.status === 'received').length;
      setSummary({
        dealName: wb.dealName,
        pathCount: wb.paths?.length || 0,
        updatedAt: wb.updatedAt,
        year1Dscr: pathOutput?.returns?.year1Dscr,
        equityCheck: pathOutput?.sourcesAndUses?.equityAmount,
        evidenceTotal: links.length,
        evidenceOk: verified
      });
      console.log('[underwriting] crm launch summary', { dealId, modelId: wb.id });
    } catch (err) {
      console.error('[underwriting] crm launch load failed', err);
      setError(err.message || 'Failed to load underwriting');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  const appUrl = `/app/underwriting/${dealId}`;

  const evidenceLabel = useMemo(() => {
    if (!summary?.evidenceTotal) return 'No evidence linked yet';
    const pct = Math.round((summary.evidenceOk / summary.evidenceTotal) * 100);
    return `${summary.evidenceOk}/${summary.evidenceTotal} evidence-backed (${pct}%)`;
  }, [summary]);

  if (loading) return <p className="uw-muted">Loading underwriting…</p>;
  if (error) {
    return (
      <div className="uw-launch">
        <p className="uw-error">{error}</p>
        <button type="button" className="btn-secondary" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <div className="uw-launch">
      <div className="uw-launch__card">
        <h3 className="uw-launch__title">Underwriting workbook</h3>
        <p className="uw-launch__sub">
          Opens as a standalone tool (full screen or pop-out). Long sessions stay out of the CRM chrome.
          {canWrite ? '' : ' · View only'}
        </p>
        <div className="uw-launch__kpis">
          <div className="uw-launch__kpi">
            <strong>{X(summary?.year1Dscr)}</strong>
            <span>Y1 DSCR</span>
          </div>
          <div className="uw-launch__kpi">
            <strong>{MONEY(summary?.equityCheck)}</strong>
            <span>Equity check</span>
          </div>
          <div className="uw-launch__kpi">
            <strong>{summary?.pathCount ?? 0}</strong>
            <span>Structure paths</span>
          </div>
          <div className="uw-launch__kpi">
            <strong>{evidenceLabel}</strong>
            <span>Trust</span>
          </div>
        </div>
        <div className="uw-launch__actions">
          <Link className="btn-primary" to={appUrl} style={{ textDecoration: 'none' }}>
            Open underwriting
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (!openUnderwritingPopout(dealId)) {
                window.location.assign(appUrl);
              }
            }}
          >
            Pop out
          </button>
          <button type="button" className="btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>
        {summary?.updatedAt ? (
          <p className="uw-launch__sub" style={{ marginTop: 10 }}>
            Last updated {new Date(summary.updatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
