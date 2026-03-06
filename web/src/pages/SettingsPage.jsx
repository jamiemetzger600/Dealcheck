import { useState, useEffect } from 'react';
import { userAPI } from '../utils/api';
import Navigation from '../components/Navigation';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [notificationFrequency, setNotificationFrequency] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await userAPI.getSettings();
      setSettings(data);
      setNotificationFrequency(data.notificationFrequency || 'daily');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateSettings({ notificationFrequency });
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Loading settings...</div>;

  return (
    <div className="dashboard">
      <Navigation user={user} logout={logout} />
      
      <div className="settings-page">
        <h1>Settings</h1>

        <div className="settings-section">
          <h2>Notifications</h2>
          <p>Choose how often you want to receive deal-matching notifications:</p>

          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="instant"
                checked={notificationFrequency === 'instant'}
                onChange={(e) => setNotificationFrequency(e.target.value)}
              />
              <span>
                <strong>Instant</strong> - Get notified immediately when new deals match (Paid plan required)
              </span>
            </label>

            <label>
              <input
                type="radio"
                value="daily"
                checked={notificationFrequency === 'daily'}
                onChange={(e) => setNotificationFrequency(e.target.value)}
              />
              <span>
                <strong>Daily</strong> - One email per day at 9:00 AM
              </span>
            </label>

            <label>
              <input
                type="radio"
                value="weekly"
                checked={notificationFrequency === 'weekly'}
                onChange={(e) => setNotificationFrequency(e.target.value)}
              />
              <span>
                <strong>Weekly</strong> - One email every Monday at 9:00 AM
              </span>
            </label>
          </div>

          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="settings-section">
          <h2>Buy Box Configuration</h2>
          <p>Configure your buy box filters from the Dashboard → Deal Aggregator view.</p>
        </div>
      </div>
    </div>
  );
}
