import { useState, useEffect, useCallback, useMemo } from 'react';
import { crmAPI } from '../../utils/api';
import { normalizeDeal } from '../../utils/normalizeDeal';
import CrmKanban from './CrmKanban';
import CrmDealWorkspace from './CrmDealWorkspace';
import CrmToday from './CrmToday';
import CrmTaskList from './CrmTaskList';
import CrmContactList from './CrmContactList';
import CrmAnalytics from './CrmAnalytics';
import CrmCalendar from './CrmCalendar';
import SuggestedTaskPrompt from './SuggestedTaskPrompt';

export default function CrmDashboard({
  deals = [],
  settings = null,
  onRefresh,
  onSaveCalculatorDefaults = null,
  onTodayLoaded = null,
  initialDealId = null,
  initialCrmView = null,
  initialFocusSection = null
}) {
  const [crmView, setCrmView] = useState(initialCrmView || 'today');
  const [today, setToday] = useState(null);
  const [selectedDealId, setSelectedDealId] = useState(initialDealId);
  const [workspaceFocusSection, setWorkspaceFocusSection] = useState(initialFocusSection);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stagePrompt, setStagePrompt] = useState(null);

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

  useEffect(() => {
    if (initialCrmView) {
      setCrmView(initialCrmView);
    }
  }, [initialCrmView]);

  useEffect(() => {
    if (initialDealId) {
      setSelectedDealId(initialDealId);
      setCrmView('today');
    }
  }, [initialDealId]);

  useEffect(() => {
    if (initialFocusSection) {
      setWorkspaceFocusSection(initialFocusSection);
    }
  }, [initialFocusSection, initialDealId]);

  const selectedDeal = useMemo(() => {
    const id = selectedDealId == null ? '' : String(selectedDealId);
    const raw = deals.find(
      (d) => String(d.vettrId ?? '') === id || String(d.id ?? '') === id
    );
    return raw ? normalizeDeal(raw) : null;
  }, [deals, selectedDealId]);

  const handleSelectDeal = (id, opts = {}) => {
    setSelectedDealId(id);
    setWorkspaceFocusSection(opts.focusSection || null);
  };

  useEffect(() => {
    if (!selectedDealId || !selectedDeal) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector('.crm-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedDealId, selectedDeal]);

  const handleRefresh = async () => {
    await loadToday();
    onRefresh?.();
  };

  const handleStageChanged = (result, dealName) => {
    if (!result || result.unchanged) return;
    const stage = result.progressStage;
    if (result.suggestedTask || stage === 'Starting Due Diligence') {
      setStagePrompt({
        dealId: result.savedDealId,
        dealName: dealName || selectedDeal?.name,
        stage,
        suggestedTask: result.suggestedTask
      });
    }
  };

  const handleAddSuggestedTask = async () => {
    if (!stagePrompt?.dealId || !stagePrompt.suggestedTask) return;
    try {
      await crmAPI.createTask(stagePrompt.dealId, {
        title: stagePrompt.suggestedTask,
        source: 'stage_suggestion'
      });
      setStagePrompt(null);
      await handleRefresh();
    } catch (err) {
      alert('Failed to add task: ' + err.message);
    }
  };

  const handleStartDdFromPrompt = async () => {
    if (!stagePrompt?.dealId) return;
    try {
      await crmAPI.startDealDd(stagePrompt.dealId);
      setStagePrompt(null);
      setSelectedDealId(stagePrompt.dealId);
      await handleRefresh();
    } catch (err) {
      alert('Failed to start DD: ' + err.message);
    }
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
  const openTaskCount = taskSummary.openCount ?? 0;

  const workspace = selectedDeal ? (
    <section className="crm-workspace crm-workspace--below-kanban">
      <CrmDealWorkspace
        deal={selectedDeal}
        dealId={selectedDealId}
        settings={settings}
        onRefresh={handleRefresh}
        onSaveCalculatorDefaults={onSaveCalculatorDefaults}
        onClose={() => {
          setSelectedDealId(null);
          setWorkspaceFocusSection(null);
        }}
        onStageChanged={(result) => handleStageChanged(result, selectedDeal.name)}
        focusSectionId={workspaceFocusSection}
      />
    </section>
  ) : null;

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
          className={`crm-subnav__btn${crmView === 'tasks' ? ' crm-subnav__btn--active' : ''}`}
          onClick={() => setCrmView('tasks')}
        >
          Tasks
          {openTaskCount > 0 ? (
            <span className="crm-subnav__badge crm-subnav__badge--muted">{openTaskCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          className={`crm-subnav__btn${crmView === 'pipeline' ? ' crm-subnav__btn--active' : ''}`}
          onClick={() => setCrmView('pipeline')}
        >
          Pipeline
        </button>
        <button
          type="button"
          className={`crm-subnav__btn${crmView === 'contacts' ? ' crm-subnav__btn--active' : ''}`}
          onClick={() => setCrmView('contacts')}
        >
          Contacts
        </button>
        <button
          type="button"
          className={`crm-subnav__btn${crmView === 'calendar' ? ' crm-subnav__btn--active' : ''}`}
          onClick={() => setCrmView('calendar')}
        >
          Calendar
        </button>
        <button
          type="button"
          className={`crm-subnav__btn${crmView === 'analytics' ? ' crm-subnav__btn--active' : ''}`}
          onClick={() => setCrmView('analytics')}
        >
          Analytics
        </button>
      </nav>

      {stagePrompt ? (
        <SuggestedTaskPrompt
          dealName={stagePrompt.dealName}
          stage={stagePrompt.stage}
          suggestedTask={stagePrompt.suggestedTask}
          onAddTask={handleAddSuggestedTask}
          onStartDd={stagePrompt.stage === 'Starting Due Diligence' ? handleStartDdFromPrompt : null}
          onDismiss={() => setStagePrompt(null)}
        />
      ) : null}

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
            onSelectDeal={handleSelectDeal}
            onRefresh={handleRefresh}
          />

          {dealList.length === 0 ? (
            <div className="crm-empty">
              <h2>No deals in CRM yet</h2>
              <p>Save a deal from the Aggregator or My Deals — it will show up here with broker and financials filled in.</p>
            </div>
          ) : workspace}
        </>
      )}

      {crmView === 'tasks' && (
        <>
          <CrmTaskList onSelectDeal={handleSelectDeal} onRefresh={handleRefresh} />
          {workspace}
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
            onStageChanged={handleStageChanged}
          />
          {workspace}
        </>
      )}

      {crmView === 'contacts' && (
        <>
          <CrmContactList deals={deals} onSelectDeal={handleSelectDeal} />
          {workspace}
        </>
      )}

      {crmView === 'calendar' && <CrmCalendar />}

      {crmView === 'analytics' && <CrmAnalytics />}
    </div>
  );
}
