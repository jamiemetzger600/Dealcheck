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

// ===== TAB NAVIGATION & JOURNEY INDICATOR =====
let currentJourneyStage = 'data'; // data, information, knowledge, insight, wisdom
let currentTab = 'aggregator'; // aggregator, my-deals

// Update journey indicator
function updateJourneyStage(stage) {
    console.log('🎯 Updating journey stage to:', stage);
    currentJourneyStage = stage;
    
    const stages = document.querySelectorAll('.journey-stage');
    stages.forEach(stageEl => {
        const stageData = stageEl.getAttribute('data-stage');
        stageEl.classList.remove('active', 'completed');
        
        if (stageData === stage) {
            stageEl.classList.add('active');
        } else {
            // Mark previous stages as completed
            const stageOrder = ['data', 'information', 'knowledge', 'insight', 'wisdom'];
            const currentIndex = stageOrder.indexOf(stage);
            const stageIndex = stageOrder.indexOf(stageData);
            if (stageIndex < currentIndex) {
                stageEl.classList.add('completed');
            }
        }
    });
}

// Switch between tabs
function switchTab(tabName) {
    console.log('📑 Switching to tab:', tabName);
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('✅ Tab switched to:', tabName);
    } else {
        console.error('❌ Tab not found:', `tab-${tabName}`);
    }
    
    // Update journey stage based on tab
    if (tabName === 'aggregator') {
        updateJourneyStage('data');
    } else if (tabName === 'my-deals') {
        updateJourneyStage('wisdom');
        // Load My Deals data when switching to My Deals tab
        loadMyDeals();
    }
}

// Initialize tabs on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Deal Aggregator v2.1.4');
    
    // Add global test functions for debugging
    window.testSourceModal = function() {
        console.log('🧪 Testing source modal...');
        const modal = document.getElementById('source-management-modal');
        if (modal) {
            console.log('✅ Modal found');
            console.log('   Current styles:', {
                display: modal.style.display,
                visibility: modal.style.visibility,
                zIndex: modal.style.zIndex,
                computed: window.getComputedStyle(modal).display
            });
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.zIndex = '99999';
            console.log('   After setting:', {
                display: modal.style.display,
                visibility: modal.style.visibility,
                zIndex: modal.style.zIndex
            });
        } else {
            console.error('❌ Modal not found');
        }
    };
    
    window.testManualModal = function() {
        console.log('🧪 Testing manual deal modal...');
        const modal = document.getElementById('manual-deal-modal');
        if (modal) {
            console.log('✅ Modal found');
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.zIndex = '99999';
        } else {
            console.error('❌ Modal not found');
        }
    };
    
    console.log('🧪 Test functions available: window.testSourceModal() and window.testManualModal()');
    
    // Verify required functions are available
    console.log('📦 Checking dependencies...');
    console.log('  fetchAllRSSFeeds:', typeof fetchAllRSSFeeds !== 'undefined' ? '✅' : '❌');
    console.log('  addDealsToPool:', typeof addDealsToPool !== 'undefined' ? '✅' : '❌');
    console.log('  loadAggregatedDeals:', typeof loadAggregatedDeals !== 'undefined' ? '✅' : '❌');
    console.log('  getCustomSources:', typeof getCustomSources !== 'undefined' ? '✅' : '❌');
    console.log('  addCustomSource:', typeof addCustomSource !== 'undefined' ? '✅' : '❌');
    console.log('  fetchAllCustomSources:', typeof fetchAllCustomSources !== 'undefined' ? '✅' : '❌');
    console.log('  openSourceManagementModal:', typeof openSourceManagementModal !== 'undefined' ? '✅' : '❌');
    console.log('  openManualDealModal:', typeof openManualDealModal !== 'undefined' ? '✅' : '❌');
    
    // ====== GLOBAL ACTION BUTTONS (Header) ======
    // These buttons are always visible and accessible regardless of tab
    
    // Fetch Deals button
    const fetchDealsBtn = document.getElementById('fetch-deals-btn');
    if (fetchDealsBtn) {
        console.log('✅ Setting up Fetch Deals button');
        fetchDealsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔄 Fetch Deals button clicked');
            startAggregation(fetchDealsBtn);
        });
    }
    
    // Manage Sources button
    const manageSourcesBtn = document.getElementById('manage-sources-btn');
    if (manageSourcesBtn) {
        console.log('✅ Setting up Manage Sources button');
        manageSourcesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📥 Manage Sources button clicked');
            if (typeof openSourceManagementModal === 'function') {
                openSourceManagementModal();
            } else {
                alert('Source management coming soon!');
            }
        });
    }
    
    // Add Deal button
    const addDealBtn = document.getElementById('add-deal-btn');
    if (addDealBtn) {
        console.log('✅ Setting up Add Deal button');
        addDealBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('➕ Add Deal button clicked');
            if (typeof openManualDealModal === 'function') {
                openManualDealModal();
            } else {
                alert('Add deal coming soon!');
            }
        });
    }
    
    // Configure Buy Box button
    const configureBuyBoxBtn = document.getElementById('configure-buybox-btn');
    if (configureBuyBoxBtn) {
        console.log('✅ Setting up Configure Buy Box button');
        configureBuyBoxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('⚙️ Configure Buy Box button clicked');
            alert('Buy Box configuration coming in Phase 3!');
        });
    }
    
    console.log('✅ Global action buttons initialized');
    
    // Set up tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Set up journey stage clickability (for navigation hints)
    document.querySelectorAll('.journey-stage').forEach(stage => {
        stage.addEventListener('click', () => {
            const stageName = stage.getAttribute('data-stage');
            console.log('Journey stage clicked:', stageName);
            // Future: Navigate to appropriate view based on stage
        });
    });
    
    // Start aggregation button function (make it accessible globally)
    window.startAggregation = async function(btn) {
        showToast('Starting deal aggregation...', 'info');
        btn.disabled = true;
        btn.classList.add('loading');
        
        try {
            const allDeals = [];
            let rssCount = 0;
            let customCount = 0;
            
            // Fetch RSS feeds
            try {
                const rssResults = await fetchAllRSSFeeds();
                const rssDeals = rssResults.flatMap(r => r.deals);
                allDeals.push(...rssDeals);
                rssCount = rssDeals.length;
                console.log(`📡 Fetched ${rssCount} deals from RSS feeds`);
            } catch (error) {
                console.error('Error fetching RSS feeds:', error);
                showToast('⚠️ Some RSS feeds failed: ' + error.message, 'warning');
            }
            
            // Fetch custom sources (Google Sheets, CSV, etc.)
            try {
                if (typeof fetchAllCustomSources !== 'undefined') {
                    const customResults = await fetchAllCustomSources();
                    const customDeals = customResults.flatMap(r => r.deals);
                    allDeals.push(...customDeals);
                    customCount = customDeals.length;
                    console.log(`📥 Fetched ${customCount} deals from custom sources`);
                }
            } catch (error) {
                console.error('Error fetching custom sources:', error);
                showToast('⚠️ Some custom sources failed: ' + error.message, 'warning');
            }
            
            // Add all deals to storage
            if (allDeals.length > 0) {
                const stats = await addDealsToPool(allDeals);
                const summary = `✅ Added ${stats.added} new deals (${stats.duplicates} duplicates)`;
                const breakdown = `RSS: ${rssCount} | Custom: ${customCount}`;
                showToast(`${summary}\n${breakdown}`, 'success', 5000);
            } else {
                showToast('ℹ️ No deals found. Add sources in "Manage Sources"', 'info', 5000);
            }
            
            // Update UI
            await loadAggregatorDeals();
            
        } catch (error) {
            console.error('Error aggregating deals:', error);
            showToast('❌ Error aggregating deals: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    };
    
    // Start aggregation button (bottom - in empty state)
    const startBtn = document.getElementById('start-aggregation');
    if (startBtn) {
        startBtn.addEventListener('click', () => startAggregation(startBtn));
    }
    
    // Load aggregated deals on tab switch
    loadAggregatorDeals();
    
    // Set up aggregator table sorting
    document.querySelectorAll('.aggregator-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortField = th.getAttribute('data-sort');
            
            // Toggle direction if same field, otherwise default to desc
            if (currentAggregatorSort.field === sortField) {
                currentAggregatorSort.direction = currentAggregatorSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentAggregatorSort.field = sortField;
                currentAggregatorSort.direction = 'desc';
            }
            
            // Update UI
            document.querySelectorAll('.aggregator-table th').forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });
            th.classList.add(`sorted-${currentAggregatorSort.direction}`);
            
            // Re-render
            renderAggregatorTable();
        });
    });
    
    // Set up aggregator search
    const searchInput = document.getElementById('aggregator-search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchAggregatorDeals(e.target.value);
            }, 300);
        });
    }
    
    // Set up pagination buttons
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderAggregatorTable();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredAggregatedDeals.length / DEALS_PER_PAGE);
            if (currentPage < totalPages) {
                currentPage++;
                renderAggregatorTable();
            }
        });
    }
    
    // ====== MY DEALS TAB EVENT LISTENERS ======
    
    // Search
    const myDealsSearch = document.getElementById('search');
    if (myDealsSearch) {
        let searchTimeout;
        myDealsSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchMyDeals(e.target.value);
            }, 300);
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filterMyDealsByStatus(e.target.value);
        });
    }
    
    // Sort
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const [field, direction] = e.target.value.split('-');
            currentMyDealsSort = { field, direction };
            renderMyDealsTable();
        });
    }
    
    // Export all button
    const exportAllBtn = document.getElementById('export-btn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => {
            exportDealsToCSV(filteredMyDeals);
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadMyDeals();
        });
    }
    
    // Bulk export button
    const bulkExportBtn = document.getElementById('bulk-export');
    if (bulkExportBtn) {
        bulkExportBtn.addEventListener('click', bulkExportDeals);
    }
    
    // Bulk delete button
    const bulkDeleteBtn = document.getElementById('bulk-delete');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', bulkDeleteDeals);
    }
    
    // Bulk deselect button
    const bulkDeselectBtn = document.getElementById('bulk-deselect');
    if (bulkDeselectBtn) {
        bulkDeselectBtn.addEventListener('click', () => {
            selectedMyDeals.clear();
            document.querySelectorAll('.deal-checkbox').forEach(cb => cb.checked = false);
            updateBulkActionsBar();
        });
    }
    
    console.log('✅ My Deals event listeners initialized');
    
    // Initialize with Deal Aggregator tab
    switchTab('aggregator');
    
    // Verify global buttons are set up (for debugging)
    setTimeout(() => {
        console.log('🔍 Verifying global button setup...');
        const buttons = {
            'fetch-deals-btn': 'Fetch Deals',
            'manage-sources-btn': 'Manage Sources',
            'add-deal-btn': 'Add Deal',
            'configure-buybox-btn': 'Configure Buy Box'
        };
        
        let allFound = true;
        for (const [id, name] of Object.entries(buttons)) {
            const btn = document.getElementById(id);
            if (btn) {
                console.log(`  ✅ ${name} button found (${id})`);
            } else {
                console.error(`  ❌ ${name} button NOT found (${id})`);
                allFound = false;
            }
        }
        
        if (allFound) {
            console.log('✅ All global action buttons found and handlers attached');
        } else {
            console.error('❌ Some buttons are missing!');
        }
    }, 100);
});

// Load and display aggregated deals
let aggregatedDeals = [];
let filteredAggregatedDeals = [];
let currentPage = 1;
const DEALS_PER_PAGE = 50;
let currentAggregatorSort = { field: 'date', direction: 'desc' };

async function loadAggregatorDeals() {
    try {
        const deals = await loadAggregatedDeals();
        console.log(`📊 Loaded ${deals.length} aggregated deals`);
        
        aggregatedDeals = deals;
        filteredAggregatedDeals = deals;
        
        // Update stats
        document.getElementById('total-aggregated').textContent = deals.length;
        document.getElementById('aggregator-count').textContent = deals.length;
        
        // Calculate today's new deals
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const newToday = deals.filter(d => d.discoveredAt > oneDayAgo).length;
        document.getElementById('new-today').textContent = newToday;
        
        // Update sources count
        const sources = new Set(deals.map(d => d.source));
        document.getElementById('sources-active').textContent = sources.size;
        
        // TODO: Calculate buy box matches (when buy box implemented)
        document.getElementById('matches-buybox').textContent = '0';
        
        // If we have deals, show table and hide empty state
        const emptyState = document.getElementById('aggregator-empty');
        const tableContainer = document.getElementById('aggregator-table-container');
        
        if (deals.length > 0) {
            if (emptyState) emptyState.style.display = 'none';
            if (tableContainer) tableContainer.classList.add('active');
            renderAggregatorTable();
        } else {
            if (emptyState) emptyState.style.display = 'block';
            if (tableContainer) tableContainer.classList.remove('active');
        }
        
    } catch (error) {
        console.error('Error loading aggregated deals:', error);
        showToast('Error loading deals: ' + error.message, 'error');
    }
}

// Render aggregator table
function renderAggregatorTable() {
    const tbody = document.getElementById('aggregator-tbody');
    if (!tbody) return;
    
    // Sort deals
    const sortedDeals = sortAggregatorDeals(filteredAggregatedDeals, currentAggregatorSort);
    
    // Paginate
    const startIdx = (currentPage - 1) * DEALS_PER_PAGE;
    const endIdx = startIdx + DEALS_PER_PAGE;
    const pageDeals = sortedDeals.slice(startIdx, endIdx);
    
    // Clear table
    tbody.innerHTML = '';
    
    // Render rows
    pageDeals.forEach(deal => {
        const row = createAggregatorDealRow(deal);
        tbody.appendChild(row);
    });
    
    // Update pagination
    updateAggregatorPagination(sortedDeals.length);
}

// Create table row for a deal
function createAggregatorDealRow(deal) {
    const row = document.createElement('tr');
    row.dataset.dealId = deal.id;
    
    // Name
    const nameCell = document.createElement('td');
    nameCell.innerHTML = `
        <div class="aggregator-deal-name">${escapeHtml(deal.name || 'Unnamed Deal')}</div>
        <div class="aggregator-deal-source">${escapeHtml(deal.source || 'Unknown')}</div>
    `;
    row.appendChild(nameCell);
    
    // Asking Price
    const priceCell = document.createElement('td');
    priceCell.innerHTML = `<span class="aggregator-price">${formatPrice(deal.askingPrice)}</span>`;
    row.appendChild(priceCell);
    
    // EBITDA
    const ebitdaCell = document.createElement('td');
    ebitdaCell.innerHTML = `<span class="aggregator-price positive">${formatPrice(deal.ebitda)}</span>`;
    row.appendChild(ebitdaCell);
    
    // Location
    const locationCell = document.createElement('td');
    locationCell.textContent = deal.location || deal.city || '-';
    row.appendChild(locationCell);
    
    // Industry
    const industryCell = document.createElement('td');
    industryCell.innerHTML = deal.industry ? 
        `<span class="aggregator-industry-tag">${escapeHtml(deal.industry)}</span>` : 
        '-';
    row.appendChild(industryCell);
    
    // Source
    const sourceCell = document.createElement('td');
    sourceCell.textContent = deal.sourceType || 'RSS';
    row.appendChild(sourceCell);
    
    // Date
    const dateCell = document.createElement('td');
    dateCell.textContent = formatRelativeTime(deal.discoveredAt);
    row.appendChild(dateCell);
    
    // Actions
    const actionsCell = document.createElement('td');
    actionsCell.innerHTML = `
        <div class="aggregator-actions">
            <button class="aggregator-action-btn save" title="Save Deal">💾</button>
            <button class="aggregator-action-btn" title="View Details">👁️</button>
        </div>
    `;
    row.appendChild(actionsCell);
    
    // Click handlers
    const saveBtn = actionsCell.querySelector('.save');
    const viewBtn = actionsCell.querySelector('.aggregator-action-btn:not(.save)');
    
    saveBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        saveDealFromAggregator(deal);
    });
    
    viewBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        viewDealDetails(deal);
    });
    
    // Row click to view details
    row.addEventListener('click', () => {
        viewDealDetails(deal);
    });
    
    return row;
}

// Sort aggregator deals
function sortAggregatorDeals(deals, sortConfig) {
    const sorted = [...deals];
    
    sorted.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortConfig.field) {
            case 'name':
                aVal = (a.name || '').toLowerCase();
                bVal = (b.name || '').toLowerCase();
                break;
            case 'price':
                aVal = a.askingPrice || 0;
                bVal = b.askingPrice || 0;
                break;
            case 'ebitda':
                aVal = a.ebitda || 0;
                bVal = b.ebitda || 0;
                break;
            case 'location':
                aVal = (a.location || a.city || '').toLowerCase();
                bVal = (b.location || b.city || '').toLowerCase();
                break;
            case 'industry':
                aVal = (a.industry || '').toLowerCase();
                bVal = (b.industry || '').toLowerCase();
                break;
            case 'source':
                aVal = (a.source || '').toLowerCase();
                bVal = (b.source || '').toLowerCase();
                break;
            case 'date':
                aVal = a.discoveredAt || 0;
                bVal = b.discoveredAt || 0;
                break;
            default:
                return 0;
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
}

// Update pagination controls
function updateAggregatorPagination(totalDeals) {
    const totalPages = Math.ceil(totalDeals / DEALS_PER_PAGE);
    const startIdx = (currentPage - 1) * DEALS_PER_PAGE + 1;
    const endIdx = Math.min(currentPage * DEALS_PER_PAGE, totalDeals);
    
    // Update info text
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
        infoEl.textContent = `Showing ${startIdx}-${endIdx} of ${totalDeals} deals`;
    }
    
    // Update buttons
    const prevBtn = document.getElementById('page-prev');
    const nextBtn = document.getElementById('page-next');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // TODO: Update page number buttons dynamically
}

// Search aggregator deals
function searchAggregatorDeals(query) {
    if (!query.trim()) {
        filteredAggregatedDeals = aggregatedDeals;
    } else {
        const lowerQuery = query.toLowerCase();
        filteredAggregatedDeals = aggregatedDeals.filter(deal => {
            return (
                (deal.name || '').toLowerCase().includes(lowerQuery) ||
                (deal.description || '').toLowerCase().includes(lowerQuery) ||
                (deal.location || '').toLowerCase().includes(lowerQuery) ||
                (deal.city || '').toLowerCase().includes(lowerQuery) ||
                (deal.state || '').toLowerCase().includes(lowerQuery) ||
                (deal.industry || '').toLowerCase().includes(lowerQuery)
            );
        });
    }
    
    currentPage = 1;
    renderAggregatorTable();
}

// Save deal from aggregator to My Deals
async function saveDealFromAggregator(deal) {
    try {
        showToast('Saving deal...', 'info');
        
        // Convert aggregator deal to saved deal format
        const savedDeal = convertAggregatorDealToSaved(deal);
        
        // Load existing saved deals
        const existingDeals = await new Promise((resolve) => {
            chrome.storage.local.get(['savedDeals'], (result) => {
                resolve(result.savedDeals || []);
            });
        });
        
        // Check for duplicates
        const exists = existingDeals.some(d => d.url === deal.url);
        if (exists) {
            showToast('Deal already saved!', 'warning');
            return;
        }
        
        // Add new deal
        existingDeals.unshift(savedDeal);
        
        // Save
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ savedDeals: existingDeals }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        
        showToast('✅ Deal saved to My Deals!', 'success');
        
        // Update My Deals count
        document.getElementById('my-deals-count').textContent = existingDeals.length;
        
    } catch (error) {
        console.error('Error saving deal:', error);
        showToast('Error saving deal: ' + error.message, 'error');
    }
}

// Convert aggregator deal to saved deal format
function convertAggregatorDealToSaved(deal) {
    return {
        name: deal.name || 'Unnamed Deal',
        url: deal.url || '',
        savedAt: Date.now(),
        status: 'none',
        inputs: {
            businessName: deal.name || '',
            askingPrice: deal.askingPrice || 0,
            ebitdaSDE: deal.ebitda || 0,
            targetOwnerSalary: 0,
            targetDSCR: 1.25
        },
        results: {
            maxPrice: 0,
            debtPayment: 0,
            cashFlowAnnual: 0,
            ownerTakeHome: 0,
            cocReturn: 0,
            paybackPeriod: 0
        },
        location: deal.location || deal.city || '',
        industry: deal.industry || '',
        source: deal.source || 'Deal Aggregator',
        notes: ''
    };
}

// ====== MY DEALS TAB FUNCTIONALITY ======

// Variables for My Deals tab
let myDeals = [];
let filteredMyDeals = [];
let selectedMyDeals = new Set();
let currentMyDealsSort = { field: 'date', direction: 'desc' };

// Load My Deals from storage
async function loadMyDeals() {
    console.log('💼 Loading My Deals...');
    
    try {
        const result = await new Promise((resolve) => {
            chrome.storage.local.get(['savedDeals'], (result) => {
                resolve(result.savedDeals || []);
            });
        });
        
        myDeals = result;
        filteredMyDeals = [...myDeals];
        
        console.log(`✅ Loaded ${myDeals.length} deals`);
        
        // Update UI
        updateMyDealsStats();
        renderMyDealsTable();
        
    } catch (error) {
        console.error('Error loading My Deals:', error);
        showToast('Error loading deals: ' + error.message, 'error');
    }
}

// Update stats cards
function updateMyDealsStats() {
    const stats = {
        total: myDeals.length,
        hot: myDeals.filter(d => d.status === 'hot').length,
        warm: myDeals.filter(d => d.status === 'warm').length,
        cold: myDeals.filter(d => d.status === 'cold').length
    };
    
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-hot').textContent = stats.hot;
    document.getElementById('stat-warm').textContent = stats.warm;
    document.getElementById('stat-cold').textContent = stats.cold;
    document.getElementById('my-deals-count').textContent = stats.total;
}

// Render My Deals table
function renderMyDealsTable() {
    const tbody = document.getElementById('deals-tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Apply sort
    sortMyDeals();
    
    // Check if we have deals
    if (filteredMyDeals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                    ${myDeals.length === 0 
                        ? '📭 No deals saved yet. Save deals from the Deal Aggregator!' 
                        : '🔍 No deals match your filters'}
                </td>
            </tr>
        `;
        return;
    }
    
    // Render each deal
    filteredMyDeals.forEach(deal => {
        const row = createMyDealRow(deal);
        tbody.appendChild(row);
    });
    
    console.log(`✅ Rendered ${filteredMyDeals.length} deals`);
}

// Create a table row for a deal
function createMyDealRow(deal) {
    const row = document.createElement('tr');
    
    // Checkbox
    const checkboxCell = document.createElement('td');
    checkboxCell.innerHTML = `<input type="checkbox" class="deal-checkbox" data-deal-id="${deal.savedAt}">`;
    if (selectedMyDeals.has(deal.savedAt)) {
        checkboxCell.querySelector('input').checked = true;
    }
    row.appendChild(checkboxCell);
    
    // Status
    const statusCell = document.createElement('td');
    statusCell.innerHTML = getStatusBadge(deal.status);
    row.appendChild(statusCell);
    
    // Deal Name
    const nameCell = document.createElement('td');
    nameCell.innerHTML = `<strong>${escapeHtml(deal.name || 'Unnamed Deal')}</strong>`;
    nameCell.style.cursor = 'pointer';
    nameCell.title = 'Click to view details';
    row.appendChild(nameCell);
    
    // Date
    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(deal.savedAt);
    row.appendChild(dateCell);
    
    // Asking Price
    const priceCell = document.createElement('td');
    priceCell.textContent = formatCurrency(deal.inputs?.askingPrice || 0);
    row.appendChild(priceCell);
    
    // EBITDA
    const ebitdaCell = document.createElement('td');
    ebitdaCell.textContent = formatCurrency(deal.inputs?.ebitdaSDE || 0);
    row.appendChild(ebitdaCell);
    
    // Quality Score (if available)
    const scoreCell = document.createElement('td');
    if (deal.qualityScore !== undefined) {
        scoreCell.innerHTML = `<span class="score-badge score-${getScoreClass(deal.qualityScore)}">${deal.qualityScore}</span>`;
    } else {
        scoreCell.textContent = '-';
    }
    row.appendChild(scoreCell);
    
    // COC Return
    const cocCell = document.createElement('td');
    const coc = deal.results?.cocReturn || 0;
    cocCell.textContent = coc > 0 ? `${coc.toFixed(1)}%` : '-';
    if (coc < 0) {
        cocCell.style.color = '#ff4444';
    }
    row.appendChild(cocCell);
    
    // Actions
    const actionsCell = document.createElement('td');
    actionsCell.innerHTML = `
        <div class="actions">
            <button class="action-btn" title="View Details">👁️</button>
            <button class="action-btn" title="Export">📤</button>
            <button class="action-btn danger" title="Delete">🗑️</button>
        </div>
    `;
    row.appendChild(actionsCell);
    
    // Event listeners
    const checkbox = checkboxCell.querySelector('input');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleDealSelection(deal.savedAt, checkbox.checked);
    });
    
    nameCell.addEventListener('click', () => openDealModal(deal));
    
    const [viewBtn, exportBtn, deleteBtn] = actionsCell.querySelectorAll('.action-btn');
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDealModal(deal);
    });
    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportSingleDeal(deal);
    });
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSingleDeal(deal);
    });
    
    return row;
}

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        hot: '<span class="status-badge hot">🔥 Hot</span>',
        warm: '<span class="status-badge warm">🌡️ Warm</span>',
        cold: '<span class="status-badge cold">❄️ Cold</span>',
        pass: '<span class="status-badge pass">❌ Pass</span>',
        none: '<span class="status-badge none">-</span>'
    };
    return badges[status] || badges.none;
}

// Get score class for coloring
function getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'weak';
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Format currency
function formatCurrency(value) {
    if (!value || value === 0) return '$0';
    if (value >= 1000000) {
        return '$' + (value / 1000000).toFixed(2) + 'M';
    }
    if (value >= 1000) {
        return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toLocaleString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sort My Deals
function sortMyDeals() {
    const { field, direction } = currentMyDealsSort;
    
    filteredMyDeals.sort((a, b) => {
        let valA, valB;
        
        switch (field) {
            case 'date':
                valA = a.savedAt || 0;
                valB = b.savedAt || 0;
                break;
            case 'name':
                valA = (a.name || '').toLowerCase();
                valB = (b.name || '').toLowerCase();
                break;
            case 'price':
                valA = a.inputs?.askingPrice || 0;
                valB = b.inputs?.askingPrice || 0;
                break;
            case 'ebitda':
                valA = a.inputs?.ebitdaSDE || 0;
                valB = b.inputs?.ebitdaSDE || 0;
                break;
            case 'score':
                valA = a.qualityScore || 0;
                valB = b.qualityScore || 0;
                break;
            case 'coc':
                valA = a.results?.cocReturn || 0;
                valB = b.results?.cocReturn || 0;
                break;
            default:
                return 0;
        }
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Search My Deals
function searchMyDeals(query) {
    const lowerQuery = query.toLowerCase();
    
    if (!query.trim()) {
        filteredMyDeals = [...myDeals];
    } else {
        filteredMyDeals = myDeals.filter(deal => {
            return (
                (deal.name || '').toLowerCase().includes(lowerQuery) ||
                (deal.url || '').toLowerCase().includes(lowerQuery) ||
                (deal.notes || '').toLowerCase().includes(lowerQuery) ||
                (deal.location || '').toLowerCase().includes(lowerQuery) ||
                (deal.industry || '').toLowerCase().includes(lowerQuery)
            );
        });
    }
    
    renderMyDealsTable();
}

// Filter My Deals by status
function filterMyDealsByStatus(status) {
    if (!status) {
        filteredMyDeals = [...myDeals];
    } else {
        filteredMyDeals = myDeals.filter(deal => deal.status === status);
    }
    
    renderMyDealsTable();
}

// Toggle deal selection
function toggleDealSelection(dealId, selected) {
    if (selected) {
        selectedMyDeals.add(dealId);
    } else {
        selectedMyDeals.delete(dealId);
    }
    
    updateBulkActionsBar();
}

// Update bulk actions bar
function updateBulkActionsBar() {
    const bulkActions = document.getElementById('bulk-actions');
    const bulkText = document.getElementById('bulk-text');
    
    if (selectedMyDeals.size > 0) {
        bulkActions.style.display = 'flex';
        bulkText.textContent = `${selectedMyDeals.size} deal${selectedMyDeals.size > 1 ? 's' : ''} selected`;
    } else {
        bulkActions.style.display = 'none';
    }
}

// Delete single deal
async function deleteSingleDeal(deal) {
    if (!confirm(`Delete "${deal.name}"?`)) return;
    
    try {
        myDeals = myDeals.filter(d => d.savedAt !== deal.savedAt);
        
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ savedDeals: myDeals }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        
        showToast('Deal deleted', 'success');
        await loadMyDeals();
        
    } catch (error) {
        console.error('Error deleting deal:', error);
        showToast('Error deleting deal', 'error');
    }
}

// Export single deal
function exportSingleDeal(deal) {
    exportDealsToCSV([deal]);
}

// Bulk delete deals
async function bulkDeleteDeals() {
    if (selectedMyDeals.size === 0) return;
    
    if (!confirm(`Delete ${selectedMyDeals.size} selected deals?`)) return;
    
    try {
        myDeals = myDeals.filter(d => !selectedMyDeals.has(d.savedAt));
        
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ savedDeals: myDeals }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        
        showToast(`${selectedMyDeals.size} deals deleted`, 'success');
        selectedMyDeals.clear();
        await loadMyDeals();
        
    } catch (error) {
        console.error('Error deleting deals:', error);
        showToast('Error deleting deals', 'error');
    }
}

// Bulk export deals
function bulkExportDeals() {
    if (selectedMyDeals.size === 0) return;
    
    const dealsToExport = myDeals.filter(d => selectedMyDeals.has(d.savedAt));
    exportDealsToCSV(dealsToExport);
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
        deal.name || '',
        deal.status || '',
        formatDate(deal.savedAt),
        deal.url || '',
        deal.inputs?.askingPrice || 0,
        deal.inputs?.ebitdaSDE || 0,
        deal.qualityScore || '',
        deal.results?.cocReturn || '',
        deal.results?.paybackPeriod || '',
        deal.results?.maxPrice || '',
        deal.results?.totalDebt || '',
        deal.results?.cashFlowAnnual || '',
        deal.results?.ownerTakeHome || '',
        (deal.notes || '').replace(/"/g, '""')
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-deals-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${deals.length} deals to CSV`, 'success');
}

// Open deal modal (placeholder for now)
function openDealModal(deal) {
    showToast('Deal modal coming soon!', 'info');
    console.log('Opening deal:', deal);
}


// View deal details (placeholder - will open modal in future)
function viewDealDetails(deal) {
    console.log('View deal details:', deal);
    showToast('Deal details modal coming soon! Click 💾 to save deal.', 'info');
    // TODO: Open deal details modal with KNOWLEDGE stage
}

// ===== SOURCE MANAGEMENT MODAL =====
let selectedSourceType = null;

function openSourceManagementModal() {
    console.log('📥 openSourceManagementModal called');
    const modal = document.getElementById('source-management-modal');
    if (!modal) {
        console.error('❌ source-management-modal not found in DOM');
        alert('Source management modal not found. Please refresh the page.');
        return;
    }
    
    console.log('✅ Found modal element, setting display...');
    console.log('   Current display:', modal.style.display);
    console.log('   Current visibility:', window.getComputedStyle(modal).display);
    
    // Force show the modal with multiple approaches
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.zIndex = '10000';
    
    console.log('   New display:', modal.style.display);
    console.log('✅ Modal should now be visible');
    
    // Load sources list
    if (typeof loadCustomSourcesList === 'function') {
        console.log('📋 Loading custom sources list...');
        loadCustomSourcesList();
    } else {
        console.warn('⚠️ loadCustomSourcesList function not found');
    }
    
    // Reset form
    selectedSourceType = null;
    const formEl = document.getElementById('source-config-form');
    if (formEl) {
        formEl.style.display = 'none';
    }
    document.querySelectorAll('.source-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    console.log('✅ Source management modal fully initialized');
}

function closeSourceManagementModal() {
    const modal = document.getElementById('source-management-modal');
    if (modal) modal.style.display = 'none';
}

// Load and display custom sources
async function loadCustomSourcesList() {
    const listEl = document.getElementById('custom-sources-list');
    if (!listEl) return;
    
    try {
        const sources = await getCustomSources();
        
        if (sources.length === 0) {
            listEl.innerHTML = `
                <p style="text-align: center; color: var(--text-secondary); font-size: 12px; padding: 20px;">
                    No custom sources added yet. Select a source type below to get started.
                </p>
            `;
            return;
        }
        
        listEl.innerHTML = '';
        sources.forEach(source => {
            const sourceEl = createSourceListItem(source);
            listEl.appendChild(sourceEl);
        });
        
    } catch (error) {
        console.error('Error loading sources:', error);
        showToast('Error loading sources: ' + error.message, 'error');
    }
}

// Create source list item
function createSourceListItem(source) {
    const div = document.createElement('div');
    div.className = 'source-item' + (source.enabled ? '' : ' disabled');
    div.innerHTML = `
        <div class="source-item-info">
            <div class="source-item-name">${escapeHtml(source.name)}</div>
            <div class="source-item-meta">
                Type: ${source.type} | 
                Deals: ${source.dealCount || 0} | 
                ${source.lastFetch ? 'Last: ' + formatRelativeTime(source.lastFetch) : 'Never fetched'}
            </div>
        </div>
        <div class="source-item-actions">
            <button class="source-item-btn toggle-btn">${source.enabled ? '✓ Enabled' : 'Disabled'}</button>
            <button class="source-item-btn fetch-btn">🔄 Fetch</button>
            <button class="source-item-btn delete">🗑️</button>
        </div>
    `;
    
    // Event handlers
    const toggleBtn = div.querySelector('.toggle-btn');
    const fetchBtn = div.querySelector('.fetch-btn');
    const deleteBtn = div.querySelector('.delete');
    
    toggleBtn.addEventListener('click', async () => {
        await toggleCustomSource(source.id, !source.enabled);
        await loadCustomSourcesList();
        showToast(`Source ${source.enabled ? 'disabled' : 'enabled'}`, 'success');
    });
    
    fetchBtn.addEventListener('click', async () => {
        fetchBtn.disabled = true;
        fetchBtn.textContent = '⏳ Fetching...';
        try {
            const deals = await fetchCustomSource(source);
            const stats = await addDealsToPool(deals);
            await loadAggregatorDeals();
            await loadCustomSourcesList();
            showToast(`✅ Added ${stats.added} deals from ${source.name}`, 'success');
        } catch (error) {
            showToast(`Error fetching ${source.name}: ${error.message}`, 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = '🔄 Fetch';
        }
    });
    
    deleteBtn.addEventListener('click', async () => {
        if (confirm(`Delete source "${source.name}"? This will not remove already aggregated deals.`)) {
            await removeCustomSource(source.id);
            await loadCustomSourcesList();
            showToast('Source deleted', 'success');
        }
    });
    
    return div;
}

// Initialize source modal handlers
document.addEventListener('DOMContentLoaded', () => {
    // Source type cards
    document.querySelectorAll('.source-type-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedSourceType = card.getAttribute('data-type');
            
            // Update UI
            document.querySelectorAll('.source-type-card').forEach(c => {
                c.classList.remove('selected');
            });
            card.classList.add('selected');
            
            // Show form
            const formEl = document.getElementById('source-config-form');
            if (formEl) formEl.style.display = 'block';
            
            // Update hint
            const hint = document.getElementById('source-url-hint');
            if (hint) {
                if (selectedSourceType === 'google_sheets') {
                    hint.textContent = 'Enter Google Sheets URL (must be shared with "Anyone with link can view")';
                } else if (selectedSourceType === 'csv_url') {
                    hint.textContent = 'Enter direct URL to CSV file';
                }
            }
        });
    });
    
    // Add source button
    const addSourceBtn = document.getElementById('add-source-btn');
    if (addSourceBtn) {
        addSourceBtn.addEventListener('click', async () => {
            const name = document.getElementById('source-name').value.trim();
            const url = document.getElementById('source-url').value.trim();
            
            if (!name || !url || !selectedSourceType) {
                showToast('Please fill in all fields', 'warning');
                return;
            }
            
            try {
                addSourceBtn.disabled = true;
                addSourceBtn.classList.add('loading');
                
                const source = {
                    name: name,
                    type: selectedSourceType,
                    url: url
                };
                
                await addCustomSource(source);
                await loadCustomSourcesList();
                
                // Clear form
                document.getElementById('source-name').value = '';
                document.getElementById('source-url').value = '';
                const formEl = document.getElementById('source-config-form');
                if (formEl) formEl.style.display = 'none';
                document.querySelectorAll('.source-type-card').forEach(c => {
                    c.classList.remove('selected');
                });
                selectedSourceType = null;
                
                showToast('✅ Source added successfully!', 'success');
                
            } catch (error) {
                showToast('Error adding source: ' + error.message, 'error');
            } finally {
                addSourceBtn.disabled = false;
                addSourceBtn.classList.remove('loading');
            }
        });
    }
    
    // Cancel source button
    const cancelSourceBtn = document.getElementById('cancel-source-btn');
    if (cancelSourceBtn) {
        cancelSourceBtn.addEventListener('click', () => {
            const formEl = document.getElementById('source-config-form');
            if (formEl) formEl.style.display = 'none';
            document.getElementById('source-name').value = '';
            document.getElementById('source-url').value = '';
            document.querySelectorAll('.source-type-card').forEach(c => {
                c.classList.remove('selected');
            });
            selectedSourceType = null;
        });
    }
    
    // Close source modal
    const sourceModalClose = document.getElementById('source-modal-close');
    if (sourceModalClose) {
        sourceModalClose.addEventListener('click', closeSourceManagementModal);
    }
    
    // Click outside to close
    const sourceModal = document.getElementById('source-management-modal');
    if (sourceModal) {
        sourceModal.addEventListener('click', (e) => {
            if (e.target === sourceModal) {
                closeSourceManagementModal();
            }
        });
    }
});

// ===== MANUAL DEAL ENTRY MODAL =====
function openManualDealModal() {
    console.log('➕ openManualDealModal called');
    const modal = document.getElementById('manual-deal-modal');
    if (!modal) {
        console.error('❌ manual-deal-modal not found in DOM');
        alert('Manual deal modal not found. Please refresh the page.');
        return;
    }
    
    console.log('✅ Found modal element, setting display...');
    console.log('   Current display:', modal.style.display);
    
    // Force show the modal with multiple approaches
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.zIndex = '10000';
    
    console.log('   New display:', modal.style.display);
    console.log('✅ Modal should now be visible');
    
    // Clear form
    if (typeof clearManualDealForm === 'function') {
        console.log('📋 Clearing manual deal form...');
        clearManualDealForm();
    } else {
        console.warn('⚠️ clearManualDealForm function not found');
    }
    
    console.log('✅ Manual deal modal fully initialized');
}

function closeManualDealModal() {
    const modal = document.getElementById('manual-deal-modal');
    if (modal) modal.style.display = 'none';
}

function clearManualDealForm() {
    const fields = [
        'manual-business-name', 'manual-description', 'manual-city', 'manual-state',
        'manual-industry', 'manual-price', 'manual-revenue', 'manual-ebitda',
        'manual-cashflow', 'manual-contact-name', 'manual-contact-phone',
        'manual-contact-email', 'manual-source-notes', 'manual-notes'
    ];
    
    fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) el.value = '';
    });
}

// Save manual deal
async function saveManualDeal() {
    try {
        // Collect form data
        const businessName = document.getElementById('manual-business-name')?.value.trim();
        const description = document.getElementById('manual-description')?.value.trim();
        const city = document.getElementById('manual-city')?.value.trim();
        const state = document.getElementById('manual-state')?.value.trim().toUpperCase();
        const industry = document.getElementById('manual-industry')?.value;
        const price = parseFloat(document.getElementById('manual-price')?.value) || 0;
        const revenue = parseFloat(document.getElementById('manual-revenue')?.value) || 0;
        const ebitda = parseFloat(document.getElementById('manual-ebitda')?.value) || 0;
        const cashflow = parseFloat(document.getElementById('manual-cashflow')?.value) || 0;
        const contactName = document.getElementById('manual-contact-name')?.value.trim();
        const contactPhone = document.getElementById('manual-contact-phone')?.value.trim();
        const contactEmail = document.getElementById('manual-contact-email')?.value.trim();
        const sourceNotes = document.getElementById('manual-source-notes')?.value.trim();
        const notes = document.getElementById('manual-notes')?.value.trim();
        
        // Validate required fields
        if (!businessName) {
            showToast('Business name is required', 'warning');
            return;
        }
        
        // Create deal object
        const manualDeal = {
            id: 'manual_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: businessName,
            url: '', // No URL for off-market deals
            description: description,
            source: 'Manual Entry (Off-Market)',
            sourceType: 'manual',
            discoveredAt: Date.now(),
            askingPrice: price,
            revenue: revenue,
            ebitda: ebitda || cashflow,
            location: city && state ? `${city}, ${state}` : '',
            city: city,
            state: state,
            industry: industry,
            contactName: contactName,
            contactPhone: contactPhone,
            contactEmail: contactEmail,
            sourceNotes: sourceNotes,
            notes: notes,
            manualEntry: true
        };
        
        // Add to aggregated pool
        await addDealsToPool([manualDeal]);
        
        // Also save to My Deals immediately (off-market deals are typically high-value)
        const savedDealFormat = convertAggregatorDealToSaved(manualDeal);
        savedDealFormat.inputs.ebitdaSDE = manualDeal.ebitda;
        savedDealFormat.inputs.askingPrice = manualDeal.askingPrice;
        savedDealFormat.notes = notes;
        
        if (contactName || contactPhone || contactEmail) {
            savedDealFormat.broker = {
                name: contactName,
                phone: contactPhone,
                email: contactEmail,
                company: 'Direct Contact'
            };
        }
        
        const existingDeals = await new Promise((resolve) => {
            chrome.storage.local.get(['savedDeals'], (result) => {
                resolve(result.savedDeals || []);
            });
        });
        
        existingDeals.unshift(savedDealFormat);
        
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ savedDeals: existingDeals }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        
        // Update UI
        await loadAggregatorDeals();
        document.getElementById('my-deals-count').textContent = existingDeals.length;
        
        showToast('✅ Off-market deal added successfully!', 'success');
        closeManualDealModal();
        
    } catch (error) {
        console.error('Error saving manual deal:', error);
        showToast('Error saving deal: ' + error.message, 'error');
    }
}

// Initialize manual deal modal handlers
document.addEventListener('DOMContentLoaded', () => {
    // Save manual deal button
    const saveBtn = document.getElementById('manual-deal-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveManualDeal);
    }
    
    // Cancel manual deal button
    const cancelBtn = document.getElementById('manual-deal-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeManualDealModal);
    }
    
    // Close manual deal modal
    const manualDealClose = document.getElementById('manual-deal-close');
    if (manualDealClose) {
        manualDealClose.addEventListener('click', closeManualDealModal);
    }
    
    // Click outside to close
    const manualModal = document.getElementById('manual-deal-modal');
    if (manualModal) {
        manualModal.addEventListener('click', (e) => {
            if (e.target === manualModal) {
                closeManualDealModal();
            }
        });
    }
});

// Format relative time
function formatRelativeTime(timestamp) {
    if (!timestamp) return '-';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

// Format price
function formatPrice(price) {
    if (!price || price === 0) return '-';
    
    if (price >= 1000000) {
        return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
        return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toLocaleString()}`;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
    text += `Generated by Deal Analyzer Extension v2.1.2\n`;
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

