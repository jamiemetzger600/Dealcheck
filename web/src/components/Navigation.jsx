import { Link, useNavigate } from 'react-router-dom';
import pkg from '../../package.json';

export default function Navigation({
  user,
  logout,
  activeTab,
  setActiveTab,
  pageTitle = 'Deal Acquisition Platform',
  pageSubtitle = 'From discovery to closing: Data → Information → Knowledge → Insight → Wisdom',
  showTabs = true,
  aggregatorCount = 0,
  myDealsCount = 0,
  onFetchDeals,
  onManageSources,
  onAddDeal,
  onConfigureBuyBox
}) {
  const navigate = useNavigate();

  return (
    <>
      <nav className="app-header">
        <div className="app-header-copy">
          <h1>📊 {pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>

        <div className="app-header-actions">
          <span className="nav-user-pill">{user?.email}</span>
          <Link to="/settings" className="header-link">Settings</Link>
          <Link to="/billing" className="header-link">Billing</Link>
          <button onClick={logout} className="header-link">Logout</button>
        </div>
      </nav>

      {showTabs && (
        <>
          <div className="global-action-row">
            <button type="button" className="aggregator-filter-btn active" onClick={onFetchDeals}>
              <span>🔄</span>
              <span>Fetch Deals</span>
            </button>
            <button type="button" className="aggregator-filter-btn" onClick={onManageSources}>
              <span>📥</span>
              <span>Manage Sources</span>
            </button>
            <button type="button" className="aggregator-filter-btn" onClick={onAddDeal}>
              <span>➕</span>
              <span>Add Deal</span>
            </button>
            <button type="button" className="aggregator-filter-btn" onClick={onConfigureBuyBox}>
              <span>⚙️</span>
              <span>Configure Buy Box</span>
            </button>
            <button type="button" className="aggregator-filter-btn" onClick={() => navigate('/settings')}>
              <span>⚙️</span>
              <span>Settings</span>
            </button>
            <span className="app-header-version app-header-version--in-row" title="App version">v{pkg.version}</span>
          </div>

          <div className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === 'aggregator' ? 'active' : ''}`}
              onClick={() => setActiveTab('aggregator')}
            >
              <span>🔍</span>
              <span>Deal Aggregator</span>
              <span className="tab-badge">{aggregatorCount}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'saved-deals' ? 'active' : ''}`}
              onClick={() => setActiveTab('saved-deals')}
            >
              <span>💼</span>
              <span>My Deals</span>
              <span className="tab-badge">{myDealsCount}</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
