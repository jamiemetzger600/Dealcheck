import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { dealsAPI } from '../utils/api';
import { formatDate, formatMoney, getStatusBadgeClass, getStatusLabel } from '../utils/normalizeDeal';
import DealDetailsPanel from './DealDetailsPanel';
import { InfoCard } from './DealDetailsPanel';

export default function SavedDeals({ deals, settings = null, onUpdate, onSaveCalculatorDefaults = null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('savedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filter and sort deals
  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal => {
        const name = (deal.name || '').toLowerCase();
        const url = (deal.url || '').toLowerCase();
        const notes = (deal.notes || '').toLowerCase();
        return name.includes(query) || url.includes(query) || notes.includes(query);
      });
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(deal => deal.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let valA, valB;

      switch (sortField) {
        case 'savedAt':
          valA = new Date(a.savedAt || 0).getTime();
          valB = new Date(b.savedAt || 0).getTime();
          break;
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          break;
        case 'askingPrice':
          valA = a.askingPrice || 0;
          valB = b.askingPrice || 0;
          break;
        case 'ebitda':
          valA = a.ebitda || 0;
          valB = b.ebitda || 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [deals, searchQuery, statusFilter, sortField, sortDirection]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: deals.length,
      hot: deals.filter(d => d.status === 'hot').length,
      warm: deals.filter(d => d.status === 'warm').length,
      cold: deals.filter(d => d.status === 'cold').length
    };
  }, [deals]);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredDeals.map(d => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle select one
  const handleSelectOne = (id, checked) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle view deal
  const handleViewDeal = (deal) => {
    setSelectedDeal(deal);
    setShowModal(true);
  };

  // Handle export CSV
  const handleExportCSV = (dealsToExport = null) => {
    const exportDeals = dealsToExport || filteredDeals;
    if (exportDeals.length === 0) return;

    const headers = ['Name', 'Saved Date', 'Status', 'Asking Price', 'EBITDA', 'Quality', 'COC Return', 'URL', 'Notes'];
    const rows = exportDeals.map(deal => [
      deal.name || '',
      formatDate(deal.savedAt),
      deal.status || 'none',
      deal.askingPrice || '',
      deal.ebitda || '',
      deal.qualityScore || '—',
      deal.cocReturn ? `${deal.cocReturn.toFixed(1)}%` : '—',
      deal.url || '',
      (deal.notes || '').replace(/\n/g, ' ')
    ]);

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-deals-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle delete
  const handleDelete = async (dealId) => {
    if (!confirm('Delete this deal?')) return;

    try {
      await dealsAPI.deleteDeal(dealId);
      if (selectedDeal?.id === dealId) {
        setSelectedDeal(null);
        setShowModal(false);
      }
      onUpdate();
    } catch (error) {
      alert('Failed to delete deal: ' + error.message);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected deals?`)) return;

    try {
      await Promise.all(Array.from(selectedIds).map(id => dealsAPI.deleteDeal(id)));
      setSelectedIds(new Set());
      onUpdate();
    } catch (error) {
      alert('Failed to delete deals: ' + error.message);
    }
  };

  // Handle bulk export
  const handleBulkExport = () => {
    const selected = filteredDeals.filter(d => selectedIds.has(d.id));
    handleExportCSV(selected);
  };

  // Handle update status from modal
  const handleUpdateStatus = async (dealId, status) => {
    try {
      await dealsAPI.updateDeal(dealId, { status });
      onUpdate();
    } catch (error) {
      alert('Failed to update status: ' + error.message);
    }
  };

  // Handle update notes from modal
  const handleUpdateNotes = async (dealId, notes) => {
    try {
      await dealsAPI.updateDeal(dealId, { notes });
      onUpdate();
    } catch (error) {
      alert('Failed to update notes: ' + error.message);
    }
  };

  const allSelected = filteredDeals.length > 0 && selectedIds.size === filteredDeals.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="saved-deals-new">
      {/* Stats Row */}
      <div className="my-deals-stats">
        <div className="stat-card">
          <div className="stat-label">Total Deals</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card hot">
          <div className="stat-label">🔥 Hot Leads</div>
          <div className="stat-value">{stats.hot}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">🌡️ Warm</div>
          <div className="stat-value">{stats.warm}</div>
        </div>
        <div className="stat-card cold">
          <div className="stat-label">❄️ Cold</div>
          <div className="stat-value">{stats.cold}</div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="my-deals-controls">
        <div className="controls-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search deals by name, URL, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">🌡️ Warm</option>
              <option value="cold">❄️ Cold</option>
              <option value="pass">❌ Pass</option>
              <option value="none">No Status</option>
            </select>

            <select 
              value={`${sortField}-${sortDirection}`} 
              onChange={(e) => {
                const [field, dir] = e.target.value.split('-');
                setSortField(field);
                setSortDirection(dir);
              }}
            >
              <option value="savedAt-desc">Newest First</option>
              <option value="savedAt-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="askingPrice-desc">Highest Price</option>
              <option value="askingPrice-asc">Lowest Price</option>
              <option value="ebitda-desc">Highest EBITDA</option>
              <option value="ebitda-asc">Lowest EBITDA</option>
            </select>

            <button className="btn-secondary" onClick={() => handleExportCSV()}>
              📤 Export CSV
            </button>
            <button className="btn-secondary" onClick={onUpdate}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {someSelected && (
          <div className="bulk-actions">
            <span className="bulk-actions-text">
              {selectedIds.size} deal{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <button className="btn-secondary" onClick={handleBulkExport}>
              📤 Export Selected
            </button>
            <button className="btn-danger" onClick={handleBulkDelete}>
              🗑️ Delete Selected
            </button>
            <button className="btn-secondary" onClick={() => setSelectedIds(new Set())}>
              ✕ Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {deals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No deals saved yet</h3>
          <p>Save deals from the Deal Aggregator to get started!</p>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No deals match your filters</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="my-deals-table-container">
          <table className="my-deals-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Deal Name
                  {sortField === 'name' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th className="sortable" onClick={() => handleSort('savedAt')}>
                  Saved Date
                  {sortField === 'savedAt' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Status</th>
                <th className="sortable" onClick={() => handleSort('askingPrice')}>
                  Asking Price
                  {sortField === 'askingPrice' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th className="sortable" onClick={() => handleSort('ebitda')}>
                  EBITDA
                  {sortField === 'ebitda' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th>Quality</th>
                <th>COC Return</th>
                <th style={{ width: '200px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map(deal => (
                <tr
                  key={deal.id}
                  className={selectedIds.has(deal.id) ? 'selected' : ''}
                  onClick={() => handleViewDeal(deal)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(deal.id)}
                      onChange={(e) => handleSelectOne(deal.id, e.target.checked)}
                    />
                  </td>
                  <td>
                    <strong>{deal.name || 'Unnamed Deal'}</strong>
                  </td>
                  <td>{formatDate(deal.savedAt)}</td>
                  <td>
                    <span className={`status-badge status-${getStatusBadgeClass(deal.status)}`}>
                      {getStatusLabel(deal.status)}
                    </span>
                  </td>
                  <td>{formatMoney(deal.askingPrice)}</td>
                  <td>{formatMoney(deal.ebitda)}</td>
                  <td>
                    {deal.qualityScore !== undefined ? (
                      <span className="quality-score">{deal.qualityScore}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {deal.cocReturn !== undefined ? `${deal.cocReturn.toFixed(1)}%` : '—'}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="actions">
                      <button 
                        className="action-btn" 
                        title="View Details"
                        onClick={() => handleViewDeal(deal)}
                      >
                        👁️
                      </button>
                      <button 
                        className="action-btn" 
                        title="Export"
                        onClick={() => handleExportCSV([deal])}
                      >
                        📤
                      </button>
                      <button 
                        className="action-btn danger" 
                        title="Delete"
                        onClick={() => handleDelete(deal.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deal Details Modal - rendered via portal so it sits on top with correct title and footer */}
      {showModal && selectedDeal && createPortal(
        <SavedDealModal
          deal={selectedDeal}
          settings={settings}
          onClose={() => {
            setShowModal(false);
            setSelectedDeal(null);
          }}
          onUpdateStatus={handleUpdateStatus}
          onUpdateNotes={handleUpdateNotes}
          onDelete={handleDelete}
          onExport={() => handleExportCSV([selectedDeal])}
          onUpdate={onUpdate}
          onSaveCalculatorDefaults={onSaveCalculatorDefaults}
        />,
        document.body
      )}
    </div>
  );
}

// Modal component for saved deal details - uses DealDetailsPanel so layout matches aggregator panel exactly
function SavedDealModal({ deal, settings = null, onClose, onUpdateStatus, onUpdateNotes, onDelete, onExport, onUpdate, onSaveCalculatorDefaults = null }) {
  const [status, setStatus] = useState(deal.status || 'none');
  const [notes, setNotes] = useState(deal.notes || '');
  const [notesTimeout, setNotesTimeout] = useState(null);
  const [brokerInfo, setBrokerInfo] = useState({
    name: deal.brokerName || '',
    company: deal.brokerCompany || '',
    phone: deal.brokerPhone || '',
    email: deal.brokerEmail || ''
  });
  const [progressStage, setProgressStage] = useState(deal.progressStage || '');
  const [progressHistory, setProgressHistory] = useState(deal.progressHistory || []);

  useEffect(() => {
    setStatus(deal.status || 'none');
    setNotes(deal.notes || '');
    setBrokerInfo({
      name: deal.brokerName || '',
      company: deal.brokerCompany || '',
      phone: deal.brokerPhone || '',
      email: deal.brokerEmail || ''
    });
    setProgressStage(deal.progressStage || '');
    setProgressHistory(deal.progressHistory || []);
  }, [deal]);

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    await onUpdateStatus(deal.id, newStatus);
  };

  const handleNotesChange = (newNotes) => {
    setNotes(newNotes);
    
    // Auto-save after 1 second of no typing
    if (notesTimeout) clearTimeout(notesTimeout);
    const timeout = setTimeout(() => {
      onUpdateNotes(deal.id, newNotes);
    }, 1000);
    setNotesTimeout(timeout);
  };

  const handleSaveBrokerInfo = async () => {
    try {
      await dealsAPI.updateDeal(deal.id, {
        brokerName: brokerInfo.name,
        brokerCompany: brokerInfo.company,
        brokerPhone: brokerInfo.phone,
        brokerEmail: brokerInfo.email
      });
      onUpdate();
      alert('Broker information saved!');
    } catch (error) {
      alert('Failed to save broker info: ' + error.message);
    }
  };

  const handleAddProgressStage = async () => {
    if (!progressStage.trim()) return;

    const newHistory = [
      ...progressHistory,
      {
        stage: progressStage,
        timestamp: new Date().toISOString()
      }
    ];

    try {
      await dealsAPI.updateDeal(deal.id, {
        progressStage,
        progressHistory: newHistory
      });
      setProgressHistory(newHistory);
      setProgressStage('');
      onUpdate();
    } catch (error) {
      alert('Failed to add progress: ' + error.message);
    }
  };

  const handleShareDeal = () => {
    const shareText = `Deal: ${deal.name}\nAsking: ${formatMoney(deal.askingPrice)}\nEBITDA: ${formatMoney(deal.ebitda)}\n${deal.url || ''}`;
    if (navigator.share) {
      navigator.share({ title: deal.name, text: shareText, url: deal.url || '' }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Deal details copied to clipboard!');
    }
  };

  const overviewAdditions = (
    <>
      <div className="deal-overview-card">
        <div className="deal-overview-label">Status</div>
        <div className="deal-overview-value">
          <select value={status} onChange={(e) => handleStatusChange(e.target.value)} className="status-select-inline">
            <option value="none">No Status</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">🌡️ Warm</option>
            <option value="cold">❄️ Cold</option>
            <option value="pass">❌ Pass</option>
          </select>
        </div>
      </div>
      <InfoCard label="Saved Date" value={formatDate(deal.savedAt)} />
      {deal.county && <InfoCard label="County" value={deal.county} />}
      {deal.country && <InfoCard label="Country" value={deal.country} />}
      {deal.yearsEstablished != null && deal.yearsEstablished !== '' && <InfoCard label="Years Established" value={deal.yearsEstablished} />}
      {deal.franchise != null && deal.franchise !== '' && <InfoCard label="Franchise" value={deal.franchise} />}
      {deal.remote != null && deal.remote !== '' && <InfoCard label="Remote / Relocatable" value={deal.remote} wide />}
    </>
  );

  const extraSections = (
    <>
      <section className="deal-details-section deal-notes-section">
        <button type="button" className="calc-section-header"><span>▼ Notes</span></button>
        <div className="deal-notes-content">
          <textarea value={notes} onChange={(e) => handleNotesChange(e.target.value)} placeholder="Add notes about this deal..." rows={6} className="modal-notes" />
          <p className="notes-hint">Notes are auto-saved as you type</p>
        </div>
      </section>
      <section className="deal-details-section deal-edit-broker-section">
        <button type="button" className="calc-section-header"><span>▼ Edit Broker &amp; Progress</span></button>
        <div className="broker-form-grid">
          <div className="input-group">
            <label>Broker Name</label>
            <input type="text" value={brokerInfo.name} onChange={(e) => setBrokerInfo({ ...brokerInfo, name: e.target.value })} placeholder="John Smith" className="modal-input" />
          </div>
          <div className="input-group">
            <label>Company</label>
            <input type="text" value={brokerInfo.company} onChange={(e) => setBrokerInfo({ ...brokerInfo, company: e.target.value })} placeholder="ABC Brokers Inc." className="modal-input" />
          </div>
          <div className="input-group">
            <label>Phone</label>
            <input type="tel" value={brokerInfo.phone} onChange={(e) => setBrokerInfo({ ...brokerInfo, phone: e.target.value })} placeholder="(555) 123-4567" className="modal-input" />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={brokerInfo.email} onChange={(e) => setBrokerInfo({ ...brokerInfo, email: e.target.value })} placeholder="broker@example.com" className="modal-input" />
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={handleSaveBrokerInfo}>💾 Save Broker Info</button>
        <div className="progress-tracking">
          <div className="input-group">
            <label>Current Progress Status</label>
            <select value={progressStage} onChange={(e) => setProgressStage(e.target.value)} className="modal-input">
              <option value="">Select Progress Status</option>
              <option value="Requested NDA">Requested NDA</option>
              <option value="Signed NDA">Signed NDA</option>
              <option value="Deal Room Access">Deal Room Access</option>
              <option value="Underwriting Began">Underwriting Began</option>
              <option value="Underwriting Complete">Underwriting Complete</option>
              <option value="Bank Pre-Approval">Bank Pre-Approval</option>
              <option value="IOI Sent">IOI Sent</option>
              <option value="IOI Accepted">IOI Accepted</option>
              <option value="IOI Declined">IOI Declined</option>
              <option value="LOI Sent">LOI Sent</option>
              <option value="LOI Accepted">LOI Accepted</option>
              <option value="LOI Declined">LOI Declined</option>
              <option value="Awaiting Seller Response">Awaiting Seller Response</option>
            </select>
          </div>
          <button type="button" className="btn-secondary" onClick={handleAddProgressStage}>+ Add Progress Update</button>
          {progressHistory.length > 0 && (
            <div className="progress-history">
              <div className="section-title">Progress History</div>
              <div className="progress-list">
                {progressHistory.map((item, index) => (
                  <div key={index} className="progress-item">
                    <div className="progress-stage">{item.stage}</div>
                    <div className="progress-timestamp">
                      {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );

  const savedFooter = (
    <>
      {deal.url ? (
        <a href={deal.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">View Original Listing</a>
      ) : (
        <button type="button" className="btn-secondary" disabled aria-label="No listing URL">No Listing URL Available</button>
      )}
      <button type="button" className="btn-secondary" onClick={handleShareDeal}>📤 Share</button>
      <button type="button" className="btn-secondary" onClick={onExport}>📊 Export CSV</button>
      <button type="button" className="btn-danger" onClick={() => onDelete(deal.id)}>🗑️ Delete</button>
      <button type="button" className="btn-primary" onClick={onClose}>Close</button>
    </>
  );

  return (
    <div className="modal-overlay saved-deal-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content saved-deal-modal saved-deal-modal-content" onClick={(e) => e.stopPropagation()}>
        <DealDetailsPanel
          isOpen
          deal={deal}
          position="center"
          onClose={onClose}
          settings={settings}
          onSaveCalculatorDefaults={onSaveCalculatorDefaults}
          panelOnly
          showPositionToggle={false}
          showSaveButton={false}
          overviewAdditions={overviewAdditions}
          extraSectionsAfterCalculator={extraSections}
          renderFooter={savedFooter}
        />
      </div>
    </div>
  );
}
