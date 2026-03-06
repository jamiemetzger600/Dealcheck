import { useState, useEffect } from 'react';
import { userAPI, paymentsAPI } from '../utils/api';
import Navigation from '../components/Navigation';
import { useAuth } from '../context/AuthContext';

export default function BillingPage() {
  const { user, logout } = useAuth();
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadEntitlements();
  }, []);

  const loadEntitlements = async () => {
    try {
      const data = await userAPI.getEntitlements();
      setEntitlements(data);
    } catch (error) {
      console.error('Failed to load entitlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan) => {
    setUpgrading(true);
    try {
      const { url } = await paymentsAPI.createCheckoutSession(plan);
      window.location.href = url;
    } catch (error) {
      alert('Failed to start checkout: ' + error.message);
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await paymentsAPI.createPortalSession();
      window.location.href = url;
    } catch (error) {
      alert('Failed to open billing portal: ' + error.message);
    }
  };

  if (loading) return <div className="loading-screen">Loading billing...</div>;

  return (
    <div className="dashboard">
      <Navigation user={user} logout={logout} />
      
      <div className="billing-page">
        <h1>Billing & Subscription</h1>

        <div className="current-plan">
          <h2>Current Plan: {entitlements?.plan || 'Free'}</h2>
          <p>Status: {entitlements?.status || 'none'}</p>
        </div>

        {entitlements?.plan === 'free' || entitlements?.status !== 'active' ? (
          <div className="pricing-plans">
            <div className="plan-card">
              <h3>Monthly</h3>
              <p className="price">$29<span>/month</span></p>
              <ul>
                <li>✓ Instant notifications</li>
                <li>✓ Unlimited saved deals</li>
                <li>✓ Advanced filters</li>
              </ul>
              <button onClick={() => handleUpgrade('monthly')} className="btn-primary" disabled={upgrading}>
                {upgrading ? 'Loading...' : 'Upgrade to Monthly'}
              </button>
            </div>

            <div className="plan-card featured">
              <h3>Yearly</h3>
              <p className="price">$290<span>/year</span></p>
              <p className="save-badge">Save $58/year</p>
              <ul>
                <li>✓ Instant notifications</li>
                <li>✓ Unlimited saved deals</li>
                <li>✓ Advanced filters</li>
                <li>✓ Priority support</li>
              </ul>
              <button onClick={() => handleUpgrade('yearly')} className="btn-primary" disabled={upgrading}>
                {upgrading ? 'Loading...' : 'Upgrade to Yearly'}
              </button>
            </div>
          </div>
        ) : (
          <div className="manage-subscription">
            <p>Manage your subscription, update payment method, or cancel:</p>
            <button onClick={handleManageSubscription} className="btn-primary">
              Manage Subscription
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
