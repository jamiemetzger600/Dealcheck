// Deals Dashboard JavaScript
let allDeals = [];
let filteredDeals = [];
let selectedDeals = new Set();
let currentSort = 'date-desc';

// Load deals from Chrome storage
function loadDeals() {
    chrome.storage.local.get(['savedDeals'], (result) => {
        allDeals = result.savedDeals || [];
        
        // Ensure each deal has a status field
        allDeals = allDeals.map(deal => ({
            ...deal,
            status: deal.status || 'none'
        }));
        
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
    });
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
            case 'score-desc':
                return parseNumber(b.results.qualityScore) - parseNumber(a.results.qualityScore);
            case 'score-asc':
                return parseNumber(a.results.qualityScore) - parseNumber(b.results.qualityScore);
            default:
                return 0;
        }
    });
    
    currentSort = sortBy;
}

// Parse number from formatted string
function parseNumber(str) {
    if (!str) return 0;
    return parseFloat(str.toString().replace(/[$,]/g, '')) || 0;
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
                <input type="checkbox" class="checkbox deal-checkbox" data-deal="${deal.name}" ${selectedDeals.has(deal.name) ? 'checked' : ''}>
            </td>
            <td>
                <div class="deal-name">
                    <div>${deal.name}</div>
                    <div class="deal-url" title="${deal.url}">${deal.url}</div>
                </div>
            </td>
            <td class="deal-date">${new Date(deal.savedAt).toLocaleDateString()}</td>
            <td>
                <select class="status-select" data-deal="${deal.name}">
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
            <td class="metric ${cocReturn.includes('-') ? 'negative' : 'positive'}">${cocReturn}</td>
            <td>
                <div class="actions">
                    <button class="action-btn" onclick="openDeal('${deal.name}')">👁️ View</button>
                    <button class="action-btn" onclick="exportDeal('${deal.name}')">📤 Export</button>
                    <button class="action-btn" onclick="deleteDeal('${deal.name}')">🗑️</button>
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
    chrome.storage.local.set({ savedDeals: allDeals }, () => {
        console.log('Deal status updated:', dealName, newStatus);
        updateStats();
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
    
    chrome.storage.local.set({ savedDeals: allDeals }, () => {
        console.log('Deal deleted:', dealName);
        loadDeals();
    });
}

// Bulk delete
function bulkDelete() {
    if (selectedDeals.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedDeals.size} deal(s)?`)) {
        return;
    }
    
    allDeals = allDeals.filter(d => !selectedDeals.has(d.name));
    
    chrome.storage.local.set({ savedDeals: allDeals }, () => {
        console.log('Bulk delete completed');
        selectedDeals.clear();
        loadDeals();
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
        alert('No deals to export');
        return;
    }
    
    exportDealsToCSV(filteredDeals);
}

// Export deals to CSV
function exportDealsToCSV(deals) {
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
        'Notes'
    ];
    
    const rows = deals.map(deal => [
        deal.name,
        deal.status || 'none',
        new Date(deal.savedAt).toLocaleDateString(),
        deal.url,
        deal.inputs.asking || '',
        deal.inputs.ebitda || '',
        deal.results.qualityScore || '',
        deal.results.cocReturn || '',
        deal.results.payback || '',
        deal.results.maxPrice || '',
        deal.results.totalDebt || '',
        deal.results.fcfAnnual || '',
        deal.results.ownerTakeHome || '',
        (deal.notes || '').replace(/"/g, '""') // Escape quotes
    ]);
    
    // Create CSV content
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deals-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Exported', deals.length, 'deals');
}

// Event Listeners
document.getElementById('search').addEventListener('input', () => {
    applyFiltersAndSort();
    renderDeals();
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
document.getElementById('refresh-btn').addEventListener('click', loadDeals);

// Initialize
loadDeals();

