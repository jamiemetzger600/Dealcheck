// Deals Dashboard JavaScript

// ===== DARK MODE - Load immediately on page load =====
(function() {
    console.log('🌓 Dark mode script starting...');
    
    function applyDarkMode(enabled) {
        console.log('🌓 Applying dark mode:', enabled);
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
    
    function loadDarkMode() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['userPreferences'], (result) => {
                const darkMode = result.userPreferences?.darkMode === true;
                console.log('🌓 User preferences:', result.userPreferences);
                console.log('🌓 Dark mode enabled:', darkMode);
                applyDarkMode(darkMode);
            });
        }
    }
    
    // Load immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadDarkMode);
    } else {
        loadDarkMode();
    }
    
    // Listen for changes
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.userPreferences) {
                const darkMode = changes.userPreferences.newValue?.darkMode === true;
                console.log('🌓 Dark mode changed to:', darkMode);
                applyDarkMode(darkMode);
            }
        });
    }
    
    // Poll every 500ms as backup
    setInterval(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['userPreferences'], (result) => {
                const darkMode = result.userPreferences?.darkMode === true;
                const currentlyDark = document.body.classList.contains('dark-mode');
                if (darkMode !== currentlyDark) {
                    console.log('🌓 Polling detected change to:', darkMode);
                    applyDarkMode(darkMode);
                }
            });
        }
    }, 500);
})();

// ===== MAIN DASHBOARD CODE =====
let allDeals = [];
let filteredDeals = [];
let selectedDeals = new Set();
let currentSort = 'date-desc';
let searchTimeout = null;

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-content">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Validate deal structure
function validateDeal(deal) {
    if (!deal || typeof deal !== 'object') return false;
    if (!deal.name || typeof deal.name !== 'string') return false;
    if (!deal.url || typeof deal.url !== 'string') return false;
    if (!deal.savedAt) return false;
    if (!deal.inputs || typeof deal.inputs !== 'object') return false;
    if (!deal.results || typeof deal.results !== 'object') return false;
    return true;
}

// Safe storage operation with error handling
function saveDeals(deals, callback) {
    try {
        // Validate all deals before saving
        const validDeals = deals.filter(deal => {
            if (!validateDeal(deal)) {
                console.warn('Invalid deal structure:', deal);
                return false;
            }
            return true;
        });
        
        if (validDeals.length !== deals.length) {
            showToast(`Removed ${deals.length - validDeals.length} invalid deal(s)`, 'warning');
        }
        
        chrome.storage.local.set({ savedDeals: validDeals }, () => {
            if (chrome.runtime.lastError) {
                console.error('Storage error:', chrome.runtime.lastError);
                showToast('Failed to save deals. ' + chrome.runtime.lastError.message, 'error');
                if (callback) callback(false);
            } else {
                if (callback) callback(true);
            }
        });
    } catch (error) {
        console.error('Error saving deals:', error);
        showToast('Error saving deals: ' + error.message, 'error');
        if (callback) callback(false);
    }
}

// Load deals from Chrome storage
function loadDeals() {
    try {
        chrome.storage.local.get(['savedDeals'], (result) => {
            try {
                if (chrome.runtime.lastError) {
                    console.error('Storage error:', chrome.runtime.lastError);
                    showToast('Failed to load deals: ' + chrome.runtime.lastError.message, 'error');
                    document.getElementById('loading').style.display = 'none';
                    return;
                }
                
                const rawDeals = result.savedDeals || [];
                
                // Validate and clean deals
                allDeals = rawDeals
                    .filter(deal => {
                        if (!validateDeal(deal)) {
                            console.warn('Skipping invalid deal:', deal);
                            return false;
                        }
                        return true;
                    })
                    .map(deal => ({
                        ...deal,
                        status: deal.status || 'none'
                    }));
                
                // If we filtered out invalid deals, save the cleaned version
                if (rawDeals.length !== allDeals.length) {
                    saveDeals(allDeals, (success) => {
                        if (success) {
                            showToast(`Cleaned ${rawDeals.length - allDeals.length} invalid deal(s)`, 'warning');
                        }
                    });
                }
                
                filteredDeals = [...allDeals];
                updateStats();
                applyFiltersAndSort();
                renderDeals();
                
                document.getElementById('loading').style.display = 'none';
                
                if (allDeals.length === 0) {
                    document.getElementById('empty-state').style.display = 'block';
                    document.getElementById('deals-table').style.display = 'none';
                } else {
                    document.getElementById('empty-state').style.display = 'none';
                    document.getElementById('deals-table').style.display = 'table';
                }
                
                if (allDeals.length > 0) {
                    showToast(`Loaded ${allDeals.length} deal${allDeals.length > 1 ? 's' : ''}`, 'success', 2000);
                }
            } catch (error) {
                console.error('Error processing deals:', error);
                showToast('Error processing deals: ' + error.message, 'error');
                document.getElementById('loading').style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Error loading deals:', error);
        showToast('Error loading deals: ' + error.message, 'error');
        document.getElementById('loading').style.display = 'none';
    }
}

// Update statistics
function updateStats() {
    document.getElementById('stat-total').textContent = allDeals.length;
    document.getElementById('stat-hot').textContent = allDeals.filter(d => d.status === 'hot').length;
    document.getElementById('stat-warm').textContent = allDeals.filter(d => d.status === 'warm').length;
    document.getElementById('stat-cold').textContent = allDeals.filter(d => d.status === 'cold').length;
}

// Apply filters and sorting
function applyFiltersAndSort() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('sort-by').value;
    
    // Filter
    filteredDeals = allDeals.filter(deal => {
        // Search filter
        const matchesSearch = !searchTerm || 
            deal.name.toLowerCase().includes(searchTerm) ||
            deal.url.toLowerCase().includes(searchTerm) ||
            (deal.notes && deal.notes.toLowerCase().includes(searchTerm));
        
        // Status filter
        const matchesStatus = !statusFilter || deal.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    // Sort
    filteredDeals.sort((a, b) => {
        switch(sortBy) {
            case 'date-desc':
                return new Date(b.savedAt) - new Date(a.savedAt);
            case 'date-asc':
                return new Date(a.savedAt) - new Date(b.savedAt);
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'price-desc':
                return parseNumber(b.inputs.asking) - parseNumber(a.inputs.asking);
            case 'price-asc':
                return parseNumber(a.inputs.asking) - parseNumber(b.inputs.asking);
            case 'ebitda-desc':
                return parseNumber(b.inputs.ebitda) - parseNumber(a.inputs.ebitda);
            case 'ebitda-asc':
                return parseNumber(a.inputs.ebitda) - parseNumber(b.inputs.ebitda);
            case 'score-desc':
                return parseNumber(b.results.qualityScore) - parseNumber(a.results.qualityScore);
            case 'score-asc':
                return parseNumber(a.results.qualityScore) - parseNumber(b.results.qualityScore);
            case 'coc-desc':
                return parseCOC(b.results.cocReturn) - parseCOC(a.results.cocReturn);
            case 'coc-asc':
                return parseCOC(a.results.cocReturn) - parseCOC(b.results.cocReturn);
            default:
                return 0;
        }
    });
    
    currentSort = sortBy;
    
    // Update table header visual indicators
    updateSortIndicators(sortBy);
}

// Update sort indicators on table headers
function updateSortIndicators(sortBy) {
    // Parse sort value (e.g., "date-desc" -> column: "date", direction: "desc")
    const [column, direction] = sortBy.split('-');
    
    // Map sort columns to header data-sort attributes
    const columnMap = {
        'date': 'date',
        'name': 'name',
        'status': 'status',
        'price': 'price',
        'ebitda': 'ebitda',
        'score': 'score',
        'coc': 'coc'
    };
    
    // Clear all sort indicators
    document.querySelectorAll('.deals-table th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
    
    // Add indicator to active column
    const activeHeader = document.querySelector(`.deals-table th.sortable[data-sort="${columnMap[column]}"]`);
    if (activeHeader) {
        activeHeader.classList.add(`sorted-${direction}`);
    }
}

// Parse number from formatted string
function parseNumber(str) {
    if (!str) return 0;
    return parseFloat(str.toString().replace(/[$,]/g, '')) || 0;
}

// Parse COC return (handles "N/A" and percentages)
function parseCOC(str) {
    if (!str || str === 'N/A') return -Infinity; // Put N/A at the end
    return parseFloat(str.toString().replace(/[%,$]/g, '')) || 0;
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render deals table
function renderDeals() {
    const tbody = document.getElementById('deals-tbody');
    tbody.innerHTML = '';
    
    if (filteredDeals.length === 0 && allDeals.length > 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #95a5a6;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No deals match your filters</div>
                    <div style="font-size: 14px;">Try adjusting your search or filters</div>
                </td>
            </tr>
        `;
        return;
    }
    
    filteredDeals.forEach(deal => {
        const row = document.createElement('tr');
        if (selectedDeals.has(deal.name)) {
            row.classList.add('selected');
        }
        
        const askingPrice = parseNumber(deal.inputs.asking);
        const ebitda = parseNumber(deal.inputs.ebitda);
        const qualityScore = parseNumber(deal.results.qualityScore);
        const cocReturn = deal.results.cocReturn || 'N/A';
        
        // Quality score class
        let scoreClass = 'fair';
        if (qualityScore >= 80) scoreClass = 'excellent';
        else if (qualityScore >= 60) scoreClass = 'good';
        else if (qualityScore < 40) scoreClass = 'poor';
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="checkbox deal-checkbox" data-deal="${escapeHtml(deal.name)}" ${selectedDeals.has(deal.name) ? 'checked' : ''}>
            </td>
            <td>
                <div class="deal-name">
                    <div class="deal-name-link" data-deal="${escapeHtml(deal.name)}">${escapeHtml(deal.name)}</div>
                    <div class="deal-url" title="${escapeHtml(deal.url)}">${escapeHtml(deal.url)}</div>
                </div>
            </td>
            <td class="deal-date">${new Date(deal.savedAt).toLocaleDateString()}</td>
            <td>
                <select class="status-select" data-deal="${escapeHtml(deal.name)}">
                    <option value="none" ${deal.status === 'none' ? 'selected' : ''}>-</option>
                    <option value="hot" ${deal.status === 'hot' ? 'selected' : ''}>🔥 Hot</option>
                    <option value="warm" ${deal.status === 'warm' ? 'selected' : ''}>🌡️ Warm</option>
                    <option value="cold" ${deal.status === 'cold' ? 'selected' : ''}>❄️ Cold</option>
                    <option value="pass" ${deal.status === 'pass' ? 'selected' : ''}>❌ Pass</option>
                </select>
            </td>
            <td class="metric">${askingPrice > 0 ? '$' + formatNumber(askingPrice) : 'N/A'}</td>
            <td class="metric">${ebitda > 0 ? '$' + formatNumber(ebitda) : 'N/A'}</td>
            <td>
                <span class="quality-score ${scoreClass}">${qualityScore || '-'}</span>
            </td>
            <td class="metric ${cocReturn.includes('-') ? 'negative' : 'positive'}">${escapeHtml(cocReturn)}</td>
            <td>
                <div class="actions">
                    <button class="action-btn view-deal-btn" data-deal="${escapeHtml(deal.name)}">👁️ View</button>
                    <button class="action-btn" onclick="exportDeal('${escapeHtml(deal.name).replace(/'/g, "\\'")}')">📤 Export</button>
                    <button class="action-btn" onclick="deleteDeal('${escapeHtml(deal.name).replace(/'/g, "\\'")}')">🗑️</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add event listeners for checkboxes
    document.querySelectorAll('.deal-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
    
    // Add event listeners for status dropdowns
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', handleStatusChange);
    });
    
    // Add event listeners for deal name clicks
    document.querySelectorAll('.deal-name-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const dealName = e.target.dataset.deal;
            openDealModal(dealName);
        });
    });
    
    // Add event listeners for View buttons
    document.querySelectorAll('.view-deal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dealName = e.target.dataset.deal;
            openDealModal(dealName);
        });
    });
    
    updateBulkActions();
}

// Handle checkbox change
function handleCheckboxChange(e) {
    const dealName = e.target.dataset.deal;
    if (e.target.checked) {
        selectedDeals.add(dealName);
    } else {
        selectedDeals.delete(dealName);
    }
    updateBulkActions();
    renderDeals();
}

// Handle status change
function handleStatusChange(e) {
    const dealName = e.target.dataset.deal;
    const newStatus = e.target.value;
    
    // Update in memory
    const deal = allDeals.find(d => d.name === dealName);
    if (deal) {
        deal.status = newStatus;
    }
    
    // Save to storage
    saveDeals(allDeals, (success) => {
        if (success) {
            console.log('Deal status updated:', dealName, newStatus);
            updateStats();
            const statusLabels = {
                hot: '🔥 Hot',
                warm: '🌡️ Warm',
                cold: '❄️ Cold',
                pass: '❌ Pass',
                none: 'No Status'
            };
            showToast(`Status updated to ${statusLabels[newStatus] || newStatus}`, 'success', 2000);
        }
    });
}

// Update bulk actions bar
function updateBulkActions() {
    const bulkActions = document.getElementById('bulk-actions');
    const bulkText = document.getElementById('bulk-text');
    const count = selectedDeals.size;
    
    if (count > 0) {
        bulkActions.classList.add('active');
        bulkText.textContent = `${count} deal${count > 1 ? 's' : ''} selected`;
    } else {
        bulkActions.classList.remove('active');
    }
    
    // Update select all checkbox
    const selectAll = document.getElementById('select-all');
    if (count === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    } else if (count === filteredDeals.length) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
    }
}

// Open deal in original listing
function openDeal(dealName) {
    const deal = allDeals.find(d => d.name === dealName);
    if (deal && deal.url) {
        window.open(deal.url, '_blank');
    }
}

// Export single deal
function exportDeal(dealName) {
    const deal = allDeals.find(d => d.name === dealName);
    if (deal) {
        exportDealsToCSV([deal]);
    }
}

// Delete single deal
function deleteDeal(dealName) {
    if (!confirm(`Are you sure you want to delete "${dealName}"?`)) {
        return;
    }
    
    allDeals = allDeals.filter(d => d.name !== dealName);
    selectedDeals.delete(dealName);
    
    saveDeals(allDeals, (success) => {
        if (success) {
            console.log('Deal deleted:', dealName);
            showToast(`Deleted "${dealName}"`, 'success');
            loadDeals();
        }
    });
}

// Bulk delete
function bulkDelete() {
    if (selectedDeals.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedDeals.size} deal(s)?`)) {
        return;
    }
    
    const count = selectedDeals.size;
    allDeals = allDeals.filter(d => !selectedDeals.has(d.name));
    
    saveDeals(allDeals, (success) => {
        if (success) {
            console.log('Bulk delete completed');
            showToast(`Deleted ${count} deal${count > 1 ? 's' : ''}`, 'success');
            selectedDeals.clear();
            loadDeals();
        }
    });
}

// Bulk export
function bulkExport() {
    if (selectedDeals.size === 0) return;
    
    const dealsToExport = allDeals.filter(d => selectedDeals.has(d.name));
    exportDealsToCSV(dealsToExport);
}

// Export all visible deals
function exportAll() {
    if (filteredDeals.length === 0) {
        showToast('No deals to export', 'warning');
        return;
    }
    
    exportDealsToCSV(filteredDeals);
}

// Debounced search function
function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(searchTimeout);
            func(...args);
        };
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(later, wait);
    };
}

// Debounced filter function
const debouncedFilter = debounce(() => {
    applyFiltersAndSort();
    renderDeals();
}, 300);

// Export deals to CSV
function exportDealsToCSV(deals) {
    try {
        if (!deals || deals.length === 0) {
            showToast('No deals to export', 'warning');
            return;
        }
        
        const headers = [
            'Deal Name',
            'Status',
            'Saved Date',
            'URL',
            'Asking Price',
            'EBITDA',
            'Quality Score',
            'COC Return',
            'Payback Period',
            'Max Price',
            'Total Debt',
            'FCF Annual',
            'Owner Take-Home',
            'Broker Name',
            'Broker Company',
            'Broker Phone',
            'Broker Email',
            'Latest Progress',
            'Notes'
        ];
        
        const rows = deals.map(deal => [
            (deal.name || '').replace(/"/g, '""'),
            deal.status || 'none',
            deal.savedAt ? new Date(deal.savedAt).toLocaleDateString() : '',
            (deal.url || '').replace(/"/g, '""'),
            deal.inputs?.asking || '',
            deal.inputs?.ebitda || '',
            deal.results?.qualityScore || '',
            deal.results?.cocReturn || '',
            deal.results?.payback || '',
            deal.results?.maxPrice || '',
            deal.results?.totalDebt || '',
            deal.results?.fcfAnnual || '',
            deal.results?.ownerTakeHome || '',
            deal.brokerInfo?.name || '',
            deal.brokerInfo?.company || '',
            deal.brokerInfo?.phone || '',
            deal.brokerInfo?.email || '',
            deal.progressHistory && deal.progressHistory.length > 0 
                ? deal.progressHistory[deal.progressHistory.length - 1].status 
                : '',
            (deal.notes || '').replace(/"/g, '""') // Escape quotes
        ]);
        
        // Create CSV content
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deals-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Exported', deals.length, 'deals');
        showToast(`Exported ${deals.length} deal${deals.length > 1 ? 's' : ''} to CSV`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Error exporting deals: ' + error.message, 'error');
    }
}

// Event Listeners
document.getElementById('search').addEventListener('input', () => {
    debouncedFilter();
});

document.getElementById('filter-status').addEventListener('change', () => {
    applyFiltersAndSort();
    renderDeals();
});

document.getElementById('sort-by').addEventListener('change', () => {
    applyFiltersAndSort();
    renderDeals();
});

document.getElementById('select-all').addEventListener('change', (e) => {
    if (e.target.checked) {
        filteredDeals.forEach(deal => selectedDeals.add(deal.name));
    } else {
        selectedDeals.clear();
    }
    renderDeals();
});

document.getElementById('bulk-delete').addEventListener('click', bulkDelete);
document.getElementById('bulk-export').addEventListener('click', bulkExport);
document.getElementById('bulk-deselect').addEventListener('click', () => {
    selectedDeals.clear();
    renderDeals();
});

document.getElementById('export-btn').addEventListener('click', exportAll);
document.getElementById('refresh-btn').addEventListener('click', () => {
    const btn = document.getElementById('refresh-btn');
    btn.classList.add('loading');
    loadDeals();
    setTimeout(() => btn.classList.remove('loading'), 500);
});

// Table header sorting
let currentSortColumn = 'date';
let currentSortDirection = 'desc';

document.querySelectorAll('.deals-table th.sortable').forEach(header => {
    header.addEventListener('click', () => {
        const sortType = header.dataset.sort;
        
        // Toggle direction if clicking same column
        if (currentSortColumn === sortType) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column - default to descending for numbers, ascending for text
            currentSortColumn = sortType;
            if (sortType === 'name') {
                currentSortDirection = 'asc';
            } else {
                currentSortDirection = 'desc';
            }
        }
        
        // Update dropdown to match
        const sortValue = `${sortType}-${currentSortDirection}`;
        document.getElementById('sort-by').value = sortValue;
        
        // Update visual indicators
        document.querySelectorAll('.deals-table th.sortable').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });
        header.classList.add(`sorted-${currentSortDirection}`);
        
        // Apply sort
        applyFiltersAndSort();
        renderDeals();
    });
});

// ===== DEAL MODAL FUNCTIONALITY =====
let currentModalDeal = null;
let currentScenario = 0;
let scenarios = [{}, {}, {}]; // Store 3 scenarios

function openDealModal(dealName) {
    const deal = allDeals.find(d => d.name === dealName);
    if (!deal) return;
    
    currentModalDeal = deal;
    currentScenario = 0;
    
    // Load scenarios from deal or initialize
    scenarios = deal.scenarios || [{}, {}, {}];
    
    // Populate modal
    document.getElementById('modal-deal-name').textContent = deal.name;
    document.getElementById('modal-status').textContent = getStatusText(deal.status || 'none');
    document.getElementById('modal-saved-date').textContent = new Date(deal.savedAt).toLocaleDateString();
    document.getElementById('modal-asking-price').textContent = deal.inputs?.asking ? '$' + formatNumber(parseNumber(deal.inputs.asking)) : 'N/A';
    document.getElementById('modal-ebitda').textContent = deal.inputs?.ebitda ? '$' + formatNumber(parseNumber(deal.inputs.ebitda)) : 'N/A';
    document.getElementById('modal-quality').textContent = deal.results?.qualityScore || '-';
    document.getElementById('modal-coc').textContent = deal.results?.cocReturn || 'N/A';
    document.getElementById('modal-max-price').textContent = deal.results?.maxPrice || 'N/A';
    document.getElementById('modal-total-debt').textContent = deal.results?.totalDebt || 'N/A';
    document.getElementById('modal-fcf').textContent = deal.results?.fcfAnnual || 'N/A';
    document.getElementById('modal-takehome').textContent = deal.results?.ownerTakeHome || 'N/A';
    document.getElementById('modal-payback').textContent = deal.results?.payback || 'N/A';
    document.getElementById('modal-notes').value = deal.notes || '';
    
    const urlLink = document.getElementById('modal-url');
    urlLink.href = deal.url;
    urlLink.textContent = deal.url;
    
    // Load broker information
    const brokerInfo = deal.brokerInfo || {};
    document.getElementById('broker-name').value = brokerInfo.name || '';
    document.getElementById('broker-company').value = brokerInfo.company || '';
    document.getElementById('broker-phone').value = brokerInfo.phone || '';
    document.getElementById('broker-email').value = brokerInfo.email || '';
    
    // Load progress tracking
    loadProgressHistory(deal);
    
    // Load custom statuses into dropdown
    loadCustomStatuses(deal);
    
    // Reset scenario tabs
    document.querySelectorAll('.scenario-tab').forEach((tab, idx) => {
        tab.classList.toggle('active', idx === 0);
    });
    
    // Load scenario 0
    loadScenario(0);
    
    // Show modal
    document.getElementById('deal-modal').style.display = 'flex';
}

function loadScenario(scenarioIndex) {
    currentScenario = scenarioIndex;
    const scenario = scenarios[scenarioIndex];
    
    // Update tab UI
    document.querySelectorAll('.scenario-tab').forEach((tab, idx) => {
        tab.classList.toggle('active', idx === scenarioIndex);
    });
    
    // If scenario exists, populate fields
    if (scenario.purchasePrice) {
        document.getElementById('calc-purchase-price').value = formatCurrency(scenario.purchasePrice);
        document.getElementById('calc-ebitda').value = formatCurrency(scenario.ebitda);
        document.getElementById('calc-sba-pct').value = scenario.sbaPct || 75;
        document.getElementById('calc-buyer-equity-pct').value = scenario.buyerEquityPct || 15;
        document.getElementById('calc-seller-note-pct').value = scenario.sellerNotePct || 10;
        document.getElementById('calc-sba-rate').value = scenario.sbaRate || 11.5;
        document.getElementById('calc-sba-term').value = scenario.sbaTerm || 10;
        document.getElementById('calc-seller-rate').value = scenario.sellerRate || 6.0;
        document.getElementById('calc-seller-term').value = scenario.sellerTerm || 5;
        
        // Display results if they exist
        displayCalculatorResults(scenario.results);
    } else {
        // Load default values from deal
        const askingPrice = currentModalDeal.inputs?.asking ? parseNumber(currentModalDeal.inputs.asking) : 0;
        const ebitda = currentModalDeal.inputs?.ebitda ? parseNumber(currentModalDeal.inputs.ebitda) : 0;
        
        document.getElementById('calc-purchase-price').value = askingPrice > 0 ? formatCurrency(askingPrice) : '';
        document.getElementById('calc-ebitda').value = ebitda > 0 ? formatCurrency(ebitda) : '';
        document.getElementById('calc-sba-pct').value = 75;
        document.getElementById('calc-buyer-equity-pct').value = 15;
        document.getElementById('calc-seller-note-pct').value = 10;
        document.getElementById('calc-sba-rate').value = 11.5;
        document.getElementById('calc-sba-term').value = 10;
        document.getElementById('calc-seller-rate').value = 6.0;
        document.getElementById('calc-seller-term').value = 5;
        
        // Clear results
        displayCalculatorResults(null);
    }
}

function saveCurrentScenario() {
    const purchasePrice = parseNumber(document.getElementById('calc-purchase-price').value);
    const ebitda = parseNumber(document.getElementById('calc-ebitda').value);
    const sbaPct = parseFloat(document.getElementById('calc-sba-pct').value) || 0;
    const buyerEquityPct = parseFloat(document.getElementById('calc-buyer-equity-pct').value) || 0;
    const sellerNotePct = parseFloat(document.getElementById('calc-seller-note-pct').value) || 0;
    const sbaRate = parseFloat(document.getElementById('calc-sba-rate').value) || 0;
    const sbaTerm = parseFloat(document.getElementById('calc-sba-term').value) || 0;
    const sellerRate = parseFloat(document.getElementById('calc-seller-rate').value) || 0;
    const sellerTerm = parseFloat(document.getElementById('calc-seller-term').value) || 0;
    
    // Validate percentages
    const totalPct = sbaPct + buyerEquityPct + sellerNotePct;
    if (Math.abs(totalPct - 100) > 0.01) {
        document.getElementById('percentage-warning').style.display = 'block';
        return null;
    }
    document.getElementById('percentage-warning').style.display = 'none';
    
    // Calculate
    const results = calculateDealStructure(
        purchasePrice,
        ebitda,
        sbaPct,
        buyerEquityPct,
        sellerNotePct,
        sbaRate,
        sbaTerm,
        sellerRate,
        sellerTerm
    );
    
    // Save to scenario
    scenarios[currentScenario] = {
        purchasePrice,
        ebitda,
        sbaPct,
        buyerEquityPct,
        sellerNotePct,
        sbaRate,
        sbaTerm,
        sellerRate,
        sellerTerm,
        results
    };
    
    // Save to deal
    currentModalDeal.scenarios = scenarios;
    
    // Update in allDeals
    const deal = allDeals.find(d => d.name === currentModalDeal.name);
    if (deal) {
        deal.scenarios = scenarios;
    }
    
    // Save to storage
    saveDeals(allDeals, (success) => {
        if (success) {
            showToast(`Scenario ${currentScenario + 1} saved`, 'success', 2000);
        }
    });
    
    return results;
}

function calculateDealStructure(purchasePrice, ebitda, sbaPct, buyerEquityPct, sellerNotePct, sbaRate, sbaTerm, sellerRate, sellerTerm) {
    const sbaAmount = purchasePrice * (sbaPct / 100);
    const buyerEquity = purchasePrice * (buyerEquityPct / 100);
    const sellerNote = purchasePrice * (sellerNotePct / 100);
    
    // Monthly payment calculation
    const sbaMonthlyRate = (sbaRate / 100) / 12;
    const sbaMonths = sbaTerm * 12;
    const sbaPayment = sbaAmount > 0 ? 
        (sbaAmount * sbaMonthlyRate * Math.pow(1 + sbaMonthlyRate, sbaMonths)) / 
        (Math.pow(1 + sbaMonthlyRate, sbaMonths) - 1) : 0;
    
    const sellerMonthlyRate = (sellerRate / 100) / 12;
    const sellerMonths = sellerTerm * 12;
    const sellerPayment = sellerNote > 0 ? 
        (sellerNote * sellerMonthlyRate * Math.pow(1 + sellerMonthlyRate, sellerMonths)) / 
        (Math.pow(1 + sellerMonthlyRate, sellerMonths) - 1) : 0;
    
    const totalDebtService = (sbaPayment + sellerPayment) * 12;
    const annualCashFlow = ebitda - totalDebtService;
    const cocReturn = buyerEquity > 0 ? (annualCashFlow / buyerEquity) * 100 : 0;
    const dscr = totalDebtService > 0 ? ebitda / totalDebtService : 0;
    const payback = buyerEquity > 0 && annualCashFlow > 0 ? buyerEquity / annualCashFlow : 0;
    
    return {
        sbaAmount,
        buyerEquity,
        sellerNote,
        totalDebtService,
        annualCashFlow,
        cocReturn,
        dscr,
        payback
    };
}

function displayCalculatorResults(results) {
    if (!results) {
        document.getElementById('calc-sba-amount').textContent = '-';
        document.getElementById('calc-buyer-equity').textContent = '-';
        document.getElementById('calc-seller-note').textContent = '-';
        document.getElementById('calc-total-debt-service').textContent = '-';
        document.getElementById('calc-annual-cashflow').textContent = '-';
        document.getElementById('calc-coc-return').textContent = '-';
        document.getElementById('calc-dscr').textContent = '-';
        document.getElementById('calc-payback').textContent = '-';
        return;
    }
    
    document.getElementById('calc-sba-amount').textContent = formatCurrency(results.sbaAmount);
    document.getElementById('calc-buyer-equity').textContent = formatCurrency(results.buyerEquity);
    document.getElementById('calc-seller-note').textContent = formatCurrency(results.sellerNote);
    document.getElementById('calc-total-debt-service').textContent = formatCurrency(results.totalDebtService);
    
    const cashflowEl = document.getElementById('calc-annual-cashflow');
    cashflowEl.textContent = formatCurrency(results.annualCashFlow);
    cashflowEl.style.color = results.annualCashFlow >= 0 ? '#27ae60' : '#e74c3c';
    
    const cocEl = document.getElementById('calc-coc-return');
    cocEl.textContent = results.cocReturn.toFixed(1) + '%';
    cocEl.style.color = results.cocReturn >= 0 ? '#27ae60' : '#e74c3c';
    
    const dscrEl = document.getElementById('calc-dscr');
    dscrEl.textContent = results.dscr.toFixed(2);
    dscrEl.style.color = results.dscr >= 1.25 ? '#27ae60' : '#e74c3c';
    
    document.getElementById('calc-payback').textContent = 
        results.payback > 0 ? results.payback.toFixed(1) + ' years' : 'N/A';
}

function formatCurrency(value) {
    if (!value || isNaN(value)) return '$0';
    return '$' + formatNumber(Math.round(value));
}

function getStatusText(status) {
    const statusMap = {
        hot: '🔥 Hot',
        warm: '🌡️ Warm',
        cold: '❄️ Cold',
        pass: '❌ Pass',
        none: 'No Status'
    };
    return statusMap[status] || 'No Status';
}

function closeDealModal() {
    document.getElementById('deal-modal').style.display = 'none';
    currentModalDeal = null;
}

// Modal event listeners
document.getElementById('modal-close').addEventListener('click', closeDealModal);
document.getElementById('modal-close-btn').addEventListener('click', closeDealModal);

// Close modal when clicking outside
document.getElementById('deal-modal').addEventListener('click', (e) => {
    if (e.target.id === 'deal-modal') {
        closeDealModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('deal-modal').style.display === 'flex') {
        closeDealModal();
    }
});

// Save notes button
document.getElementById('modal-save-notes').addEventListener('click', () => {
    if (!currentModalDeal) return;
    
    const notes = document.getElementById('modal-notes').value;
    currentModalDeal.notes = notes;
    
    // Update in allDeals
    const deal = allDeals.find(d => d.name === currentModalDeal.name);
    if (deal) {
        deal.notes = notes;
    }
    
    // Save to storage
    saveDeals(allDeals, (success) => {
        if (success) {
            showToast('Notes saved successfully', 'success');
        }
    });
});

// Save broker information
document.getElementById('modal-save-broker').addEventListener('click', () => {
    if (!currentModalDeal) return;
    
    const brokerInfo = {
        name: document.getElementById('broker-name').value,
        company: document.getElementById('broker-company').value,
        phone: document.getElementById('broker-phone').value,
        email: document.getElementById('broker-email').value
    };
    
    currentModalDeal.brokerInfo = brokerInfo;
    
    // Update in allDeals
    const deal = allDeals.find(d => d.name === currentModalDeal.name);
    if (deal) {
        deal.brokerInfo = brokerInfo;
    }
    
    // Save to storage
    saveDeals(allDeals, (success) => {
        if (success) {
            showToast('Broker information saved successfully', 'success');
        }
    });
});

// Load progress history
function loadProgressHistory(deal) {
    const progressList = document.getElementById('progress-history-list');
    const progressHistory = deal.progressHistory || [];
    
    if (progressHistory.length === 0) {
        progressList.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px; text-align: center; padding: 20px;">No progress updates yet</p>';
        return;
    }
    
    // Sort by date, most recent first
    const sortedProgress = [...progressHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    progressList.innerHTML = sortedProgress.map((item, index) => `
        <div class="progress-item">
            <div class="progress-icon">📌</div>
            <div class="progress-content">
                <div class="progress-status">${escapeHtml(item.status)}</div>
                <div class="progress-date">${new Date(item.date).toLocaleString()}</div>
            </div>
            <button class="progress-delete" onclick="deleteProgressItem(${index})" title="Remove">×</button>
        </div>
    `).join('');
}

// Load custom statuses into dropdown
function loadCustomStatuses(deal) {
    const customStatuses = deal.customStatuses || [];
    const dropdown = document.getElementById('deal-progress-status');
    
    // Remove any previously added custom options
    const existingOptions = Array.from(dropdown.options);
    existingOptions.forEach(option => {
        if (option.dataset.custom === 'true') {
            dropdown.removeChild(option);
        }
    });
    
    // Add custom statuses
    customStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        option.dataset.custom = 'true';
        dropdown.appendChild(option);
    });
}

// Add progress status
document.getElementById('deal-progress-status').addEventListener('change', (e) => {
    if (!currentModalDeal) return;
    
    const status = e.target.value;
    if (!status) return;
    
    // Initialize progress history if needed
    if (!currentModalDeal.progressHistory) {
        currentModalDeal.progressHistory = [];
    }
    
    // Add new progress item
    currentModalDeal.progressHistory.push({
        status: status,
        date: new Date().toISOString()
    });
    
    // Update in allDeals
    const deal = allDeals.find(d => d.name === currentModalDeal.name);
    if (deal) {
        deal.progressHistory = currentModalDeal.progressHistory;
    }
    
    // Save to storage
    saveDeals(allDeals, (success) => {
        if (success) {
            showToast(`Progress updated: ${status}`, 'success', 2000);
            loadProgressHistory(currentModalDeal);
            // Reset dropdown
            e.target.value = '';
        }
    });
});

// Add custom status
document.getElementById('add-custom-status-btn').addEventListener('click', () => {
    if (!currentModalDeal) return;
    
    const customStatus = document.getElementById('custom-progress-status').value.trim();
    if (!customStatus) {
        showToast('Please enter a custom status', 'warning');
        return;
    }
    
    // Initialize custom statuses if needed
    if (!currentModalDeal.customStatuses) {
        currentModalDeal.customStatuses = [];
    }
    
    // Check if already exists
    if (currentModalDeal.customStatuses.includes(customStatus)) {
        showToast('This custom status already exists', 'warning');
        return;
    }
    
    // Add custom status
    currentModalDeal.customStatuses.push(customStatus);
    
    // Update in allDeals
    const deal = allDeals.find(d => d.name === currentModalDeal.name);
    if (deal) {
        deal.customStatuses = currentModalDeal.customStatuses;
    }
    
    // Save to storage
    saveDeals(allDeals, (success) => {
        if (success) {
            showToast(`Custom status "${customStatus}" added`, 'success');
            loadCustomStatuses(currentModalDeal);
            document.getElementById('custom-progress-status').value = '';
        }
    });
});

// Delete progress item
function deleteProgressItem(index) {
    if (!currentModalDeal) return;
    
    const progressHistory = currentModalDeal.progressHistory || [];
    
    // Sort to get the same order as displayed
    const sortedProgress = [...progressHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    const itemToDelete = sortedProgress[index];
    
    // Find and remove from original array
    const originalIndex = progressHistory.findIndex(item => 
        item.status === itemToDelete.status && item.date === itemToDelete.date
    );
    
    if (originalIndex > -1) {
        progressHistory.splice(originalIndex, 1);
        currentModalDeal.progressHistory = progressHistory;
        
        // Update in allDeals
        const deal = allDeals.find(d => d.name === currentModalDeal.name);
        if (deal) {
            deal.progressHistory = progressHistory;
        }
        
        // Save to storage
        saveDeals(allDeals, (success) => {
            if (success) {
                showToast('Progress item removed', 'success', 2000);
                loadProgressHistory(currentModalDeal);
            }
        });
    }
}

// Modal export button
document.getElementById('modal-export-btn').addEventListener('click', () => {
    if (currentModalDeal) {
        exportDeal(currentModalDeal.name);
    }
});

// Modal delete button
document.getElementById('modal-delete-btn').addEventListener('click', () => {
    if (currentModalDeal) {
        closeDealModal();
        deleteDeal(currentModalDeal.name);
    }
});

// Scenario tab switching
document.querySelectorAll('.scenario-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const scenarioIndex = parseInt(e.target.dataset.scenario);
        loadScenario(scenarioIndex);
    });
});

// Show comparison view
document.getElementById('compare-scenarios-btn').addEventListener('click', () => {
    showComparisonView();
});

// Close comparison view
document.getElementById('close-comparison-btn').addEventListener('click', () => {
    document.getElementById('scenario-comparison').style.display = 'none';
    document.querySelector('.calculator-section').parentElement.style.display = 'block';
    document.querySelector('.modal-content').classList.remove('wide');
});

function showComparisonView() {
    // Hide calculator
    document.querySelector('.calculator-section').parentElement.style.display = 'none';
    
    // Show comparison
    document.getElementById('scenario-comparison').style.display = 'block';
    
    // Make modal wide
    document.querySelector('.modal-content').classList.add('wide');
    
    // Populate comparison
    populateComparison();
}

function populateComparison() {
    const validScenarios = [];
    
    for (let i = 0; i < 3; i++) {
        const scenario = scenarios[i];
        const cardId = `scenario-card-${i + 1}`;
        const card = document.getElementById(cardId);
        
        if (scenario.purchasePrice && scenario.results) {
            // Populate inputs
            card.querySelector('[data-field="purchasePrice"]').textContent = formatCurrency(scenario.purchasePrice);
            card.querySelector('[data-field="ebitda"]').textContent = formatCurrency(scenario.ebitda);
            card.querySelectorAll('[data-field="sbaPct"]')[0].textContent = scenario.sbaPct + '%';
            card.querySelectorAll('[data-field="buyerEquityPct"]')[0].textContent = scenario.buyerEquityPct + '%';
            card.querySelectorAll('[data-field="sellerNotePct"]')[0].textContent = scenario.sellerNotePct + '%';
            card.querySelector('[data-field="sbaRate"]').textContent = scenario.sbaRate + '%';
            card.querySelector('[data-field="sellerRate"]').textContent = scenario.sellerRate + '%';
            
            // Populate results
            const r = scenario.results;
            card.querySelector('[data-field="sbaAmount"]').textContent = formatCurrency(r.sbaAmount);
            card.querySelectorAll('[data-field="buyerEquity"]')[0].textContent = formatCurrency(r.buyerEquity);
            card.querySelector('[data-field="sellerNote"]').textContent = formatCurrency(r.sellerNote);
            card.querySelector('[data-field="totalDebtService"]').textContent = formatCurrency(r.totalDebtService);
            
            const cashflowCell = card.querySelector('[data-field="annualCashFlow"]');
            cashflowCell.textContent = formatCurrency(r.annualCashFlow);
            cashflowCell.style.color = r.annualCashFlow >= 0 ? '#27ae60' : '#e74c3c';
            
            const cocCell = card.querySelector('[data-field="cocReturn"]');
            cocCell.textContent = r.cocReturn.toFixed(1) + '%';
            cocCell.style.color = r.cocReturn >= 0 ? '#27ae60' : '#e74c3c';
            
            const dscrCell = card.querySelector('[data-field="dscr"]');
            dscrCell.textContent = r.dscr.toFixed(2);
            dscrCell.style.color = r.dscr >= 1.25 ? '#27ae60' : '#e74c3c';
            
            card.querySelector('[data-field="payback"]').textContent = 
                r.payback > 0 ? r.payback.toFixed(1) + ' yrs' : 'N/A';
            
            validScenarios.push({ index: i, scenario, results: r });
        } else {
            // Empty scenario - clear all values
            card.querySelectorAll('.scenario-value').forEach(cell => {
                cell.textContent = '-';
                cell.style.color = '';
            });
        }
    }
    
    // Find best scenario
    if (validScenarios.length > 0) {
        findBestScenario(validScenarios);
    } else {
        document.getElementById('best-scenario-summary').innerHTML = 
            '<p>Calculate scenarios to see recommendations</p>';
    }
}

function findBestScenario(validScenarios) {
    // Clear previous best indicators
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.classList.remove('best-overall');
        card.querySelector('.best-badge').style.display = 'none';
    });
    
    // Find best by different metrics
    let bestCOC = validScenarios[0];
    let bestDSCR = validScenarios[0];
    let bestCashFlow = validScenarios[0];
    let lowestEquity = validScenarios[0];
    
    validScenarios.forEach(s => {
        if (s.results.cocReturn > bestCOC.results.cocReturn) bestCOC = s;
        if (s.results.dscr > bestDSCR.results.dscr) bestDSCR = s;
        if (s.results.annualCashFlow > bestCashFlow.results.annualCashFlow) bestCashFlow = s;
        if (s.results.buyerEquity < lowestEquity.results.buyerEquity) lowestEquity = s;
    });
    
    // Overall recommendation (weighted scoring)
    const scores = validScenarios.map(s => {
        const cocScore = s.results.cocReturn >= 0 ? s.results.cocReturn : 0;
        const dscrScore = s.results.dscr >= 1.25 ? s.results.dscr * 10 : 0;
        const cashflowScore = s.results.annualCashFlow >= 0 ? (s.results.annualCashFlow / 10000) : 0;
        return {
            index: s.index,
            total: cocScore * 2 + dscrScore * 1.5 + cashflowScore
        };
    });
    
    scores.sort((a, b) => b.total - a.total);
    const bestOverall = scores[0].index;
    
    // Highlight best overall card
    const bestCard = document.getElementById(`scenario-card-${bestOverall + 1}`);
    bestCard.classList.add('best-overall');
    bestCard.querySelector('.best-badge').style.display = 'inline-block';
    
    // Display summary
    const summary = document.getElementById('best-scenario-summary');
    summary.innerHTML = `
        <p><strong>🏆 Recommended: Scenario ${bestOverall + 1}</strong> - Best overall based on weighted analysis</p>
        <p>• <strong>Highest COC Return:</strong> Scenario ${bestCOC.index + 1} at ${bestCOC.results.cocReturn.toFixed(1)}%</p>
        <p>• <strong>Best DSCR:</strong> Scenario ${bestDSCR.index + 1} at ${bestDSCR.results.dscr.toFixed(2)}x</p>
        <p>• <strong>Highest Cash Flow:</strong> Scenario ${bestCashFlow.index + 1} at ${formatCurrency(bestCashFlow.results.annualCashFlow)}/year</p>
        <p>• <strong>Lowest Equity Required:</strong> Scenario ${lowestEquity.index + 1} at ${formatCurrency(lowestEquity.results.buyerEquity)}</p>
    `;
}

// Calculator recalculate button
document.getElementById('calc-recalculate-btn').addEventListener('click', () => {
    const results = saveCurrentScenario();
    if (results) {
        displayCalculatorResults(results);
    }
});

// Auto-validate percentages
['calc-sba-pct', 'calc-buyer-equity-pct', 'calc-seller-note-pct'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        const sbaPct = parseFloat(document.getElementById('calc-sba-pct').value) || 0;
        const buyerEquityPct = parseFloat(document.getElementById('calc-buyer-equity-pct').value) || 0;
        const sellerNotePct = parseFloat(document.getElementById('calc-seller-note-pct').value) || 0;
        const total = sbaPct + buyerEquityPct + sellerNotePct;
        
        const warning = document.getElementById('percentage-warning');
        if (Math.abs(total - 100) > 0.01) {
            warning.style.display = 'block';
            warning.textContent = `⚠️ Percentages total ${total.toFixed(1)}% (must be 100%)`;
        } else {
            warning.style.display = 'none';
        }
    });
});

// ===== SHARE FUNCTIONALITY =====
let shareModalDeal = null;
let shareText = '';

// Open share modal
document.getElementById('modal-share-btn').addEventListener('click', () => {
    if (!currentModalDeal) return;
    
    shareModalDeal = currentModalDeal;
    shareText = generateShareText();
    
    // Show preview
    document.getElementById('share-preview-text').textContent = shareText;
    
    // Hide SMS phone section (in case it was visible before)
    document.getElementById('sms-phone-section').style.display = 'none';
    
    // Show share modal
    document.getElementById('share-modal').style.display = 'flex';
});

// Close share modal
document.getElementById('share-modal-close').addEventListener('click', () => {
    document.getElementById('share-modal').style.display = 'none';
    document.getElementById('sms-phone-section').style.display = 'none';
});

// Close share modal when clicking outside
document.getElementById('share-modal').addEventListener('click', (e) => {
    if (e.target.id === 'share-modal') {
        document.getElementById('share-modal').style.display = 'none';
        document.getElementById('sms-phone-section').style.display = 'none';
    }
});

// Generate comprehensive share text
function generateShareText() {
    if (!shareModalDeal) return '';
    
    const deal = shareModalDeal;
    let text = '';
    
    // Header
    text += `📊 DEAL ANALYSIS: ${deal.name}\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    // Overview
    text += `📍 OVERVIEW\n`;
    text += `Status: ${getStatusText(deal.status || 'none')}\n`;
    text += `Saved: ${new Date(deal.savedAt).toLocaleDateString()}\n`;
    text += `Quality Score: ${deal.results?.qualityScore || 'N/A'}/100\n`;
    text += `Link: ${deal.url}\n\n`;
    
    // Financial Highlights
    text += `💰 FINANCIAL HIGHLIGHTS\n`;
    text += `Asking Price: ${deal.inputs?.asking || 'N/A'}\n`;
    text += `EBITDA: ${deal.inputs?.ebitda || 'N/A'}\n`;
    text += `Max Price: ${deal.results?.maxPrice || 'N/A'}\n`;
    text += `COC Return: ${deal.results?.cocReturn || 'N/A'}\n`;
    text += `Total Debt: ${deal.results?.totalDebt || 'N/A'}\n`;
    text += `FCF Annual: ${deal.results?.fcfAnnual || 'N/A'}\n`;
    text += `Owner Take-Home: ${deal.results?.ownerTakeHome || 'N/A'}\n`;
    text += `Payback Period: ${deal.results?.payback || 'N/A'}\n\n`;
    
    // Broker Information
    if (deal.brokerInfo && (deal.brokerInfo.name || deal.brokerInfo.company || deal.brokerInfo.phone || deal.brokerInfo.email)) {
        text += `👔 BROKER CONTACT\n`;
        if (deal.brokerInfo.name) text += `Name: ${deal.brokerInfo.name}\n`;
        if (deal.brokerInfo.company) text += `Company: ${deal.brokerInfo.company}\n`;
        if (deal.brokerInfo.phone) text += `Phone: ${deal.brokerInfo.phone}\n`;
        if (deal.brokerInfo.email) text += `Email: ${deal.brokerInfo.email}\n`;
        text += `\n`;
    }
    
    // Deal Progress
    if (deal.progressHistory && deal.progressHistory.length > 0) {
        text += `📋 DEAL PROGRESS\n`;
        const sortedProgress = [...deal.progressHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedProgress.slice(0, 5).forEach(item => {
            text += `• ${item.status} (${new Date(item.date).toLocaleDateString()})\n`;
        });
        text += `\n`;
    }
    
    // Scenarios (if calculated)
    const validScenarios = scenarios.filter(s => s.purchasePrice && s.results);
    if (validScenarios.length > 0) {
        text += `🎯 DEAL STRUCTURE SCENARIOS\n`;
        text += `${'='.repeat(50)}\n\n`;
        
        validScenarios.forEach((scenario, idx) => {
            text += `SCENARIO ${idx + 1}\n`;
            text += `${'-'.repeat(30)}\n`;
            text += `Purchase Price: ${formatCurrency(scenario.purchasePrice)}\n`;
            text += `EBITDA/SDE: ${formatCurrency(scenario.ebitda)}\n`;
            text += `\n`;
            text += `Structure:\n`;
            text += `  SBA Loan: ${scenario.sbaPct}% (${formatCurrency(scenario.results.sbaAmount)})\n`;
            text += `  Buyer Equity: ${scenario.buyerEquityPct}% (${formatCurrency(scenario.results.buyerEquity)})\n`;
            text += `  Seller Note: ${scenario.sellerNotePct}% (${formatCurrency(scenario.results.sellerNote)})\n`;
            text += `\n`;
            text += `Terms:\n`;
            text += `  SBA Rate: ${scenario.sbaRate}% for ${scenario.sbaTerm} years\n`;
            text += `  Seller Rate: ${scenario.sellerRate}% for ${scenario.sellerTerm} years\n`;
            text += `\n`;
            text += `Results:\n`;
            text += `  Total Debt Service: ${formatCurrency(scenario.results.totalDebtService)}/year\n`;
            text += `  Annual Cash Flow: ${formatCurrency(scenario.results.annualCashFlow)}\n`;
            text += `  COC Return: ${scenario.results.cocReturn.toFixed(1)}%\n`;
            text += `  DSCR: ${scenario.results.dscr.toFixed(2)}x\n`;
            text += `  Payback Period: ${scenario.results.payback > 0 ? scenario.results.payback.toFixed(1) + ' years' : 'N/A'}\n`;
            text += `\n`;
        });
        
        // Recommendation
        if (validScenarios.length > 1) {
            const scores = validScenarios.map((s, idx) => {
                const cocScore = s.results.cocReturn >= 0 ? s.results.cocReturn : 0;
                const dscrScore = s.results.dscr >= 1.25 ? s.results.dscr * 10 : 0;
                const cashflowScore = s.results.annualCashFlow >= 0 ? (s.results.annualCashFlow / 10000) : 0;
                return {
                    index: idx,
                    total: cocScore * 2 + dscrScore * 1.5 + cashflowScore
                };
            });
            scores.sort((a, b) => b.total - a.total);
            const bestIdx = scores[0].index;
            
            text += `🏆 RECOMMENDED: Scenario ${bestIdx + 1}\n`;
            text += `Based on weighted analysis of COC return, DSCR, and cash flow.\n\n`;
        }
    }
    
    // Notes
    if (deal.notes) {
        text += `📝 NOTES\n`;
        text += `${deal.notes}\n\n`;
    }
    
    // Footer
    text += `${'='.repeat(50)}\n`;
    text += `Generated by Deal Analyzer Extension v1.9.21\n`;
    text += `${new Date().toLocaleString()}\n`;
    
    return text;
}

// Email share
document.getElementById('share-email').addEventListener('click', () => {
    if (!shareText) return;
    
    const subject = encodeURIComponent(`Deal Analysis: ${shareModalDeal.name}`);
    const body = encodeURIComponent(shareText);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    showToast('Opening email client...', 'success', 2000);
});

// SMS share
document.getElementById('share-sms').addEventListener('click', () => {
    if (!shareText) return;
    
    // Show phone number input section
    const smsSection = document.getElementById('sms-phone-section');
    smsSection.style.display = 'block';
    
    // Load last used phone number
    chrome.storage.local.get(['lastSMSNumber'], (result) => {
        if (result.lastSMSNumber) {
            document.getElementById('sms-phone-number').value = result.lastSMSNumber;
            console.log('Loaded last SMS number:', result.lastSMSNumber);
        }
    });
    
    // Focus on phone input
    document.getElementById('sms-phone-number').focus();
});

// SMS send button
document.getElementById('sms-send-btn').addEventListener('click', () => {
    sendSMS();
});

// Allow Enter key to send SMS
document.getElementById('sms-phone-number').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendSMS();
    }
});

// Send SMS function
function sendSMS() {
    if (!shareText || !shareModalDeal) return;
    
    const phoneNumber = document.getElementById('sms-phone-number').value.trim();
    
    if (!phoneNumber) {
        showToast('Please enter a phone number', 'warning');
        return;
    }
    
    // Save phone number for next time
    chrome.storage.local.set({ lastSMSNumber: phoneNumber }, () => {
        console.log('Saved SMS number:', phoneNumber);
    });
    
    // SMS has character limits, so create a shorter version
    const shortText = `Deal: ${shareModalDeal.name}\nAsking: ${shareModalDeal.inputs?.asking || 'N/A'}\nEBITDA: ${shareModalDeal.inputs?.ebitda || 'N/A'}\nQuality: ${shareModalDeal.results?.qualityScore || 'N/A'}/100\nLink: ${shareModalDeal.url}`;
    
    const body = encodeURIComponent(shortText);
    const smsLink = `sms:${phoneNumber}?&body=${body}`;
    
    // Open SMS app
    window.location.href = smsLink;
    
    showToast('Opening messages app...', 'success', 2000);
    
    // Hide phone section and close modal after a delay
    setTimeout(() => {
        document.getElementById('sms-phone-section').style.display = 'none';
        document.getElementById('share-modal').style.display = 'none';
    }, 500);
}

// Copy to clipboard
document.getElementById('share-copy').addEventListener('click', async () => {
    if (!shareText) return;
    
    try {
        await navigator.clipboard.writeText(shareText);
        showToast('Deal analysis copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Deal analysis copied to clipboard!', 'success');
        } catch (e) {
            showToast('Failed to copy to clipboard', 'error');
        }
        document.body.removeChild(textarea);
    }
});

// Native share (includes AirDrop on iOS/macOS)
document.getElementById('share-native').addEventListener('click', async () => {
    if (!shareText) return;
    
    // Check if Web Share API is available
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Deal Analysis: ${shareModalDeal.name}`,
                text: shareText,
                url: shareModalDeal.url
            });
            showToast('Shared successfully!', 'success');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
                showToast('Share cancelled or failed', 'warning');
            }
        }
    } else {
        // Fallback: copy to clipboard if Web Share API not available
        try {
            await navigator.clipboard.writeText(shareText);
            showToast('Web Share not available. Copied to clipboard instead!', 'info');
        } catch (e) {
            showToast('Sharing not supported on this device. Try Copy Link instead.', 'warning');
        }
    }
});

// Initialize
loadDeals();

