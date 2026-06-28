import { useState } from 'react';
import { Link } from 'react-router-dom';
import pkg from '../../package.json';

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
  onOpenQuickCalculator = null,
  onStartTour = null,
  compact = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const actionLinks = (
    <>
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
          >
            <span>My Deals</span>
            <span className="tab-badge">{myDealsCount}</span>
          </button>
          {!compact && (
            <span className="app-header-version tab-navigation-version" title="App version">v{pkg.version}</span>
          )}
        </div>
      )}
    </>
  );
}
