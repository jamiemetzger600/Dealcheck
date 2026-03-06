import { Link } from 'react-router-dom';

export default function Navigation({ user, logout, activeTab, setActiveTab }) {
  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1>📊 Dealcheck</h1>
        <p className="nav-user">{user?.email}</p>
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'aggregator' ? 'active' : ''}`}
          onClick={() => setActiveTab('aggregator')}
        >
          Deal Aggregator
        </button>
        <button
          className={`nav-tab ${activeTab === 'saved-deals' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved-deals')}
        >
          My Deals
        </button>
      </div>

      <div className="nav-footer">
        <Link to="/settings" className="nav-link">Settings</Link>
        <Link to="/billing" className="nav-link">Billing</Link>
        <button onClick={logout} className="nav-link">Logout</button>
      </div>
    </nav>
  );
}
