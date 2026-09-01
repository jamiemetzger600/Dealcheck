import { useState, useEffect, useCallback } from 'react';
import { crmAPI } from '../../utils/api';
import { formatMoney, formatDate, getDealProgressLabel } from '../../utils/normalizeDeal';
import { PIPELINE_STAGE_OPTIONS } from '../../utils/pipelineStages';

/**
 * Lightweight right-side deal peek — board stays visible. No DealDetailsPanel.
 */
export default function CrmDealPeek({
  deal,
  dealId,
  nextAction = null,
  onOpen,
  onClose,
  onStageChanged = null,
  onRefresh = null
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [progressStage, setProgressStage] = useState(deal?.progressStage || '');

  useEffect(() => {
    setProgressStage(deal?.progressStage || '');
  }, [deal?.progressStage, dealId]);

  const loadDetail = useCallback(async () => {
    if (!dealId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const data = await crmAPI.getDealActivities(dealId);
      setDetail(data);
      console.log('[CrmDealPeek] loaded', dealId, {
        contacts: data?.contacts?.length ?? 0,
        last: data?.lastActivity?.type
      });
    } catch (err) {
      console.warn('[CrmDealPeek] load failed', err.message);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const broker =
    detail?.contacts?.find((c) => c.role === 'broker')
    || detail?.contacts?.[0]
    || null;
  const otherDealCount = broker
    ? Math.max(0, (Number(broker.deal_count) || 0) - 1)
    : 0;

  const stageLabel =
    progressStage?.trim()
    || getDealProgressLabel(deal)
    || 'Unstaged';

  const lastTouch = (() => {
    const last = detail?.lastActivity;
    if (!last?.at) return null;
    const who = (last.actorEmail || '').split('@')[0];
    const when = formatDate(last.at);
    return who ? `${when} · ${who}` : when;
  })();

  const writeEnabled = detail?.access ? Boolean(detail.access.canWrite) : true;

  const handleStageChange = async (e) => {
    const newStage = e.target.value;
    if (!newStage.trim() || stageSaving || !dealId) return;
    const prev = progressStage;
    setProgressStage(newStage);
    setStageSaving(true);
    try {
      const result = await crmAPI.updateStage(dealId, newStage);
      onStageChanged?.(result, deal?.name);
      onRefresh?.();
      await loadDetail();
    } catch (err) {
      setProgressStage(prev);
      alert('Failed to update stage: ' + (err.message || 'error'));
    } finally {
      setStageSaving(false);
    }
  };

  if (!deal) return null;

  return (
    <aside className="crm-deal-peek" role="complementary" aria-label="Deal peek">
      <header className="crm-deal-peek__header">
        <div className="crm-deal-peek__header-top">
          <h3 className="crm-deal-peek__title">{deal.name || 'Untitled deal'}</h3>
          <button
            type="button"
            className="crm-deal-peek__close"
            onClick={onClose}
            aria-label="Close peek"
          >
            ×
          </button>
        </div>
        <p className="crm-deal-peek__stage">{stageLabel}</p>
      </header>

      <div className="crm-deal-peek__metrics">
        <div>
          <span className="crm-deal-peek__metric-label">Asking</span>
          <span className="crm-deal-peek__metric-value">{formatMoney(deal.askingPrice)}</span>
        </div>
        <div>
          <span className="crm-deal-peek__metric-label">EBITDA</span>
          <span className="crm-deal-peek__metric-value">{formatMoney(deal.ebitda)}</span>
        </div>
      </div>

      {nextAction ? (
        <div className={`crm-deal-peek__next${nextAction.urgent ? ' crm-deal-peek__next--urgent' : ''}`}>
          <span className="crm-deal-peek__next-label">Next</span>
          <span>{nextAction.title || nextAction.label || 'Action needed'}</span>
          {nextAction.dueLabel ? (
            <span className="crm-deal-peek__next-due">{nextAction.dueLabel}</span>
          ) : null}
        </div>
      ) : null}

      {loading && !detail ? (
        <p className="crm-muted crm-deal-peek__loading">Loading…</p>
      ) : null}

      {broker ? (
        <div className="crm-deal-peek__broker">
          <span className="crm-chip crm-deal-peek__broker-chip">
            {broker.name || 'Broker'}
            {broker.company_name ? ` · ${broker.company_name}` : ''}
          </span>
          {otherDealCount > 0 ? (
            <span className="crm-deal-peek__other-deals">
              {otherDealCount} other deal{otherDealCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      ) : null}

      {lastTouch ? (
        <p className="crm-deal-peek__touched">Last touched {lastTouch}</p>
      ) : null}

      <div className="crm-deal-peek__stage-control">
        <label htmlFor={`crm-peek-stage-${dealId}`}>Stage</label>
        <select
          id={`crm-peek-stage-${dealId}`}
          className="modal-input"
          value={progressStage || ''}
          onChange={handleStageChange}
          disabled={stageSaving || !writeEnabled}
          aria-label="Pipeline stage"
        >
          <option value="">Select stage</option>
          {PIPELINE_STAGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          {progressStage && !PIPELINE_STAGE_OPTIONS.includes(progressStage) ? (
            <option value={progressStage}>{progressStage} (saved)</option>
          ) : null}
        </select>
      </div>

      <div className="crm-deal-peek__actions">
        <button type="button" className="btn-primary" onClick={() => onOpen?.(dealId)}>
          Open
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onOpen?.(dealId, { focusSection: 'ioi' })}
        >
          Quick IOI
        </button>
        {deal.url ? (
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Listing
          </a>
        ) : null}
      </div>
    </aside>
  );
}
