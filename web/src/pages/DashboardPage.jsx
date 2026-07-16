import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { userAPI, dealsAPI, paymentsAPI } from '../utils/api';
import { normalizeDeal } from '../utils/normalizeDeal';
import DealAggregator from '../components/DealAggregator';
import SavedDeals from '../components/SavedDeals';
import CrmDashboard from '../components/crm/CrmDashboard';
import Navigation from '../components/Navigation';
import { useIsMobile } from '../hooks/useMediaQuery';
import BuyBoxModal from '../components/BuyBoxModal';
import { BUY_BOX_SLOT_COUNT } from '../utils/buyBoxes';
import SourceManagerModal from '../components/SourceManagerModal';
import ManualDealModal from '../components/ManualDealModal';
import QuickDealCalculatorModal from '../components/QuickDealCalculatorModal';
import ScrapeActivityToast from '../components/ScrapeActivityToast';
import GuestOnboardingTour, { GUEST_TOUR_DISMISS_KEY } from '../components/GuestOnboardingTour';
import GuestMyDealsEmpty from '../components/GuestMyDealsEmpty';
import { loadGuestSettings, persistGuestSettings } from '../utils/guestSettings';
import { useGuestAccess } from '../hooks/useGuestAccess';
import { logGuestEvent } from '../utils/guestAnalytics';

function isBuyBoxEmpty(buyBox) {
  if (!buyBox || typeof buyBox !== 'object') return true;
  const has = (v) => v != null && v !== '' && (Array.isArray(v) ? v.length > 0 : true);
  return (
    !has(buyBox.minPrice) &&
    !has(buyBox.maxPrice) &&
    !has(buyBox.minEbitda) &&
    !has(buyBox.maxEbitda) &&
    !has(buyBox.minRevenue) &&
    !has(buyBox.revenueMultiple) &&
    !has(buyBox.targetStates) &&
    !has(buyBox.targetIndustries) &&
    !has(buyBox.targetCOC) &&
    !has(buyBox.targetPayback) &&
    !has(buyBox.minBuyerSalary)
  );
}

function shouldSkipGuestOnboardingAfterLogout() {
  try {
    return sessionStorage.getItem('vettr_skip_guest_onboarding') === '1';
  } catch {
    return false;
  }
}

function clearSkipGuestOnboardingAfterLogout() {
  try {
    sessionStorage.removeItem('vettr_skip_guest_onboarding');
  } catch {}
}

export default function DashboardPage({ feedSource = 'airtable' }) {
  const { user, logout, loading: authLoading } = useAuth();
  const { activeTeamId } = useTeam();
  const { isGuest, entitlements, requireSignup } = useGuestAccess(user);
  const [searchParams] = useSearchParams();
  const initialDealDbId = searchParams.get('dealDbId') || null;
  const checkoutSessionId = searchParams.get('session_id');
  const initialCrmView = searchParams.get('crmSubview') || null;

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'aggregator';
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'crm' ? 'crm' : 'aggregator';
  });
  const [guestTourBlocking, setGuestTourBlocking] = useState(() => {
    if (!isGuest) return false;
    try {
      return localStorage.getItem(GUEST_TOUR_DISMISS_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const [settings, setSettings] = useState(null);
  const [savedDeals, setSavedDeals] = useState([]);
  /** All personal + team saves — used for aggregator “already saved” markers only. */
  const [savedDealIndex, setSavedDealIndex] = useState([]);
  const [crmBadgeCount, setCrmBadgeCount] = useState(0);
  const [crmInitialDealId, setCrmInitialDealId] = useState(null);
  const [matchCount, setMatchCount] = useState(0);
  const [totalDeals, setTotalDeals] = useState(0);
  const [newTodayCount, setNewTodayCount] = useState(0);
  const [showingCount, setShowingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBuyBoxModal, setShowBuyBoxModal] = useState(false);
  const [buyBoxModalMode, setBuyBoxModalMode] = useState('closed');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showManualDealModal, setShowManualDealModal] = useState(false);
  const [showQuickCalculator, setShowQuickCalculator] = useState(false);
  const [poolNewDealsFilter, setPoolNewDealsFilter] = useState(null);
  const [tourForceOpen, setTourForceOpen] = useState(false);
  const [tourPrepareStepId, setTourPrepareStepId] = useState(null);
  const [mobileDeckActive, setMobileDeckActive] = useState(false);
  const isMobile = useIsMobile();
  /** Skip guest tour + buy box onboarding after logout (user already knows the product). */
  const [suppressGuestOnboarding, setSuppressGuestOnboarding] = useState(() => {
    if (shouldSkipGuestOnboardingAfterLogout()) {
      clearSkipGuestOnboardingAfterLogout();
      return true;
    }
    return false;
  });
  const teamScopeBootstrappedRef = useRef(false);

  const loadScopedSavedDeals = useCallback(async () => {
    if (authLoading || isGuest) return;
    const dealsOpts = activeTeamId
      ? { scope: 'team', teamId: activeTeamId }
      : { scope: 'personal' };
    const dealsData = await dealsAPI.getSavedDeals(dealsOpts);
    const normalized = (dealsData.deals || []).map(normalizeDeal);
    console.log('[Dashboard] scoped saved deals loaded', {
      scope: dealsOpts.scope,
      teamId: dealsOpts.teamId ?? null,
      count: normalized.length
    });
    setSavedDeals(normalized);
  }, [authLoading, isGuest, activeTeamId]);

  const loadSavedDealIndex = useCallback(async () => {
    if (authLoading || isGuest) return;
    const dealsData = await dealsAPI.getSavedDeals({ scope: 'all' });
    setSavedDealIndex((dealsData.deals || []).map(normalizeDeal));
  }, [authLoading, isGuest]);

  const loadSettings = useCallback(async () => {
    if (authLoading) return;
    if (isGuest) {
      setSettings(loadGuestSettings());
      setSavedDeals([]);
      setSavedDealIndex([]);
      return;
    }
    const settingsData = await userAPI.getSettings();
    setSettings(settingsData);
  }, [authLoading, isGuest]);

  /** Full refresh after save / settings change — does not block the dashboard UI. */
  const loadUserData = useCallback(async () => {
    if (authLoading) return;

    if (isGuest) {
      await loadSettings();
      setLoading(false);
      return;
    }

    try {
      await Promise.all([
        loadSettings(),
        loadScopedSavedDeals(),
        loadSavedDealIndex()
      ]);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isGuest, loadSettings, loadScopedSavedDeals, loadSavedDealIndex]);

  const persistSettings = useCallback(
    async (patch) => {
      if (isGuest) {
        const next = await persistGuestSettings(patch);
        setSettings(next);
        return next;
      }
      const updated = await userAPI.updateSettings(patch);
      await loadUserData();
      return updated;
    },
    [isGuest, loadUserData]
  );

  /** Initial dashboard boot only — team switches must not unmount the aggregator. */
  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    loadUserData();
  }, [authLoading, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Team workspace change: refresh My Deals / CRM list silently; market feed stays mounted. */
  useEffect(() => {
    if (authLoading || isGuest) return;
    if (!teamScopeBootstrappedRef.current) {
      teamScopeBootstrappedRef.current = true;
      return;
    }
    setSavedDeals([]);
    loadScopedSavedDeals().catch((err) => {
      console.error('[Dashboard] team saved deals refresh failed:', err);
    });
  }, [activeTeamId, authLoading, isGuest, loadScopedSavedDeals]);

  /** Live refresh when the Chrome extension saves/updates a deal on the web API. */
  useEffect(() => {
    if (isGuest) return;
    const onExtensionDealsChanged = () => {
      console.log('[Dashboard] Extension deals changed — refetching My Deals');
      loadUserData();
    };
    window.addEventListener('vettr-deals-changed', onExtensionDealsChanged);
    return () => window.removeEventListener('vettr-deals-changed', onExtensionDealsChanged);
  }, [isGuest, loadUserData]);

  useEffect(() => {
    if (isGuest) logGuestEvent('guest_dashboard_view', { feedSource });
  }, [isGuest, feedSource]);

  useEffect(() => {
    if (isGuest || !checkoutSessionId) return;

    let cancelled = false;
    (async () => {
      try {
        await paymentsAPI.confirmCheckout(checkoutSessionId);
        if (!cancelled) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (error) {
        console.error('Failed to confirm checkout:', error);
      }
    })();

    return () => { cancelled = true; };
  }, [isGuest, checkoutSessionId]);

  useEffect(() => {
    if (user) {
      setSuppressGuestOnboarding(false);
      clearSkipGuestOnboardingAfterLogout();
    }
  }, [user]);

  const handleLogout = useCallback(() => {
    setSuppressGuestOnboarding(true);
    setShowBuyBoxModal(false);
    setBuyBoxModalMode('closed');
    logout();
  }, [logout]);

  useEffect(() => {
    if (authLoading || !isGuest || guestTourBlocking || suppressGuestOnboarding || !settings) return;
    if (shouldSkipGuestOnboardingAfterLogout()) {
      clearSkipGuestOnboardingAfterLogout();
      setSuppressGuestOnboarding(true);
      return;
    }
    if (
      isBuyBoxEmpty(settings.buyBox) &&
      !settings.preferences?.buyBoxOnboardingDismissed
    ) {
      setBuyBoxModalMode('onboarding');
      setShowBuyBoxModal(true);
    }
  }, [authLoading, isGuest, guestTourBlocking, suppressGuestOnboarding, settings]);

  // Auth can resolve after a guest-path render; never keep onboarding open for logged-in users.
  useEffect(() => {
    if (isGuest || buyBoxModalMode !== 'onboarding') return;
    setShowBuyBoxModal(false);
    setBuyBoxModalMode('closed');
  }, [isGuest, buyBoxModalMode]);

  const handleTourDismiss = useCallback(() => {
    setTourForceOpen(false);
    setGuestTourBlocking(false);
    setTourPrepareStepId(null);
  }, []);

  const handleStartTour = useCallback(() => {
    setActiveTab('aggregator');
    setTourForceOpen(true);
    setGuestTourBlocking(true);
    setTourPrepareStepId(null);
  }, []);

  const handleMatchCountUpdate = (count) => setMatchCount(count);

  const handleDealsStatsUpdate = ({ total = 0, newToday = 0, showing = 0 }) => {
    setTotalDeals(total);
    setNewTodayCount(newToday);
    setShowingCount(showing);
  };

  const handleFetchDeals = () => {
    setRefreshKey((current) => current + 1);
    setActiveTab('aggregator');
  };

  const handleSaveCalculatorDefaults = async (calculatorDefaults) => {
    try {
      await persistSettings({ preferences: { calculatorDefaults } });
    } catch (error) {
      console.error('Failed to save calculator defaults:', error);
    }
  };

  const aggregatorSavedEntries = useMemo(() => savedDealIndex, [savedDealIndex]);

  const savedRowIdByMarketDealId = useMemo(() => {
    const map = {};
    for (const d of aggregatorSavedEntries) {
      if (d.dealId != null && d.dealId !== '') {
        map[String(d.dealId)] = d.id;
      }
      if (d.marketDealId != null && d.marketDealId !== '') {
        map[String(d.marketDealId)] = d.id;
      }
    }
    return map;
  }, [aggregatorSavedEntries]);

  const aggregatorSavedDealIds = useMemo(() => {
    const ids = [];
    for (const d of aggregatorSavedEntries) {
      if (d.dealId != null && d.dealId !== '') ids.push(String(d.dealId));
      if (d.marketDealId != null && d.marketDealId !== '') ids.push(String(d.marketDealId));
    }
    return ids;
  }, [aggregatorSavedEntries]);

  const saveScopeSavedDealIds = useMemo(() => {
    const ids = [];
    for (const d of savedDeals) {
      if (d.dealId != null && d.dealId !== '') ids.push(String(d.dealId));
      if (d.marketDealId != null && d.marketDealId !== '') ids.push(String(d.marketDealId));
    }
    return ids;
  }, [savedDeals]);

  const saveScopeRowIdByMarketDealId = useMemo(() => {
    const map = {};
    for (const d of savedDeals) {
      if (d.dealId != null && d.dealId !== '') map[String(d.dealId)] = d.id;
      if (d.marketDealId != null && d.marketDealId !== '') map[String(d.marketDealId)] = d.id;
    }
    return map;
  }, [savedDeals]);

  const safeBuyBoxEditingSlotIndex = useMemo(() => {
    const raw = settings?.activeBuyBoxIndex ?? settings?.preferences?.activeBuyBoxIndex ?? 0;
    const n = Number(raw);
    const idx = Number.isFinite(n) ? Math.trunc(n) : 0;
    return Math.min(BUY_BOX_SLOT_COUNT - 1, Math.max(0, idx));
  }, [settings?.activeBuyBoxIndex, settings?.preferences?.activeBuyBoxIndex]);

  const handleTabChange = (tab) => {
    if (isGuest && tab === 'saved-deals') {
      logGuestEvent('guest_my_deals_tab');
    }
    setActiveTab(tab);
  };

  if (loading || authLoading) {
    return (
      <div className="loading-screen">
        {isGuest ? 'Loading deals...' : 'Loading your dashboard...'}
      </div>
    );
  }

  return (
    <div className={`app-page-shell${mobileDeckActive && isMobile ? ' app-page-shell--mobile-deck' : ''}`}>
      {(isGuest || tourForceOpen) && (
        <GuestOnboardingTour
          autoShow={isGuest && !suppressGuestOnboarding}
          forceOpen={tourForceOpen}
          onDismiss={handleTourDismiss}
          onEnsureAggregatorTab={() => setActiveTab('aggregator')}
          onPrepareStep={setTourPrepareStepId}
        />
      )}
      <ScrapeActivityToast
        feedSource={feedSource}
        enabled={Boolean(user)}
        isGuest={isGuest}
        suppressGuestHint={guestTourBlocking}
        onRequireSignup={requireSignup}
        onViewNewDeals={({ newRowDbIds, lastScrapeAt }) => {
          setPoolNewDealsFilter({
            dbIds: newRowDbIds?.length > 0 ? newRowDbIds : null,
            lastScrapeAt,
          });
          setActiveTab('aggregator');
        }}
      />
      <Navigation
        user={user}
        logout={handleLogout}
        isGuest={isGuest}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        aggregatorCount={totalDeals}
        myDealsCount={savedDeals.length}
        crmCount={savedDeals.length}
        crmBadgeCount={crmBadgeCount}
        compact={mobileDeckActive && isMobile && activeTab === 'aggregator'}
        onOpenQuickCalculator={() => {
          if (isGuest) {
            requireSignup('default');
            return;
          }
          setShowQuickCalculator(true);
        }}
        onStartTour={handleStartTour}
      />

      <div className="dashboard-content">
        {activeTab === 'aggregator' && (
          <div className="dashboard-tab-pane dashboard-tab-pane--active">
          <DealAggregator
            tourPrepareStepId={tourPrepareStepId}
            settings={settings}
            manualRefreshToken={refreshKey}
            matchCount={matchCount}
            onMatchCountUpdate={handleMatchCountUpdate}
            onDealsStatsUpdate={handleDealsStatsUpdate}
            onSaveDeal={loadUserData}
            onSettingsUpdate={loadUserData}
            onConfigureBuyBox={() => {
              setBuyBoxModalMode('edit');
              setShowBuyBoxModal(true);
            }}
            feedSource={feedSource}
            savedDealIds={aggregatorSavedDealIds}
            savedRowIdByMarketDealId={savedRowIdByMarketDealId}
            saveScopeSavedDealIds={saveScopeSavedDealIds}
            saveScopeRowIdByMarketDealId={saveScopeRowIdByMarketDealId}
            poolNewDealsFilter={poolNewDealsFilter}
            onClearPoolNewDealsFilter={() => setPoolNewDealsFilter(null)}
            isGuest={isGuest}
            entitlements={entitlements}
            persistSettings={persistSettings}
            requireSignup={requireSignup}
            initialOpenDealDbId={initialDealDbId}
            onMobileDeckChange={setMobileDeckActive}
          />
          </div>
        )}

        {activeTab === 'saved-deals' && isGuest && (
          <div className="dashboard-tab-pane dashboard-tab-pane--active">
          <GuestMyDealsEmpty
            onRequireSignup={requireSignup}
            onBackToAggregator={() => setActiveTab('aggregator')}
          />
          </div>
        )}

        {activeTab === 'saved-deals' && !isGuest && (
          <div className="dashboard-tab-pane dashboard-tab-pane--active">
          <SavedDeals
            deals={savedDeals}
            settings={settings}
            onUpdate={loadUserData}
            onSaveCalculatorDefaults={handleSaveCalculatorDefaults}
            onAddDeal={() => setShowManualDealModal(true)}
            onOpenInCrm={(dealId) => {
              setCrmInitialDealId(dealId);
              setActiveTab('crm');
            }}
          />
          </div>
        )}

        {activeTab === 'crm' && isGuest && (
          <div className="dashboard-tab-pane dashboard-tab-pane--active">
          <GuestMyDealsEmpty
            onRequireSignup={requireSignup}
            onBackToAggregator={() => setActiveTab('aggregator')}
          />
          </div>
        )}

        {activeTab === 'crm' && !isGuest && (
          <div className="dashboard-tab-pane dashboard-tab-pane--active">
          <CrmDashboard
            deals={savedDeals}
            settings={settings}
            onRefresh={loadUserData}
            onSaveCalculatorDefaults={handleSaveCalculatorDefaults}
            onTodayLoaded={setCrmBadgeCount}
            initialDealId={crmInitialDealId}
            initialCrmView={initialCrmView}
          />
          </div>
        )}
      </div>

      <BuyBoxModal
        isOpen={showBuyBoxModal}
        settings={settings}
        editingSlotIndex={safeBuyBoxEditingSlotIndex}
        onClose={() => {
          setShowBuyBoxModal(false);
          setBuyBoxModalMode('closed');
        }}
        onSaved={loadUserData}
        isOnboarding={buyBoxModalMode === 'onboarding'}
        isGuest={isGuest}
        persistSettings={persistSettings}
      />

      {!isGuest && (
        <>
          <SourceManagerModal
            isOpen={showSourceModal}
            settings={settings}
            onClose={() => setShowSourceModal(false)}
            onSaved={() => {
              loadUserData();
              handleFetchDeals();
            }}
          />
          <ManualDealModal
            isOpen={showManualDealModal}
            onClose={() => setShowManualDealModal(false)}
            onSaved={async () => {
              await loadUserData();
              setActiveTab('saved-deals');
            }}
          />
          <QuickDealCalculatorModal
            isOpen={showQuickCalculator}
            onClose={() => setShowQuickCalculator(false)}
            settings={settings}
            onSaveCalculatorDefaults={handleSaveCalculatorDefaults}
            onDealSaved={async () => {
              await loadUserData();
              setActiveTab('saved-deals');
            }}
          />
        </>
      )}
    </div>
  );
}
