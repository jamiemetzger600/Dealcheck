import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, dealsAPI } from '../utils/api';
import { normalizeDeal } from '../utils/normalizeDeal';
import DealAggregator from '../components/DealAggregator';
import SavedDeals from '../components/SavedDeals';
import Navigation from '../components/Navigation';
import BuyBoxModal from '../components/BuyBoxModal';
import SourceManagerModal from '../components/SourceManagerModal';
import ManualDealModal from '../components/ManualDealModal';

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

export default function DashboardPage({ feedSource = 'airtable' }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('aggregator');
  const [settings, setSettings] = useState(null);
  const [savedDeals, setSavedDeals] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [totalDeals, setTotalDeals] = useState(0);
  const [newTodayCount, setNewTodayCount] = useState(0);
  const [showingCount, setShowingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBuyBoxModal, setShowBuyBoxModal] = useState(false);
  /** 'onboarding' = auto-open for new/empty buy box; 'edit' = user opened settings */
  const [buyBoxModalMode, setBuyBoxModalMode] = useState('closed');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showManualDealModal, setShowManualDealModal] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [settingsData, dealsData] = await Promise.all([
        userAPI.getSettings(),
        dealsAPI.getSavedDeals()
      ]);
      
      setSettings(settingsData);
      // Normalize deals from API (snake_case) to frontend format (camelCase)
      const normalized = (dealsData.deals || []).map(normalizeDeal);
      setSavedDeals(normalized);
      
      if (
        settingsData &&
        isBuyBoxEmpty(settingsData.buyBox) &&
        !settingsData.preferences?.buyBoxOnboardingDismissed
      ) {
        setBuyBoxModalMode('onboarding');
        setShowBuyBoxModal(true);
      }
      
      setMatchCount(0);
      
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchCountUpdate = (count) => {
    setMatchCount(count);
  };

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
      await userAPI.updateSettings({ preferences: { calculatorDefaults } });
      await loadUserData();
    } catch (error) {
      console.error('Failed to save calculator defaults:', error);
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading your dashboard...</div>;
  }

  return (
    <div className="app-page-shell">
      <Navigation
        user={user}
        logout={logout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        aggregatorCount={totalDeals}
        myDealsCount={savedDeals.length}
      />

      <div className="dashboard-content">
        {activeTab === 'aggregator' && (
          <DealAggregator 
            settings={settings}
            manualRefreshToken={refreshKey}
            matchCount={matchCount}
            onMatchCountUpdate={handleMatchCountUpdate}
            onDealsStatsUpdate={handleDealsStatsUpdate}
            onSaveDeal={loadUserData}
            onSettingsUpdate={loadUserData}
            onAddDeal={() => setShowManualDealModal(true)}
            onConfigureBuyBox={() => {
              setBuyBoxModalMode('edit');
              setShowBuyBoxModal(true);
            }}
            feedSource={feedSource}
            savedDealIds={savedDeals.map((d) => d.dealId ?? d.id).filter(Boolean)}
          />
        )}

        {activeTab === 'saved-deals' && (
          <SavedDeals 
            deals={savedDeals}
            settings={settings}
            onUpdate={loadUserData}
            onSaveCalculatorDefaults={handleSaveCalculatorDefaults}
          />
        )}
      </div>

      <BuyBoxModal
        isOpen={showBuyBoxModal}
        settings={settings}
        onClose={() => {
          setShowBuyBoxModal(false);
          setBuyBoxModalMode('closed');
        }}
        onSaved={loadUserData}
        isOnboarding={buyBoxModalMode === 'onboarding'}
      />
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
        onSaved={() => {
          loadUserData();
          handleFetchDeals();
        }}
      />
    </div>
  );
}
