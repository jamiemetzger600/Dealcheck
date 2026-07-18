import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { userAPI } from '../utils/api';
import Navigation from '../components/Navigation';
import TeamsSettingsPanel from '../components/TeamsSettingsPanel';
import GetTheAppPanel from '../components/GetTheAppPanel';
import { useAuth } from '../context/AuthContext';

const SETTINGS_EXPORT_VERSION = 1;
const DEFAULT_SETTINGS = {
  buyBox: {},
  excludeKeywords: [],
  excludeLists: {},
  currentExcludeList: null,
  hiddenDealIds: [],
  preferences: {},
  customSources: [],
  autoRefreshEnabled: false,
  refreshInterval: 60,
  notifyNewDeals: true,
  notificationFrequency: 'daily',
  notificationChannel: 'email',
  visibleColumns: [],
  dealViewStyle: 'table'
};

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS);

function buildExportPayload(settings) {
  return {
    version: SETTINGS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: SETTINGS_KEYS.reduce((acc, key) => {
      if (settings[key] !== undefined) acc[key] = settings[key];
      return acc;
    }, {})
  };
}

function parseImportPayload(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data || typeof data !== 'object') return null;
  const raw = data.settings || data;
  const settings = {};
  for (const key of SETTINGS_KEYS) {
    if (raw[key] !== undefined) settings[key] = raw[key];
  }
  return Object.keys(settings).length ? settings : null;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  const [notificationFrequency, setNotificationFrequency] = useState('daily');
  const [hideSavedDealsInFeed, setHideSavedDealsInFeed] = useState(false);
  const [crmEmailDigest, setCrmEmailDigest] = useState(false);
  const [showSavedHighlightInFeed, setShowSavedHighlightInFeed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importPaste, setImportPaste] = useState('');
  const [importError, setImportError] = useState('');
  const [exportResetMessage, setExportResetMessage] = useState('');
  const fileInputRef = useRef(null);

  const viteApiUrl = import.meta.env.VITE_API_URL || '';
  const viteExtensionId = import.meta.env.VITE_EXTENSION_ID || '';

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (location.hash === '#get-the-app') {
      const el = document.getElementById('get-the-app');
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    }
  }, [loading, location.hash]);

  const loadSettings = async () => {
    try {
      const data = await userAPI.getSettings();
      setSettings(data);
      setNotificationFrequency(data.notificationFrequency || 'daily');
      setHideSavedDealsInFeed(Boolean(data.preferences?.hideSavedDealsInFeed));
      setCrmEmailDigest(Boolean(data.preferences?.crmEmailDigest));
      setShowSavedHighlightInFeed(data.preferences?.showSavedHighlightInFeed !== false);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCrmEmailDigest = async (checked) => {
    const prev = crmEmailDigest;
    setCrmEmailDigest(checked);
    try {
      await userAPI.updateSettings({ preferences: { crmEmailDigest: checked } });
      setSettings((s) =>
        s ? { ...s, preferences: { ...s.preferences, crmEmailDigest: checked } } : s
      );
    } catch {
      setCrmEmailDigest(prev);
      alert('Failed to update CRM email preference');
    }
  };

  const handleToggleHideSavedInFeed = async (checked) => {
    const prev = hideSavedDealsInFeed;
    setHideSavedDealsInFeed(checked);
    try {
      await userAPI.updateSettings({ preferences: { hideSavedDealsInFeed: checked } });
      setSettings((s) =>
        s ? { ...s, preferences: { ...s.preferences, hideSavedDealsInFeed: checked } } : s
      );
    } catch (error) {
      setHideSavedDealsInFeed(prev);
      alert('Failed to save: ' + error.message);
    }
  };

  const handleToggleShowSavedHighlight = async (checked) => {
    const prev = showSavedHighlightInFeed;
    setShowSavedHighlightInFeed(checked);
    try {
      await userAPI.updateSettings({ preferences: { showSavedHighlightInFeed: checked } });
      setSettings((s) =>
        s ? { ...s, preferences: { ...s.preferences, showSavedHighlightInFeed: checked } } : s
      );
    } catch (error) {
      setShowSavedHighlightInFeed(prev);
      alert('Failed to save: ' + error.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateSettings({ notificationFrequency });
      setExportResetMessage('Settings saved successfully!');
      setTimeout(() => setExportResetMessage(''), 4000);
    } catch (error) {
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!settings) return;
    const payload = buildExportPayload(settings);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vettr-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportResetMessage('Settings exported.');
    setTimeout(() => setExportResetMessage(''), 4000);
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all settings to defaults? This cannot be undone.')) return;
    setSaving(true);
    setImportError('');
    try {
      await userAPI.updateSettings(DEFAULT_SETTINGS);
      await loadSettings();
      setExportResetMessage('Settings reset to defaults.');
      setTimeout(() => setExportResetMessage(''), 4000);
    } catch (error) {
      setImportError('Reset failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImportFromFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const text = await file.text();
      const parsed = parseImportPayload(text);
      if (!parsed) {
        setImportError('Invalid settings file. Expected JSON with a settings object.');
        return;
      }
      setSaving(true);
      await userAPI.updateSettings(parsed);
      await loadSettings();
      setNotificationFrequency(parsed.notificationFrequency ?? settings?.notificationFrequency ?? 'daily');
      setExportResetMessage('Settings imported successfully.');
      setImportPaste('');
      setTimeout(() => setExportResetMessage(''), 4000);
    } catch (err) {
      setImportError(err.message || 'Failed to read or import file.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleImportFromPaste = async () => {
    if (!importPaste.trim()) {
      setImportError('Paste JSON first.');
      return;
    }
    setImportError('');
    try {
      const parsed = parseImportPayload(importPaste.trim());
      if (!parsed) {
        setImportError('Invalid JSON. Expected an object with settings or a versioned export.');
        return;
      }
      setSaving(true);
      await userAPI.updateSettings(parsed);
      await loadSettings();
      setNotificationFrequency(parsed.notificationFrequency ?? settings?.notificationFrequency ?? 'daily');
      setExportResetMessage('Settings imported successfully.');
      setImportPaste('');
      setTimeout(() => setExportResetMessage(''), 4000);
    } catch (err) {
      setImportError(err.message || 'Invalid JSON.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Loading settings...</div>;

  return (
    <div className="app-page-shell">
      <Navigation
        user={user}
        logout={logout}
        showTabs={false}
        pageTitle="Vettr"
        pageSubtitle="Settings and notification preferences"
      />
      
      <div className="settings-page dashboard-content">
        <h1>Settings</h1>
        <div className="settings-page-actions">
          <Link to="/" className="btn-secondary">Back to Dashboard</Link>
        </div>

        <div className="settings-section" id="get-the-app">
          <h2>Get the app</h2>
          <GetTheAppPanel />
        </div>

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
          <h2>Market feed</h2>
          <p>
            Control how saved listings appear in the deal table and card views on the dashboard. Use{' '}
            <strong>Hide saved deals</strong> for an inbox-style workflow: after you save a listing, it leaves the market
            feed so you can focus on what is still new.
          </p>
          <div className="settings-checkbox-list">
            <label className="settings-checkbox-row">
              <input
                type="checkbox"
                checked={showSavedHighlightInFeed}
                onChange={(e) => handleToggleShowSavedHighlight(e.target.checked)}
              />
              <span>
                <strong>Highlight saved listings</strong> — show a red &ldquo;Saved&rdquo; button (or filled heart in
                cards) when a row is already in My Deals. Turn off for a quieter, neutral &ldquo;Saved&rdquo; style.
              </span>
            </label>
            <label className="settings-checkbox-row">
              <input
                type="checkbox"
                checked={hideSavedDealsInFeed}
                onChange={(e) => handleToggleHideSavedInFeed(e.target.checked)}
              />
              <span>
                <strong>Hide saved deals from the feed</strong> — remove saved listings from the market list (table /
                cards). Open <strong>My Deals</strong> to review them.
              </span>
            </label>
          </div>
        </div>

        {user ? (
          <div className="settings-section">
            <h2>CRM</h2>
            <p>Email reminders for due tasks are sent when SMTP is configured on the server.</p>
            <label className="settings-checkbox-row">
              <input
                type="checkbox"
                checked={crmEmailDigest}
                onChange={(e) => handleToggleCrmEmailDigest(e.target.checked)}
              />
              <span>
                <strong>Daily CRM digest</strong> — morning email with overdue tasks, due-today items, and DD deadlines.
              </span>
            </label>
          </div>
        ) : null}

        <div className="settings-section">
          <h2>Chrome extension (free tier)</h2>
          <p>
            Install the Vettr extension in the same Chrome profile you use here. When you are signed in on this site, your
            session is sent to the extension automatically—saved deals and calculator inputs sync to{' '}
            <strong>My Deals</strong> without copying tokens or URLs.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary, #666)' }}>
            If you just installed the extension, open this tab once while logged in so linking can complete.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary, #666)' }}>
            <strong>Deployers:</strong> set <code>VITE_EXTENSION_ID</code> to the extension ID (Chrome Web Store ID or
            unpacked ID from <code>chrome://extensions</code>) and add your production web origin to{' '}
            <code>externally_connectable.matches</code> in the extension <code>manifest.json</code>.
            {viteExtensionId ? (
              <> Extension ID is configured for this build.</>
            ) : (
              <> This build has no <code>VITE_EXTENSION_ID</code>; automatic linking from the hosted site will not run until it is set.</>
            )}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary, #666)' }}>
            <strong>API base URL</strong> (for reference):{' '}
            {viteApiUrl || 'Use the same value as VITE_API_URL in production, or the Vite dev proxy at /api locally.'}
          </p>
        </div>

        <div className="settings-section">
          <h2>Teams</h2>
          <TeamsSettingsPanel />
        </div>

        <div className="settings-section">
          <h2>Export / Reset / Import</h2>
          <p>Back up your settings to a file, restore from a backup, or reset everything to defaults.</p>
          {exportResetMessage && (
            <p className="settings-message settings-message-success" role="status">{exportResetMessage}</p>
          )}
          {importError && (
            <p className="settings-message settings-message-error" role="alert">{importError}</p>
          )}
          <div className="settings-export-reset-import">
            <div className="settings-action-row">
              <button type="button" className="btn-secondary" onClick={handleExport} disabled={!settings}>
                Export settings
              </button>
              <button type="button" className="btn-secondary settings-btn-danger" onClick={handleReset} disabled={saving}>
                {saving ? '…' : 'Reset to defaults'}
              </button>
            </div>
            <div className="settings-import-row">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFromFile}
                className="settings-file-input"
                aria-label="Import settings from file"
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                Import from file
              </button>
              <span className="settings-import-or">or paste JSON:</span>
              <textarea
                className="settings-import-textarea"
                placeholder='{"settings": { ... }} or { "buyBox": {}, ... }'
                value={importPaste}
                onChange={(e) => setImportPaste(e.target.value)}
                rows={3}
                disabled={saving}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleImportFromPaste}
                disabled={saving || !importPaste.trim()}
              >
                {saving ? 'Importing...' : 'Import from paste'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
