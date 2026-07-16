import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import pkg from '../../package.json';
import { useTeam } from '../context/TeamContext';

const TEAM_SAVE_BANNER_AUTO_HIDE_MS = 4000;
const TEAM_SAVE_BANNER_FADE_MS = 300;

function TeamSaveBanner({ activeTeam, setActiveTeamId }) {
  const [phase, setPhase] = useState('hidden');
  const dismissedRef = useRef(false);
  const fadeTimerRef = useRef(null);

  const hideBanner = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setPhase('hiding');
    fadeTimerRef.current = setTimeout(() => {
      setPhase('hidden');
      fadeTimerRef.current = null;
    }, TEAM_SAVE_BANNER_FADE_MS);
  }, []);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    hideBanner();
  }, [hideBanner]);

  useEffect(() => {
    if (!activeTeam) {
      dismissedRef.current = false;
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      setPhase('hidden');
      return undefined;
    }

    dismissedRef.current = false;
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setPhase('visible');

    const autoHideTimer = setTimeout(() => {
      if (!dismissedRef.current) hideBanner();
    }, TEAM_SAVE_BANNER_AUTO_HIDE_MS);

    return () => {
      clearTimeout(autoHideTimer);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [activeTeam?.id, hideBanner]);

  if (!activeTeam || phase === 'hidden') return null;

  return (
    <div
      className={`team-save-banner${phase === 'hiding' ? ' team-save-banner--hiding' : ''}`}
      role="status"
    >
      <span className="team-save-banner__text">
        Saving to <strong>{activeTeam.name}</strong>
        {' · '}
        <button type="button" className="team-save-banner__link" onClick={() => setActiveTeamId(null)}>
          Switch to personal
        </button>
      </span>
      <button
        type="button"
        className="team-save-banner__close"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}

export default function Navigation({
  user,
  logout,
  isGuest = false,
  activeTab,
  setActiveTab,
  pageTitle = 'Find It. Vett It. Save It.',
  pageSubtitle,
  showTabs = true,
  aggregatorCount = 0,
  myDealsCount = 0,
  crmCount = 0,
  crmBadgeCount = 0,
  onOpenQuickCalculator = null,
  onStartTour = null,
  compact = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { teams, activeTeamId, setActiveTeamId, activeTeam, isTeamMode } = useTeam();

  const teamSwitcher = !isGuest && user ? (
    <label className="nav-team-switcher">
      <span className="nav-team-switcher__label">Workspace</span>
      <select
        value={activeTeamId != null ? String(activeTeamId) : ''}
        onChange={(e) => setActiveTeamId(e.target.value || null)}
        aria-label="Active team"
      >
        <option value="">Personal</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </label>
  ) : null;

  const saveBanner = isTeamMode && activeTeam ? (
    <TeamSaveBanner activeTeam={activeTeam} setActiveTeamId={setActiveTeamId} />
  ) : null;

  const actionLinks = (
    <>
      {teamSwitcher}
      {isGuest ? (
        <>
          <Link to="/login" className="header-link" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link to="/register" className="header-link header-link--primary" onClick={() => setMenuOpen(false)}>Sign up</Link>
        </>
      ) : (
        <>
          <span className="nav-user-pill">{user?.email}</span>
          <Link to="/settings" className="header-link" onClick={() => setMenuOpen(false)}>Settings</Link>
          <Link to="/billing" className="header-link" onClick={() => setMenuOpen(false)}>Billing</Link>
          <button type="button" onClick={() => { logout(); setMenuOpen(false); }} className="header-link">Logout</button>
        </>
      )}
      {typeof onStartTour === 'function' && (
        <button type="button" className="header-link" onClick={() => { onStartTour(); setMenuOpen(false); }}>
          Take a tour
        </button>
      )}
      {typeof onOpenQuickCalculator === 'function' && (
        <button
          type="button"
          className="header-link header-link--calculator"
          onClick={() => { onOpenQuickCalculator(); setMenuOpen(false); }}
        >
          Quick Deal Calculator
        </button>
      )}
    </>
  );

  return (
    <>
      <nav className={`app-header${compact ? ' app-header--compact' : ''}`}>
        <div className="app-header-brand">
          <img
            className="app-header-logo"
            src="/vettr-logo.png"
            alt="Vettr"
            width={420}
            height={120}
            decoding="async"
          />
          {!compact && (
            <div className="app-header-copy">
              <h1>{pageTitle}</h1>
              {pageSubtitle != null && pageSubtitle !== '' ? <p>{pageSubtitle}</p> : null}
            </div>
          )}
        </div>

        <div className="app-header-actions app-header-actions--desktop">
          {actionLinks}
        </div>

        <button
          type="button"
          className="app-header-menu-btn"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {saveBanner}

      {menuOpen && (
        <div className="app-header-mobile-menu" role="menu">
          {actionLinks}
        </div>
      )}

      {showTabs && (
        <div className={`tab-navigation${compact ? ' tab-navigation--compact' : ''}`}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'aggregator' ? 'active' : ''}`}
            onClick={() => setActiveTab('aggregator')}
          >
            <span>{compact ? 'Discover' : 'Deal Aggregator'}</span>
            <span className="tab-badge">{aggregatorCount}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'saved-deals' ? 'active' : ''}`}
            data-tour="my-deals-tab"
            onClick={() => setActiveTab('saved-deals')}
            title={isTeamMode && activeTeam ? `Saved deals for ${activeTeam.name}` : 'Your saved deals'}
          >
            <span>{isTeamMode && activeTeam ? `${activeTeam.name} Deals` : 'My Deals'}</span>
            <span className="tab-badge">{myDealsCount}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'crm' ? 'active' : ''}`}
            data-tour="crm-tab"
            onClick={() => setActiveTab('crm')}
          >
            <span>CRM</span>
            {!isGuest ? (
              <span className={`tab-badge${crmBadgeCount > 0 ? ' tab-badge--alert' : ''}`}>
                {crmBadgeCount > 0 ? crmBadgeCount : crmCount}
              </span>
            ) : null}
          </button>
          {!compact && (
            <span className="app-header-version tab-navigation-version" title="App version">v{pkg.version}</span>
          )}
        </div>
      )}
    </>
  );
}
