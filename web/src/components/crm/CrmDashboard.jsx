import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { crmAPI } from '../../utils/api';
import { normalizeDeal } from '../../utils/normalizeDeal';
import CrmKanban from './CrmKanban';
import CrmDealWorkspace from './CrmDealWorkspace';
import CrmTaskList from './CrmTaskList';
import CrmContactList from './CrmContactList';
import CrmAnalytics from './CrmAnalytics';
import CrmCalendar from './CrmCalendar';
import SuggestedTaskPrompt from './SuggestedTaskPrompt';
import CrmActionStrip, {
  buildNextActionByDealId,
  getActionFilterDealIds
} from './CrmActionStrip';
import SavedDeals from '../SavedDeals';

const VALID_VIEWS = new Set(['home', 'list', 'tasks', 'contacts', 'calendar', 'analytics']);

function normalizeCrmView(view) {
  if (!view) return 'home';
  if (view === 'today' || view === 'pipeline') return 'home';
  if (VALID_VIEWS.has(view)) return view;
  return 'home';
}

export default function CrmDashboard({
  deals = [],
  settings = null,
  onRefresh,
  onSaveCalculatorDefaults = null,
  onTodayLoaded = null,
  onAddDeal = null,
  initialDealId = null,
  initialCrmView = null,
  initialFocusSection = null
}) {
  const [crmView, setCrmView] = useState(() => normalizeCrmView(initialCrmView));
  const [today, setToday] = useState(null);
  const [selectedDealId, setSelectedDealId] = useState(initialDealId);
  const [workspaceFocusSection, setWorkspaceFocusSection] = useState(initialFocusSection);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stagePrompt, setStagePrompt] = useState(null);
  const [actionFilter, setActionFilter] = useState(null);

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
      setCrmView(normalizeCrmView(initialCrmView));
    }
  }, [initialCrmView]);

  useEffect(() => {
    if (initialDealId) {
      setSelectedDealId(initialDealId);
      console.log('[CrmDashboard] open deal from deep link / parent', initialDealId);
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

  const nextActionByDealId = useMemo(() => buildNextActionByDealId(today), [today]);

  const highlightDealIds = useMemo(
    () => getActionFilterDealIds(today, actionFilter),
    [today, actionFilter]
  );

  const handleSelectDeal = (id, opts = {}) => {
    setSelectedDealId(id);
    setWorkspaceFocusSection(opts.focusSection || null);
  };

  const handleCloseWorkspace = () => {
    setSelectedDealId(null);
    setWorkspaceFocusSection(null);
  };

  useEffect(() => {
    if (!selectedDealId) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handleCloseWorkspace();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedDealId]);

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

  const handleBlankUnderwriting =
    typeof crmAPI.createBlankUnderwriting === 'function'
      ? async () => {
          const name = window.prompt('Deal name for blank underwriting', 'Off-market deal');
          if (name === null) return;
          try {
            const res = await crmAPI.createBlankUnderwriting({
              name: name.trim() || 'Off-market deal'
            });
            console.log('[crm] blank underwriting created', res.savedDealId);
            await handleRefresh();
            window.location.assign(`/app/underwriting/${res.savedDealId}`);
          } catch (err) {
            alert('Failed to create underwriting: ' + (err.message || 'error'));
          }
        }
      : null;

  if (loading && !today) {
    return <div className="crm-panel crm-panel--loading">Loading Vettr CRM…</div>;
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

  const workspaceDrawer =
    selectedDeal && typeof document !== 'undefined'
      ? createPortal(
          <div className="crm-drawer-root" role="presentation">
            <button
              type="button"
              className="crm-drawer-backdrop"
              aria-label="Close deal workspace"
              onClick={handleCloseWorkspace}
            />
            <aside className="crm-drawer" role="dialog" aria-modal="true" aria-label="Deal workspace">
              <CrmDealWorkspace
                deal={selectedDeal}
                dealId={selectedDealId}
                settings={settings}
                onRefresh={handleRefresh}
                onSaveCalculatorDefaults={onSaveCalculatorDefaults}
                onClose={handleCloseWorkspace}
                onStageChanged={(result) => handleStageChanged(result, selectedDeal.name)}
                focusSectionId={workspaceFocusSection}
              />
            </aside>
          </div>,
          document.body
        )
      : null;

  const subnav = (
    <nav className="crm-subnav" aria-label="Vettr CRM views">
      <button
        type="button"
        className={`crm-subnav__btn${crmView === 'home' ? ' crm-subnav__btn--active' : ''}`}
        onClick={() => setCrmView('home')}
      >
        Home
        {(today?.badgeCount ?? 0) > 0 ? (
          <span className="crm-subnav__badge">{today.badgeCount}</span>
        ) : null}
      </button>
      <button
        type="button"
        className={`crm-subnav__btn${crmView === 'list' ? ' crm-subnav__btn--active' : ''}`}
        onClick={() => setCrmView('list')}
      >
        List
        {dealList.length > 0 ? (
          <span className="crm-subnav__badge">{dealList.length}</span>
        ) : null}
      </button>
      <button
        type="button"
        className={`crm-subnav__btn${crmView === 'tasks' ? ' crm-subnav__btn--active' : ''}`}
        onClick={() => setCrmView('tasks')}
      >
        Tasks
        {openTaskCount > 0 ? (
          <span className="crm-subnav__badge">{openTaskCount}</span>
        ) : null}
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
  );

  return (
    <div className="crm-dashboard">
      {subnav}

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

      {crmView === 'home' && (
        <>
          <CrmActionStrip
            today={today}
            activeFilter={actionFilter}
            onFilterChange={setActionFilter}
            onSelectDeal={handleSelectDeal}
            onRefresh={handleRefresh}
          />

          {dealList.length === 0 ? (
            <div className="crm-empty">
              <h2>No deals in Vettr CRM yet</h2>
              <p>Save a deal from the Aggregator — it shows up on this board with broker and financials filled in.</p>
              {typeof onAddDeal === 'function' ? (
                <button type="button" className="btn-primary" onClick={onAddDeal}>
                  Add deal manually
                </button>
              ) : null}
            </div>
          ) : (
            <CrmKanban
              deals={deals}
              settings={settings}
              selectedDealId={selectedDealId}
              onSelectDeal={handleSelectDeal}
              onRefresh={handleRefresh}
              onStageChanged={handleStageChanged}
              onBlankUnderwriting={handleBlankUnderwriting}
              highlightDealIds={highlightDealIds}
              nextActionByDealId={nextActionByDealId}
              onAddDeal={onAddDeal}
            />
          )}
        </>
      )}

      {crmView === 'list' && (
        <SavedDeals
          deals={deals}
          settings={settings}
          onUpdate={onRefresh}
          onSaveCalculatorDefaults={onSaveCalculatorDefaults}
          onAddDeal={onAddDeal}
          workspaceMode
          onOpenInCrm={(dealId) => handleSelectDeal(dealId)}
        />
      )}

      {crmView === 'tasks' && (
        <CrmTaskList
          deals={dealList}
          onSelectDeal={handleSelectDeal}
          onRefresh={handleRefresh}
        />
      )}

      {crmView === 'contacts' && (
        <CrmContactList deals={dealList} onSelectDeal={handleSelectDeal} />
      )}

      {crmView === 'calendar' && <CrmCalendar />}

      {crmView === 'analytics' && <CrmAnalytics />}

      {workspaceDrawer}
    </div>
  );
}
