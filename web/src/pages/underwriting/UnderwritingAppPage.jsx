import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { crmAPI } from '../../utils/api';
import { useEffect, useState } from 'react';
import useUnderwritingWorkbook from './useUnderwritingWorkbook';
import QuickUnderwriteSection from './QuickUnderwriteSection';
import HistoricalsSection from './HistoricalsSection';
import StructurePathsSection from './StructurePathsSection';
import DebtSchedulesSection from './DebtSchedulesSection';
import ReturnsSection from './ReturnsSection';
import OutputsSection from './OutputsSection';
import ImportSection from './ImportSection';
import { MONEY, X } from './uwFormat';
import './underwritingApp.css';
import '../../components/crm/underwriting/underwriting.css';

const NAV = [
  { id: 'quick', label: 'Quick Underwrite' },
  { id: 'historicals', label: 'Historicals' },
  { id: 'paths', label: 'Structure paths' },
  { id: 'debt', label: 'Debt schedules' },
  { id: 'returns', label: 'Returns' },
  { id: 'outputs', label: 'Outputs' },
  { id: 'import', label: 'Import' }
];

const PCT = (n, digits = 1) => {
  if (n == null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
};

export default function UnderwritingAppPage() {
  const { dealId: dealIdParam } = useParams();
  const dealId = Number(dealIdParam);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || 'quick';
  const [headerMsg, setHeaderMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(dealId) || dealId <= 0) {
      navigate('/app/underwriting', { replace: true });
    }
  }, [dealId, navigate]);

  const uw = useUnderwritingWorkbook(Number.isFinite(dealId) && dealId > 0 ? dealId : null, {
    canWrite: true,
    onMeta: null
  });

  if (!Number.isFinite(dealId) || dealId <= 0) return null;

  const setSection = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', id);
    setSearchParams(next, { replace: true });
  };

  const pathOutput = uw.pathOutput;
  const dscr = pathOutput?.returns?.year1Dscr;
  const lendable = dscr != null && dscr >= 1.25;
  const evidence = uw.keyInputCoverage?.total
    ? uw.keyInputCoverage
    : uw.evidenceCoverage || { total: 0, verified: 0, backed: 0, pct: 0 };
  const evidenceLabel = evidence.total
    ? `Evidence ${evidence.backed ?? evidence.verified}/${evidence.total} (${evidence.pct}%)`
    : null;

  const saveRevision = async () => {
    if (!uw.workbook?.id) return;
    setSaving(true);
    setHeaderMsg('');
    try {
      const label = window.prompt('Revision label', `Snapshot ${new Date().toLocaleString()}`);
      if (label == null) return;
      await crmAPI.saveUwRevision(uw.workbook.id, { label: label.trim() || 'Snapshot' });
      setHeaderMsg('Revision saved');
      console.log('[underwriting] app revision saved', { modelId: uw.workbook.id });
      await uw.load();
    } catch (err) {
      console.error('[underwriting] app revision failed', err);
      setHeaderMsg(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const shareLive = async () => {
    if (!uw.workbook?.id) return;
    try {
      const res = await crmAPI.createUwShareLink(uw.workbook.id, {
        label: 'Live underwriting',
        preferredPathId: uw.activePath?.id
      });
      const url = `${window.location.origin}/underwriting/${res.link.token}`;
      await navigator.clipboard.writeText(url);
      setHeaderMsg('Live link copied');
      console.log('[underwriting] app share link', { url });
      await uw.load();
    } catch (err) {
      console.error('[underwriting] app share failed', err);
      setHeaderMsg(err.message || 'Share failed');
    }
  };

  const subtitleParts = [];
  if (uw.workbook?.paths?.length) subtitleParts.push(`${uw.workbook.paths.length} path(s)`);
  if (evidenceLabel) subtitleParts.push(evidenceLabel);
  if (uw.workbook?.updatedAt) {
    subtitleParts.push(`Updated ${new Date(uw.workbook.updatedAt).toLocaleString()}`);
  }

  const displayMsg = headerMsg || uw.msg;
  const displayError = uw.error;

  let body = null;
  if (uw.loading) body = <p className="uw-muted">Loading underwriting workbook…</p>;
  else if (displayError && !uw.workbook) {
    body = (
      <div>
        <p className="uw-error">{displayError}</p>
        <button type="button" className="btn-secondary" onClick={uw.load}>
          Retry
        </button>
      </div>
    );
  } else if (uw.workbook) {
    const sectionProps = {
      uw: {
        ...uw,
        setMsg: (m) => {
          uw.setMsg(m);
          setHeaderMsg(m);
        },
        setError: (e) => {
          uw.setError(e);
          setHeaderMsg(e);
        }
      }
    };
    body = (
      <>
        {section === 'quick' && <QuickUnderwriteSection {...sectionProps} />}
        {section === 'historicals' && <HistoricalsSection {...sectionProps} />}
        {section === 'paths' && <StructurePathsSection {...sectionProps} />}
        {section === 'debt' && <DebtSchedulesSection {...sectionProps} />}
        {section === 'returns' && <ReturnsSection {...sectionProps} />}
        {section === 'outputs' && <OutputsSection {...sectionProps} />}
        {section === 'import' && <ImportSection {...sectionProps} />}
      </>
    );
  }

  return (
    <div className="uw-app">
      <header className="uw-app__top">
        <div className="uw-app__brand">
          <Link to="/app/underwriting" title="Underwriting hub">
            <img className="uw-app__logo" src="/vettr-logo.png" alt="Vettr" />
          </Link>
          <div className="uw-app__title-block">
            <p className="uw-app__eyebrow">Underwriting</p>
            <h1 className="uw-app__title">{uw.workbook?.dealName || `Deal #${dealId}`}</h1>
            <p className="uw-app__meta">{subtitleParts.join(' · ') || 'Standalone workbook'}</p>
          </div>
        </div>
        <div className="uw-app__actions">
          <Link className="btn-secondary" to="/dashboard" style={{ textDecoration: 'none' }}>
            CRM
          </Link>
          <Link className="btn-secondary" to="/app/underwriting" style={{ textDecoration: 'none' }}>
            All workbooks
          </Link>
          <button
            type="button"
            className="btn-secondary"
            disabled={!uw.canWrite || saving}
            onClick={saveRevision}
          >
            Save revision
          </button>
          <button type="button" className="btn-primary" disabled={!uw.canWrite} onClick={shareLive}>
            Copy live link
          </button>
        </div>
      </header>

      {displayMsg ? <p className="uw-msg" style={{ margin: '8px 18px 0' }}>{displayMsg}</p> : null}
      {displayError && uw.workbook ? (
        <p className="uw-error" style={{ margin: '8px 18px 0' }}>
          {displayError}
        </p>
      ) : null}

      <div className="uw-app__body">
        <nav className="uw-app__nav" aria-label="Underwriting sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`uw-app__nav-btn${section === item.id ? ' uw-app__nav-btn--active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          <p className="uw-app__nav-note">
            SOIL-speed workbook — change price, seller mode, or growth and the 10-year table recomputes live.
          </p>
        </nav>

        <main className="uw-app__main">
          <div className="uw-app__kpi-strip">
            <div
              className={`uw-app__kpi${lendable ? ' uw-app__kpi--ok' : dscr != null ? ' uw-app__kpi--warn' : ''}`}
            >
              <div className="uw-app__kpi-label">Y1 DSCR</div>
              <div className="uw-app__kpi-value">{X(dscr)}</div>
            </div>
            <div className="uw-app__kpi">
              <div className="uw-app__kpi-label">Equity check</div>
              <div className="uw-app__kpi-value">{MONEY(pathOutput?.sourcesAndUses?.equityAmount)}</div>
            </div>
            <div className="uw-app__kpi">
              <div className="uw-app__kpi-label">Y1 CoC</div>
              <div className="uw-app__kpi-value">{PCT(pathOutput?.returns?.year1Coc)}</div>
            </div>
            <div className="uw-app__kpi">
              <div className="uw-app__kpi-label">Sponsor IRR</div>
              <div className="uw-app__kpi-value">{PCT(pathOutput?.returns?.sponsor?.irr)}</div>
            </div>
            <div className="uw-app__kpi">
              <div className="uw-app__kpi-label">Exit equity</div>
              <div className="uw-app__kpi-value">{MONEY(pathOutput?.exit?.exitEquityValue)}</div>
            </div>
          </div>

          {body}
        </main>
      </div>
    </div>
  );
}
