import { useState, useEffect, useCallback, useMemo } from 'react';
import { crmAPI } from '../../utils/api';
import { normalizeDeal } from '../../utils/normalizeDeal';
import CrmKanban from './CrmKanban';
import CrmDealWorkspace from './CrmDealWorkspace';

export default function CrmDashboard({
  deals = [],
  settings = null,
  onRefresh,
  onSaveCalculatorDefaults = null
}) {
  const [crmView, setCrmView] = useState('pipeline');
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
    } catch (err) {
      setError(err.message || 'Failed to load CRM');
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="crm-dashboard">
      <nav className="crm-subnav" aria-label="CRM views">
        <button
          type="button"
          className={`crm-subnav__btn${crmView === 'today' ? ' crm-subnav__btn--active' : ''}`}
          onClick={() => setCrmView('today')}
        >
          Today
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
              <span className="crm-today-stat__value">{today?.dealCount ?? dealList.length}</span>
              <span className="crm-today-stat__label">Deals in CRM</span>
            </div>
            <div className="crm-today-stat">
              <span className="crm-today-stat__value">{today?.recentActivities?.length ?? 0}</span>
              <span className="crm-today-stat__label">Recent activities</span>
            </div>
            <p className="crm-today-hint">
              Switch to Pipeline to drag deals across acquisition stages.
            </p>
          </div>

          {dealList.length === 0 ? (
            <div className="crm-empty">
              <h2>No deals in CRM yet</h2>
              <p>Save a deal from the Aggregator or My Deals — it will show up here with broker and financials filled in.</p>
            </div>
          ) : (
            <div className="crm-layout">
              <aside className="crm-deal-list">
                <h3 className="crm-section-title">Your pursuits</h3>
                <ul className="crm-deal-list__items">
                  {dealList.map((deal) => {
                    const id = deal.vettrId ?? deal.id;
                    const active = id === selectedDealId;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`crm-deal-card${active ? ' crm-deal-card--active' : ''}`}
                          onClick={() => setSelectedDealId(id)}
                        >
                          <span className="crm-deal-card__name">{deal.name || 'Untitled deal'}</span>
                          {deal.progressStage ? (
                            <span className="crm-deal-card__stage">{deal.progressStage}</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              <section className="crm-workspace">
                <CrmDealWorkspace
                  deal={selectedDeal}
                  dealId={selectedDealId}
                  settings={settings}
                  onRefresh={handleRefresh}
                  onSaveCalculatorDefaults={onSaveCalculatorDefaults}
                />
              </section>
            </div>
          )}
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
