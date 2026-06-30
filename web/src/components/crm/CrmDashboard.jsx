import { useState, useEffect, useCallback, useMemo } from 'react';
import { crmAPI } from '../../utils/api';
import { normalizeDeal } from '../../utils/normalizeDeal';
import CrmKanban from './CrmKanban';
import CrmDealWorkspace from './CrmDealWorkspace';
import CrmToday from './CrmToday';

export default function CrmDashboard({
  deals = [],
  settings = null,
  onRefresh,
  onSaveCalculatorDefaults = null,
  onTodayLoaded = null
}) {
  const [crmView, setCrmView] = useState('today');
  const [today, setToday] = useState(null);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAPI.getToday();
      setToday(data);
      onTodayLoaded?.(data?.badgeCount ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to load CRM');
    } finally {
      setLoading(false);
    }
  }, [onTodayLoaded]);

  useEffect(() => {
    loadToday();
  }, [loadToday, deals.length]);

  const selectedDeal = useMemo(() => {
    const raw = deals.find((d) => d.vettrId === selectedDealId || d.id === selectedDealId);
    return raw ? normalizeDeal(raw) : null;
  }, [deals, selectedDealId]);

  const handleSelectDeal = (id) => {
    setSelectedDealId(id);
  };

  const handleRefresh = async () => {
    await loadToday();
    onRefresh?.();
  };

  if (loading && !today) {
    return <div className="crm-panel crm-panel--loading">Loading CRM…</div>;
  }

  if (error && !today) {
    return (
      <div className="crm-panel crm-panel--error">
        <p>{error}</p>
        <button type="button" className="btn-secondary" onClick={loadToday}>Retry</button>
      </div>
    );
  }

  const dealList = deals.length > 0 ? deals : [];
  const taskSummary = today?.tasks || {};

  return (
    <div className="crm-dashboard">
      <nav className="crm-subnav" aria-label="CRM views">
        <button
          type="button"
          className={`crm-subnav__btn${crmView === 'today' ? ' crm-subnav__btn--active' : ''}`}
          onClick={() => setCrmView('today')}
        >
          Today
          {(today?.badgeCount ?? 0) > 0 ? (
            <span className="crm-subnav__badge">{today.badgeCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          className={`crm-subnav__btn${crmView === 'pipeline' ? ' crm-subnav__btn--active' : ''}`}
          onClick={() => setCrmView('pipeline')}
        >
          Pipeline
        </button>
      </nav>

      {crmView === 'today' && (
        <>
          <div className="crm-today-strip">
            <div className="crm-today-stat">
              <span className="crm-today-stat__value">{taskSummary.overdue?.length ?? 0}</span>
              <span className="crm-today-stat__label">Overdue</span>
            </div>
            <div className="crm-today-stat">
              <span className="crm-today-stat__value">{taskSummary.dueToday?.length ?? 0}</span>
              <span className="crm-today-stat__label">Due today</span>
            </div>
            <div className="crm-today-stat">
              <span className="crm-today-stat__value">{today?.staleListings?.length ?? 0}</span>
              <span className="crm-today-stat__label">Stale listings</span>
            </div>
          </div>

          <CrmToday
            today={today}
            onSelectDeal={(id) => {
              setSelectedDealId(id);
            }}
            onRefresh={handleRefresh}
          />

          {dealList.length === 0 ? (
            <div className="crm-empty">
              <h2>No deals in CRM yet</h2>
              <p>Save a deal from the Aggregator or My Deals — it will show up here with broker and financials filled in.</p>
            </div>
          ) : selectedDeal ? (
            <section className="crm-workspace crm-workspace--below-kanban">
              <CrmDealWorkspace
                deal={selectedDeal}
                dealId={selectedDealId}
                settings={settings}
                onRefresh={handleRefresh}
                onSaveCalculatorDefaults={onSaveCalculatorDefaults}
                onClose={() => setSelectedDealId(null)}
              />
            </section>
          ) : null}
        </>
      )}

      {crmView === 'pipeline' && (
        <>
          <CrmKanban
            deals={deals}
            settings={settings}
            selectedDealId={selectedDealId}
            onSelectDeal={handleSelectDeal}
            onRefresh={handleRefresh}
          />
          {selectedDeal ? (
            <section className="crm-workspace crm-workspace--below-kanban">
              <CrmDealWorkspace
                deal={selectedDeal}
                dealId={selectedDealId}
                settings={settings}
                onRefresh={handleRefresh}
                onSaveCalculatorDefaults={onSaveCalculatorDefaults}
                onClose={() => setSelectedDealId(null)}
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
