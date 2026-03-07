import { useState } from 'react';
import { dealsAPI } from '../utils/api';

export default function SavedDeals({ deals, onUpdate }) {
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('new');

  const handleSelectDeal = (deal) => {
    setSelectedDeal(deal);
    setNotes(deal.notes || '');
    setStatus(deal.status || 'new');
  };

  const handleUpdateDeal = async () => {
    if (!selectedDeal) return;

    try {
      await dealsAPI.updateDeal(selectedDeal.id, { notes, status });
      alert('Deal updated successfully!');
      setSelectedDeal(null);
      onUpdate();
    } catch (error) {
      alert('Failed to update deal: ' + error.message);
    }
  };

  const handleDeleteDeal = async (dealId) => {
    if (!confirm('Delete this deal?')) return;

    try {
      await dealsAPI.deleteDeal(dealId);
      if (selectedDeal?.id === dealId) {
        setSelectedDeal(null);
      }
      onUpdate();
    } catch (error) {
      alert('Failed to delete deal: ' + error.message);
    }
  };

  return (
    <div className="saved-deals">
      <div className="saved-deals-header">
        <h2>My Deals</h2>
        <p>{deals.length} saved deals</p>
      </div>

      {deals.length === 0 ? (
        <div className="empty-state">
          <p>No saved deals yet. Save deals from the Deal Aggregator to get started.</p>
        </div>
      ) : (
        <div className="saved-deals-grid">
          <div className="deals-sidebar">
            {deals.map(deal => (
              <div
                key={deal.id}
                className={`saved-deal-item ${selectedDeal?.id === deal.id ? 'active' : ''}`}
                onClick={() => handleSelectDeal(deal)}
              >
                <h4>{deal.name}</h4>
                <span className={`status-badge status-${deal.status || 'new'}`}>
                  {deal.status || 'new'}
                </span>
              </div>
            ))}
          </div>

          <div className="deal-detail-panel">
            {selectedDeal ? (
              <>
                <h3>{selectedDeal.name}</h3>
                
                <div className="deal-info">
                  {selectedDeal.askingPrice && <p><strong>Price:</strong> ${selectedDeal.askingPrice.toLocaleString()}</p>}
                  {selectedDeal.revenue && <p><strong>Revenue:</strong> ${selectedDeal.revenue.toLocaleString()}</p>}
                  {selectedDeal.ebitda && <p><strong>EBITDA:</strong> ${selectedDeal.ebitda.toLocaleString()}</p>}
                  {selectedDeal.location && <p><strong>Location:</strong> {selectedDeal.location}</p>}
                  {selectedDeal.industry && <p><strong>Industry:</strong> {selectedDeal.industry}</p>}
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="new">New</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="contacted">Contacted Broker</option>
                    <option value="due-diligence">Due Diligence</option>
                    <option value="offer">Offer Made</option>
                    <option value="passed">Passed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    placeholder="Add your notes..."
                  />
                </div>

                <div className="deal-actions">
                  <button onClick={handleUpdateDeal} className="btn-primary">
                    Update
                  </button>
                  <button onClick={() => handleDeleteDeal(selectedDeal.id)} className="btn-danger">
                    Delete
                  </button>
                  {selectedDeal.url && (
                    <a href={selectedDeal.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                      View Listing →
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-selection">
                <p>Select a deal to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
