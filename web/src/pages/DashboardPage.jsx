import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, dealsAPI } from '../utils/api';
import { filterDeals, countMatchingDeals } from '../../../shared/buyBoxMatcher.js';
import DealAggregator from '../components/DealAggregator';
import SavedDeals from '../components/SavedDeals';
import Navigation from '../components/Navigation';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('aggregator');
  const [settings, setSettings] = useState(null);
  const [savedDeals, setSavedDeals] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showGreeting, setShowGreeting] = useState(true);

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
      setSavedDeals(dealsData.deals || []);
      
      // Calculate match count (will be updated when deals are fetched in DealAggregator)
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

  if (loading) {
    return <div className="loading-screen">Loading your dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <Navigation user={user} logout={logout} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="dashboard-content">
        {/* Post-login greeting with match count */}
        {showGreeting && activeTab === 'aggregator' && (
          <div className="greeting-banner">
            <div className="greeting-content">
              <h2>
                {matchCount > 0 
                  ? `You have ${matchCount} deal${matchCount !== 1 ? 's' : ''} matching your criteria` 
                  : 'Welcome back! Loading deals...'}
              </h2>
              <p>
                {matchCount > 0 
                  ? 'Review them below and save promising opportunities to My Deals.' 
                  : 'Set your buy box to filter deals that match your investment criteria.'}
              </p>
            </div>
            <button 
              className="close-greeting" 
              onClick={() => setShowGreeting(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === 'aggregator' && (
          <DealAggregator 
            settings={settings}
            onMatchCountUpdate={handleMatchCountUpdate}
            onSaveDeal={loadUserData}
          />
        )}

        {activeTab === 'saved-deals' && (
          <SavedDeals 
            deals={savedDeals}
            onUpdate={loadUserData}
          />
        )}
      </div>
    </div>
  );
}
