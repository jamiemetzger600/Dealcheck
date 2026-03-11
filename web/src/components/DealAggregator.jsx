import { useCallback, useEffect, useRef, useState } from 'react';
import { filterDeals } from '../../../shared/buyBoxMatcher.js';
import { dealsAPI, userAPI } from '../utils/api';
import { fetchFirstPageAirtableDeals, fetchAirtableDealsPage } from '../utils/normalizeAirtableDeal';
import DealDetailsPanel from './DealDetailsPanel';

const FIRST_PAGE_SIZE = 100;
const BACKGROUND_PAGE_SIZE = 100;
/** Deals per page in the list; pagination advances by this. */
const RENDER_PAGE_SIZE = 100;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const DEFAULT_DEALS_URL = `${API_BASE_URL}/default-deals-csv`;
const CUSTOM_SOURCE_REFRESH_MS = 4 * 60 * 60 * 1000;
const COLUMN_CONFIG = {
  name: { label: 'Name', default: true, required: true, sortable: true },
  date: { label: 'Date Added', default: true, sortable: true },
  industry: { label: 'Industry', default: true, sortable: true },
  description: { label: 'Description', default: false, sortable: false },
  city: { label: 'City', default: false, sortable: true },
  county: { label: 'County', default: false, sortable: true },
  state: { label: 'State', default: false, sortable: true },
  country: { label: 'Country', default: false, sortable: true },
  yearsEstablished: { label: 'Years Established', default: false, sortable: true },
  ebitda: { label: 'Annual Profit', default: true, sortable: true },
  revenue: { label: 'Annual Revenue', default: false, sortable: true },
  price: { label: 'Asking Price', default: true, sortable: true },
  profitMultiple: { label: 'Profit Multiple', default: false, sortable: true },
  revenueMultiple: { label: 'Revenue Multiple', default: false, sortable: true },
  remote: { label: 'Remote/Relocatable/Absentee-Run', default: false, sortable: true },
  franchise: { label: 'Franchise', default: false, sortable: true },
  fiveYearsInBusiness: { label: '5+ Years In Business', default: false, sortable: true },
  broker: { label: 'Broker Name', default: false, sortable: true },
  brokerCompany: { label: 'Broker Company', default: false, sortable: true },
  brokerPhone: { label: 'Broker Contact', default: false, sortable: true },
  brokerEmail: { label: 'Broker Email', default: false, sortable: true },
  location: { label: 'Location', default: true, sortable: true },
  source: { label: 'Source', default: true, sortable: true },
  url: { label: 'Listing URL', default: false, sortable: true }
};
const DEFAULT_VISIBLE_COLUMNS = Object.fromEntries(
  Object.entries(COLUMN_CONFIG).map(([key, config]) => [key, config.default !== false])
);
const DEFAULT_SORT = [{ field: 'date', direction: 'desc' }];

const CARD_SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date Added (newest first)', field: 'date', direction: 'desc' },
  { value: 'date_asc', label: 'Date Added (oldest first)', field: 'date', direction: 'asc' },
  { value: 'state_asc', label: 'State (A–Z)', field: 'state', direction: 'asc' },
  { value: 'state_desc', label: 'State (Z–A)', field: 'state', direction: 'desc' },
  { value: 'price_desc', label: 'Asking Price (high to low)', field: 'price', direction: 'desc' },
  { value: 'price_asc', label: 'Asking Price (low to high)', field: 'price', direction: 'asc' },
  { value: 'ebitda_desc', label: 'Cashflow (high to low)', field: 'ebitda', direction: 'desc' },
  { value: 'ebitda_asc', label: 'Cashflow (low to high)', field: 'ebitda', direction: 'asc' },
  { value: 'industry_asc', label: 'Industry (A–Z)', field: 'industry', direction: 'asc' },
  { value: 'industry_desc', label: 'Industry (Z–A)', field: 'industry', direction: 'desc' },
  { value: 'profitMultiple_desc', label: 'C.F. Multiple (high to low)', field: 'profitMultiple', direction: 'desc' },
  { value: 'profitMultiple_asc', label: 'C.F. Multiple (low to high)', field: 'profitMultiple', direction: 'asc' }
];

function getCardSortValue(sortConfig) {
  const primary = sortConfig?.[0];
  if (!primary) return CARD_SORT_OPTIONS[0].value;
  const found = CARD_SORT_OPTIONS.find(
    (opt) => opt.field === primary.field && opt.direction === primary.direction
  );
  return found ? found.value : CARD_SORT_OPTIONS[0].value;
}

const FLEXIBILITY_PRESETS = [0, 5, 10, 15, 20];
const FLEXIBILITY_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
  { value: 20, label: '20%' },
  { value: 'custom', label: 'Custom' }
];

const SWIPE_THRESHOLD = 80;
const DRAG_CLICK_THRESHOLD = 8;
const MAX_DRAG = 320;
const MOBILE_BREAKPOINT_PX = 768;

/** Returns page numbers to show: e.g. [1, 2, 3, 4, 5, '…', 50] for currentPage 3, totalPages 50. */
function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [];
  pages.push(1);
  const left = Math.max(2, currentPage - 2);
  const right = Math.min(totalPages - 1, currentPage + 2);
  if (left > 2) pages.push('…');
  for (let p = left; p <= right; p += 1) pages.push(p);
  if (right < totalPages - 1) pages.push('…');
  if (totalPages > 1) pages.push(totalPages);
  return pages;
}

/** Card in list view. When enableSwipe (mobile only): swipe left = hide, swipe right = heart/save. Desktop: plain click. */
function SwipeableDealCard({ deal, isHidden, onHide, onLike, onTap, enableSwipe, children }) {
  const [dragX, setDragX] = useState(0);
  const startXRef = useRef(0);
  const isDragRef = useRef(false);
  const dragXRef = useRef(0);

  const handleStart = useCallback((clientX) => {
    startXRef.current = clientX;
    isDragRef.current = false;
  }, []);

  const handleMove = useCallback((clientX) => {
    const dx = clientX - startXRef.current;
    if (!isDragRef.current && Math.abs(dx) > DRAG_CLICK_THRESHOLD) {
      isDragRef.current = true;
    }
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
    dragXRef.current = clamped;
    setDragX(clamped);
  }, []);

  const handleEnd = useCallback(() => {
    const x = dragXRef.current;
    if (x < -SWIPE_THRESHOLD) {
      onHide(deal.id);
    } else if (x > SWIPE_THRESHOLD) {
      onLike(deal);
    }
    setDragX(0);
    dragXRef.current = 0;
  }, [deal, onHide, onLike]);

  const onMouseMove = useCallback((e) => handleMove(e.clientX), [handleMove]);
  const onMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    handleEnd();
  }, [handleEnd, onMouseMove]);

  const onTouchStart = useCallback((e) => {
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const onTouchMove = useCallback((e) => {
    handleMove(e.touches[0].clientX);
    if (isDragRef.current) {
      e.preventDefault();
    }
  }, [handleMove]);

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    handleStart(e.clientX);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [handleStart, onMouseMove, onMouseUp]);

  const onClick = useCallback((e) => {
    if (enableSwipe && isDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onTap(deal);
  }, [deal, onTap, enableSwipe]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap(deal);
    }
  }, [deal, onTap]);

  if (!enableSwipe) {
    return (
      <div
        className={`deal-card ${isHidden ? 'deal-card--hidden' : ''}`}
        onClick={() => onTap(deal)}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    );
  }

  const rotate = (dragX / MAX_DRAG) * 12;
  const nopeOpacity = dragX < 0 ? Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD) * 0.9 : 0;
  const likeOpacity = dragX > 0 ? Math.min(1, dragX / SWIPE_THRESHOLD) * 0.9 : 0;

  return (
    <div
      className="swipeable-card-outer"
      style={{
        transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
        transition: dragX === 0 ? 'transform 0.25s ease-out' : 'none'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      <div
        className={`deal-card ${isHidden ? 'deal-card--hidden' : ''}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="swipeable-card-overlay swipeable-card-overlay--nope" style={{ opacity: nopeOpacity }} aria-hidden="true">
          Nope
        </div>
        <div className="swipeable-card-overlay swipeable-card-overlay--like" style={{ opacity: likeOpacity }} aria-hidden="true">
          ♡ Like
        </div>
        {children}
      </div>
    </div>
  );
}

export default function DealAggregator({
  settings,
  manualRefreshToken,
  matchCount = 0,
  onMatchCountUpdate,
  onDealsStatsUpdate,
  onSaveDeal,
  onSettingsUpdate,
  feedSource = 'airtable'
}) {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState(settings?.excludeKeywords || []);
  const [savedExcludeLists, setSavedExcludeLists] = useState(settings?.excludeLists || {});
  const [currentSelectedList, setCurrentSelectedList] = useState(settings?.currentExcludeList || '');
  const [hiddenDealIds, setHiddenDealIds] = useState(settings?.hiddenDealIds || []);
  const [customSources, setCustomSources] = useState(settings?.customSources || []);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dealPanelPosition, setDealPanelPosition] = useState(settings?.preferences?.dealPanelPosition || 'center');
  const [showHiddenDeals, setShowHiddenDeals] = useState(false);
  const [viewMode, setViewMode] = useState('matches');
  const [excludeInput, setExcludeInput] = useState('');
  const [sortConfig, setSortConfig] = useState(() => loadSavedSortConfig());
  const [visibleColumns, setVisibleColumns] = useState(() => loadVisibleColumns());
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [showExcludeSection, setShowExcludeSection] = useState(true);
  const [dealViewStyle, setDealViewStyle] = useState(settings?.dealViewStyle || 'table');
  const [customFlexibilityInput, setCustomFlexibilityInput] = useState('');
  const [saveToast, setSaveToast] = useState(null);
  const [savingDealId, setSavingDealId] = useState(null);
  const [feedError, setFeedError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalFromAPI, setTotalFromAPI] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [cardColumnsPerRow, setCardColumnsPerRow] = useState(() => {
    const v = settings?.preferences?.cardColumnsPerRow;
    return [2, 3, 4, 6, 8].includes(v) ? v : 4;
  });
  const [showCardColsPopup, setShowCardColsPopup] = useState(false);
  const cardColsPopupRef = useRef(null);
  const fetchAbortRef = useRef(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const handler = () => setIsMobileViewport(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    setExcludeKeywords(settings?.excludeKeywords || []);
    setSavedExcludeLists(settings?.excludeLists || {});
    setCurrentSelectedList(settings?.currentExcludeList || '');
    setHiddenDealIds(settings?.hiddenDealIds || []);
    setCustomSources(settings?.customSources || []);
    setDealPanelPosition(settings?.preferences?.dealPanelPosition || 'center');
    setDealViewStyle(settings?.dealViewStyle || 'table');
    const cols = settings?.preferences?.cardColumnsPerRow;
    setCardColumnsPerRow([2, 3, 4, 6, 8].includes(cols) ? cols : 4);
  }, [settings]);

  useEffect(() => {
    fetchDeals({ refreshCustomSources: manualRefreshToken > 0 });
  }, []);

  useEffect(() => {
    if (!settings) return undefined;

    const maybeRefreshStaleSources = async () => {
      if (shouldRefreshCustomSources(customSources)) {
        await fetchDeals({ refreshCustomSources: true, background: true });
      }
    };

    maybeRefreshStaleSources();

    const intervalId = window.setInterval(() => {
      fetchDeals({ refreshCustomSources: true, background: true });
    }, CUSTOM_SOURCE_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [settings, customSources]);

  useEffect(() => {
    if (settings) {
      applyFilters();
    }
  }, [deals, settings, searchQuery, excludeKeywords, hiddenDealIds, showHiddenDeals, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig, viewMode, showHiddenDeals]);

  useEffect(() => {
    localStorage.setItem('vettr_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('vettr_aggregator_sort', JSON.stringify(sortConfig));
  }, [sortConfig]);

  const fetchDeals = async ({ refreshCustomSources = false, background = false } = {}) => {
    if (!background) {
      setLoading(true);
      setFeedError(null);
      setLoadingMore(false);
      setTotalFromAPI(null);
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      fetchAbortRef.current = new AbortController();
    }
    const signal = fetchAbortRef.current?.signal;

    try {
      if (feedSource === 'airtable') {
        const first = await fetchFirstPageAirtableDeals(API_BASE_URL, FIRST_PAGE_SIZE, signal);
        if (signal?.aborted) return;
        const firstDeduped = dedupeDeals(first.deals);
        setDeals(firstDeduped);
        setTotalFromAPI(first.total);
        setFeedError(null);
        if (!background) setLoading(false);

        if (first.total > first.deals.length) {
          setLoadingMore(true);
          let offset = first.deals.length;
          while (offset < first.total && !signal?.aborted) {
            const next = await fetchAirtableDealsPage(API_BASE_URL, offset, BACKGROUND_PAGE_SIZE, signal);
            if (signal?.aborted) return;
            setDeals((prev) => dedupeDeals([...prev, ...next.deals]));
            offset += next.deals.length;
            if (next.deals.length < BACKGROUND_PAGE_SIZE) break;
          }
        }
        setLoadingMore(false);
      } else {
        const response = await fetch(DEFAULT_DEALS_URL);
        if (!response.ok) throw new Error(`Default deals feed error (${response.status})`);

        const csvText = await response.text();
        const rows = parseCSV(csvText);
        const defaultDeals = normalizeRows(rows, {
          sourceName: 'Business Listings Database (100+ Real Deals)',
          sourceType: 'google_sheets'
        });

        let nextCustomSources = [...customSources];
        if (refreshCustomSources) {
          nextCustomSources = await refreshCachedCustomSources(customSources);
          setCustomSources(nextCustomSources);
          await persistCustomSources(nextCustomSources, onSettingsUpdate);
        }

        const cachedCustomDeals = getCachedCustomDeals(nextCustomSources);
        setDeals(dedupeDeals([...defaultDeals, ...cachedCustomDeals]));
      }
    } catch (error) {
      const apiUrl = `${API_BASE_URL}/airtable-deals`;
      console.error('Failed to fetch deals:', error);
      if (!background) {
        setDeals([]);
        const msg = error?.message || 'Failed to load deals';
        setFeedError(
          msg === 'Failed to fetch'
            ? `Failed to fetch (cannot reach ${apiUrl}). Check backend is running and CORS allows this origin.`
            : msg
        );
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  };

  const applyFilters = () => {
    let filtered = [...deals];

    if (viewMode === 'hidden' || showHiddenDeals) {
      filtered = filtered.filter((deal) => hiddenDealIds.includes(deal.id));
    } else {
      filtered = filterDeals(filtered, {
        buyBox: settings?.buyBox || {},
        excludeKeywords,
        hiddenIds: hiddenDealIds
      });
    }

    // Apply search (multiple keywords with & = all must match, e.g. "Relocatable & Fedex & HVAC")
    if (searchQuery.trim()) {
      const keywords = searchQuery.split(/\s*&\s*/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (keywords.length > 0) {
        filtered = filtered.filter((deal) => {
          const name = (deal.name || '').toLowerCase();
          const desc = (deal.description || '').toLowerCase();
          const location = (deal.location || '').toLowerCase();
          const industry = (deal.industry || '').toLowerCase();
          const searchable = `${name} ${desc} ${location} ${industry}`;
          return keywords.every((kw) => searchable.includes(kw));
        });
      }
    }

    filtered = sortAggregatorDeals(filtered, sortConfig);

    setFilteredDeals(filtered);
    
    onMatchCountUpdate(filtered.length);

    if (typeof onDealsStatsUpdate === 'function') {
      const today = new Date();
      const newToday = deals.filter((deal) => {
        const date = new Date(deal.discoveredAt);
        return date.toDateString() === today.toDateString();
      }).length;

      const activeSourceCount = 1 + customSources.filter((source) => source.enabled !== false).length;

      onDealsStatsUpdate({
        total: deals.length,
        newToday,
        showing: filtered.length,
        sources: activeSourceCount
      });
    }
  };

  const updateUserFilterSettings = async (nextValues) => {
    try {
      await userAPI.updateSettings(nextValues);
      if (typeof onSettingsUpdate === 'function') {
        await onSettingsUpdate();
      }
    } catch (error) {
      alert(`Failed to save filter settings: ${error.message}`);
    }
  };

  const handleSaveDeal = async (deal) => {
    setSavingDealId(deal.id);
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
        county: deal.county,
        country: deal.country,
        industry: deal.industry,
        yearsEstablished: deal.yearsEstablished,
        franchise: deal.franchise,
        remote: deal.remote,
        listingId: deal.listingId,
        source: deal.source,
        sourceType: deal.sourceType,
        discoveredAt: deal.discoveredAt,
        broker: deal.broker,
        brokerName: deal.brokerName,
        brokerCompany: deal.brokerCompany,
        brokerEmail: deal.brokerEmail,
        brokerPhone: deal.brokerPhone
      });
      setSaveToast('Deal saved to My Deals');
      onSaveDeal();
    } catch (error) {
      alert('Failed to save deal: ' + error.message);
    } finally {
      setSavingDealId(null);
    }
  };

  useEffect(() => {
    if (!saveToast) return;
    const t = setTimeout(() => setSaveToast(null), 3000);
    return () => clearTimeout(t);
  }, [saveToast]);

  useEffect(() => {
    if (!showCardColsPopup) return;
    const handleClickOutside = (e) => {
      if (cardColsPopupRef.current && !cardColsPopupRef.current.contains(e.target)) {
        setShowCardColsPopup(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowCardColsPopup(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showCardColsPopup]);

  if (loading) {
    return <div className="loading">Loading deals...</div>;
  }

  const today = new Date();
  const newTodayCount = deals.filter((deal) => {
    const date = new Date(deal.discoveredAt);
    return date.toDateString() === today.toDateString();
  }).length;

  const handleAddExcludeKeyword = async () => {
    const nextKeywords = Array.from(new Set(
      excludeInput
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .concat(excludeKeywords)
    ));

    if (nextKeywords.length === excludeKeywords.length) return;
    setExcludeKeywords(nextKeywords);
    setExcludeInput('');
    await updateUserFilterSettings({ excludeKeywords: nextKeywords });
  };

  const flexibilityPercent = Math.min(100, Math.max(0, Number(settings?.buyBox?.includeNearMatchesPercent) || 0));
  const flexibilityIsPreset = FLEXIBILITY_PRESETS.includes(flexibilityPercent);
  const flexibilitySelectValue = flexibilityIsPreset ? flexibilityPercent : 'custom';

  const handleFlexibilityChange = async (percent) => {
    const num = Math.min(100, Math.max(0, Number(percent) || 0));
    try {
      await userAPI.updateSettings({
        buyBox: { ...(settings?.buyBox || {}), includeNearMatchesPercent: num }
      });
      if (typeof onSettingsUpdate === 'function') await onSettingsUpdate();
      setCustomFlexibilityInput('');
    } catch (error) {
      alert('Failed to save flexibility: ' + error.message);
    }
  };

  const handleFlexibilitySelectChange = (e) => {
    const v = e.target.value;
    if (v === 'custom') return;
    handleFlexibilityChange(Number(v));
  };

  const handleCustomFlexibilityBlur = () => {
    const num = Math.min(100, Math.max(0, parseInt(customFlexibilityInput, 10) || 0));
    handleFlexibilityChange(num);
    setCustomFlexibilityInput('');
  };

  const handleRemoveExcludeKeyword = async (keyword) => {
    const nextKeywords = excludeKeywords.filter((item) => item !== keyword);
    setExcludeKeywords(nextKeywords);
    await updateUserFilterSettings({ excludeKeywords: nextKeywords });
  };

  const handleClearExcludeKeywords = async () => {
    setExcludeKeywords([]);
    setCurrentSelectedList('');
    await updateUserFilterSettings({ excludeKeywords: [], currentExcludeList: '' });
  };

  const handleSaveExcludeList = async () => {
    if (excludeKeywords.length === 0) {
      alert('Add some keywords first before saving a list');
      return;
    }
    const listName = window.prompt('Enter a name for this exclude list:', currentSelectedList || '');
    if (!listName || !listName.trim()) return;

    const trimmed = listName.trim();
    const nextLists = { ...savedExcludeLists, [trimmed]: [...excludeKeywords] };
    setSavedExcludeLists(nextLists);
    setCurrentSelectedList(trimmed);
    await updateUserFilterSettings({ excludeLists: nextLists, currentExcludeList: trimmed });
  };

  const handleDeleteExcludeList = async () => {
    if (!currentSelectedList) {
      alert('Select a list to delete');
      return;
    }
    if (!window.confirm(`Delete exclude list "${currentSelectedList}"?`)) return;

    const nextLists = { ...savedExcludeLists };
    delete nextLists[currentSelectedList];
    setSavedExcludeLists(nextLists);
    setCurrentSelectedList('');
    await updateUserFilterSettings({ excludeLists: nextLists, currentExcludeList: '' });
  };

  const handleUpdateExcludeList = async () => {
    if (!currentSelectedList) {
      alert('Select a list to update first');
      return;
    }
    const nextLists = { ...savedExcludeLists, [currentSelectedList]: [...excludeKeywords] };
    setSavedExcludeLists(nextLists);
    await updateUserFilterSettings({ excludeLists: nextLists, currentExcludeList: currentSelectedList });
  };

  const handleLoadExcludeList = async (listName) => {
    const nextKeywords = savedExcludeLists[listName] || [];
    setCurrentSelectedList(listName);
    setExcludeKeywords(nextKeywords);
    await updateUserFilterSettings({ excludeKeywords: nextKeywords, currentExcludeList: listName });
  };

  const handleToggleHidden = async (dealId) => {
    const nextHiddenIds = hiddenDealIds.includes(dealId)
      ? hiddenDealIds.filter((id) => id !== dealId)
      : [...hiddenDealIds, dealId];
    setHiddenDealIds(nextHiddenIds);
    await updateUserFilterSettings({ hiddenDealIds: nextHiddenIds });
  };

  const handleDealPanelPositionChange = async (position) => {
    setDealPanelPosition(position);
    try {
      await userAPI.updateSettings({ preferences: { dealPanelPosition: position } });
      if (typeof onSettingsUpdate === 'function') {
        await onSettingsUpdate();
      }
    } catch (error) {
      alert(`Failed to save panel position: ${error.message}`);
    }
  };

  const handleSaveCalculatorDefaults = async (calculatorDefaults) => {
    try {
      await userAPI.updateSettings({ preferences: { calculatorDefaults } });
      if (typeof onSettingsUpdate === 'function') {
        await onSettingsUpdate();
      }
    } catch (error) {
      console.error('Failed to save calculator defaults:', error);
    }
  };

  const handleCardColumnsPerRowChange = async (value) => {
    const num = [2, 3, 4, 6, 8].includes(value) ? value : 4;
    setCardColumnsPerRow(num);
    setShowCardColsPopup(false);
    try {
      await userAPI.updateSettings({ preferences: { cardColumnsPerRow: num } });
      if (typeof onSettingsUpdate === 'function') {
        await onSettingsUpdate();
      }
    } catch (error) {
      console.error('Failed to save card columns preference:', error);
    }
  };

  const handleViewStyleChange = async (style) => {
    if (style === dealViewStyle) return;
    setDealViewStyle(style);
    if (style === 'card') {
      setSortConfig([{ field: 'date', direction: 'desc' }]);
    }
    try {
      await updateUserFilterSettings({ dealViewStyle: style });
    } catch (error) {
      setDealViewStyle(dealViewStyle);
      alert('Failed to save view preference: ' + error.message);
    }
  };

  const handleShowMatches = () => {
    setViewMode('matches');
    setShowHiddenDeals(false);
  };

  const handleShowHidden = () => {
    setViewMode('hidden');
    setShowHiddenDeals(true);
  };

  const handleSort = (field, isShiftKey) => {
    setSortConfig((current) => {
      if (isShiftKey) {
        const existingIndex = current.findIndex((sort) => sort.field === field);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = {
            ...next[existingIndex],
            direction: next[existingIndex].direction === 'asc' ? 'desc' : 'asc'
          };
          return next;
        }
        return [...current, { field, direction: 'asc' }];
      }

      const isSingleSort = current.length === 1 && current[0].field === field;
      if (isSingleSort) {
        return [{ field, direction: current[0].direction === 'asc' ? 'desc' : 'asc' }];
      }
      return [{ field, direction: 'asc' }];
    });
  };

  const toggleColumn = (columnId) => {
    if (COLUMN_CONFIG[columnId]?.required) return;
    setVisibleColumns((current) => ({
      ...current,
      [columnId]: !current[columnId]
    }));
  };

  const handleCardSortChange = (e) => {
    const value = e.target.value;
    const option = CARD_SORT_OPTIONS.find((opt) => opt.value === value) || CARD_SORT_OPTIONS[0];
    setSortConfig([{ field: option.field, direction: option.direction }]);
  };

  const buyBox = settings?.buyBox || {};
  const flexPct = Math.min(100, Math.max(0, Number(buyBox.includeNearMatchesPercent) || 0));
  const hasAnyCriteria = [buyBox.minPrice, buyBox.maxPrice, buyBox.minEbitda, buyBox.maxEbitda, buyBox.minRevenue, buyBox.maxRevenue, buyBox.revenueMultiple].some((v) => v != null && v !== '');
  const effectiveMax = (limit) => (limit != null && flexPct > 0 ? limit * (1 + flexPct / 100) : limit);
  const effectiveMin = (limit) => (limit != null && flexPct > 0 ? limit * (1 - flexPct / 100) : limit);
  const fmt = (n) => (n != null ? `$${Number(n).toLocaleString()}` : null);
  const fmtMult = (n) => (n != null ? `${Number(n)}×` : null);

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / RENDER_PAGE_SIZE));
  const dealsToShow = filteredDeals.slice(
    (currentPage - 1) * RENDER_PAGE_SIZE,
    currentPage * RENDER_PAGE_SIZE
  );
  const hasMultiplePages = totalPages > 1;

  return (
    <div className="deal-aggregator">
      {feedError && (
        <div className="aggregator-feed-error" role="alert">
          {feedError}
          {(feedError.includes('404') || feedError.includes('Failed to fetch')) && (
            <span> Redeploy the <strong>backend</strong> on Koyeb from the latest main so it has the <code>/api/airtable-deals</code> route. Test: <a href={`${API_BASE_URL}/airtable-deals?limit=5`} target="_blank" rel="noopener noreferrer">open API URL</a></span>
          )}
        </div>
      )}
      <div className="aggregator-welcome">
        <div className="aggregator-welcome__main">
          <h2>🔍 Discover Business Deals</h2>
          <p>
            {matchCount > 0
              ? `You have ${matchCount} deal${matchCount !== 1 ? 's' : ''} matching your criteria. Review them below and save promising opportunities to My Deals.`
              : 'Explore the same matching, hiding, sorting, and source workflows that power the extension.'}
          </p>
          <div className="aggregator-stats">
            <button type="button" className={`aggregator-stat aggregator-stat-btn ${viewMode === 'matches' ? 'active' : ''}`} onClick={handleShowMatches}>Matches: {matchCount.toLocaleString()}</button>
            <div className="aggregator-stat">Total: {totalFromAPI != null ? `${deals.length.toLocaleString()} of ${totalFromAPI.toLocaleString()}` : deals.length.toLocaleString()} Deals</div>
            <div className="aggregator-stat">New: {newTodayCount.toLocaleString()} Added Today</div>
            <div className="aggregator-stat">Showing: {filteredDeals.length.toLocaleString()} of {deals.length.toLocaleString()}</div>
            {loadingMore && <div className="aggregator-stat aggregator-stat--loading" aria-live="polite">Loading more…</div>}
            <div className="aggregator-stat">Sources: {(1 + customSources.filter((source) => source.enabled !== false).length).toLocaleString()} Active</div>
            <button type="button" className={`aggregator-stat aggregator-stat-btn ${viewMode === 'hidden' ? 'active' : ''}`} onClick={handleShowHidden}>Hidden: {hiddenDealIds.length.toLocaleString()}</button>
          </div>
        </div>
        <div className="aggregator-welcome__buybox">
          <h3 className="aggregator-welcome__buybox-title">Buy box</h3>
          {!hasAnyCriteria ? (
            <p className="aggregator-welcome__buybox-empty">No criteria set. Configure in Buy Box.</p>
          ) : (
            <dl className="aggregator-welcome__buybox-list">
              {(buyBox.minPrice != null || buyBox.maxPrice != null) && (
                <>
                  <dt>Price</dt>
                  <dd>{fmt(effectiveMin(buyBox.minPrice)) ?? '—'} – {fmt(effectiveMax(buyBox.maxPrice)) ?? '—'}</dd>
                </>
              )}
              {(buyBox.minEbitda != null || buyBox.maxEbitda != null) && (
                <>
                  <dt>EBITDA</dt>
                  <dd>{fmt(effectiveMin(buyBox.minEbitda)) ?? '—'} – {fmt(effectiveMax(buyBox.maxEbitda)) ?? '—'}</dd>
                </>
              )}
              {(buyBox.minRevenue != null || buyBox.maxRevenue != null) && (
                <>
                  <dt>Revenue</dt>
                  <dd>{fmt(effectiveMin(buyBox.minRevenue)) ?? '—'} – {fmt(effectiveMax(buyBox.maxRevenue)) ?? '—'}</dd>
                </>
              )}
              {buyBox.revenueMultiple != null && (
                <>
                  <dt>Rev multiple</dt>
                  <dd>≤ {fmtMult(effectiveMax(buyBox.revenueMultiple))}</dd>
                </>
              )}
              {flexPct > 0 && hasAnyCriteria && (
                <>
                  <dt>Flexibility</dt>
                  <dd>{flexPct}% (near matches included)</dd>
                </>
              )}
            </dl>
          )}
        </div>
      </div>

      <div className="aggregator-table-container active">
        <div className="aggregator-controls">
          <div className="controls-row">
            <div className="aggregator-search">
              <input
                type="text"
                placeholder="Search: name, location, industry… Use & for AND (e.g. Relocatable & Fedex & HVAC)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                aria-label="Search deals; use & to require multiple keywords"
              />
            </div>

            <div className="view-style-toggle" role="group" aria-label="View style">
              <button type="button" className={`toolbar-btn ${dealViewStyle === 'table' ? 'active' : ''}`} onClick={() => handleViewStyleChange('table')}>Table</button>
              <button type="button" className={`toolbar-btn ${dealViewStyle === 'card' ? 'active' : ''}`} onClick={() => handleViewStyleChange('card')}>Card</button>
            </div>
            {dealViewStyle === 'card' && (
              <>
                <label className="card-sort-label">
                  <span className="card-sort-label-text">Sort:</span>
                  <select
                    className="card-sort-select"
                    value={getCardSortValue(sortConfig)}
                    onChange={handleCardSortChange}
                    aria-label="Sort cards by"
                  >
                    {CARD_SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <div className="card-cols-wrapper" ref={cardColsPopupRef}>
                  <button
                    type="button"
                    className="toolbar-btn card-cols-trigger"
                    onClick={() => setShowCardColsPopup((v) => !v)}
                    aria-expanded={showCardColsPopup}
                    aria-label="Cards per row"
                  >
                    ⊞ {cardColumnsPerRow} cols
                  </button>
                  {showCardColsPopup && (
                    <div className="card-cols-popup" role="listbox" aria-label="Cards per row">
                      {[2, 3, 4, 6, 8].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="option"
                          aria-selected={cardColumnsPerRow === n}
                          className={`card-cols-option${cardColumnsPerRow === n ? ' active' : ''}`}
                          onClick={() => handleCardColumnsPerRowChange(n)}
                        >
                          <span className="card-cols-option-blocks" aria-hidden="true">
                            {Array.from({ length: n }, (_, i) => <span key={i} className="card-cols-block" />)}
                          </span>
                          <span className="card-cols-option-label">{n}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            <button type="button" className="toolbar-btn" onClick={() => setShowColumnsPanel((current) => !current)}>
              Columns
            </button>
            <label className="show-hidden-toggle">
              <input
                type="checkbox"
                checked={showHiddenDeals}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setShowHiddenDeals(checked);
                  setViewMode(checked ? 'hidden' : 'matches');
                }}
              />
              <span>{showHiddenDeals ? 'Showing Hidden Deals' : `Show Hidden (${hiddenDealIds.length})`}</span>
            </label>
            <label className="flexibility-label">
              <span className="flexibility-label-text">Flexibility</span>
              <select
                className="flexibility-select"
                value={flexibilitySelectValue}
                onChange={handleFlexibilitySelectChange}
                aria-label="Match flexibility (include near matches)"
              >
                {FLEXIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {flexibilitySelectValue === 'custom' && (
                <input
                  type="number"
                  className="flexibility-custom-input"
                  min={0}
                  max={100}
                  value={customFlexibilityInput !== '' ? customFlexibilityInput : String(flexibilityPercent)}
                  onChange={(e) => setCustomFlexibilityInput(e.target.value)}
                  onBlur={handleCustomFlexibilityBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCustomFlexibilityBlur(); }}
                  aria-label="Custom flexibility percent"
                />
              )}
            </label>
          </div>

          {showColumnsPanel && (
            <div className="column-visibility-panel">
              <div className="column-visibility-header">
                <span>Show/Hide Columns:</span>
                <button type="button" className="column-close-btn" onClick={() => setShowColumnsPanel(false)}>
                  ×
                </button>
              </div>
              <div className="column-checkboxes">
                {Object.entries(COLUMN_CONFIG).map(([columnId, config]) => (
                  <label key={columnId}>
                    <input
                      type="checkbox"
                      checked={visibleColumns[columnId] !== false}
                      disabled={config.required}
                      onChange={() => toggleColumn(columnId)}
                    />
                    {config.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={`exclude-keywords-section${!showExcludeSection ? ' exclude-keywords-section--collapsed' : ''}`}>
            <div className="exclude-header">
              <button
                type="button"
                className="exclude-label exclude-label-toggle"
                onClick={() => setShowExcludeSection((v) => !v)}
                aria-expanded={showExcludeSection}
              >
                {showExcludeSection ? '▼' : '▶'} Exclude Keywords:
              </button>
              <div className="exclude-list-controls">
                <select
                  value={currentSelectedList}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) {
                      setCurrentSelectedList('');
                      updateUserFilterSettings({ currentExcludeList: '' });
                      return;
                    }
                    handleLoadExcludeList(value);
                  }}
                >
                  <option value="">-- Select List --</option>
                  {Object.keys(savedExcludeLists).sort().map((name) => (
                    <option key={name} value={name}>
                      {name} ({savedExcludeLists[name].length})
                    </option>
                  ))}
                </select>
                <button type="button" className="exclude-btn" onClick={handleSaveExcludeList}>
                  Save List
                </button>
                <button type="button" className="exclude-btn" onClick={handleUpdateExcludeList} disabled={!currentSelectedList}>
                  Update
                </button>
                <button type="button" className="exclude-btn" onClick={handleDeleteExcludeList} disabled={!currentSelectedList}>
                  Delete
                </button>
                <button type="button" className="exclude-btn exclude-btn-clear" onClick={handleClearExcludeKeywords}>
                  Clear All
                </button>
              </div>
            </div>
            {showExcludeSection && (
            <div className="exclude-content">
              <div className="exclude-input-row">
                <input
                  type="text"
                  value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExcludeKeyword();
                    }
                  }}
                  placeholder="Type keyword and press Enter..."
                />
                <button type="button" className="exclude-add-btn" onClick={handleAddExcludeKeyword}>
                  Add
                </button>
              </div>
              <div className="exclude-tags">
                {excludeKeywords.length === 0 ? (
                  <span className="exclude-empty-text">No keywords excluded.</span>
                ) : (
                  excludeKeywords.map((keyword) => (
                    <span key={keyword} className="exclude-tag">
                      {keyword}
                      <button
                        type="button"
                        className="exclude-tag-remove"
                        onClick={() => handleRemoveExcludeKeyword(keyword)}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
            )}
          </div>
        </div>

        {dealViewStyle === 'table' && (
          <div className="sort-tip">
            💡 <strong>Sorting tip:</strong> Click a column to sort. Hold <kbd>Shift</kbd> + click to add multi-level sorting like the extension.
          </div>
        )}

        {dealViewStyle === 'table' && (
        <div className="aggregator-table-scroll">
          <table className="aggregator-table">
            <thead>
              <tr>
                {renderHeaderCell('name', 'NAME', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('date', 'DATE ADDED', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('industry', 'INDUSTRY', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('description', 'DESCRIPTION', visibleColumns, sortConfig, handleSort, false)}
                {renderHeaderCell('city', 'CITY', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('county', 'COUNTY', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('state', 'STATE', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('country', 'COUNTRY', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('yearsEstablished', 'YEARS ESTABLISHED', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('ebitda', 'ANNUAL PROFIT', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('revenue', 'ANNUAL REVENUE', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('price', 'ASKING PRICE', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('profitMultiple', 'PROFIT MULTIPLE', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('revenueMultiple', 'REVENUE MULTIPLE', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('remote', 'REMOTE', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('franchise', 'FRANCHISE', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('fiveYearsInBusiness', '5+ YEARS IN BUSINESS', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('broker', 'BROKER', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('brokerCompany', 'BROKER COMPANY', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('brokerPhone', 'BROKER CONTACT', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('brokerEmail', 'BROKER EMAIL', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('location', 'LOCATION', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('source', 'SOURCE', visibleColumns, sortConfig, handleSort)}
                {renderHeaderCell('url', 'LISTING URL', visibleColumns, sortConfig, handleSort)}
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={Object.keys(COLUMN_CONFIG).filter((columnId) => visibleColumns[columnId] !== false).length + 1} className="table-empty-cell">No deals found. Try adjusting your filters or search.</td>
                </tr>
              ) : (
                dealsToShow.map((deal) => {
                  const isHidden = hiddenDealIds.includes(deal.id);
                  return (
                  <tr key={deal.id} className={isHidden ? 'deal-row-hidden' : ''} onClick={() => setSelectedDeal(deal)}>
                    {visibleColumns.name !== false && (
                      <td className="deal-name-cell" data-col="name">
                        <div className="deal-name-primary">{deal.name || 'Unnamed Business'}</div>
                      </td>
                    )}
                    {visibleColumns.date !== false && <td data-col="date">{formatDate(deal.discoveredAt)}</td>}
                    {visibleColumns.industry !== false && <td data-col="industry">{deal.industry || '—'}</td>}
                    {visibleColumns.description !== false && (
                      <td data-col="description" className="description-col">
                        {deal.description ? `${deal.description.substring(0, 120)}${deal.description.length > 120 ? '...' : ''}` : '—'}
                      </td>
                    )}
                    {visibleColumns.city !== false && <td data-col="city">{deal.city || '—'}</td>}
                    {visibleColumns.county !== false && <td data-col="county">{deal.county || '—'}</td>}
                    {visibleColumns.state !== false && <td data-col="state">{deal.state || '—'}</td>}
                    {visibleColumns.country !== false && <td data-col="country">{deal.country || '—'}</td>}
                    {visibleColumns.yearsEstablished !== false && <td data-col="yearsEstablished">{deal.yearsEstablished || '—'}</td>}
                    {visibleColumns.ebitda !== false && <td className="money-cell" data-col="ebitda">{formatMoney(deal.ebitda)}</td>}
                    {visibleColumns.revenue !== false && <td data-col="revenue">{formatMoney(deal.revenue)}</td>}
                    {visibleColumns.price !== false && <td data-col="price">{formatMoney(deal.askingPrice)}</td>}
                    {visibleColumns.profitMultiple !== false && <td data-col="profitMultiple">{formatRatio(deal.profitMultiple)}</td>}
                    {visibleColumns.revenueMultiple !== false && <td data-col="revenueMultiple">{formatRatio(deal.revenueMultiple)}</td>}
                    {visibleColumns.remote !== false && <td data-col="remote">{deal.remote || '—'}</td>}
                    {visibleColumns.franchise !== false && <td data-col="franchise">{deal.franchise || '—'}</td>}
                    {visibleColumns.fiveYearsInBusiness !== false && <td data-col="fiveYearsInBusiness">{deal.fiveYearsInBusiness || '—'}</td>}
                    {visibleColumns.broker !== false && <td data-col="broker">{deal.broker || '—'}</td>}
                    {visibleColumns.brokerCompany !== false && <td data-col="brokerCompany">{deal.brokerCompany || '—'}</td>}
                    {visibleColumns.brokerPhone !== false && <td data-col="brokerPhone">{deal.brokerPhone || '—'}</td>}
                    {visibleColumns.brokerEmail !== false && <td data-col="brokerEmail">{deal.brokerEmail || '—'}</td>}
                    {visibleColumns.location !== false && <td data-col="location">{deal.location || '—'}</td>}
                    {visibleColumns.source !== false && <td data-col="source">{deal.source || '—'}</td>}
                    {visibleColumns.url !== false && (
                      <td data-col="url" className="url-col">
                        {deal.url ? (
                          <a href={deal.url} target="_blank" rel="noopener noreferrer" className="table-link">
                            Open
                          </a>
                        ) : '—'}
                      </td>
                    )}
                    <td>
                      <div className="table-actions">
                        <button onClick={(event) => { event.stopPropagation(); handleSaveDeal(deal); }} className="btn-save">Save</button>
                        <button onClick={(event) => { event.stopPropagation(); handleToggleHidden(deal.id); }} className="btn-save btn-hide">{isHidden ? 'Unhide' : 'Hide'}</button>
                      </div>
                    </td>
                  </tr>
                );})
              )}
            </tbody>
          </table>
          {hasMultiplePages && (
            <div className="aggregator-pagination">
              <button type="button" className="aggregator-pagination-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} aria-label="Previous page">
                Previous
              </button>
              <div className="aggregator-pagination-pages" role="navigation" aria-label="Page navigation">
                {getPaginationPages(currentPage, totalPages).map((page, i) =>
                  page === '…' ? (
                    <span key={`ellipsis-${i}`} className="aggregator-pagination-ellipsis">…</span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      className={`aggregator-pagination-num ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Page ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
              <button type="button" className="aggregator-pagination-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} aria-label="Next page">
                Next
              </button>
              <span className="aggregator-pagination-label">Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}</span>
            </div>
          )}
        </div>
        )}

        {dealViewStyle === 'card' && (
          <div className="aggregator-cards-scroll">
            <div className="aggregator-cards-grid" data-cols={cardColumnsPerRow}>
              {filteredDeals.length === 0 ? (
                <div className="aggregator-cards-empty">No deals found. Try adjusting your filters or search.</div>
              ) : (
                dealsToShow.map((deal) => {
                  const isHidden = hiddenDealIds.includes(deal.id);
                  const subtitle = [deal.industry, deal.location].filter(Boolean).join(' in ') || deal.description?.slice(0, 80) || '—';
                  return (
                    <SwipeableDealCard
                      key={deal.id}
                      deal={deal}
                      isHidden={isHidden}
                      onHide={handleToggleHidden}
                      onLike={handleSaveDeal}
                      onTap={setSelectedDeal}
                      enableSwipe={isMobileViewport}
                    >
                      <div className="deal-card__header">
                        <h3 className="deal-card__name">{deal.name || 'Unnamed Business'}</h3>
                        <div className="deal-card__actions">
                          <button type="button" className="deal-card__btn deal-card__btn-save" onClick={(e) => { e.stopPropagation(); handleSaveDeal(deal); }} title="Save to My Deals" aria-label="Save to My Deals">♡</button>
                          <button type="button" className="deal-card__btn deal-card__btn-hide" onClick={(e) => { e.stopPropagation(); handleToggleHidden(deal.id); }} title={isHidden ? 'Unhide' : 'Hide'} aria-label={isHidden ? 'Unhide' : 'Hide'}>{isHidden ? 'Unhide' : 'Hide'}</button>
                        </div>
                      </div>
                      <p className="deal-card__subtitle">{subtitle}{subtitle.length >= 80 ? '...' : ''}</p>
                      <div className="deal-card__metrics">
                        <div className="deal-card__metric">
                          <span className="deal-card__metric-value" title={formatMoney(deal.askingPrice)}>{formatMoneyShort(deal.askingPrice)}</span>
                          <span className="deal-card__metric-label">Asking Price</span>
                        </div>
                        <div className="deal-card__metric">
                          <span className="deal-card__metric-value" title={formatMoney(deal.revenue)}>{formatMoneyShort(deal.revenue)}</span>
                          <span className="deal-card__metric-label">Gross Revenue</span>
                        </div>
                        <div className="deal-card__metric">
                          <span className="deal-card__metric-value" title={formatMoney(deal.ebitda)}>{formatMoneyShort(deal.ebitda)}</span>
                          <span className="deal-card__metric-label">Adj. Cash Flow</span>
                        </div>
                        <div className="deal-card__metric">
                          <span className="deal-card__metric-value">{deal.profitMultiple != null ? `${formatRatio(deal.profitMultiple)}X` : '—'}</span>
                          <span className="deal-card__metric-label">C.F. Multiple</span>
                        </div>
                      </div>
                    </SwipeableDealCard>
                  );
                })
              )}
            </div>
            {hasMultiplePages && (
              <div className="aggregator-pagination">
                <button type="button" className="aggregator-pagination-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} aria-label="Previous page">
                  Previous
                </button>
                <div className="aggregator-pagination-pages" role="navigation" aria-label="Page navigation">
                  {getPaginationPages(currentPage, totalPages).map((page, i) =>
                    page === '…' ? (
                      <span key={`ellipsis-${i}`} className="aggregator-pagination-ellipsis">…</span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        className={`aggregator-pagination-num ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>
                <button type="button" className="aggregator-pagination-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} aria-label="Next page">
                  Next
                </button>
                <span className="aggregator-pagination-label">Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <DealDetailsPanel
        isOpen={Boolean(selectedDeal)}
        deal={selectedDeal}
        position={dealPanelPosition}
        onClose={() => setSelectedDeal(null)}
        onSaveDeal={handleSaveDeal}
        isSavingDeal={savingDealId != null && selectedDeal?.id === savingDealId}
        onPositionChange={handleDealPanelPositionChange}
        settings={settings}
        onSaveCalculatorDefaults={handleSaveCalculatorDefaults}
      />
      {saveToast && (
        <div className="save-toast" role="status" aria-live="polite">
          {saveToast}
        </div>
      )}
    </div>
  );
}

function formatMoney(value) {
  if (!value) return '—';
  return `$${value.toLocaleString()}`;
}

/** Compact form for card metrics: e.g. 1100000 → $1.1M, 399000 → $399K */
function formatMoneyShort(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `$${m}M` : `$${m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return k % 1 === 0 ? `$${k}K` : `$${k.toFixed(1)}K`;
  }
  return `$${n.toLocaleString()}`;
}

function formatRatio(value) {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isNaN(numeric) ? '—' : numeric.toFixed(2);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function normalizeRows(rows, { sourceName, sourceType }) {
  return rows
    .filter((row) => Object.values(row || {}).some((value) => value && String(value).trim()))
    .map((row, index) => normalizeRow(row, index, sourceName, sourceType));
}

function normalizeRow(row, index, sourceName, sourceType) {
  const url = row['Parsed URL'] || row['View Listing'] || row['URL'] || row['Link'] || row['Listing URL'] || row.url || '';
  const name = row['Name'] || row['Business Name'] || row['Deal Name'] || row['Title'] || row.name || `Deal ${index + 1}`;
  const city = row['City'] || row.city || '';
  const state = row['State'] || row.state || '';
  const location = (city && state) ? `${city}, ${state}` : (city || state || row['Location'] || row.location || '');
  const brokerName = row['Broker Name'] || row.brokerName || '';
  const brokerCompany = row['Broker Company'] || row.brokerCompany || '';
  const broker = brokerName && brokerCompany ? `${brokerName} (${brokerCompany})` : (brokerName || brokerCompany);
  const ebitda = parsePrice(row['Annual Profit'] || row.ebitda);
  const revenue = parsePrice(row['Annual Revenue'] || row.revenue);
  const askingPrice = parsePrice(row['Asking Price'] || row.askingPrice);

  return {
    id: row.id || generateDealId(url || name || `${sourceType}_${index}`),
    name,
    url,
    industry: row['Industry'] || row.industry || '',
    description: row['Description'] || row.description || '',
    location,
    city,
    state,
    county: row['County'] || row.county || '',
    country: row['Country'] || row.country || '',
    yearsEstablished: row['Years Established'] || row.yearsEstablished || '',
    ebitda,
    revenue,
    askingPrice,
    profitMultiple: row['Profit Multiple'] ? parseFloat(row['Profit Multiple']) : computeMultiple(askingPrice, ebitda),
    revenueMultiple: row['Revenue Multiple'] ? parseFloat(row['Revenue Multiple']) : computeMultiple(askingPrice, revenue),
    remote: row['Remote/Relocatable/Absentee-Run'] || row.remote || '',
    franchise: row['Franchise'] || row.franchise || '',
    fiveYearsInBusiness: row['5+ Years In Business'] || row.fiveYearsInBusiness || '',
    broker,
    brokerName,
    brokerCompany,
    brokerPhone: row['Broker Contact'] || row.brokerPhone || '',
    brokerEmail: row['Broker Email'] || row.brokerEmail || '',
    source: row.Source || row.source || sourceName,
    sourceType,
    discoveredAt: row['Date Added'] ? new Date(row['Date Added']).getTime() : (row.discoveredAt || Date.now()),
    rawColumns: row
  };
}

async function persistCustomSources(customSources, onSettingsUpdate) {
  await userAPI.updateSettings({ customSources });
  if (typeof onSettingsUpdate === 'function') {
    await onSettingsUpdate();
  }
}

async function refreshCachedCustomSources(customSources) {
  const enabledSources = customSources.filter((source) => source.enabled !== false);
  const refreshedSources = await Promise.all(
    enabledSources.map(async (source) => {
      if (source.type === 'manual') {
        return {
          ...source,
          lastFetchedAt: source.lastFetchedAt || Date.now(),
          dealCount: source.deal ? 1 : (source.dealCount || 0)
        };
      }

      try {
        const deals = await fetchCustomSourceDeals(source);
        return {
          ...source,
          cachedDeals: deals,
          lastFetchedAt: Date.now(),
          dealCount: deals.length,
          lastError: null
        };
      } catch (error) {
        console.error(`Failed to refresh ${source.name}:`, error);
        return {
          ...source,
          lastError: error.message
        };
      }
    })
  );

  const refreshedById = new Map(refreshedSources.map((source) => [source.id, source]));
  return customSources.map((source) => refreshedById.get(source.id) || source);
}

function getCachedCustomDeals(customSources) {
  return customSources
    .filter((source) => source.enabled !== false)
    .flatMap((source) => {
      if (source.type === 'manual' && source.deal) {
        return [normalizeRow(source.deal, 0, source.name, 'manual')];
      }

      if (!Array.isArray(source.cachedDeals)) {
        return [];
      }

      return source.cachedDeals.map((deal, index) => normalizeRow(deal, index, source.name, source.type));
    });
}

function shouldRefreshCustomSources(customSources) {
  const refreshableSources = customSources.filter(
    (source) => source.enabled !== false && source.type !== 'manual'
  );

  if (refreshableSources.length === 0) {
    return false;
  }

  return refreshableSources.some((source) => {
    if (!source.lastFetchedAt || !Array.isArray(source.cachedDeals)) {
      return true;
    }
    return (Date.now() - source.lastFetchedAt) >= CUSTOM_SOURCE_REFRESH_MS;
  });
}

async function fetchCustomSourceDeals(source) {
  if (source.type === 'manual' && source.deal) {
    return [normalizeRow(source.deal, 0, source.name, 'manual')];
  }

  if (source.type === 'google_sheets') {
    const exportUrl = parseGoogleSheetsUrl(source.url);
    const response = await fetch(exportUrl);
    if (!response.ok) throw new Error(`Source fetch failed (${response.status})`);
    return normalizeRows(parseCSV(await response.text()), { sourceName: source.name, sourceType: source.type });
  }

  if (source.type === 'csv_url') {
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`Source fetch failed (${response.status})`);
    return normalizeRows(parseCSV(await response.text()), { sourceName: source.name, sourceType: source.type });
  }

  return [];
}

function parseGoogleSheetsUrl(url) {
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  const publishedMatch = url.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (publishedMatch) {
    return `https://docs.google.com/spreadsheets/d/e/${publishedMatch[1]}/pub?gid=${gid}&single=true&output=csv`;
  }
  const sheetMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetMatch) throw new Error('Invalid Google Sheets URL');
  return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv&gid=${gid}`;
}

/** Normalize URL for dedupe: same listing may appear with different fragments or casing. */
function normalizeUrlForDedupe(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  const withoutHash = u.split('#')[0];
  return withoutHash.toLowerCase();
}

/** Dedupe key: prefer normalized URL (same listing = same URL), fallback to id. */
function getDealDedupeKey(deal) {
  const norm = normalizeUrlForDedupe(deal.url);
  if (norm) return `url:${norm}`;
  return `id:${deal.id}`;
}

/** Dedupe the aggregator feed by listing identity (URL or id); keep the newest by discoveredAt.
 *  Does not touch saved deals storage — saved deals are stored and matched separately (backend). */
function dedupeDeals(items) {
  const byKey = new Map();
  items.forEach((deal) => {
    const key = getDealDedupeKey(deal);
    const existing = byKey.get(key);
    const dealTime = deal.discoveredAt ? new Date(deal.discoveredAt).getTime() : 0;
    const existingTime = existing?.discoveredAt ? new Date(existing.discoveredAt).getTime() : 0;
    if (!existing || dealTime >= existingTime) {
      byKey.set(key, deal);
    }
  });
  return Array.from(byKey.values());
}

function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parsePrice(priceStr) {
  if (priceStr === null || priceStr === undefined || priceStr === '') return null;
  if (typeof priceStr === 'number') return priceStr;

  const cleaned = String(priceStr).replace(/[$,€£]/g, '').trim().toLowerCase();

  let multiplier = 1;
  if (cleaned.includes('k')) {
    multiplier = 1000;
  } else if (cleaned.includes('m')) {
    multiplier = 1000000;
  }

  const number = parseFloat(cleaned.replace(/[km]/g, ''));
  return Number.isNaN(number) ? null : number * multiplier;
}

function computeMultiple(price, base) {
  if (!price || !base) return null;
  return Number((price / base).toFixed(2));
}

function generateDealId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return `custom_${Math.abs(hash).toString(36)}`;
}

function loadVisibleColumns() {
  try {
    const saved = localStorage.getItem('vettr_visible_columns');
    return saved ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

function loadSavedSortConfig() {
  try {
    const saved = localStorage.getItem('vettr_aggregator_sort');
    return saved ? JSON.parse(saved) : DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

function renderHeaderCell(columnId, label, visibleColumns, sortConfig, handleSort, sortable = true) {
  if (visibleColumns[columnId] === false) return null;

  const sortIndex = sortConfig.findIndex((sort) => sort.field === columnId);
  const sortMeta = sortIndex >= 0 ? sortConfig[sortIndex] : null;
  const classes = [
    sortable ? 'sortable' : '',
    sortMeta ? `sorted-${sortMeta.direction}` : ''
  ].filter(Boolean).join(' ');

  return (
    <th
      key={columnId}
      data-col={columnId}
      data-sort={columnId}
      className={classes}
      onClick={sortable ? (event) => handleSort(columnId, event.shiftKey) : undefined}
      title={sortable ? 'Click to sort. Shift+Click for multi-sort.' : undefined}
    >
      <span>{label}</span>
      {sortMeta && <span className="sort-priority">{sortIndex + 1}</span>}
    </th>
  );
}

function sortAggregatorDeals(deals, sortConfig) {
  const sorted = [...deals];

  sorted.sort((a, b) => {
    for (let i = 0; i < sortConfig.length; i += 1) {
      const sort = sortConfig[i];
      const aVal = getSortValue(a, sort.field);
      const bVal = getSortValue(b, sort.field);

      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
    }

    return 0;
  });

  return sorted;
}

function getSortValue(deal, field) {
  switch (field) {
    case 'name':
      return (deal.name || '').toLowerCase();
    case 'price':
      return deal.askingPrice || 0;
    case 'ebitda':
      return deal.ebitda || 0;
    case 'revenue':
      return deal.revenue || 0;
    case 'location':
      return (deal.location || deal.city || '').toLowerCase();
    case 'industry':
      return (deal.industry || '').toLowerCase();
    case 'source':
      return (deal.source || '').toLowerCase();
    case 'date':
      return deal.discoveredAt || 0;
    case 'description':
      return (deal.description || '').toLowerCase();
    case 'city':
      return (deal.city || '').toLowerCase();
    case 'county':
      return (deal.county || '').toLowerCase();
    case 'state':
      return (deal.state || '').toLowerCase();
    case 'country':
      return (deal.country || '').toLowerCase();
    case 'yearsEstablished':
      return parseInt(deal.yearsEstablished, 10) || 0;
    case 'profitMultiple':
      return deal.profitMultiple || 0;
    case 'revenueMultiple':
      return deal.revenueMultiple || 0;
    case 'remote':
      return (deal.remote || '').toLowerCase();
    case 'franchise':
      return (deal.franchise || '').toLowerCase();
    case 'fiveYearsInBusiness':
      return (deal.fiveYearsInBusiness || '').toLowerCase();
    case 'broker':
      return (deal.broker || deal.brokerName || '').toLowerCase();
    case 'brokerCompany':
      return (deal.brokerCompany || '').toLowerCase();
    case 'brokerPhone':
      return (deal.brokerPhone || '').toLowerCase();
    case 'brokerEmail':
      return (deal.brokerEmail || '').toLowerCase();
    case 'url':
      return (deal.url || '').toLowerCase();
    default:
      return (deal[field] || '').toString().toLowerCase();
  }
}

