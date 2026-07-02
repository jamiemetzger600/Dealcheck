import { useState, useEffect, useCallback, useMemo } from 'react';
import { crmAPI } from '../../utils/api';
import { normalizeDeal, formatMoney } from '../../utils/normalizeDeal';
import { getCalculatorDefaultsFromSettings } from '../../utils/calculatorDefaultsFromSettings';
import { getSavedDealCalculatorSummary } from '../../utils/savedDealCalculatorSummary';
import {
  UNSTAGED_KEY,
  daysInCurrentStage,
  cocReturnTier,
  defaultStageForKanbanColumn,
  kanbanColumnForStage,
  resolveDealStage
} from '../../utils/pipelineStages';

function KanbanCard({ deal, summary, onSelect, dragging, isSelected, onDragStart, onDragEnd }) {
  const days = daysInCurrentStage(deal);
  const coc = summary?.cocReturn;
  const cocOk = coc != null && Number.isFinite(coc);
  const stageLabel = resolveDealStage(deal);

  return (
    <article
      className={`crm-kanban-card${dragging ? ' crm-kanban-card--dragging' : ''}${isSelected ? ' crm-kanban-card--selected' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(deal.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(deal.id);
        }
      }}
    >
      <h4 className="crm-kanban-card__title">{deal.name || 'Untitled deal'}</h4>
      <div className="crm-kanban-card__meta">
        {deal.askingPrice != null ? <span>{formatMoney(deal.askingPrice)}</span> : null}
        {cocOk ? (
          <span className="crm-kanban-card__coc" data-tier={cocReturnTier(coc)}>
            {coc.toFixed(0)}% CoC
          </span>
        ) : null}
      </div>
      <div className="crm-kanban-card__footer">
        {stageLabel ? <span className="crm-kanban-card__stage">{stageLabel}</span> : <span>New</span>}
        {days != null ? <span>{days}d</span> : null}
      </div>
    </article>
  );
}

export default function CrmKanban({
  deals = [],
  settings = null,
  selectedDealId = null,
  onSelectDeal,
  onRefresh,
  onStageChanged = null
}) {
  const [kanban, setKanban] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dragDealId, setDragDealId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [moving, setMoving] = useState(false);

  const calculatorDefaults = useMemo(
    () => getCalculatorDefaultsFromSettings(settings),
    [settings]
  );

  const dealsById = useMemo(() => {
    const map = new Map();
    for (const d of deals) {
      const n = normalizeDeal(d);
      if (n?.id) map.set(n.id, n);
    }
    return map;
  }, [deals]);

  const loadKanban = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAPI.getKanban();
      setKanban(data);
    } catch (err) {
      setError(err.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKanban();
  }, [loadKanban, deals.length]);

  const normalizeKanbanDeal = useCallback(
    (row) => {
      const fromParent = dealsById.get(row.id);
      if (fromParent) return fromParent;
      return normalizeDeal(row);
    },
    [dealsById]
  );

  const columns = useMemo(() => {
    if (!kanban) return [];
    return (kanban.columns || []).map((col) => ({
      id: col.id || col.stage,
      label: col.label || col.stage,
      deals: (col.deals || []).map(normalizeKanbanDeal)
    }));
  }, [kanban, normalizeKanbanDeal]);

  const summaryFor = useCallback(
    (deal) => getSavedDealCalculatorSummary(deal, calculatorDefaults),
    [calculatorDefaults]
  );

  const handleDragStart = (e, dealId) => {
    setDragDealId(dealId);
    e.dataTransfer.setData('text/plain', String(dealId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragDealId(null);
    setDropTarget(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(columnId);
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    setDropTarget(null);
    const dealId = Number(e.dataTransfer.getData('text/plain') || dragDealId);
    if (!dealId || moving) return;

    const deal = dealsById.get(dealId) || normalizeKanbanDeal({ id: dealId });
    const currentCol = kanbanColumnForStage(resolveDealStage(deal));
    if (currentCol.id === columnId) return;

    const targetStage = defaultStageForKanbanColumn(columnId);

    setMoving(true);
    try {
      const result = await crmAPI.updateStage(dealId, targetStage);
      onStageChanged?.(result, deal.name);
      await loadKanban();
      onRefresh?.();
    } catch (err) {
      alert('Failed to move deal: ' + err.message);
    } finally {
      setMoving(false);
      setDragDealId(null);
    }
  };

  if (loading && !kanban) {
    return <div className="crm-panel">Loading pipeline…</div>;
  }

  if (error) {
    return (
      <div className="crm-panel crm-panel--error">
        <p>{error}</p>
        <button type="button" className="btn-secondary" onClick={loadKanban}>Retry</button>
      </div>
    );
  }

  const totalDeals = kanban?.totalDeals ?? 0;

  return (
    <div className="crm-kanban">
      <div className="crm-kanban-toolbar">
        <p className="crm-kanban-toolbar__hint">
          Drag deals between columns to update pipeline stage. Changes are logged to the deal timeline.
        </p>
        <span className="crm-kanban-count">{totalDeals} deals</span>
      </div>

      {totalDeals === 0 ? (
        <div className="crm-empty">
          <h2>Pipeline is empty</h2>
          <p>Save deals from the Aggregator — they appear in Inbox until you move them forward.</p>
        </div>
      ) : (
        <div className="crm-kanban-board" aria-busy={moving}>
          {columns.map((col) => {
            const isDrop = dropTarget === col.id;
            return (
              <section
                key={col.id}
                className={`crm-kanban-column${isDrop ? ' crm-kanban-column--drop' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setDropTarget((t) => (t === col.id ? null : t))}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <header className="crm-kanban-column__header">
                  <h3>{col.label}</h3>
                  <span className="crm-kanban-column__count">{col.deals.length}</span>
                </header>
                <div className="crm-kanban-column__body">
                  {col.deals.map((deal) => (
                    <KanbanCard
                      key={deal.id}
                      deal={deal}
                      summary={summaryFor(deal)}
                      dragging={dragDealId === deal.id}
                      isSelected={selectedDealId === deal.id}
                      onSelect={onSelectDeal}
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { UNSTAGED_KEY };
