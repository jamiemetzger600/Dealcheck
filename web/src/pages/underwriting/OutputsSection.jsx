import { useState } from 'react';
import { crmAPI } from '../../utils/api';
import { MONEY, PCT, X } from './uwFormat';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Exec summary / bank one-pager / investor waterfall / live private links.
 */
export default function OutputsSection({ uw }) {
  const { workbook, pathOutput, activePath, scenario, canWrite, setWorkbook, load, setMsg, setError } = uw;
  const [preview, setPreview] = useState(null);
  const [sharePwd, setSharePwd] = useState('');
  const [shareDays, setShareDays] = useState('');

  if (!workbook) return null;

  const cmp = workbook.outputs?.comparison || [];
  const hist = workbook.outputs?.historicals || [];
  const su = pathOutput?.sourcesAndUses;
  const ret = pathOutput?.returns;
  const waterfall = pathOutput?.waterfall || [];

  const buildHtml = (mode) => {
    const deal = esc(workbook.dealName);
    const pathName = esc(activePath?.name || 'Baseline');
    const styles = `
      body{font-family:Georgia,'Times New Roman',serif;padding:28px;color:#111;background:#fff;line-height:1.35}
      h1{font-size:22px;margin:0 0 6px}
      h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
      .meta{color:#555;font-size:12px;margin:0 0 16px}
      table{border-collapse:collapse;width:100%;font-size:11px;margin:8px 0 16px}
      th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}
      th{background:#f4f4f4}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .callout{border-left:3px solid #222;padding:8px 12px;background:#fafafa;margin:12px 0}
      @media print{body{padding:12px}.no-print{display:none}}
    `;

    if (mode === 'bank') {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Bank one-pager — ${deal}</title><style>${styles}</style></head><body>
        <h1>Bank one-pager</h1>
        <p class="meta">${deal} · ${pathName} · ${esc(scenario)} · Confidential</p>
        <h2>Sources &amp; uses</h2>
        <table>
          <tr><th>Sources</th><th>Amount</th><th>Uses</th><th>Amount</th></tr>
          <tr><td>Equity</td><td>${MONEY(su?.equityAmount)}</td><td>Purchase price</td><td>${MONEY(su?.purchasePrice)}</td></tr>
          <tr><td>SBA 7(a)</td><td>${MONEY(su?.sbaAmount)}</td><td>Closing / deal costs</td><td>${MONEY(su?.closingCosts)}</td></tr>
          <tr><td>Seller note</td><td>${MONEY(su?.sellerAmount)}</td><td>Working capital</td><td>${MONEY(su?.workingCapital)}</td></tr>
          <tr><td><strong>Total</strong></td><td><strong>${MONEY(su?.sourcesTotal)}</strong></td><td><strong>Total</strong></td><td><strong>${MONEY(su?.usesTotal)}</strong></td></tr>
        </table>
        <div class="callout">Equity injection ${MONEY(su?.equityAmount)} (${su?.equityPercent || '—'}%) · Y1 DSCR ${X(ret?.year1Dscr)} · Cash at close to seller ${MONEY(su?.cashAtCloseToSeller)}</div>
        <h2>Historical EBITDA</h2>
        <table>
          <tr><th>Year</th><th>Revenue</th><th>Adj. EBITDA</th><th>SDE</th><th>Tax check</th></tr>
          ${hist
            .map(
              (h) =>
                `<tr><td>${h.year}</td><td>${MONEY(h.revenue)}</td><td>${MONEY(h.adjustedEbitda)}</td><td>${MONEY(h.sde)}</td><td>${
                  h.revenuePass == null ? '—' : h.revenuePass ? 'Pass' : 'Review'
                }</td></tr>`
            )
            .join('')}
        </table>
        <h2>Projected DSCR</h2>
        <table>
          <tr><th>Year</th>${(pathOutput?.years || []).map((y) => `<th>Y${y.year}</th>`).join('')}</tr>
          <tr><td>DSCR</td>${(pathOutput?.years || []).map((y) => `<td>${X(y.dscr)}</td>`).join('')}</tr>
          <tr><td>EBITDA</td>${(pathOutput?.years || []).map((y) => `<td>${MONEY(y.ebitda)}</td>`).join('')}</tr>
        </table>
        <p class="meta">Prepared in Vettr Underwriting · not a commitment to lend.</p>
      </body></html>`;
      return { title: 'Bank one-pager', html, filename: `bank-one-pager-${workbook.savedDealId}.html` };
    }

    if (mode === 'investor') {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Investor pack — ${deal}</title><style>${styles}</style></head><body>
        <h1>Investor returns pack</h1>
        <p class="meta">${deal} · ${pathName} · Pref → ROC → profit share</p>
        <div class="callout">
          Investor IRR ${PCT(ret?.investor?.irr)} / MOIC ${X(ret?.investor?.moic)} ·
          Sponsor IRR ${PCT(ret?.sponsor?.irr)} / MOIC ${X(ret?.sponsor?.moic)} ·
          Exit #1 ${MONEY(pathOutput?.exit?.exitEquityValue)} (@${X(pathOutput?.exit?.exitMultiple)}) ·
          Exit #2 ${MONEY(pathOutput?.exit2?.exitEquityValue)} (@${X(pathOutput?.exit2?.exitMultiple)})
        </div>
        <h2>Waterfall</h2>
        <table>
          <tr><th>Year</th><th>Pref</th><th>Inv ROC</th><th>Sp ROC</th><th>Inv profit</th><th>Sp profit</th><th>Inv total</th><th>Sp total</th><th>Exit inv</th><th>Exit sp</th></tr>
          ${waterfall
            .map(
              (w) =>
                `<tr><td>${w.year}</td><td>${MONEY(w.prefPaid)}</td><td>${MONEY(w.investorRoc)}</td><td>${MONEY(
                  w.sponsorRoc
                )}</td><td>${MONEY(w.investorProfit)}</td><td>${MONEY(w.sponsorProfit)}</td><td>${MONEY(
                  w.investorTotal
                )}</td><td>${MONEY(w.sponsorTotal)}</td><td>${MONEY(w.exitInvestor)}</td><td>${MONEY(
                  w.exitSponsor
                )}</td></tr>`
            )
            .join('')}
        </table>
      </body></html>`;
      return { title: 'Investor pack', html, filename: `investor-pack-${workbook.savedDealId}.html` };
    }

    if (mode === 'compare') {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Path comparison — ${deal}</title><style>${styles}</style></head><body>
        <h1>Structure path comparison</h1>
        <p class="meta">${deal} · scenario ${esc(scenario)}</p>
        <table>
          <tr><th>Metric</th>${cmp.map((c) => `<th>${esc(c.name)}${c.isPreferred ? ' ✓' : ''}</th>`).join('')}</tr>
          ${[
            ['Equity check', (c) => MONEY(c.equityCheck)],
            ['Cash at close', (c) => MONEY(c.cashAtClose)],
            ['Seller mode', (c) => c.sellerNoteMode],
            ['Y1 DSCR', (c) => X(c.year1Dscr)],
            ['Y1 CoC', (c) => PCT(c.year1Coc)],
            ['Sponsor IRR', (c) => PCT(c.sponsorIrr)],
            ['Sponsor MOIC', (c) => X(c.sponsorMoic)],
            ['Exit equity', (c) => MONEY(c.exitEquityValue)]
          ]
            .map(
              ([label, fn]) =>
                `<tr><td>${label}</td>${cmp.map((c) => `<td>${fn(c)}</td>`).join('')}</tr>`
            )
            .join('')}
        </table>
      </body></html>`;
      return { title: 'Path comparison', html, filename: `path-compare-${workbook.savedDealId}.html` };
    }

    // Executive summary (default)
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Executive Summary — ${deal}</title><style>${styles}</style></head><body>
      <h1>Executive Summary</h1>
      <p class="meta">${deal} · ${pathName} · ${esc(scenario)}</p>
      <div class="grid">
        <div>
          <h2>Deal terms</h2>
          <table>
            <tr><td>Purchase price</td><td>${MONEY(su?.purchasePrice)}</td></tr>
            <tr><td>Equity</td><td>${MONEY(su?.equityAmount)} (${su?.equityPercent || '—'}%)</td></tr>
            <tr><td>SBA</td><td>${MONEY(su?.sbaAmount)} @ ${activePath?.sbaRate || '—'}%</td></tr>
            <tr><td>Seller note</td><td>${MONEY(su?.sellerAmount)} · ${esc(activePath?.sellerNoteMode)}</td></tr>
            <tr><td>Y1 DSCR</td><td>${X(ret?.year1Dscr)}</td></tr>
            <tr><td>Y1 FCF</td><td>${MONEY(ret?.year1Fcf)}</td></tr>
          </table>
        </div>
        <div>
          <h2>Historicals</h2>
          <table>
            <tr><th>Year</th><th>Revenue</th><th>Adj. EBITDA</th></tr>
            ${hist.map((h) => `<tr><td>${h.year}</td><td>${MONEY(h.revenue)}</td><td>${MONEY(h.adjustedEbitda)}</td></tr>`).join('')}
          </table>
        </div>
      </div>
      <h2>Scenario / path compare</h2>
      <table>
        <tr><th>Path</th><th>Y1 DSCR</th><th>Sponsor IRR</th><th>Exit equity</th></tr>
        ${cmp
          .map(
            (c) =>
              `<tr><td>${esc(c.name)}${c.isPreferred ? ' ✓' : ''}</td><td>${X(c.year1Dscr)}</td><td>${PCT(
                c.sponsorIrr
              )}</td><td>${MONEY(c.exitEquityValue)}</td></tr>`
          )
          .join('')}
      </table>
      <h2>Key insights</h2>
      <ul>
        ${(pathOutput?.warnings || []).map((w) => `<li>${esc(w.message)}</li>`).join('') || '<li>No engine warnings.</li>'}
        <li>Preferred path: ${esc(cmp.find((c) => c.isPreferred)?.name || activePath?.name || '—')}</li>
      </ul>
    </body></html>`;
    return { title: 'Executive Summary', html, filename: `exec-summary-${workbook.savedDealId}.html` };
  };

  const download = (filename, html) => {
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
    const report = buildHtml(mode);
    setPreview(report);
    download(report.filename, report.html);
    setMsg?.(`${report.title} downloaded — open in Chrome/Safari → File → Print for PDF`);
    console.log('[underwriting] report', { mode, filename: report.filename });
  };

  const shareLive = async () => {
    if (!canWrite) return;
    try {
      const expiresAt = shareDays
        ? new Date(Date.now() + Number(shareDays) * 86400000).toISOString()
        : undefined;
      const res = await crmAPI.createUwShareLink(workbook.id, {
        label: 'Live underwriting',
        preferredPathId: activePath?.id,
        password: sharePwd || undefined,
        expiresAt
      });
      const url = `${window.location.origin}/underwriting/${res.link.token}`;
      await navigator.clipboard.writeText(url);
      setMsg?.('Live link copied');
      setWorkbook(res.workbook);
      console.log('[underwriting] share link', { url, hasPassword: Boolean(sharePwd) });
    } catch (err) {
      setError?.(err.message || 'Share failed');
    }
  };

  return (
    <div className="uw-outputs">
      <section className="uw-qu__card">
        <h3>Print / share packs</h3>
        <p className="uw-muted">
          Downloads HTML (print-ready). System print inside Cursor&apos;s browser is disabled — open the file in Chrome/Safari.
        </p>
        <div className="uw-output-actions">
          <button type="button" className="btn-secondary" onClick={() => openReport('exec')}>
            Executive Summary
          </button>
          <button type="button" className="btn-secondary" onClick={() => openReport('bank')}>
            Bank one-pager
          </button>
          <button type="button" className="btn-secondary" onClick={() => openReport('investor')}>
            Investor pack
          </button>
          <button type="button" className="btn-secondary" onClick={() => openReport('compare')}>
            Path comparison
          </button>
        </div>
      </section>

      <section className="uw-qu__card">
        <h3>Private live link</h3>
        <div className="uw-qu__toolbar">
          <input
            className="modal-input"
            type="password"
            placeholder="Optional password"
            value={sharePwd}
            disabled={!canWrite}
            onChange={(e) => setSharePwd(e.target.value)}
          />
          <input
            className="modal-input"
            type="number"
            placeholder="Expiry days (optional)"
            value={shareDays}
            disabled={!canWrite}
            onChange={(e) => setShareDays(e.target.value)}
          />
          <button type="button" className="btn-primary" disabled={!canWrite} onClick={shareLive}>
            Copy live link
          </button>
        </div>
        {(workbook.shareLinks || []).length > 0 ? (
          <ul className="uw-share-list">
            {workbook.shareLinks.map((l) => (
              <li key={l.id}>
                <a href={`/underwriting/${l.token}`} target="_blank" rel="noreferrer">
                  {l.label || l.token}
                </a>
                {l.hasPassword ? ' · 🔒' : ''}
                {l.expiresAt ? ` · expires ${new Date(l.expiresAt).toLocaleDateString()}` : ''}
                {canWrite ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      crmAPI.revokeUwShareLink(workbook.id, l.id).then((r) => setWorkbook(r.workbook))
                    }
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="uw-muted">No active share links.</p>
        )}
      </section>

      {(workbook.revisions || []).length > 0 ? (
        <section className="uw-qu__card">
          <h3>Revisions</h3>
          <ul className="uw-rev-list">
            {workbook.revisions.map((r) => (
              <li key={r.id}>
                {r.label} · {new Date(r.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {preview ? (
        <div
          className="uw-report-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <div className="uw-report-modal">
            <div className="uw-report-modal-head">
              <h3>{preview.title}</h3>
              <button type="button" className="btn-primary" onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
            <iframe className="uw-report-frame" title={preview.title} srcDoc={preview.html} sandbox="" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
