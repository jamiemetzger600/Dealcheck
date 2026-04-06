import { Link } from 'react-router-dom';
import pkg from '../../package.json';

export default function Navigation({
  user,
  logout,
  activeTab,
  setActiveTab,
  pageTitle = 'Find It. Vett It. Save It.',
  pageSubtitle,
  showTabs = true,
  aggregatorCount = 0,
  myDealsCount = 0
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
          <span className="nav-user-pill">{user?.email}</span>
          <Link to="/settings" className="header-link">Settings</Link>
          <Link to="/billing" className="header-link">Billing</Link>
          <button onClick={logout} className="header-link">Logout</button>
        </div>
      </nav>

      {showTabs && (
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'aggregator' ? 'active' : ''}`}
            onClick={() => setActiveTab('aggregator')}
          >
            <span>Deal Aggregator</span>
            <span className="tab-badge">{aggregatorCount}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'saved-deals' ? 'active' : ''}`}
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
