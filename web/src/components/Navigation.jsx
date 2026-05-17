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
}) {
  return (
    <>
      <nav className="app-header">
        <div className="app-header-brand">
          <img
            className="app-header-logo"
            src="/vettr-logo.png"
            alt="Vettr"
            width={420}
            height={120}
            decoding="async"
          />
          <div className="app-header-copy">
            <h1>{pageTitle}</h1>
            {pageSubtitle != null && pageSubtitle !== '' ? <p>{pageSubtitle}</p> : null}
          </div>
        </div>

        <div className="app-header-actions">
          {isGuest ? (
            <>
              <Link to="/login" className="header-link">Sign in</Link>
              <Link to="/register" className="header-link header-link--primary">Sign up</Link>
            </>
          ) : (
            <>
              <span className="nav-user-pill">{user?.email}</span>
              <Link to="/settings" className="header-link">Settings</Link>
              <Link to="/billing" className="header-link">Billing</Link>
              <button type="button" onClick={logout} className="header-link">Logout</button>
            </>
          )}
          {typeof onStartTour === 'function' && (
            <button type="button" className="header-link" onClick={onStartTour}>
              Take a tour
            </button>
          )}
          {typeof onOpenQuickCalculator === 'function' && (
            <button
              type="button"
              className="header-link header-link--calculator"
              onClick={onOpenQuickCalculator}
            >
              Quick Deal Calculator
            </button>
          )}
        </div>
      </nav>

      {showTabs && (
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'aggregator' ? 'active' : ''}`}
            onClick={() => setActiveTab('aggregator')}
          >
            <span>Deal Aggregator</span>
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
          <span className="app-header-version tab-navigation-version" title="App version">v{pkg.version}</span>
        </div>
      )}
    </>
  );
}
