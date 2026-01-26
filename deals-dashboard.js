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
function initializeDashboard() {
    console.log('🚀 Initializing Deal Aggregator v2.2.0');
    
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
            console.log('📥 window.openSourceManagementModal type:', typeof window.openSourceManagementModal);
            if (window.openSourceManagementModal) {
                window.openSourceManagementModal();
            } else {
                console.error('❌ openSourceManagementModal not found on window');
                alert('Source management modal not available. Please refresh.');
            }
        });
    } else {
        console.error('❌ manage-sources-btn not found in DOM');
    }
    
    // Add Deal button
    const addDealBtn = document.getElementById('add-deal-btn');
    if (addDealBtn) {
        console.log('✅ Setting up Add Deal button');
        addDealBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('➕ Add Deal button clicked');
            console.log('➕ window.openManualDealModal type:', typeof window.openManualDealModal);
            if (window.openManualDealModal) {
                window.openManualDealModal();
            } else {
                console.error('❌ openManualDealModal not found on window');
                alert('Manual deal modal not available. Please refresh.');
            }
        });
    } else {
        console.error('❌ add-deal-btn not found in DOM');
    }
    
    // Configure Buy Box button
    const configureBuyBoxBtn = document.getElementById('configure-buybox-btn');
    if (configureBuyBoxBtn) {
        console.log('✅ Setting up Configure Buy Box button');
        configureBuyBoxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('⚙️ Configure Buy Box button clicked');
            console.log('⚙️ window.openBuyBoxModal type:', typeof window.openBuyBoxModal);
            if (window.openBuyBoxModal) {
                window.openBuyBoxModal();
            } else {
                console.error('❌ openBuyBoxModal not found on window');
                alert('Buy Box modal not available. Please refresh.');
            }
        });
    } else {
        console.error('❌ configure-buybox-btn not found in DOM');
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
    
    // Aggregator table: sort + drag-and-drop via delegation
    const aggTable = document.querySelector('.aggregator-table');
    if (aggTable) {
        aggTable.addEventListener('click', (e) => {
            if (window._aggJustDragged) { window._aggJustDragged = false; return; }
            const th = e.target.closest('th.sortable');
            if (!th) return;
            const sortField = th.getAttribute('data-sort');
            if (currentAggregatorSort.field === sortField) {
                currentAggregatorSort.direction = currentAggregatorSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentAggregatorSort.field = sortField;
                currentAggregatorSort.direction = 'desc';
            }
            renderAggregatorTable();
        });
        aggTable.addEventListener('dragstart', (e) => {
            const th = e.target.closest('th.sortable');
            if (!th) return;
            e.dataTransfer.setData('text/plain', th.dataset.columnKey || '');
            e.dataTransfer.effectAllowed = 'move';
            th.classList.add('dragging');
        });
        aggTable.addEventListener('dragend', (e) => {
            const th = e.target.closest('th.sortable');
            if (th) th.classList.remove('dragging');
            window._aggJustDragged = true;
        });
        aggTable.addEventListener('dragover', (e) => {
            const th = e.target.closest('th.sortable');
            if (th) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
        });
        aggTable.addEventListener('drop', async (e) => {
            const th = e.target.closest('th.sortable');
            if (!th) return;
            e.preventDefault();
            const fromKey = e.dataTransfer.getData('text/plain');
            const toKey = th.dataset.columnKey;
            if (!fromKey || !toKey || fromKey === toKey) return;
            const prefs = await getAggregatorColumnPrefs();
            const { builtin, raw } = getAggregatorColumnKeys(aggregatedDeals);
            const allKeys = [...builtin, ...raw];
            let order = prefs.order && prefs.order.length ? prefs.order : allKeys;
            order = [...new Set([...order, ...allKeys])];
            const fromIdx = order.indexOf(fromKey);
            const toIdx = order.indexOf(toKey);
            if (fromIdx === -1 || toIdx === -1) return;
            order.splice(fromIdx, 1);
            const newToIdx = order.indexOf(toKey);
            order.splice(newToIdx, 0, fromKey);
            await saveAggregatorColumnPrefs({ ...prefs, order });
            window._aggJustDragged = true;
            renderAggregatorTable();
        });
    }
    
    // Column menu: toggle visibility, reset order
    const colsBtn = document.getElementById('aggregator-columns-btn');
    const colsMenu = document.getElementById('aggregator-column-menu');
    const colsCheckboxes = document.getElementById('aggregator-column-checkboxes');
    const colsReset = document.getElementById('aggregator-column-reset');
    if (colsBtn && colsMenu) {
        colsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const shown = colsMenu.style.display !== 'none';
            colsMenu.style.display = shown ? 'none' : 'block';
            if (!shown) populateAggregatorColumnMenu();
        });
        document.addEventListener('click', (e) => {
            if (e.target.closest('#aggregator-columns-btn') || e.target.closest('#aggregator-column-menu')) return;
            if (colsMenu) colsMenu.style.display = 'none';
        });
        colsMenu?.addEventListener('click', (e) => e.stopPropagation());
    }
    async function populateAggregatorColumnMenu() {
        if (!colsCheckboxes) return;
        const prefs = await getAggregatorColumnPrefs();
        const { builtin, raw } = getAggregatorColumnKeys(aggregatedDeals);
        const allKeys = [...builtin, ...raw];
        const visibility = prefs.visibility || {};
        colsCheckboxes.innerHTML = '';
        allKeys.forEach(k => {
            const meta = AGG_BUILTIN.find(c => c.key === k);
            const label = meta ? meta.label : k;
            const id = 'col-' + k.replace(/\s+/g, '-');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = id;
            cb.checked = visibility[k] !== false;
            cb.dataset.columnKey = k;
            const lab = document.createElement('label');
            lab.htmlFor = id;
            lab.appendChild(cb);
            lab.appendChild(document.createTextNode(' ' + label));
            lab.style.display = 'flex';
            lab.style.alignItems = 'center';
            lab.style.gap = '8px';
            lab.style.cursor = 'pointer';
            lab.style.fontSize = '13px';
            colsCheckboxes.appendChild(lab);
            cb.addEventListener('change', async () => {
                const v = { ...(await getAggregatorColumnPrefs()).visibility, [k]: cb.checked };
                await saveAggregatorColumnPrefs({ ...await getAggregatorColumnPrefs(), visibility: v });
                renderAggregatorTable();
            });
        });
    }
    if (colsReset) {
        colsReset.addEventListener('click', async () => {
            const { builtin, raw } = getAggregatorColumnKeys(aggregatedDeals);
            const order = [...builtin, ...raw];
            const prefs = await getAggregatorColumnPrefs();
            await saveAggregatorColumnPrefs({ ...prefs, order });
            showToast('Column order reset', 'success');
            renderAggregatorTable();
            if (colsMenu) colsMenu.style.display = 'none';
        });
    }
    
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
    
    // Set up NOT filter tags UI
    setupNotFilterTagsUI();
    
    // Set up filter views UI
    setupFilterViewsUI();
    
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
}

// Run initialization - handle case where DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    // DOM already loaded, run immediately
    console.log('🚀 DOM already ready, initializing immediately...');
    initializeDashboard();
}

// Load and display aggregated deals
let aggregatedDeals = [];
let filteredAggregatedDeals = [];
let currentPage = 1;
const DEALS_PER_PAGE = 50;
let currentAggregatorSort = { field: 'date', direction: 'desc' };
let notFilterTags = []; // Tags to exclude deals (e.g., "FedEx", "Cannabis", "Pharmacy")
let filterViews = []; // Saved filter view configurations
let currentFilterViewId = null; // Currently active filter view
let filterViewModified = false; // Track if current view has been modified

// Built-in columns (key, label, sortKey). rawFields columns use header as key/label/sortKey.
const AGG_BUILTIN = [
    { key: 'name', label: 'NAME', sortKey: 'name' },
    { key: 'asking', label: 'ASKING', sortKey: 'price' },
    { key: 'ebitda', label: 'EBITDA', sortKey: 'ebitda' },
    { key: 'location', label: 'LOCATION', sortKey: 'location' },
    { key: 'industry', label: 'INDUSTRY', sortKey: 'industry' },
    { key: 'source', label: 'SOURCE', sortKey: 'source' },
    { key: 'discovered', label: 'DISCOVERED', sortKey: 'date' }
];
const AGG_RAW_EXCLUDE = new Set(['Name', 'Asking Price', 'Annual Profit', 'City', 'State', 'Industry', 'Description']);

function getAggregatorColumnKeys(deals) {
    const raw = new Set();
    (deals || []).forEach(d => {
        if (d.rawFields && typeof d.rawFields === 'object') {
            Object.keys(d.rawFields).forEach(k => {
                if (k && !AGG_RAW_EXCLUDE.has(k)) raw.add(k);
            });
        }
    });
    return { builtin: AGG_BUILTIN.map(c => c.key), raw: [...raw].sort() };
}

async function getAggregatorColumnPrefs() {
    const prefs = await new Promise(r => {
        chrome.storage.local.get(['userPreferences'], x => r(x.userPreferences || {}));
    });
    return prefs.aggregatorColumns || { order: [], visibility: {} };
}

async function saveAggregatorColumnPrefs(prefs) {
    const all = await new Promise(r => {
        chrome.storage.local.get(['userPreferences'], x => r(x.userPreferences || {}));
    });
    all.aggregatorColumns = prefs;
    await new Promise(r => chrome.storage.local.set({ userPreferences: all }, r));
}

function getVisibleOrderedColumns(deals, prefs) {
    const { builtin, raw } = getAggregatorColumnKeys(deals);
    const allKeys = [...builtin, ...raw];
    const order = prefs.order && prefs.order.length ? prefs.order : allKeys;
    const visibility = prefs.visibility || {};
    const merged = [...new Set([...order, ...allKeys])];
    return merged.filter(k => visibility[k] !== false);
}

// Apply all filters to deals (buy box, NOT filters, search)
function applyAllFilters() {
    console.log('🔍 Applying all filters...');
    let filtered = [...aggregatedDeals];
    
    // 1. Apply Buy Box filtering
    const hasBuyBoxCriteria = 
        currentBuyBox.minPrice || currentBuyBox.maxPrice ||
        currentBuyBox.minEbitda || currentBuyBox.maxEbitda ||
        currentBuyBox.minRevenue || currentBuyBox.revenueMultiple ||
        (currentBuyBox.targetStates && currentBuyBox.targetStates.length > 0) ||
        (currentBuyBox.excludeStates && currentBuyBox.excludeStates.length > 0) ||
        (currentBuyBox.targetIndustries && currentBuyBox.targetIndustries.length > 0) ||
        currentBuyBox.minQuality;
    
    if (hasBuyBoxCriteria) {
        console.log('📦 Applying buy box criteria');
        filtered = filtered.filter(deal => dealMatchesBuyBox(deal));
        console.log(`   ${filtered.length} deals match buy box`);
    }
    
    // 2. Apply NOT filters (exclude deals matching any tag)
    if (notFilterTags.length > 0) {
        console.log('🚫 Applying NOT filters:', notFilterTags);
        const beforeCount = filtered.length;
        filtered = filtered.filter(deal => !dealMatchesNotFilters(deal));
        console.log(`   Excluded ${beforeCount - filtered.length} deals`);
    }
    
    // 3. Apply search query
    const searchInput = document.getElementById('aggregator-search');
    const searchQuery = searchInput ? searchInput.value.trim() : '';
    if (searchQuery) {
        console.log('🔍 Applying search query:', searchQuery);
        const lowerQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(deal => {
            const base = (
                (deal.name || '').toLowerCase().includes(lowerQuery) ||
                (deal.description || '').toLowerCase().includes(lowerQuery) ||
                (deal.location || '').toLowerCase().includes(lowerQuery) ||
                (deal.city || '').toLowerCase().includes(lowerQuery) ||
                (deal.state || '').toLowerCase().includes(lowerQuery) ||
                (deal.industry || '').toLowerCase().includes(lowerQuery)
            );
            if (base) return true;
            if (deal.rawFields && typeof deal.rawFields === 'object') {
                return Object.values(deal.rawFields).some(v =>
                    String(v || '').toLowerCase().includes(lowerQuery)
                );
            }
            return false;
        });
    }
    
    console.log(`✅ Final filtered count: ${filtered.length} / ${aggregatedDeals.length}`);
    filteredAggregatedDeals = filtered;
    currentPage = 1;
    renderAggregatorTable();
}

// Check if deal matches any NOT filter tags
function dealMatchesNotFilters(deal) {
    if (notFilterTags.length === 0) return false;
    
    // Check all text fields in the deal
    const fieldsToCheck = [
        deal.name,
        deal.description,
        deal.industry,
        deal.location,
        deal.city,
        deal.state,
        deal.source
    ];
    
    // Also check raw fields
    if (deal.rawFields && typeof deal.rawFields === 'object') {
        fieldsToCheck.push(...Object.values(deal.rawFields));
    }
    
    // Convert all fields to lowercase for case-insensitive matching
    const textContent = fieldsToCheck
        .filter(f => f != null)
        .map(f => String(f).toLowerCase())
        .join(' ');
    
    // Check if any NOT filter tag matches
    return notFilterTags.some(tag => {
        const lowerTag = tag.toLowerCase();
        return textContent.includes(lowerTag);
    });
}

async function loadAggregatorDeals() {
    try {
        const deals = await loadAggregatedDeals();
        console.log(`📊 Loaded ${deals.length} aggregated deals`);
        
        aggregatedDeals = deals;
        
        // Load buy box configuration
        await loadBuyBoxFromStorage();
        
        // Load NOT filter tags
        await loadNotFilterTags();
        
        // Load filter views
        await loadFilterViews();
        
        // Render filter views dropdown after loading
        renderFilterViewsDropdown();
        updateFilterViewUI();
        
        // Apply all filters
        applyAllFilters();
        
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
        
        // Calculate buy box matches (from original deals, not filtered)
        const buyBoxMatches = deals.filter(d => dealMatchesBuyBox(d)).length;
        document.getElementById('matches-buybox').textContent = buyBoxMatches;
        
        // If we have deals, show table and hide empty state
        const emptyState = document.getElementById('aggregator-empty');
        const tableContainer = document.getElementById('aggregator-table-container');
        
        if (deals.length > 0) {
            if (emptyState) emptyState.style.display = 'none';
            if (tableContainer) tableContainer.classList.add('active');
        } else {
            if (emptyState) emptyState.style.display = 'block';
            if (tableContainer) tableContainer.classList.remove('active');
        }
        
    } catch (error) {
        console.error('Error loading aggregated deals:', error);
        showToast('Error loading deals: ' + error.message, 'error');
    }
}

// Load buy box from storage on page load
async function loadBuyBoxFromStorage() {
    try {
        const result = await new Promise((resolve) => {
            chrome.storage.local.get(['buyBoxConfig'], (result) => {
                resolve(result.buyBoxConfig || DEFAULT_BUYBOX);
            });
        });
        currentBuyBox = result;
        console.log('📦 Loaded buy box configuration:', currentBuyBox);
    } catch (error) {
        console.error('Error loading buy box:', error);
        currentBuyBox = { ...DEFAULT_BUYBOX };
    }
}

// Load NOT filter tags from storage
async function loadNotFilterTags() {
    try {
        const result = await new Promise((resolve) => {
            chrome.storage.local.get(['notFilterTags'], (result) => {
                resolve(result.notFilterTags || []);
            });
        });
        notFilterTags = result;
        console.log('🚫 Loaded NOT filter tags:', notFilterTags);
    } catch (error) {
        console.error('Error loading NOT filters:', error);
        notFilterTags = [];
    }
}

// Save NOT filter tags to storage
async function saveNotFilterTags() {
    try {
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ notFilterTags }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        console.log('💾 Saved NOT filter tags:', notFilterTags);
    } catch (error) {
        console.error('Error saving NOT filters:', error);
        throw error;
    }
}

// ===== NOT FILTER TAGS UI =====

// Setup NOT filter tags UI
function setupNotFilterTagsUI() {
    const addBtn = document.getElementById('not-filter-add-btn');
    if (!addBtn) return;
    
    addBtn.addEventListener('click', showNotFilterInput);
    renderNotFilterTags();
}

// Render NOT filter tags
function renderNotFilterTags() {
    const container = document.getElementById('not-filter-tags');
    if (!container) return;
    
    container.innerHTML = '';
    
    notFilterTags.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'not-filter-tag';
        tagEl.innerHTML = `
            <span>${escapeHtml(tag)}</span>
            <span class="not-filter-tag-remove" data-tag="${escapeHtml(tag)}">×</span>
        `;
        
        const removeBtn = tagEl.querySelector('.not-filter-tag-remove');
        removeBtn.addEventListener('click', () => removeNotFilterTag(tag));
        
        container.appendChild(tagEl);
    });
}

// Show input to add new NOT filter tag
function showNotFilterInput() {
    const addBtn = document.getElementById('not-filter-add-btn');
    if (!addBtn) return;
    
    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'not-filter-input-container';
    inputContainer.innerHTML = `
        <input 
            type="text" 
            class="not-filter-input" 
            id="not-filter-input" 
            placeholder="e.g., FedEx, Cannabis" 
            autocomplete="off"
        />
        <button class="not-filter-input-btn" id="not-filter-save">Add</button>
        <button class="not-filter-input-btn cancel" id="not-filter-cancel">Cancel</button>
    `;
    
    // Replace add button with input
    addBtn.style.display = 'none';
    addBtn.parentNode.insertBefore(inputContainer, addBtn);
    
    // Focus input
    const input = document.getElementById('not-filter-input');
    input.focus();
    
    // Setup event listeners
    const saveBtn = document.getElementById('not-filter-save');
    const cancelBtn = document.getElementById('not-filter-cancel');
    
    const addTag = () => {
        const value = input.value.trim();
        if (value) {
            addNotFilterTag(value);
        }
        hideNotFilterInput();
    };
    
    const cancel = () => {
        hideNotFilterInput();
    };
    
    saveBtn.addEventListener('click', addTag);
    cancelBtn.addEventListener('click', cancel);
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
        }
    });
}

// Hide NOT filter input
function hideNotFilterInput() {
    const inputContainer = document.querySelector('.not-filter-input-container');
    const addBtn = document.getElementById('not-filter-add-btn');
    
    if (inputContainer) {
        inputContainer.remove();
    }
    
    if (addBtn) {
        addBtn.style.display = '';
    }
}

// Add a NOT filter tag
async function addNotFilterTag(tag) {
    if (!tag || notFilterTags.includes(tag)) {
        if (notFilterTags.includes(tag)) {
            showToast('Filter already exists', 'warning');
        }
        return;
    }
    
    notFilterTags.push(tag);
    await saveNotFilterTags();
    renderNotFilterTags();
    applyAllFilters();
    showToast(`Added NOT filter: ${tag}`, 'success');
    
    // Mark current view as modified (but keep it active)
    if (currentFilterViewId) {
        filterViewModified = true;
        updateFilterViewUI();
    }
}

// Remove a NOT filter tag
async function removeNotFilterTag(tag) {
    const index = notFilterTags.indexOf(tag);
    if (index > -1) {
        notFilterTags.splice(index, 1);
        await saveNotFilterTags();
        renderNotFilterTags();
        applyAllFilters();
        showToast(`Removed NOT filter: ${tag}`, 'success');
        
        // Mark current view as modified (but keep it active)
        if (currentFilterViewId) {
            filterViewModified = true;
            updateFilterViewUI();
        }
    }
}

// ===== FILTER VIEWS (SAVE/LOAD FILTER CONFIGURATIONS) =====

// Load filter views from storage
async function loadFilterViews() {
    try {
        const result = await new Promise((resolve) => {
            chrome.storage.local.get(['filterViews'], (result) => {
                resolve(result.filterViews || []);
            });
        });
        filterViews = result;
        console.log('📋 Loaded filter views from storage:', filterViews);
        console.log('   Number of views:', filterViews.length);
        if (filterViews.length > 0) {
            console.log('   View names:', filterViews.map(v => v.name).join(', '));
        }
    } catch (error) {
        console.error('❌ Error loading filter views:', error);
        filterViews = [];
    }
}

// Save filter views to storage
async function saveFilterViewsToStorage() {
    try {
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ filterViews }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        console.log('💾 Saved filter views to storage:', filterViews);
        console.log('   Number of views saved:', filterViews.length);
        if (filterViews.length > 0) {
            console.log('   View names:', filterViews.map(v => v.name).join(', '));
        }
    } catch (error) {
        console.error('❌ Error saving filter views:', error);
        throw error;
    }
}

// Get current filter configuration
function getCurrentFilterConfig() {
    return {
        buyBox: { ...currentBuyBox },
        notFilterTags: [...notFilterTags]
    };
}

// Apply a filter configuration
async function applyFilterConfig(config) {
    // Apply buy box
    currentBuyBox = { ...config.buyBox };
    
    // Apply NOT filters
    notFilterTags = [...config.notFilterTags];
    await saveNotFilterTags();
    renderNotFilterTags();
    
    // Apply all filters
    applyAllFilters();
}

// Save current filters as a new view
async function saveCurrentFilterView() {
    const viewName = prompt('Enter a name for this filter view:');
    if (!viewName || !viewName.trim()) return;
    
    const newView = {
        id: Date.now().toString(),
        name: viewName.trim(),
        config: getCurrentFilterConfig(),
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    filterViews.push(newView);
    await saveFilterViewsToStorage();
    currentFilterViewId = newView.id;
    filterViewModified = false; // Reset modified flag
    
    renderFilterViewsDropdown();
    updateFilterViewUI();
    showToast(`✅ Saved filter view: ${viewName}`, 'success');
}

// Update an existing filter view
async function updateFilterView(viewId) {
    const view = filterViews.find(v => v.id === viewId);
    if (!view) return;
    
    view.config = getCurrentFilterConfig();
    view.updatedAt = Date.now();
    
    await saveFilterViewsToStorage();
    filterViewModified = false; // Reset modified flag
    updateFilterViewUI();
    showToast(`✅ Updated filter view: ${view.name}`, 'success');
}

// Load a filter view
async function loadFilterView(viewId) {
    const view = filterViews.find(v => v.id === viewId);
    if (!view) return;
    
    await applyFilterConfig(view.config);
    currentFilterViewId = viewId;
    filterViewModified = false; // Reset modified flag
    
    // Update buy box modal if it's open
    const modal = document.getElementById('buybox-modal');
    if (modal && modal.style.display === 'flex') {
        loadBuyBoxSettings();
    }
    
    updateFilterViewUI();
    showToast(`✅ Loaded filter view: ${view.name}`, 'success');
}

// Delete a filter view
async function deleteFilterView(viewId) {
    const view = filterViews.find(v => v.id === viewId);
    if (!view) return;
    
    if (!confirm(`Delete filter view "${view.name}"?`)) return;
    
    filterViews = filterViews.filter(v => v.id !== viewId);
    await saveFilterViewsToStorage();
    
    if (currentFilterViewId === viewId) {
        currentFilterViewId = null;
    }
    
    renderFilterViewsDropdown();
    updateFilterViewUI();
    showToast(`🗑️ Deleted filter view: ${view.name}`, 'success');
}

// Clear all filters (reset to defaults)
async function clearAllFilters() {
    currentBuyBox = { ...DEFAULT_BUYBOX };
    notFilterTags = [];
    currentFilterViewId = null;
    filterViewModified = false;
    
    await saveNotFilterTags();
    renderNotFilterTags();
    applyAllFilters();
    updateFilterViewUI();
    
    showToast('✅ Cleared all filters', 'success');
}

// Render filter views dropdown
function renderFilterViewsDropdown() {
    const dropdown = document.getElementById('filter-views-dropdown');
    if (!dropdown) {
        console.warn('⚠️ Filter views dropdown not found in DOM');
        return;
    }
    
    console.log('🎨 Rendering filter views dropdown with', filterViews.length, 'views');
    
    dropdown.innerHTML = '<option value="">-- Select a Filter View --</option>';
    
    filterViews.forEach(view => {
        const option = document.createElement('option');
        option.value = view.id;
        option.textContent = view.name;
        if (view.id === currentFilterViewId) {
            option.selected = true;
        }
        dropdown.appendChild(option);
        console.log('   Added view:', view.name);
    });
}

// Update filter view UI (show save/update buttons)
function updateFilterViewUI() {
    const saveBtn = document.getElementById('filter-view-save-btn');
    const updateBtn = document.getElementById('filter-view-update-btn');
    const dropdown = document.getElementById('filter-views-dropdown');
    
    if (currentFilterViewId) {
        // Viewing a saved filter - show update button
        if (saveBtn) saveBtn.style.display = 'none';
        if (updateBtn) {
            updateBtn.style.display = '';
            
            // Show visual indicator if modified
            if (filterViewModified) {
                updateBtn.textContent = '🔄 Update View *';
                updateBtn.title = 'Save changes to the current view (modified)';
                updateBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'; // Orange gradient
            } else {
                updateBtn.textContent = '🔄 Update View';
                updateBtn.title = 'Update the current view with current filters';
                updateBtn.style.background = ''; // Reset to default
            }
        }
        
        // Add indicator to dropdown if modified
        if (dropdown && filterViewModified) {
            const currentView = filterViews.find(v => v.id === currentFilterViewId);
            if (currentView) {
                // Find the selected option and add asterisk
                const selectedOption = dropdown.querySelector(`option[value="${currentFilterViewId}"]`);
                if (selectedOption && !selectedOption.textContent.includes('*')) {
                    selectedOption.textContent = currentView.name + ' *';
                }
            }
        }
    } else {
        // Not viewing a saved filter - show save button
        if (saveBtn) saveBtn.style.display = '';
        if (updateBtn) updateBtn.style.display = 'none';
    }
}

// Setup filter views UI
function setupFilterViewsUI() {
    const dropdown = document.getElementById('filter-views-dropdown');
    if (dropdown) {
        dropdown.addEventListener('change', (e) => {
            const viewId = e.target.value;
            if (viewId) {
                loadFilterView(viewId);
            }
        });
    }
    
    const saveBtn = document.getElementById('filter-view-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentFilterView);
    }
    
    const updateBtn = document.getElementById('filter-view-update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            if (currentFilterViewId) {
                updateFilterView(currentFilterViewId);
            }
        });
    }
    
    const deleteBtn = document.getElementById('filter-view-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const dropdown = document.getElementById('filter-views-dropdown');
            const viewId = dropdown ? dropdown.value : null;
            if (viewId) {
                deleteFilterView(viewId);
            }
        });
    }
    
    const clearBtn = document.getElementById('filter-view-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
    
    // Don't render dropdown here - it will be rendered after filter views are loaded
    // renderFilterViewsDropdown() is called in loadAggregatorDeals() after loadFilterViews()
}

// Render aggregator table (async for column prefs)
async function renderAggregatorTable() {
    const tbody = document.getElementById('aggregator-tbody');
    const theadRow = document.getElementById('aggregator-thead-row');
    if (!tbody || !theadRow) return;
    
    const prefs = await getAggregatorColumnPrefs();
    const columns = getVisibleOrderedColumns(aggregatedDeals, prefs);
    
    renderAggregatorHeaders(theadRow, columns, prefs);
    
    const sortedDeals = sortAggregatorDeals(filteredAggregatedDeals, currentAggregatorSort);
    const startIdx = (currentPage - 1) * DEALS_PER_PAGE;
    const endIdx = startIdx + DEALS_PER_PAGE;
    const pageDeals = sortedDeals.slice(startIdx, endIdx);
    
    tbody.innerHTML = '';
    pageDeals.forEach(deal => {
        const row = createAggregatorDealRow(deal, columns);
        tbody.appendChild(row);
    });
    
    updateAggregatorPagination(sortedDeals.length);
}

function renderAggregatorHeaders(theadRow, columns, prefs) {
    theadRow.innerHTML = '';
    const dir = currentAggregatorSort.direction;
    const sortField = currentAggregatorSort.field;
    
    columns.forEach(colKey => {
        const meta = AGG_BUILTIN.find(c => c.key === colKey);
        const label = meta ? meta.label : colKey;
        const sortKey = meta ? meta.sortKey : colKey;
        const th = document.createElement('th');
        th.className = 'sortable draggable';
        th.dataset.sort = sortKey;
        th.dataset.columnKey = colKey;
        th.textContent = label;
        th.draggable = true;
        if (sortKey === sortField) th.classList.add(`sorted-${dir}`);
        theadRow.appendChild(th);
    });
    
    const actions = document.createElement('th');
    actions.style.width = '120px';
    actions.textContent = 'ACTIONS';
    actions.className = 'aggregator-actions-header';
    theadRow.appendChild(actions);
}

function getDealCellValue(deal, colKey) {
    const map = {
        name: () => deal.name || 'Unnamed Deal',
        asking: () => formatPrice(deal.askingPrice),
        ebitda: () => formatPrice(deal.ebitda),
        location: () => deal.location || deal.city || '-',
        industry: () => deal.industry || '-',
        source: () => deal.sourceType || 'RSS',
        discovered: () => formatRelativeTime(deal.discoveredAt)
    };
    if (map[colKey]) return map[colKey]();
    const raw = deal.rawFields && deal.rawFields[colKey];
    return (raw !== undefined && raw !== null && String(raw).trim() !== '') ? String(raw).trim() : '-';
}

function getDealCellHtml(deal, colKey) {
    const matchesBuyBox = dealMatchesBuyBox(deal);
    if (colKey === 'name') {
        const name = deal.name || 'Unnamed Deal';
        return `<div class="aggregator-deal-name">${escapeHtml(name)}${matchesBuyBox ? '<span class="buybox-badge" title="Matches Your Buy Box">🎯</span>' : ''}</div><div class="aggregator-deal-source">${escapeHtml(deal.source || 'Unknown')}</div>`;
    }
    if (colKey === 'asking') return `<span class="aggregator-price">${formatPrice(deal.askingPrice)}</span>`;
    if (colKey === 'ebitda') return `<span class="aggregator-price positive">${formatPrice(deal.ebitda)}</span>`;
    if (colKey === 'industry') return deal.industry ? `<span class="aggregator-industry-tag">${escapeHtml(deal.industry)}</span>` : '-';
    return escapeHtml(getDealCellValue(deal, colKey));
}

// Create table row for a deal (columns = ordered visible column keys)
function createAggregatorDealRow(deal, columns) {
    const row = document.createElement('tr');
    row.dataset.dealId = deal.id;
    
    columns.forEach(colKey => {
        const td = document.createElement('td');
        td.innerHTML = getDealCellHtml(deal, colKey);
        row.appendChild(td);
    });
    
    const actionsCell = document.createElement('td');
    actionsCell.innerHTML = `
        <div class="aggregator-actions">
            <button class="aggregator-action-btn save" title="Save Deal">💾</button>
            <button class="aggregator-action-btn" title="View Details">👁️</button>
        </div>
    `;
    row.appendChild(actionsCell);
    
    const saveBtn = actionsCell.querySelector('.save');
    const viewBtn = actionsCell.querySelector('.aggregator-action-btn:not(.save)');
    saveBtn?.addEventListener('click', (e) => { e.stopPropagation(); saveDealFromAggregator(deal); });
    viewBtn?.addEventListener('click', (e) => { e.stopPropagation(); viewDealDetails(deal); });
    row.addEventListener('click', () => viewDealDetails(deal));
    
    return row;
}

// Sort aggregator deals (field = sortKey: name|price|ebitda|location|industry|source|date | or raw header)
function sortAggregatorDeals(deals, sortConfig) {
    const sorted = [...deals];
    const isAsc = sortConfig.direction === 'asc';
    const builtinSortKeys = new Set(AGG_BUILTIN.map(c => c.sortKey));
    
    function val(d) {
        switch (sortConfig.field) {
            case 'name': return (d.name || '').toLowerCase();
            case 'price': return d.askingPrice || 0;
            case 'ebitda': return d.ebitda || 0;
            case 'location': return (d.location || d.city || '').toLowerCase();
            case 'industry': return (d.industry || '').toLowerCase();
            case 'source': return (d.source || '').toLowerCase();
            case 'date': return d.discoveredAt || 0;
            default:
                if (!builtinSortKeys.has(sortConfig.field) && d.rawFields && d.rawFields[sortConfig.field] != null) {
                    const s = String(d.rawFields[sortConfig.field]).trim();
                    const n = parseFloat(s.replace(/[$,]/g, ''));
                    return !isNaN(n) ? n : s.toLowerCase();
                }
                return '';
        }
    }
    
    sorted.sort((a, b) => {
        const aVal = val(a);
        const bVal = val(b);
        if (aVal < bVal) return isAsc ? -1 : 1;
        if (aVal > bVal) return isAsc ? 1 : -1;
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

// Search aggregator deals (all fields including rawFields)
function searchAggregatorDeals(query) {
    // Use the comprehensive filtering function that applies all filters
    applyAllFilters();
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
    
    // Click on name to open deal modal (for My Deals - detailed scenario comparison)
    nameCell.addEventListener('click', () => {
        console.log('📋 Opening deal modal for:', deal.name);
        openDealModal(deal);
    });
    
    const [viewBtn, exportBtn, deleteBtn] = actionsCell.querySelectorAll('.action-btn');
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('👁️ Opening deal modal for:', deal.name);
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

// Open deal modal with full details
function openDealModal(deal) {
    try {
        console.log('📋 Opening deal modal for:', deal.name);
        console.log('Deal data:', deal);
        
        const modal = document.getElementById('deal-modal');
        if (!modal) {
            console.error('❌ Deal modal element not found in DOM');
            showToast('Modal not found', 'error');
            return;
        }
        
        console.log('✅ Modal element found');
        
        // Store current deal for updates
        window.currentDeal = deal;
        
        // Populate modal with deal data
        document.getElementById('modal-deal-name').textContent = deal.name || 'Unnamed Deal';
    
        // Status with edit capability
        const statusEl = document.getElementById('modal-status');
        if (statusEl) {
            const statusBadges = {
                hot: '🔥 Hot',
                warm: '🌡️ Warm',
                cold: '❄️ Cold',
                pass: '❌ Pass',
                none: 'No Status'
            };
            statusEl.innerHTML = `
                <select id="modal-status-select" style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary);">
                    <option value="none" ${deal.status === 'none' ? 'selected' : ''}>No Status</option>
                    <option value="hot" ${deal.status === 'hot' ? 'selected' : ''}>🔥 Hot</option>
                    <option value="warm" ${deal.status === 'warm' ? 'selected' : ''}>🌡️ Warm</option>
                    <option value="cold" ${deal.status === 'cold' ? 'selected' : ''}>❄️ Cold</option>
                    <option value="pass" ${deal.status === 'pass' ? 'selected' : ''}>❌ Pass</option>
                </select>
            `;
            
            // Add change listener
            const statusSelect = document.getElementById('modal-status-select');
            if (statusSelect) {
                statusSelect.addEventListener('change', async (e) => {
                    await updateDealStatus(deal, e.target.value);
                });
            }
        }
        
        // Date
        document.getElementById('modal-saved-date').textContent = formatDate(deal.savedAt);
        
        // Financial overview
        document.getElementById('modal-asking-price').textContent = formatCurrency(deal.inputs?.askingPrice || 0);
        document.getElementById('modal-ebitda').textContent = formatCurrency(deal.inputs?.ebitdaSDE || 0);
        document.getElementById('modal-quality').textContent = deal.qualityScore !== undefined ? deal.qualityScore : 'N/A';
        document.getElementById('modal-coc').textContent = deal.results?.cocReturn ? `${deal.results.cocReturn.toFixed(1)}%` : 'N/A';
        
        // URL
        const urlEl = document.getElementById('modal-url');
        if (urlEl) {
            if (deal.url) {
                urlEl.href = deal.url;
                urlEl.textContent = deal.url;
                urlEl.style.display = 'block';
            } else {
                urlEl.textContent = 'No URL (Off-market deal)';
                urlEl.href = '#';
                urlEl.style.pointerEvents = 'none';
            }
        }
        
        // Financial details
        document.getElementById('modal-max-price').textContent = formatCurrency(deal.results?.maxPrice || 0);
        document.getElementById('modal-total-debt').textContent = formatCurrency(deal.results?.totalDebt || 0);
        document.getElementById('modal-fcf').textContent = formatCurrency(deal.results?.cashFlowAnnual || 0);
        document.getElementById('modal-takehome').textContent = formatCurrency(deal.results?.ownerTakeHome || 0);
        document.getElementById('modal-payback').textContent = deal.results?.paybackPeriod ? `${deal.results.paybackPeriod.toFixed(1)} years` : 'N/A';
        
        // Notes section
        const notesTextarea = document.getElementById('modal-notes');
        if (notesTextarea) {
            notesTextarea.value = deal.notes || '';
            
            // Auto-save notes
            notesTextarea.addEventListener('input', () => {
                clearTimeout(notesTextarea.saveTimeout);
                notesTextarea.saveTimeout = setTimeout(async () => {
                    await updateDealNotes(deal, notesTextarea.value);
                }, 1000);
            });
        }
    
        // Show modal
        modal.style.display = 'flex';
        console.log('✅ Deal modal displayed');
    } catch (error) {
        console.error('❌ Error opening deal modal:', error);
        console.error('Stack:', error.stack);
        showToast('Error opening deal details', 'error');
    }
}

// Close deal modal
function closeDealModal() {
    const modal = document.getElementById('deal-modal');
    if (modal) modal.style.display = 'none';
    window.currentDeal = null;
}

// Update deal status
async function updateDealStatus(deal, newStatus) {
    try {
        // Update deal object
        deal.status = newStatus;
        
        // Save to storage
        const existingDeals = await new Promise((resolve) => {
            chrome.storage.local.get(['savedDeals'], (result) => {
                resolve(result.savedDeals || []);
            });
        });
        
        const dealIndex = existingDeals.findIndex(d => d.savedAt === deal.savedAt);
        if (dealIndex !== -1) {
            existingDeals[dealIndex].status = newStatus;
            
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ savedDeals: existingDeals }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            
            showToast('Status updated', 'success');
            
            // Refresh My Deals if visible
            if (currentTab === 'my-deals') {
                await loadMyDeals();
            }
        }
        
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Error updating status', 'error');
    }
}

// Update deal notes
async function updateDealNotes(deal, newNotes) {
    try {
        // Update deal object
        deal.notes = newNotes;
        
        // Save to storage
        const existingDeals = await new Promise((resolve) => {
            chrome.storage.local.get(['savedDeals'], (result) => {
                resolve(result.savedDeals || []);
            });
        });
        
        const dealIndex = existingDeals.findIndex(d => d.savedAt === deal.savedAt);
        if (dealIndex !== -1) {
            existingDeals[dealIndex].notes = newNotes;
            
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ savedDeals: existingDeals }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            
            console.log('✅ Notes auto-saved');
        }
        
    } catch (error) {
        console.error('Error updating notes:', error);
        showToast('Error saving notes', 'error');
    }
}

// Initialize deal modal handlers
document.addEventListener('DOMContentLoaded', () => {
    // Close button
    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDealModal);
    }
    
    // Click outside to close
    const modal = document.getElementById('deal-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDealModal();
            }
        });
    }
});



// ===== DEAL DETAILS VIEW =====
let currentViewedDeal = null;

// Get user's view preference (sidebar or popup)
async function getDealViewPreference() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userPreferences'], (result) => {
            const pref = result.userPreferences?.dealViewPreference || 'sidebar';
            resolve(pref);
        });
    });
}

// Save user's view preference
async function saveDealViewPreference(preference) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userPreferences'], (result) => {
            const prefs = result.userPreferences || {};
            prefs.dealViewPreference = preference;
            chrome.storage.local.set({ userPreferences: prefs }, resolve);
        });
    });
}

// Generate deal details HTML
function generateDealDetailsHTML(deal) {
    const matchesBuyBox = dealMatchesBuyBox(deal);
    
    // Extract broker info from rawFields or deal.broker
    const brokerInfo = deal.broker || deal.brokerInfo || {};
    const brokerEmail = brokerInfo.email || deal.rawFields?.['Broker Email'] || deal.rawFields?.['Contact Email'] || '';
    const brokerPhone = brokerInfo.phone || deal.rawFields?.['Broker Phone'] || deal.rawFields?.['Contact Phone'] || '';
    const brokerName = brokerInfo.name || deal.rawFields?.['Broker Name'] || deal.rawFields?.['Contact Name'] || '';
    
    // Get description - ensure we only show it once
    const description = deal.description || deal.rawFields?.Description || '';
    
    return `
        <div class="deal-detail-section">
            <h3>📊 Overview</h3>
            <div class="deal-detail-grid">
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Deal Name</div>
                    <div class="deal-detail-value highlight">${escapeHtml(deal.name || 'Unnamed Deal')}</div>
                </div>
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Source</div>
                    <div class="deal-detail-value">${escapeHtml(deal.source || 'Unknown')}</div>
                </div>
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Discovered</div>
                    <div class="deal-detail-value">${formatRelativeTime(deal.discoveredAt)}</div>
                </div>
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Buy Box Match</div>
                    <div class="deal-detail-value">${matchesBuyBox ? '🎯 Yes' : '❌ No'}</div>
                </div>
            </div>
        </div>

        <div class="deal-detail-section">
            <h3>💰 Financial Information</h3>
            <div class="deal-detail-grid">
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Asking Price</div>
                    <div class="deal-detail-value highlight">${formatPrice(deal.askingPrice)}</div>
                </div>
                <div class="deal-detail-item">
                    <div class="deal-detail-label">EBITDA/SDE</div>
                    <div class="deal-detail-value">${formatPrice(deal.ebitda)}</div>
                </div>
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Revenue</div>
                    <div class="deal-detail-value">${formatPrice(deal.revenue)}</div>
                </div>
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Cash Flow</div>
                    <div class="deal-detail-value">${formatPrice(deal.cashFlow)}</div>
                </div>
            </div>
        </div>

        <div class="deal-detail-section">
            <h3>📍 Location & Industry</h3>
            <div class="deal-detail-grid">
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Location</div>
                    <div class="deal-detail-value">${escapeHtml(deal.location || deal.city || 'Not specified')}</div>
                </div>
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Industry</div>
                    <div class="deal-detail-value">${escapeHtml(deal.industry || 'Not specified')}</div>
                </div>
            </div>
        </div>

        ${(brokerName || brokerEmail || brokerPhone) ? `
        <div class="deal-detail-section">
            <h3>📞 Broker Contact</h3>
            <div class="deal-detail-grid">
                ${brokerName ? `
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Name</div>
                    <div class="deal-detail-value">${escapeHtml(brokerName)}</div>
                </div>
                ` : ''}
                ${brokerEmail ? `
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Email</div>
                    <div class="deal-detail-value">
                        <a href="mailto:${escapeHtml(brokerEmail)}" style="color: #667eea; text-decoration: none;">
                            ${escapeHtml(brokerEmail)}
                        </a>
                    </div>
                </div>
                ` : ''}
                ${brokerPhone ? `
                <div class="deal-detail-item">
                    <div class="deal-detail-label">Phone</div>
                    <div class="deal-detail-value">
                        <a href="tel:${escapeHtml(brokerPhone)}" style="color: #667eea; text-decoration: none;">
                            ${escapeHtml(brokerPhone)}
                        </a>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}

        ${description ? `
        <div class="deal-detail-section">
            <h3>📝 Description</h3>
            <div class="deal-detail-description">${escapeHtml(description)}</div>
        </div>
        ` : ''}

        ${deal.url ? `
        <div class="deal-detail-section">
            <h3>🔗 Link</h3>
            <a href="${escapeHtml(deal.url)}" target="_blank" class="deal-detail-link">
                <span>Open Deal Listing</span>
                <span>↗</span>
            </a>
        </div>
        ` : ''}

        <div class="deal-detail-section" style="border: 2px solid #667eea; border-radius: 8px; background: var(--bg-tertiary);">
            <h3 style="cursor: pointer; user-select: none; display: flex; align-items: center; gap: 8px;" id="deal-analysis-toggle">
                <span id="deal-analysis-arrow" style="transition: transform 0.2s; display: inline-block;">▼</span>
                <span>🧮 Deal Analysis Calculator</span>
            </h3>
            <div id="deal-analysis-content" style="display: none; margin-top: 16px;">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
                    <strong>💡 Scenario Analysis:</strong> Adjust the financing inputs below to model different scenarios. 
                    Your changes will be automatically saved as "Scenario 1" when you save this deal to "My Deals".
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                        Business EBITDA/SDE
                    </label>
                    <input type="text" id="deal-calc-ebitda" class="deal-calc-input" placeholder="0" 
                           value="${deal.ebitda || 0}" 
                           style="width: 100%; padding: 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px;">
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                        Asking Price
                    </label>
                    <input type="text" id="deal-calc-asking" class="deal-calc-input" placeholder="0" 
                           value="${deal.askingPrice || 0}"
                           style="width: 100%; padding: 10px; border: 2px solid var(--border-color); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px;">
                </div>

                <div style="border-top: 2px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
                    <h4 style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                        💰 Financing Structure
                    </h4>
                    
                    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; cursor: pointer;" id="deal-sba-toggle">
                            <label style="font-size: 12px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                                <span id="deal-sba-arrow" style="transition: transform 0.2s;">▼</span>
                                A. SBA Loan
                            </label>
                            <span id="deal-sba-summary" style="font-size: 11px; color: var(--text-secondary);">80% • 11.5% • 10yr</span>
                        </div>
                        <div id="deal-sba-content" style="display: none;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Percentage (%)</label>
                                    <input type="number" id="deal-sba-percent" value="80" step="0.1" min="0" max="100"
                                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Interest Rate (%)</label>
                                    <input type="number" id="deal-sba-rate" value="11.5" step="0.1" min="0"
                                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Term (Years)</label>
                                    <input type="number" id="deal-sba-term" value="10" min="1" max="30"
                                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Target DSCR</label>
                                    <input type="number" id="deal-sba-dscr" value="1.25" step="0.05" min="1.0"
                                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; cursor: pointer;" id="deal-equity-toggle">
                            <label style="font-size: 12px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                                <span id="deal-equity-arrow" style="transition: transform 0.2s;">▼</span>
                                B. Buyer Equity
                            </label>
                            <span id="deal-equity-summary" style="font-size: 11px; color: var(--text-secondary);">10% • $150k salary</span>
                        </div>
                        <div id="deal-equity-content" style="display: none;">
                            <div style="margin-bottom: 12px;">
                                <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Percentage (%)</label>
                                <input type="number" id="deal-equity-percent" value="10" step="0.1" min="0" max="100"
                                       style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Target Owner Salary (Annual)</label>
                                <input type="text" id="deal-equity-salary" value="150000" placeholder="150000"
                                       style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <label style="font-size: 12px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" id="deal-seller-note-enabled" style="width: auto; cursor: pointer;">
                                <span id="deal-seller-note-arrow" style="transition: transform 0.2s; cursor: pointer;">▼</span>
                                <span style="cursor: pointer;">C. Seller Note (Optional)</span>
                            </label>
                            <span id="deal-seller-note-summary" style="font-size: 11px; color: var(--text-secondary);">10% • 6.0%</span>
                        </div>
                        <div id="deal-seller-note-content" style="display: none;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Percentage (%)</label>
                                    <input type="number" id="deal-seller-note-percent" value="10" step="0.1" min="0" max="100"
                                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Interest Rate (%)</label>
                                    <input type="number" id="deal-seller-note-rate" value="6.0" step="0.1" min="0"
                                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Term (Years)</label>
                                    <input type="number" id="deal-seller-note-term" value="5" min="1" max="15"
                                           style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Payment Type</label>
                                    <select id="deal-seller-note-type" 
                                            style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 13px;">
                                        <option value="amortizing">Amortizing</option>
                                        <option value="interest-only">Interest Only</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="border-top: 2px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
                    <h4 style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                        📊 Results
                    </h4>
                    <div id="deal-calc-results" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid #667eea;">
                            <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Max Allowable Price</div>
                            <div id="deal-calc-max-price" style="font-size: 16px; font-weight: 700; color: var(--text-primary);">$0</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid #27ae60;">
                            <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Free Cash Flow</div>
                            <div id="deal-calc-fcf" style="font-size: 16px; font-weight: 700; color: var(--text-primary);">$0</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid #e67e22;">
                            <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Cash-on-Cash Return</div>
                            <div id="deal-calc-coc" style="font-size: 16px; font-weight: 700; color: var(--text-primary);">0%</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid #9b59b6;">
                            <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">DSCR</div>
                            <div id="deal-calc-dscr" style="font-size: 16px; font-weight: 700; color: var(--text-primary);">0x</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// View deal details - opens sidebar or popup based on user preference
async function viewDealDetails(deal) {
    try {
        console.log('👁️ View deal details:', deal);
        currentViewedDeal = deal;
        
        const preference = await getDealViewPreference();
        console.log('📋 Preference:', preference);
        
        const detailsHTML = generateDealDetailsHTML(deal);
        console.log('✅ Generated HTML, length:', detailsHTML.length);
        
        if (preference === 'sidebar') {
            openDealSidebar(deal, detailsHTML);
        } else {
            openDealPopup(deal, detailsHTML);
        }
        
        // Update journey stage to KNOWLEDGE
        updateJourneyStage('knowledge');
    } catch (error) {
        console.error('❌ Error in viewDealDetails:', error);
        console.error('Stack:', error.stack);
        alert('Error displaying deal details. Check console for details.');
    }
}

// Open deal details in sidebar
function openDealSidebar(deal, detailsHTML) {
    const sidebar = document.getElementById('deal-sidebar');
    const overlay = document.getElementById('deal-sidebar-overlay');
    const title = document.getElementById('deal-sidebar-title');
    const body = document.getElementById('deal-sidebar-body');
    
    if (!sidebar || !overlay || !title || !body) {
        console.error('Sidebar elements not found');
        return;
    }
    
    title.textContent = deal.name || 'Deal Details';
    body.innerHTML = detailsHTML;
    
    // Show sidebar
    overlay.classList.add('active');
    sidebar.classList.add('active');
    
    // Setup action buttons
    setupDealActionButtons(deal);
}

// Open deal details in popup modal
function openDealPopup(deal, detailsHTML) {
    const popup = document.getElementById('deal-popup-modal');
    const title = document.getElementById('deal-popup-title');
    const body = document.getElementById('deal-popup-body');
    
    if (!popup || !title || !body) {
        console.error('Popup elements not found');
        return;
    }
    
    title.textContent = deal.name || 'Deal Details';
    body.innerHTML = detailsHTML;
    
    // Show popup
    popup.style.display = 'flex';
    
    // Setup action buttons
    setupDealActionButtons(deal);
}

// Setup action buttons for deal details view
function setupDealActionButtons(deal) {
    // Sidebar buttons
    const sidebarSaveBtn = document.getElementById('sidebar-save-deal');
    const sidebarOpenBtn = document.getElementById('sidebar-open-link');
    const sidebarHideBtn = document.getElementById('sidebar-hide-deal');
    
    if (sidebarSaveBtn) {
        sidebarSaveBtn.onclick = () => {
            saveDealFromAggregatorWithScenario(deal);
            closeDealDetailsView();
        };
    }
    
    if (sidebarOpenBtn) {
        sidebarOpenBtn.onclick = () => {
            if (deal.url) {
                window.open(deal.url, '_blank');
            } else {
                showToast('No URL available for this deal', 'warning');
            }
        };
        sidebarOpenBtn.disabled = !deal.url;
    }
    
    if (sidebarHideBtn) {
        sidebarHideBtn.onclick = () => {
            hideDealFromAggregator(deal);
            closeDealDetailsView();
        };
    }
    
    // Popup buttons
    const popupSaveBtn = document.getElementById('popup-save-deal');
    const popupOpenBtn = document.getElementById('popup-open-link');
    const popupHideBtn = document.getElementById('popup-hide-deal');
    
    if (popupSaveBtn) {
        popupSaveBtn.onclick = () => {
            saveDealFromAggregatorWithScenario(deal);
            closeDealDetailsView();
        };
    }
    
    if (popupOpenBtn) {
        popupOpenBtn.onclick = () => {
            if (deal.url) {
                window.open(deal.url, '_blank');
            } else {
                showToast('No URL available for this deal', 'warning');
            }
        };
        popupOpenBtn.disabled = !deal.url;
    }
    
    if (popupHideBtn) {
        popupHideBtn.onclick = () => {
            hideDealFromAggregator(deal);
            closeDealDetailsView();
        };
    }
    
    // Setup deal calculator
    setupDealCalculator(deal);
}

// Close deal details view (both sidebar and popup)
function closeDealDetailsView() {
    // Close sidebar
    const sidebar = document.getElementById('deal-sidebar');
    const overlay = document.getElementById('deal-sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    
    // Close popup
    const popup = document.getElementById('deal-popup-modal');
    if (popup) popup.style.display = 'none';
    
    currentViewedDeal = null;
}

// Hide deal from aggregator
async function hideDealFromAggregator(deal) {
    try {
        showToast('Hiding deal...', 'info');
        
        // Get hidden deals list
        const result = await new Promise((resolve) => {
            chrome.storage.local.get(['hiddenDeals'], (result) => {
                resolve(result.hiddenDeals || []);
            });
        });
        
        // Add deal ID/URL to hidden list
        const dealIdentifier = deal.url || deal.id || deal.name;
        if (!result.includes(dealIdentifier)) {
            result.push(dealIdentifier);
        }
        
        // Save hidden deals
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ hiddenDeals: result }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        
        showToast('Deal hidden successfully', 'success');
        
        // Refresh the aggregator view
        if (typeof loadAggregatedDeals === 'function') {
            loadAggregatedDeals();
        }
    } catch (error) {
        console.error('Error hiding deal:', error);
        showToast('Failed to hide deal', 'error');
    }
}

// Save deal with scenario data
async function saveDealFromAggregatorWithScenario(deal) {
    try {
        // Get calculator values if they exist
        const calculatorData = getCalculatorScenario();
        
        // Call original save function
        await saveDealFromAggregator(deal);
        
        // If calculator data exists and deal was saved, update with scenario
        if (calculatorData && Object.keys(calculatorData).length > 0) {
            const savedDeals = await new Promise((resolve) => {
                chrome.storage.local.get(['savedDeals'], (result) => {
                    resolve(result.savedDeals || []);
                });
            });
            
            // Find the deal we just saved (it should be first)
            if (savedDeals.length > 0) {
                const savedDeal = savedDeals[0];
                savedDeal.scenario1 = calculatorData;
                savedDeal.activeScenario = 'scenario1';
                
                // Save updated deal
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set({ savedDeals: savedDeals }, () => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve();
                        }
                    });
                });
                
                console.log('✅ Saved deal with Scenario 1:', calculatorData);
            }
        }
    } catch (error) {
        console.error('Error saving deal with scenario:', error);
    }
}

// Get calculator scenario data
function getCalculatorScenario() {
    const ebitda = document.getElementById('deal-calc-ebitda');
    const asking = document.getElementById('deal-calc-asking');
    const sbaPercent = document.getElementById('deal-sba-percent');
    const sbaRate = document.getElementById('deal-sba-rate');
    const sbaTerm = document.getElementById('deal-sba-term');
    const sbaDscr = document.getElementById('deal-sba-dscr');
    const equityPercent = document.getElementById('deal-equity-percent');
    const equitySalary = document.getElementById('deal-equity-salary');
    const sellerNoteEnabled = document.getElementById('deal-seller-note-enabled');
    const sellerNotePercent = document.getElementById('deal-seller-note-percent');
    const sellerNoteRate = document.getElementById('deal-seller-note-rate');
    const sellerNoteTerm = document.getElementById('deal-seller-note-term');
    const sellerNoteType = document.getElementById('deal-seller-note-type');
    
    if (!ebitda || !asking) return null;
    
    const parseNumber = (val) => {
        if (!val) return 0;
        return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
    };
    
    return {
        ebitda: parseNumber(ebitda.value),
        askingPrice: parseNumber(asking.value),
        sba: {
            percent: parseFloat(sbaPercent?.value || 80),
            rate: parseFloat(sbaRate?.value || 11.5),
            term: parseInt(sbaTerm?.value || 10),
            dscr: parseFloat(sbaDscr?.value || 1.25)
        },
        equity: {
            percent: parseFloat(equityPercent?.value || 10),
            salary: parseNumber(equitySalary?.value || 150000)
        },
        sellerNote: {
            enabled: sellerNoteEnabled?.checked || false,
            percent: parseFloat(sellerNotePercent?.value || 10),
            rate: parseFloat(sellerNoteRate?.value || 6.0),
            term: parseInt(sellerNoteTerm?.value || 5),
            type: sellerNoteType?.value || 'amortizing'
        }
    };
}

// Setup deal calculator interactions
function setupDealCalculator(deal) {
    try {
        console.log('🧮 Setting up deal calculator for:', deal.name);
        
        // Toggle deal analysis section
        const analysisToggle = document.getElementById('deal-analysis-toggle');
        const analysisContent = document.getElementById('deal-analysis-content');
        const analysisArrow = document.getElementById('deal-analysis-arrow');
        
        if (analysisToggle && analysisContent && analysisArrow) {
            analysisToggle.addEventListener('click', () => {
                const isVisible = analysisContent.style.display !== 'none';
                analysisContent.style.display = isVisible ? 'none' : 'block';
                analysisArrow.style.transform = isVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
            });
        } else {
            console.warn('⚠️ Calculator toggle elements not found');
        }
    
    // Toggle SBA section
    const sbaToggle = document.getElementById('deal-sba-toggle');
    const sbaContent = document.getElementById('deal-sba-content');
    const sbaArrow = document.getElementById('deal-sba-arrow');
    
    if (sbaToggle && sbaContent && sbaArrow) {
        sbaToggle.addEventListener('click', () => {
            const isVisible = sbaContent.style.display !== 'none';
            sbaContent.style.display = isVisible ? 'none' : 'block';
            sbaArrow.style.transform = isVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
        });
    }
    
    // Toggle Equity section
    const equityToggle = document.getElementById('deal-equity-toggle');
    const equityContent = document.getElementById('deal-equity-content');
    const equityArrow = document.getElementById('deal-equity-arrow');
    
    if (equityToggle && equityContent && equityArrow) {
        equityToggle.addEventListener('click', () => {
            const isVisible = equityContent.style.display !== 'none';
            equityContent.style.display = isVisible ? 'none' : 'block';
            equityArrow.style.transform = isVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
        });
    }
    
    // Toggle Seller Note section
    const sellerNoteEnabled = document.getElementById('deal-seller-note-enabled');
    const sellerNoteContent = document.getElementById('deal-seller-note-content');
    const sellerNoteArrow = document.getElementById('deal-seller-note-arrow');
    
    if (sellerNoteEnabled && sellerNoteContent) {
        sellerNoteEnabled.addEventListener('change', () => {
            sellerNoteContent.style.display = sellerNoteEnabled.checked ? 'block' : 'none';
            if (sellerNoteArrow) {
                sellerNoteArrow.style.transform = sellerNoteEnabled.checked ? 'rotate(0deg)' : 'rotate(-90deg)';
            }
            calculateDealMetrics();
        });
    }
    
    if (sellerNoteArrow) {
        sellerNoteArrow.addEventListener('click', () => {
            if (sellerNoteEnabled && sellerNoteContent) {
                sellerNoteEnabled.checked = !sellerNoteEnabled.checked;
                sellerNoteContent.style.display = sellerNoteEnabled.checked ? 'block' : 'none';
                sellerNoteArrow.style.transform = sellerNoteEnabled.checked ? 'rotate(0deg)' : 'rotate(-90deg)';
                calculateDealMetrics();
            }
        });
    }
    
    // Add input listeners for real-time calculation
    const inputs = [
        'deal-calc-ebitda', 'deal-calc-asking',
        'deal-sba-percent', 'deal-sba-rate', 'deal-sba-term', 'deal-sba-dscr',
        'deal-equity-percent', 'deal-equity-salary',
        'deal-seller-note-percent', 'deal-seller-note-rate', 'deal-seller-note-term'
    ];
    
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calculateDealMetrics);
            input.addEventListener('change', calculateDealMetrics);
        }
    });
    
    const sellerNoteType = document.getElementById('deal-seller-note-type');
    if (sellerNoteType) {
        sellerNoteType.addEventListener('change', calculateDealMetrics);
    }
    
        // Initial calculation
        calculateDealMetrics();
        
        console.log('✅ Deal calculator setup complete');
    } catch (error) {
        console.error('❌ Error setting up deal calculator:', error);
        console.error('Stack:', error.stack);
    }
}

// Calculate deal metrics based on inputs
function calculateDealMetrics() {
    try {
        const parseNumber = (val) => {
            if (!val) return 0;
            return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
        };
        
        const formatCurrency = (num) => {
            if (isNaN(num) || num === null || num === undefined) return '$0';
            return '$' + Math.round(num).toLocaleString();
        };
        
        const formatPercent = (num) => {
            if (isNaN(num) || num === null || num === undefined) return '0%';
            return num.toFixed(1) + '%';
        };
        
        // Get input values
        const ebitda = parseNumber(document.getElementById('deal-calc-ebitda')?.value);
        const askingPrice = parseNumber(document.getElementById('deal-calc-asking')?.value);
    const sbaPercent = parseFloat(document.getElementById('deal-sba-percent')?.value || 80);
    const sbaRate = parseFloat(document.getElementById('deal-sba-rate')?.value || 11.5) / 100;
    const sbaTerm = parseInt(document.getElementById('deal-sba-term')?.value || 10);
    const sbaDscr = parseFloat(document.getElementById('deal-sba-dscr')?.value || 1.25);
    const equityPercent = parseFloat(document.getElementById('deal-equity-percent')?.value || 10);
    const salary = parseNumber(document.getElementById('deal-equity-salary')?.value || 150000);
    const sellerNoteEnabled = document.getElementById('deal-seller-note-enabled')?.checked || false;
    const sellerNotePercent = parseFloat(document.getElementById('deal-seller-note-percent')?.value || 10);
    const sellerNoteRate = parseFloat(document.getElementById('deal-seller-note-rate')?.value || 6.0) / 100;
    const sellerNoteTerm = parseInt(document.getElementById('deal-seller-note-term')?.value || 5);
    const sellerNoteType = document.getElementById('deal-seller-note-type')?.value || 'amortizing';
    
    if (!ebitda || !askingPrice) {
        return;
    }
    
    // Calculate available cash flow after salary
    const availableCashFlow = ebitda - salary;
    
    // Calculate max allowable debt service based on DSCR
    const maxDebtService = availableCashFlow / sbaDscr;
    
    // Calculate SBA loan payment (monthly)
    const sbaMonthlyRate = sbaRate / 12;
    const sbaMonths = sbaTerm * 12;
    const sbaLoanAmount = (askingPrice * sbaPercent) / 100;
    const sbaMonthlyPayment = sbaLoanAmount * (sbaMonthlyRate * Math.pow(1 + sbaMonthlyRate, sbaMonths)) / (Math.pow(1 + sbaMonthlyRate, sbaMonths) - 1);
    const sbaAnnualPayment = sbaMonthlyPayment * 12;
    
    // Calculate seller note payment if enabled
    let sellerNoteAnnualPayment = 0;
    if (sellerNoteEnabled) {
        const sellerNoteAmount = (askingPrice * sellerNotePercent) / 100;
        if (sellerNoteType === 'interest-only') {
            sellerNoteAnnualPayment = sellerNoteAmount * sellerNoteRate;
        } else {
            const sellerMonthlyRate = sellerNoteRate / 12;
            const sellerMonths = sellerNoteTerm * 12;
            const sellerMonthlyPayment = sellerNoteAmount * (sellerMonthlyRate * Math.pow(1 + sellerMonthlyRate, sellerMonths)) / (Math.pow(1 + sellerMonthlyRate, sellerMonths) - 1);
            sellerNoteAnnualPayment = sellerMonthlyPayment * 12;
        }
    }
    
    // Calculate total debt service
    const totalDebtService = sbaAnnualPayment + sellerNoteAnnualPayment;
    
    // Calculate max allowable price
    const maxAllowablePrice = (maxDebtService / sbaAnnualPayment) * askingPrice;
    
    // Calculate free cash flow
    const freeCashFlow = availableCashFlow - totalDebtService;
    
    // Calculate equity investment
    const equityAmount = (askingPrice * equityPercent) / 100;
    
    // Calculate cash-on-cash return
    const cocReturn = equityAmount > 0 ? (freeCashFlow / equityAmount) * 100 : 0;
    
    // Calculate actual DSCR
    const actualDscr = totalDebtService > 0 ? availableCashFlow / totalDebtService : 0;
    
    // Update results
    document.getElementById('deal-calc-max-price').textContent = formatCurrency(maxAllowablePrice);
    document.getElementById('deal-calc-fcf').textContent = formatCurrency(freeCashFlow);
    document.getElementById('deal-calc-coc').textContent = formatPercent(cocReturn);
    document.getElementById('deal-calc-dscr').textContent = actualDscr.toFixed(2) + 'x';
    
    // Update summaries
    const sbaSummary = document.getElementById('deal-sba-summary');
    if (sbaSummary) {
        sbaSummary.textContent = `${sbaPercent}% • ${(sbaRate * 100).toFixed(1)}% • ${sbaTerm}yr`;
    }
    
    const equitySummary = document.getElementById('deal-equity-summary');
    if (equitySummary) {
        equitySummary.textContent = `${equityPercent}% • ${formatCurrency(salary)} salary`;
    }
    
        const sellerNoteSummary = document.getElementById('deal-seller-note-summary');
        if (sellerNoteSummary && sellerNoteEnabled) {
            sellerNoteSummary.textContent = `${sellerNotePercent}% • ${(sellerNoteRate * 100).toFixed(1)}%`;
        }
    } catch (error) {
        console.error('❌ Error calculating deal metrics:', error);
        console.error('Stack:', error.stack);
    }
}

// Initialize deal details view event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Sidebar close button
    const sidebarClose = document.getElementById('deal-sidebar-close');
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeDealDetailsView);
    }
    
    // Sidebar overlay click
    const overlay = document.getElementById('deal-sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeDealDetailsView);
    }
    
    // Popup close buttons
    const popupClose = document.getElementById('deal-popup-close');
    const popupCloseBtn = document.getElementById('popup-close-btn');
    
    if (popupClose) {
        popupClose.addEventListener('click', closeDealDetailsView);
    }
    
    if (popupCloseBtn) {
        popupCloseBtn.addEventListener('click', closeDealDetailsView);
    }
    
    // Popup overlay click
    const popup = document.getElementById('deal-popup-modal');
    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closeDealDetailsView();
            }
        });
    }
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDealDetailsView();
        }
    });
});

// ===== SOURCE MANAGEMENT MODAL =====
let selectedSourceType = null;

// Make function globally accessible via window
window.openSourceManagementModal = function openSourceManagementModal() {
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
// Make function globally accessible via window
window.openManualDealModal = function openManualDealModal() {
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

// ===== BUY BOX CONFIGURATION =====

// Default buy box configuration
const DEFAULT_BUYBOX = {
    minPrice: null,
    maxPrice: null,
    minEbitda: null,
    maxEbitda: null,
    minRevenue: null,
    revenueMultiple: null,
    targetStates: [],
    excludeStates: [],
    targetIndustries: [],
    minQuality: null
};

let currentBuyBox = { ...DEFAULT_BUYBOX };

// Open buy box configuration modal
// Make function globally accessible via window
window.openBuyBoxModal = function openBuyBoxModal() {
    console.log('⚙️ Opening Buy Box configuration modal');
    const modal = document.getElementById('buybox-modal');
    if (!modal) {
        console.error('❌ buybox-modal not found');
        showToast('Buy Box modal not found', 'error');
        return;
    }
    
    modal.style.display = 'flex';
    
    // Load existing buy box settings
    loadBuyBoxSettings();
}

// Close buy box modal
function closeBuyBoxModal() {
    const modal = document.getElementById('buybox-modal');
    if (modal) modal.style.display = 'none';
}

// Load buy box settings from storage
async function loadBuyBoxSettings() {
    try {
        const result = await new Promise((resolve) => {
            chrome.storage.local.get(['buyBoxConfig', 'userPreferences'], (result) => {
                resolve({
                    buyBox: result.buyBoxConfig || DEFAULT_BUYBOX,
                    prefs: result.userPreferences || {}
                });
            });
        });
        
        currentBuyBox = result.buyBox;
        
        // Populate form fields
        document.getElementById('buybox-min-price').value = currentBuyBox.minPrice || '';
        document.getElementById('buybox-max-price').value = currentBuyBox.maxPrice || '';
        document.getElementById('buybox-min-ebitda').value = currentBuyBox.minEbitda || '';
        document.getElementById('buybox-max-ebitda').value = currentBuyBox.maxEbitda || '';
        document.getElementById('buybox-min-revenue').value = currentBuyBox.minRevenue || '';
        document.getElementById('buybox-revenue-multiple').value = currentBuyBox.revenueMultiple || '';
        document.getElementById('buybox-states').value = currentBuyBox.targetStates?.join(', ') || '';
        document.getElementById('buybox-exclude-states').value = currentBuyBox.excludeStates?.join(', ') || '';
        document.getElementById('buybox-min-quality').value = currentBuyBox.minQuality || '';
        
        // Set deal view preference
        const dealViewPref = document.getElementById('deal-view-preference');
        if (dealViewPref) {
            dealViewPref.value = result.prefs.dealViewPreference || 'sidebar';
        }
        
        // Set industry checkboxes
        const industries = currentBuyBox.targetIndustries || [];
        const checkboxes = {
            'Healthcare': 'buybox-ind-healthcare',
            'SaaS': 'buybox-ind-saas',
            'Manufacturing': 'buybox-ind-manufacturing',
            'Restaurant': 'buybox-ind-restaurant',
            'Retail': 'buybox-ind-retail',
            'E-commerce': 'buybox-ind-ecommerce',
            'Services': 'buybox-ind-services',
            'Real Estate': 'buybox-ind-realestate'
        };
        
        Object.entries(checkboxes).forEach(([industry, id]) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = industries.includes(industry);
            }
        });
        
        updateBuyBoxPreview();
        
    } catch (error) {
        console.error('Error loading buy box settings:', error);
        showToast('Error loading settings', 'error');
    }
}

// Save buy box configuration
async function saveBuyBoxConfig() {
    try {
        // Collect form data
        const minPrice = parseFloat(document.getElementById('buybox-min-price')?.value) || null;
        const maxPrice = parseFloat(document.getElementById('buybox-max-price')?.value) || null;
        const minEbitda = parseFloat(document.getElementById('buybox-min-ebitda')?.value) || null;
        const maxEbitda = parseFloat(document.getElementById('buybox-max-ebitda')?.value) || null;
        const minRevenue = parseFloat(document.getElementById('buybox-min-revenue')?.value) || null;
        const revenueMultiple = parseFloat(document.getElementById('buybox-revenue-multiple')?.value) || null;
        
        // Parse states (comma-separated)
        const statesInput = document.getElementById('buybox-states')?.value || '';
        const targetStates = statesInput
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(s => s.length === 2);
        
        const excludeStatesInput = document.getElementById('buybox-exclude-states')?.value || '';
        const excludeStates = excludeStatesInput
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(s => s.length === 2);
        
        // Get selected industries
        const targetIndustries = [];
        const checkboxes = {
            'Healthcare': 'buybox-ind-healthcare',
            'SaaS': 'buybox-ind-saas',
            'Manufacturing': 'buybox-ind-manufacturing',
            'Restaurant': 'buybox-ind-restaurant',
            'Retail': 'buybox-ind-retail',
            'E-commerce': 'buybox-ind-ecommerce',
            'Services': 'buybox-ind-services',
            'Real Estate': 'buybox-ind-realestate'
        };
        
        Object.entries(checkboxes).forEach(([industry, id]) => {
            const checkbox = document.getElementById(id);
            if (checkbox?.checked) {
                targetIndustries.push(industry);
            }
        });
        
        const minQuality = parseFloat(document.getElementById('buybox-min-quality')?.value) || null;
        
        // Get deal view preference
        const dealViewPreference = document.getElementById('deal-view-preference')?.value || 'sidebar';
        
        // Validate
        if (minPrice && maxPrice && minPrice > maxPrice) {
            showToast('Min price cannot be greater than max price', 'warning');
            return;
        }
        
        if (minEbitda && maxEbitda && minEbitda > maxEbitda) {
            showToast('Min EBITDA cannot be greater than max EBITDA', 'warning');
            return;
        }
        
        // Build config object
        const buyBoxConfig = {
            minPrice,
            maxPrice,
            minEbitda,
            maxEbitda,
            minRevenue,
            revenueMultiple,
            targetStates,
            excludeStates,
            targetIndustries,
            minQuality
        };
        
        // Save buy box config and user preferences
        await new Promise((resolve, reject) => {
            chrome.storage.local.get(['userPreferences'], (result) => {
                const userPreferences = result.userPreferences || {};
                userPreferences.dealViewPreference = dealViewPreference;
                
                chrome.storage.local.set({ buyBoxConfig, userPreferences }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
        });
        
        currentBuyBox = buyBoxConfig;
        
        showToast('✅ Buy Box configuration saved!', 'success');
        closeBuyBoxModal();
        
        // Mark current view as modified (but keep it active)
        if (currentFilterViewId) {
            filterViewModified = true;
            updateFilterViewUI();
        }
        
        // Re-apply all filters with new buy box criteria
        if (currentTab === 'aggregator') {
            applyAllFilters();
        }
        
    } catch (error) {
        console.error('Error saving buy box:', error);
        showToast('Error saving configuration', 'error');
    }
}

// Reset buy box to defaults
async function resetBuyBox() {
    if (!confirm('Reset Buy Box to default settings?')) return;
    
    try {
        await new Promise((resolve, reject) => {
            chrome.storage.local.set({ buyBoxConfig: DEFAULT_BUYBOX }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        
        currentBuyBox = { ...DEFAULT_BUYBOX };
        loadBuyBoxSettings();
        showToast('Buy Box reset to defaults', 'success');
        
        // Re-apply filters after reset
        if (currentTab === 'aggregator') {
            applyAllFilters();
        }
        
    } catch (error) {
        console.error('Error resetting buy box:', error);
        showToast('Error resetting configuration', 'error');
    }
}

// Extract state code from deal (handles various formats)
function extractStateFromDeal(deal) {
    // 1. Check if deal has explicit state field
    if (deal.state) {
        return deal.state.toUpperCase().trim();
    }
    
    // 2. Try to extract from location field
    if (deal.location) {
        const location = deal.location.trim();
        
        // Common patterns:
        // "Tampa, FL" -> FL
        // "Charleston, SC" -> SC
        // "New York, NY" -> NY
        // "FL" -> FL
        // "Newark, NJ" -> NJ
        
        // Try to match state code at the end (after comma or as whole string)
        const stateMatch = location.match(/,\s*([A-Z]{2})$/i) || location.match(/^([A-Z]{2})$/i);
        if (stateMatch) {
            return stateMatch[1].toUpperCase();
        }
        
        // Try to match full state names and convert to codes
        const stateNames = {
            'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
            'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
            'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
            'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
            'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
            'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
            'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
            'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
            'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
            'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
            'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
            'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
            'WISCONSIN': 'WI', 'WYOMING': 'WY'
        };
        
        const upperLocation = location.toUpperCase();
        for (const [stateName, stateCode] of Object.entries(stateNames)) {
            if (upperLocation.includes(stateName)) {
                return stateCode;
            }
        }
    }
    
    // 3. Check city field if available
    if (deal.city) {
        // City might be "Tampa, FL" format
        const cityMatch = deal.city.match(/,\s*([A-Z]{2})$/i);
        if (cityMatch) {
            return cityMatch[1].toUpperCase();
        }
    }
    
    // 4. Check raw fields for state
    if (deal.rawFields) {
        const stateField = deal.rawFields.State || deal.rawFields.state || deal.rawFields.STATE;
        if (stateField) {
            const stateStr = String(stateField).trim();
            if (stateStr.length === 2) {
                return stateStr.toUpperCase();
            }
        }
    }
    
    return null;
}

// Check if deal matches buy box criteria
function dealMatchesBuyBox(deal) {
    // If no criteria set, all deals match
    const hasAnyCriteria = 
        currentBuyBox.minPrice || currentBuyBox.maxPrice ||
        currentBuyBox.minEbitda || currentBuyBox.maxEbitda ||
        currentBuyBox.minRevenue || currentBuyBox.revenueMultiple ||
        (currentBuyBox.targetStates && currentBuyBox.targetStates.length > 0) ||
        (currentBuyBox.excludeStates && currentBuyBox.excludeStates.length > 0) ||
        (currentBuyBox.targetIndustries && currentBuyBox.targetIndustries.length > 0) ||
        currentBuyBox.minQuality;
    
    if (!hasAnyCriteria) return true;
    
    // Price checks (only filter if deal HAS price data)
    if (currentBuyBox.minPrice && deal.askingPrice && deal.askingPrice < currentBuyBox.minPrice) return false;
    if (currentBuyBox.maxPrice && deal.askingPrice && deal.askingPrice > currentBuyBox.maxPrice) return false;
    
    // EBITDA checks (only filter if deal HAS EBITDA data)
    if (currentBuyBox.minEbitda && deal.ebitda && deal.ebitda < currentBuyBox.minEbitda) return false;
    if (currentBuyBox.maxEbitda && deal.ebitda && deal.ebitda > currentBuyBox.maxEbitda) return false;
    
    // Revenue checks (only filter if deal HAS revenue data)
    if (currentBuyBox.minRevenue && deal.revenue && deal.revenue < currentBuyBox.minRevenue) return false;
    if (currentBuyBox.revenueMultiple && deal.revenue && deal.askingPrice) {
        const actualMultiple = deal.askingPrice / deal.revenue;
        if (actualMultiple > currentBuyBox.revenueMultiple) return false;
    }
    
    // State checks
    if (currentBuyBox.targetStates && currentBuyBox.targetStates.length > 0) {
        const dealState = extractStateFromDeal(deal);
        if (!dealState || !currentBuyBox.targetStates.includes(dealState)) return false;
    }
    
    if (currentBuyBox.excludeStates && currentBuyBox.excludeStates.length > 0) {
        const dealState = extractStateFromDeal(deal);
        if (dealState && currentBuyBox.excludeStates.includes(dealState)) return false;
    }
    
    // Industry checks
    if (currentBuyBox.targetIndustries && currentBuyBox.targetIndustries.length > 0) {
        if (!deal.industry || !currentBuyBox.targetIndustries.includes(deal.industry)) return false;
    }
    
    // Quality score check
    if (currentBuyBox.minQuality && deal.qualityScore && deal.qualityScore < currentBuyBox.minQuality) return false;
    
    return true;
}

// Update buy box preview
function updateBuyBoxPreview() {
    const previewEl = document.getElementById('buybox-preview');
    if (!previewEl) return;
    
    const criteria = [];
    
    if (currentBuyBox.minPrice || currentBuyBox.maxPrice) {
        const min = currentBuyBox.minPrice ? formatCurrency(currentBuyBox.minPrice) : 'any';
        const max = currentBuyBox.maxPrice ? formatCurrency(currentBuyBox.maxPrice) : 'any';
        criteria.push(`💰 Price: ${min} - ${max}`);
    }
    
    if (currentBuyBox.minEbitda || currentBuyBox.maxEbitda) {
        const min = currentBuyBox.minEbitda ? formatCurrency(currentBuyBox.minEbitda) : 'any';
        const max = currentBuyBox.maxEbitda ? formatCurrency(currentBuyBox.maxEbitda) : 'any';
        criteria.push(`📊 EBITDA: ${min} - ${max}`);
    }
    
    if (currentBuyBox.targetStates && currentBuyBox.targetStates.length > 0) {
        criteria.push(`📍 States: ${currentBuyBox.targetStates.join(', ')}`);
    }
    
    if (currentBuyBox.targetIndustries && currentBuyBox.targetIndustries.length > 0) {
        criteria.push(`🏭 Industries: ${currentBuyBox.targetIndustries.join(', ')}`);
    }
    
    if (currentBuyBox.minQuality) {
        criteria.push(`⭐ Min Quality: ${currentBuyBox.minQuality}`);
    }
    
    if (criteria.length === 0) {
        previewEl.textContent = 'No criteria set - all deals will be shown';
    } else {
        previewEl.innerHTML = criteria.join('<br>');
    }
}

// Initialize buy box modal handlers
document.addEventListener('DOMContentLoaded', () => {
    // Save button
    const saveBtn = document.getElementById('buybox-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveBuyBoxConfig);
    }
    
    // Reset button
    const resetBtn = document.getElementById('buybox-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetBuyBox);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('buybox-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeBuyBoxModal);
    }
    
    // Close button
    const closeBtn = document.getElementById('buybox-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeBuyBoxModal);
    }
    
    // Update preview on field changes
    const formFields = [
        'buybox-min-price', 'buybox-max-price', 'buybox-min-ebitda', 'buybox-max-ebitda',
        'buybox-min-revenue', 'buybox-revenue-multiple', 'buybox-states', 'buybox-exclude-states',
        'buybox-min-quality'
    ];
    
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateBuyBoxPreview);
        }
    });
    
    // Update preview on checkbox changes
    const checkboxIds = [
        'buybox-ind-healthcare', 'buybox-ind-saas', 'buybox-ind-manufacturing',
        'buybox-ind-restaurant', 'buybox-ind-retail', 'buybox-ind-ecommerce',
        'buybox-ind-services', 'buybox-ind-realestate'
    ];
    
    checkboxIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', updateBuyBoxPreview);
        }
    });
});

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

// ===== END OF DASHBOARD CODE =====

// Initialize
loadDeals();
