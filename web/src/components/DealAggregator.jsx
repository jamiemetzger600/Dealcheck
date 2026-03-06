import { useState, useEffect } from 'react';
import { filterDeals, countMatchingDeals } from '../../../shared/buyBoxMatcher.js';
import { dealsAPI } from '../utils/api';

export default function DealAggregator({ settings, onMatchCountUpdate, onSaveDeal }) {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllDeals, setShowAllDeals] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, []);

  useEffect(() => {
    if (deals.length > 0 && settings) {
      applyFilters();
    }
  }, [deals, settings, searchQuery, showAllDeals]);

  const fetchDeals = async () => {
    try {
      // Fetch from Opensheet API (using the same logic as extension)
      // For MVP, simulate with empty array - implement Opensheet fetch later
      const response = await fetch('https://opensheet.elk.sh/YOUR_SHEET_ID/Sheet1');
      const data = await response.json();
      
      setDeals(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
      setDeals([]);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deals];

    // Apply buy box filter unless showing all
    if (!showAllDeals && settings?.buyBox) {
      filtered = filterDeals(filtered, {
        buyBox: settings.buyBox,
        excludeKeywords: settings.excludeKeywords || [],
        hiddenIds: settings.hiddenDealIds || []
      });
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal =>
        (deal.name || '').toLowerCase().includes(query) ||
        (deal.description || '').toLowerCase().includes(query) ||
        (deal.location || '').toLowerCase().includes(query) ||
        (deal.industry || '').toLowerCase().includes(query)
      );
    }

    setFilteredDeals(filtered);
    
    // Update match count (only for buy-box filtered view)
    if (!showAllDeals) {
      onMatchCountUpdate(filtered.length);
    }
  };

  const handleSaveDeal = async (deal) => {
    try {
      await dealsAPI.saveDeal({
        dealId: deal.id,
        name: deal.name,
        url: deal.url,
        description: deal.description,
        askingPrice: deal.askingPrice,
        ebitda: deal.ebitda,
        revenue: deal.revenue,
        location: deal.location,
        city: deal.city,
        state: deal.state,
        industry: deal.industry,
        source: deal.source,
        sourceType: deal.sourceType,
        discoveredAt: deal.discoveredAt
      });
      
      alert('Deal saved successfully!');
      onSaveDeal();
    } catch (error) {
      alert('Failed to save deal: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading deals...</div>;
  }

  return (
    <div className="deal-aggregator">
      <div className="aggregator-header">
        <h2>Deal Aggregator</h2>
        <p>{filteredDeals.length} deals {showAllDeals ? 'total' : 'matching your criteria'}</p>
      </div>

      <div className="aggregator-controls">
        <input
          type="text"
          placeholder="Search deals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showAllDeals}
            onChange={(e) => setShowAllDeals(e.target.checked)}
          />
          Show all deals
        </label>
      </div>

      <div className="deals-list">
        {filteredDeals.length === 0 ? (
          <div className="empty-state">
            <p>No deals found. Try adjusting your filters or search.</p>
          </div>
        ) : (
          filteredDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} onSave={() => handleSaveDeal(deal)} />
          ))
        )}
      </div>
    </div>
  );
}

function DealCard({ deal, onSave }) {
  return (
    <div className="deal-card">
      <div className="deal-card-header">
        <h3>{deal.name || 'Unnamed Business'}</h3>
        <button onClick={onSave} className="btn-save">Save</button>
      </div>
      
      <div className="deal-card-details">
        {deal.askingPrice && (
          <div className="deal-detail">
            <strong>Price:</strong> ${deal.askingPrice.toLocaleString()}
          </div>
        )}
        {deal.revenue && (
          <div className="deal-detail">
            <strong>Revenue:</strong> ${deal.revenue.toLocaleString()}
          </div>
        )}
        {deal.ebitda && (
          <div className="deal-detail">
            <strong>EBITDA:</strong> ${deal.ebitda.toLocaleString()}
          </div>
        )}
        {deal.location && (
          <div className="deal-detail">
            <strong>Location:</strong> {deal.location}
          </div>
        )}
        {deal.industry && (
          <div className="deal-detail">
            <strong>Industry:</strong> {deal.industry}
          </div>
        )}
      </div>

      {deal.description && (
        <p className="deal-description">
          {deal.description.substring(0, 200)}
          {deal.description.length > 200 && '...'}
        </p>
      )}

      {deal.url && (
        <a href={deal.url} target="_blank" rel="noopener noreferrer" className="deal-link">
          View Listing →
        </a>
      )}
    </div>
  );
}
