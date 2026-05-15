import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dealsAPI, userAPI } from '../utils/api';
import { loadCalculatorState, saveCalculatorState } from '../utils/dealCalculatorStorage';
import {
  fetchMarketDeals,
  fetchMarketDealsStats,
  fetchMarketDealByDbId,
  buildMarketDealsParams,
  mapSortField,
  encodeMarketDealsSortSpec,
  normalizeGeoScalar
} from '../utils/normalizeMarketDeal';
import {
  criteriaFromSlot,
  defaultBuyBoxSlotName,
  mergeActiveSlotFeedPatch,
  normalizeBuyBoxesState,
  patchActiveBuyBoxFlexibility
} from '../utils/buyBoxes';
import DealDetailsPanel from './DealDetailsPanel';

const PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 300;
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

/** First direction when adding a column via Shift+click (numeric/date: high/newest first). */
function defaultDirectionForNewSortField(field) {
  const descFirst = new Set([
    'date',
    'price',
    'ebitda',
    'revenue',
    'profitMultiple',
    'revenueMultiple',
    'yearsEstablished'
  ]);
  return descFirst.has(field) ? 'desc' : 'asc';
}

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

const CARD_COLUMNS_OPTIONS = [1, 2, 3, 4, 6, 8];
const DEFAULT_CARD_COLUMNS = 4;

/** State for card metrics; else city, county, country; then combined location line. */
function cardMetricLocation(deal) {
  const state = normalizeGeoScalar(deal?.state);
  if (state) return { label: 'State', value: state };
  const city = normalizeGeoScalar(deal?.city);
  if (city) return { label: 'City', value: city };
  const county = normalizeGeoScalar(deal?.county);
  if (county) return { label: 'County', value: county };
  const country = normalizeGeoScalar(deal?.country);
  if (country) return { label: 'Country', value: country };
  const locationLine = normalizeGeoScalar(deal?.location);
  if (locationLine) return { label: 'Location', value: locationLine };
  return null;
}

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

/** Collapse whitespace for card description text. */
function normalizeCardDescription(description) {
  if (description == null) return '';
  return String(description).replace(/\s+/g, ' ').trim();
}

/**
 * First `maxSentences` sentences for card preview (split on . ! ? followed by space).
 * Appends … when there are more sentences. `full` is the full normalized string for tooltips.
 */
function cardViewDescriptionPreview(description, maxSentences = 4) {
  const full = normalizeCardDescription(description);
  if (!full) return { preview: '', full: '', truncated: false };
  const sentences = full.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  if (sentences.length === 0) return { preview: full, full, truncated: false };
  if (sentences.length <= maxSentences) {
    return { preview: sentences.join(' '), full, truncated: false };
  }
  return {
    preview: `${sentences.slice(0, maxSentences).join(' ')} …`,
    full,
    truncated: true
  };
}

/** Stored in hidden_deal_ids for market rows; maps 1:1 to market_deals.id (PK). */
function marketDealHiddenToken(dbId) {
  const n = Number(dbId);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `md:${n}`;
}

/**
 * Map a stored hidden id to market_deals.id for exclude_ids.
 * Supports md:<pk> and plain numeric legacy entries. Never guesses PK from composite deal.id
 * (trailing digits are often source_id, not the DB row).
 */
function hiddenDealIdToDbId(hiddenId) {
  if (hiddenId == null) return null;
  if (typeof hiddenId === 'number' && Number.isFinite(hiddenId) && hiddenId > 0) return hiddenId;
  const s = String(hiddenId);
  if (s.startsWith('md:')) {
    const n = Number(s.slice(3));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function isDealHidden(deal, hiddenDealIds) {
  if (!hiddenDealIds || hiddenDealIds.length === 0) return false;
  if (hiddenDealIds.includes(deal.id)) return true;
  const md = marketDealHiddenToken(deal.dbId);
  return Boolean(md && hiddenDealIds.includes(md));
}

/** One list entry per hidden deal for new hides (prefer stable DB PK when present). */
function hiddenStorageTokenForDeal(deal) {
  return marketDealHiddenToken(deal.dbId) || deal.id;
}

/** Tokens to remove on unhide (covers legacy composite-only rows). */
function hiddenStorageTokensForDeal(deal) {
  const tokens = new Set();
  if (deal.id != null && deal.id !== '') tokens.add(deal.id);
  const md = marketDealHiddenToken(deal.dbId);
  if (md) tokens.add(md);
  return tokens;
}

function isDealInSavedList(deal, savedIdSet) {
  if (!deal?.id || !savedIdSet?.size) return false;
  const key = String(deal.id);
  return savedIdSet.has(key);
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
      onHide(deal);
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
          Like
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
  onConfigureBuyBox,
  feedSource = 'airtable',
  savedDealIds = [],
  savedRowIdByMarketDealId = {},
  poolNewDealsFilter = null,
  onClearPoolNewDealsFilter
}) {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState(settings?.excludeKeywords || []);
  const [savedExcludeLists, setSavedExcludeLists] = useState(settings?.excludeLists || {});
  const [currentSelectedList, setCurrentSelectedList] = useState(settings?.currentExcludeList || '');
  const [hiddenDealIds, setHiddenDealIds] = useState(settings?.hiddenDealIds || []);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dealPanelPosition, setDealPanelPosition] = useState(settings?.preferences?.dealPanelPosition || 'center');
  const [showHiddenDeals, setShowHiddenDeals] = useState(false);
  const [viewMode, setViewMode] = useState('matches');
  const [excludeInput, setExcludeInput] = useState('');
  const [sortConfig, setSortConfig] = useState(() => loadSavedSortConfig());
  const [visibleColumns, setVisibleColumns] = useState(() => loadVisibleColumns());
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [showExcludeSection, setShowExcludeSection] = useState(false);
  const [dealViewStyle, setDealViewStyle] = useState(settings?.dealViewStyle || 'table');
  const [customFlexibilityInput, setCustomFlexibilityInput] = useState('');
  const [saveToast, setSaveToast] = useState(null);
  const [savingDealId, setSavingDealId] = useState(null);
  const [buyBoxSwitching, setBuyBoxSwitching] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFromAPI, setTotalFromAPI] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [cardColumnsPerRow, setCardColumnsPerRow] = useState(() => {
    const v = settings?.preferences?.cardColumnsPerRow;
    return CARD_COLUMNS_OPTIONS.includes(v) ? v : DEFAULT_CARD_COLUMNS;
  });
  const [showCardColsPopup, setShowCardColsPopup] = useState(false);
  const cardColsPopupRef = useRef(null);
  const fetchAbortRef = useRef(null);
  /** Same query + manual refresh → send If-None-Match for list 304. */
  const listEtagCacheRef = useRef({ key: '', etag: '' });
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX
  );

  // List API returns truncated description; merge full row when a deal is opened.
  useEffect(() => {
    const dbId = selectedDeal?.dbId;
    if (dbId == null) return;

    const ac = new AbortController();
    (async () => {
      try {
        const full = await fetchMarketDealByDbId(dbId, ac.signal);
        if (ac.signal.aborted) return;
        setSelectedDeal((prev) => {
          if (!prev || prev.dbId !== dbId) return prev;
          return { ...prev, ...full };
        });
      } catch (err) {
        if (err?.name === 'AbortError' || ac.signal.aborted) return;
        console.warn('[DealAggregator] Full deal fetch failed:', err?.message || err);
      }
    })();

    return () => ac.abort();
  }, [selectedDeal?.dbId]);

  const excludeKeywordsFingerprint = useMemo(
    () => `${settings?.activeBuyBoxIndex ?? settings?.preferences?.activeBuyBoxIndex ?? 0}:${JSON.stringify(excludeKeywords)}`,
    [settings?.activeBuyBoxIndex, settings?.preferences?.activeBuyBoxIndex, excludeKeywords]
  );

  const poolNewFinger = useMemo(() => {
    if (!poolNewDealsFilter) return '';
    const ids = poolNewDealsFilter.dbIds || [];
    return `${ids.join(',')}|${poolNewDealsFilter.lastScrapeAt || ''}`;
  }, [poolNewDealsFilter]);

  const poolNewMode = Boolean(
    poolNewDealsFilter &&
      ((poolNewDealsFilter.dbIds && poolNewDealsFilter.dbIds.length > 0) ||
        poolNewDealsFilter.lastScrapeAt)
  );

  const savedDealIdSet = useMemo(
    () => new Set((savedDealIds || []).filter(Boolean).map((id) => String(id))),
    [savedDealIds]
  );

  const hideSavedDealsInFeed = Boolean(settings?.preferences?.hideSavedDealsInFeed);
  const showSavedHighlightInFeed = settings?.preferences?.showSavedHighlightInFeed !== false;

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const handler = () => setIsMobileViewport(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const { buyBoxes, activeBuyBoxIndex } = normalizeBuyBoxesState(settings);
    const slot = buyBoxes[activeBuyBoxIndex] || {};
    setExcludeKeywords(Array.isArray(slot.excludeKeywords) ? slot.excludeKeywords : []);
    setSavedExcludeLists(
      slot.excludeLists && typeof slot.excludeLists === 'object' && !Array.isArray(slot.excludeLists)
        ? slot.excludeLists
        : {}
    );
    setCurrentSelectedList(slot.currentExcludeList != null ? String(slot.currentExcludeList) : '');
    const q = typeof slot.feedSearch === 'string' ? slot.feedSearch : '';
    setSearchQuery(q);
    setDebouncedSearch(q);
    setHiddenDealIds(settings?.hiddenDealIds || []);
    setDealPanelPosition(settings?.preferences?.dealPanelPosition || 'center');
    setDealViewStyle(settings?.dealViewStyle || 'table');
    const cols = settings?.preferences?.cardColumnsPerRow;
    setCardColumnsPerRow(CARD_COLUMNS_OPTIONS.includes(cols) ? cols : DEFAULT_CARD_COLUMNS);
  }, [settings]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Persist search text per active buy box (no full settings refresh — avoids input flicker)
  useEffect(() => {
    if (!settings) return;
    const t = setTimeout(() => {
      const { buyBoxes, activeBuyBoxIndex } = normalizeBuyBoxesState(settings);
      const slot = buyBoxes[activeBuyBoxIndex];
      const server = typeof slot?.feedSearch === 'string' ? slot.feedSearch : '';
      if (server === debouncedSearch) return;
      const payload = mergeActiveSlotFeedPatch(settings, { feedSearch: debouncedSearch });
      userAPI.updateSettings(payload).catch((err) => {
        console.error('[DealAggregator] persist feedSearch failed:', err);
      });
    }, 900);
    return () => clearTimeout(t);
  }, [debouncedSearch, settings]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortConfig, showHiddenDeals, viewMode, excludeKeywordsFingerprint, hideSavedDealsInFeed, poolNewFinger]);

  // Persist column/sort preferences
  useEffect(() => {
    localStorage.setItem('vettr_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  useEffect(() => {
    localStorage.setItem('vettr_aggregator_sort', JSON.stringify(sortConfig));
  }, [sortConfig]);

  // ---------------------------------------------------------------------------
  // Server-side fetch: single API call per page/filter change
  // ---------------------------------------------------------------------------
  const fetchServerDeals = useCallback(async (pageOverride) => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    fetchAbortRef.current = new AbortController();
    const signal = fetchAbortRef.current.signal;

    setIsFetching(true);
    setFeedError(null);

    const buyBox = settings?.buyBox || {};
    const flexPct = Math.min(100, Math.max(0, Number(buyBox.includeNearMatchesPercent) || 0));
    const effectiveSort = sortConfig.length > 0 ? sortConfig : [{ field: 'date', direction: 'desc' }];
    const primary = effectiveSort[0];
    const primarySortCol = mapSortField(primary.field);
    const sortSpec = encodeMarketDealsSortSpec(effectiveSort);

    const hiddenDbIds = [...new Set(hiddenDealIds.map(hiddenDealIdToDbId).filter(Boolean))];

    const excludeKw = excludeKeywords;

    const sourceFilter =
      feedSource === 'airtable' ? ['airtable_bizbuysell'] : null;

    let restrictToDbIds = null;
    let firstSeenAfter = null;
    let firstSeenBefore = null;
    if (poolNewMode && poolNewDealsFilter) {
      if (poolNewDealsFilter.dbIds?.length > 0) {
        restrictToDbIds = poolNewDealsFilter.dbIds;
      } else if (poolNewDealsFilter.lastScrapeAt) {
        const end = new Date(poolNewDealsFilter.lastScrapeAt);
        if (!Number.isNaN(end.getTime())) {
          firstSeenBefore = end.toISOString();
          firstSeenAfter = new Date(end.getTime() - 12 * 60 * 60 * 1000).toISOString();
        }
      }
    }

    const params = buildMarketDealsParams({
      page: pageOverride ?? currentPage,
      perPage: PER_PAGE,
      search: debouncedSearch,
      buyBox: poolNewMode ? null : (showHiddenDeals ? null : buyBox),
      flexibilityPct: flexPct,
      sortSpec,
      sort: primarySortCol,
      order: primary.direction,
      hiddenDealDbIds: showHiddenDeals ? [] : hiddenDbIds,
      showHidden: showHiddenDeals,
      excludeKeywords: excludeKw,
      sources: sourceFilter,
      restrictToDbIds,
      firstSeenAfter,
      firstSeenBefore,
    });

    if (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      effectiveSort.length > 1 &&
      sortSpec
    ) {
      console.debug('[DealAggregator] market-deals sort_spec:', sortSpec);
    }

    const paramsKey = `${params.toString()}|${String(manualRefreshToken ?? 0)}`;
    const ifNoneMatch =
      listEtagCacheRef.current.key === paramsKey ? listEtagCacheRef.current.etag : undefined;

    try {
      const result = await fetchMarketDeals(params, signal, { ifNoneMatch });
      if (signal.aborted) return;

      if (result.notModified) {
        return;
      }

      listEtagCacheRef.current = {
        key: paramsKey,
        etag: result.etag || '',
      };

      setDeals(result.deals);
      setTotalFromAPI(result.pagination.total);
      setTotalPages(result.pagination.total_pages);

      onMatchCountUpdate(result.pagination.total);

      if (typeof onDealsStatsUpdate === 'function') {
        fetchMarketDealsStats(signal).then((stats) => {
          if (stats && !signal.aborted) {
            onDealsStatsUpdate({
              total: stats.total_deals,
              newToday: stats.new_today,
              showing: result.pagination.total,
              sources: (stats.by_source || []).length || 1,
            });
          }
        }).catch(() => {});
      }
    } catch (error) {
      if (error?.name === 'AbortError' || signal?.aborted) return;
      console.error('Failed to fetch deals:', error);
      setDeals([]);
      const msg = error?.message || 'Failed to load deals';
      setFeedError(
        msg === 'Failed to fetch'
          ? 'Failed to reach the API. Check that the backend is running.'
          : msg
      );
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [settings, debouncedSearch, sortConfig, hiddenDealIds, showHiddenDeals, currentPage, manualRefreshToken, onMatchCountUpdate, onDealsStatsUpdate, feedSource, poolNewFinger, poolNewMode, poolNewDealsFilter, excludeKeywords]);

  // Fetch on mount, filter/sort/page/search/hidden-ids change, and manual refresh
  useEffect(() => {
    if (settings) fetchServerDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when inputs to fetchServerDeals change; avoid tying to unstable parent callbacks
  }, [debouncedSearch, sortConfig, currentPage, showHiddenDeals, hiddenDealIds, settings, manualRefreshToken, poolNewFinger]);

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

  const persistActiveSlotFeed = async (patch) => {
    try {
      const payload = mergeActiveSlotFeedPatch(settings, patch);
      await userAPI.updateSettings(payload);
      if (typeof onSettingsUpdate === 'function') {
        await onSettingsUpdate();
      }
    } catch (error) {
      alert(`Failed to save filter settings: ${error.message}`);
    }
  };

  const getSavedRowIdForMarketDeal = useCallback(
    (deal) => {
      if (!deal?.id) return null;
      const rowId = savedRowIdByMarketDealId[String(deal.id)];
      return rowId != null ? rowId : null;
    },
    [savedRowIdByMarketDealId]
  );

  const handleUnsaveDeal = async (deal) => {
    const rowId = getSavedRowIdForMarketDeal(deal);
    if (rowId == null) {
      console.warn('[DealAggregator] No saved row id for market deal', deal?.id);
      alert('Could not remove this listing from My Deals. Try refreshing the page.');
      return;
    }
    setSavingDealId(deal.id);
    try {
      await dealsAPI.deleteDeal(rowId);
      setSaveToast('Removed from My Deals');
      onSaveDeal();
    } catch (error) {
      alert('Failed to remove deal: ' + error.message);
    } finally {
      setSavingDealId(null);
    }
  };

  const handleToggleSaveDeal = async (deal) => {
    if (isDealInSavedList(deal, savedDealIdSet)) {
      await handleUnsaveDeal(deal);
    } else {
      await handleSaveDeal(deal);
    }
  };

  const handleSaveDeal = async (deal) => {
    if (isDealInSavedList(deal, savedDealIdSet)) return;
    setSavingDealId(deal.id);
    try {
      const calculatorState = loadCalculatorState(deal.id);
      const data = await dealsAPI.saveDeal({
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
        brokerPhone: deal.brokerPhone,
        ...(calculatorState ? { calculatorState } : {})
      });
      if (calculatorState && data?.dealId != null) {
        saveCalculatorState(data.dealId, calculatorState);
      }
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

  const dealsToShow = useMemo(() => {
    let list;
    if (showHiddenDeals) {
      list = deals.filter((d) => isDealHidden(d, hiddenDealIds));
    } else {
      list = deals.filter((d) => !isDealHidden(d, hiddenDealIds));
    }
    if (hideSavedDealsInFeed && !showHiddenDeals) {
      list = list.filter((d) => !isDealInSavedList(d, savedDealIdSet));
    }
    return list;
  }, [deals, hiddenDealIds, showHiddenDeals, hideSavedDealsInFeed, savedDealIdSet]);

  const emptyFeedMessage = useMemo(() => {
    if (showHiddenDeals) {
      return 'No hidden listings on this page. Try another page or clear search.';
    }
    const visibleNotHidden = deals.filter((d) => !isDealHidden(d, hiddenDealIds));
    if (visibleNotHidden.length === 0) {
      return 'All listings on this page are hidden. Open Hidden or use Show hidden to review them.';
    }
    if (
      hideSavedDealsInFeed &&
      visibleNotHidden.length > 0 &&
      visibleNotHidden.every((d) => isDealInSavedList(d, savedDealIdSet))
    ) {
      return 'Every listing on this page is saved and hidden from the feed. Open My Deals, or turn off “Hide saved deals” in Settings.';
    }
    return 'All listings on this page are hidden. Open Hidden or use Show hidden to review them.';
  }, [deals, hiddenDealIds, showHiddenDeals, hideSavedDealsInFeed, savedDealIdSet]);

  const buyBoxesUiState = useMemo(() => normalizeBuyBoxesState(settings), [settings]);

  if (loading) {
    return <div className="loading">Loading deals...</div>;
  }

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
    await persistActiveSlotFeed({ excludeKeywords: nextKeywords });
  };

  const flexibilityPercent = Math.min(100, Math.max(0, Number(settings?.buyBox?.includeNearMatchesPercent) || 0));
  const flexibilityIsPreset = FLEXIBILITY_PRESETS.includes(flexibilityPercent);
  const flexibilitySelectValue = flexibilityIsPreset ? flexibilityPercent : 'custom';

  const handleBuyBoxSlotClick = async (index) => {
    const activeIdx = buyBoxesUiState.activeBuyBoxIndex;
    if (index === activeIdx || buyBoxSwitching) return;
    setBuyBoxSwitching(true);
    try {
      const { buyBoxes, activeBuyBoxIndex } = normalizeBuyBoxesState(settings);
      const next = buyBoxes.map((b, i) => {
        if (i !== activeBuyBoxIndex) return b;
        return {
          ...b,
          feedSearch: searchQuery,
          excludeKeywords: [...excludeKeywords],
          excludeLists: { ...savedExcludeLists },
          currentExcludeList: currentSelectedList || ''
        };
      });
      const newIdx = index;
      const activeSlot = next[newIdx];
      const crit = criteriaFromSlot(activeSlot);
      await userAPI.updateSettings({
        preferences: { buyBoxes: next, activeBuyBoxIndex: newIdx },
        buyBox: crit,
        excludeKeywords: Array.isArray(activeSlot.excludeKeywords) ? activeSlot.excludeKeywords : [],
        excludeLists:
          activeSlot.excludeLists && typeof activeSlot.excludeLists === 'object' && !Array.isArray(activeSlot.excludeLists)
            ? activeSlot.excludeLists
            : {},
        currentExcludeList: activeSlot.currentExcludeList || null
      });
      if (typeof onSettingsUpdate === 'function') await onSettingsUpdate();
    } catch (error) {
      alert(`Failed to switch buy box: ${error.message}`);
    } finally {
      setBuyBoxSwitching(false);
    }
  };

  const handleFlexibilityChange = async (percent) => {
    const num = Math.min(100, Math.max(0, Number(percent) || 0));
    try {
      await userAPI.updateSettings(patchActiveBuyBoxFlexibility(settings, num));
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
    await persistActiveSlotFeed({ excludeKeywords: nextKeywords });
  };

  const handleClearExcludeKeywords = async () => {
    setExcludeKeywords([]);
    setCurrentSelectedList('');
    await persistActiveSlotFeed({ excludeKeywords: [], currentExcludeList: '' });
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
    await persistActiveSlotFeed({ excludeLists: nextLists, currentExcludeList: trimmed });
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
    await persistActiveSlotFeed({ excludeLists: nextLists, currentExcludeList: '' });
  };

  const handleUpdateExcludeList = async () => {
    if (!currentSelectedList) {
      alert('Select a list to update first');
      return;
    }
    const nextLists = { ...savedExcludeLists, [currentSelectedList]: [...excludeKeywords] };
    setSavedExcludeLists(nextLists);
    await persistActiveSlotFeed({ excludeLists: nextLists, currentExcludeList: currentSelectedList });
  };

  const handleLoadExcludeList = async (listName) => {
    const nextKeywords = savedExcludeLists[listName] || [];
    setCurrentSelectedList(listName);
    setExcludeKeywords(nextKeywords);
    await persistActiveSlotFeed({ excludeKeywords: nextKeywords, currentExcludeList: listName });
  };

  const handleToggleHidden = async (deal) => {
    const tokenSet = hiddenStorageTokensForDeal(deal);
    const primary = hiddenStorageTokenForDeal(deal);
    const currentlyHidden = [...tokenSet].some((t) => hiddenDealIds.includes(t));
    const nextHiddenIds = currentlyHidden
      ? hiddenDealIds.filter((id) => !tokenSet.has(id))
      : hiddenDealIds.includes(primary)
        ? hiddenDealIds
        : [...hiddenDealIds, primary];
    setHiddenDealIds(nextHiddenIds);
    if (selectedDeal && isDealHidden(selectedDeal, nextHiddenIds) && !showHiddenDeals) {
      setSelectedDeal(null);
    }
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
    const num = CARD_COLUMNS_OPTIONS.includes(value) ? value : DEFAULT_CARD_COLUMNS;
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
        return [...current, { field, direction: defaultDirectionForNewSortField(field) }];
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
  const hasTargetStates = Array.isArray(buyBox.targetStates) && buyBox.targetStates.length > 0;
  const hasAnyCriteria =
    [
      buyBox.minPrice,
      buyBox.maxPrice,
      buyBox.minEbitda,
      buyBox.maxEbitda,
      buyBox.minRevenue,
      buyBox.maxRevenue,
      buyBox.revenueMultiple
    ].some((v) => v != null && v !== '') || hasTargetStates;
  const showBuyBoxConfigureHint = Boolean(settings) && !hasAnyCriteria;
  const effectiveMax = (limit) => (limit != null && flexPct > 0 ? limit * (1 + flexPct / 100) : limit);
  const effectiveMin = (limit) => (limit != null && flexPct > 0 ? limit * (1 - flexPct / 100) : limit);
  const fmt = (n) => (n != null ? `$${Number(n).toLocaleString()}` : null);
  const fmtMult = (n) => (n != null ? `${Number(n)}×` : null);

  const hasMultiplePages = totalPages > 1;

  return (
    <div className="deal-aggregator">
      {feedError && (
        <div className="aggregator-feed-error" role="alert">
          {feedError}
        </div>
      )}
      {poolNewMode && (
        <div className="pool-new-deals-banner" role="region" aria-label="New pool listings filter">
          <p>
            Showing deals added to the pool in the latest scrape
            {totalFromAPI > 0 ? ` (${totalFromAPI.toLocaleString()} listing${totalFromAPI !== 1 ? 's' : ''})` : ''}.
          </p>
          {typeof onClearPoolNewDealsFilter === 'function' ? (
            <button type="button" className="pool-new-deals-banner__clear" onClick={onClearPoolNewDealsFilter}>
              Back to Buy Box feed
            </button>
          ) : null}
        </div>
      )}
      {isFetching && <div className="aggregator-loading-bar" aria-live="polite" />}
      <div className="aggregator-welcome">
        <div className="aggregator-welcome__main">
          <h2>Discover Business Deals</h2>
          <p>
            {poolNewMode ? (
              <>
                {totalFromAPI > 0
                  ? `${totalFromAPI.toLocaleString()} new pool listing${totalFromAPI !== 1 ? 's' : ''} in this scrape view.`
                  : 'No listings match this scrape filter (they may be hidden or excluded).'}
              </>
            ) : totalFromAPI > 0 ? (
              <>
                {totalFromAPI.toLocaleString()} deal{totalFromAPI !== 1 ? 's' : ''} match your{' '}
                {onConfigureBuyBox ? (
                  <button
                    type="button"
                    className="aggregator-welcome__buybox-text-link"
                    onClick={onConfigureBuyBox}
                  >
                    buy box
                  </button>
                ) : (
                  'buy box'
                )}
                {' '}criteria.
              </>
            ) : (
              'Configure your Buy Box to see matching deals.'
            )}
          </p>
          <div className="aggregator-stats">
            <button type="button" className={`aggregator-stat aggregator-stat-btn ${viewMode === 'matches' ? 'active' : ''}`} onClick={handleShowMatches}>Matches: {totalFromAPI.toLocaleString()}</button>
            <div className="aggregator-stat">
              Showing: {dealsToShow.length.toLocaleString()} of {totalFromAPI.toLocaleString()}
              {hideSavedDealsInFeed && !showHiddenDeals ? (
                <span className="aggregator-stat__note" title="Saved listings are omitted from this list while the option is on in Settings.">
                  {' '}
                  · saved hidden
                </span>
              ) : null}
            </div>
            <div className="aggregator-stat">Page {currentPage} of {totalPages || 1}</div>
            <button type="button" className={`aggregator-stat aggregator-stat-btn ${viewMode === 'hidden' ? 'active' : ''}`} onClick={handleShowHidden}>Hidden: {hiddenDealIds.length.toLocaleString()}</button>
          </div>
        </div>
        <div className="aggregator-welcome__actions" role="toolbar" aria-label="Deal list actions">
          {onConfigureBuyBox ? (
            <div className="aggregator-welcome__buybox-toolbar">
              <button
                type="button"
                className={`aggregator-filter-btn${showBuyBoxConfigureHint ? ' aggregator-filter-btn--buybox-unset' : ''}`}
                onClick={onConfigureBuyBox}
              >
                Configure Buy Box
              </button>
              <div className="aggregator-buybox-slots" role="tablist" aria-label="Buy box slots">
                {buyBoxesUiState.buyBoxes.map((slot, i) => {
                  const isActive = i === buyBoxesUiState.activeBuyBoxIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`aggregator-buybox-slot-btn${isActive ? ' active' : ''}`}
                      disabled={buyBoxSwitching}
                      onClick={() => handleBuyBoxSlotClick(i)}
                      title={slot?.name || defaultBuyBoxSlotName(i)}
                    >
                      {slot?.name || defaultBuyBoxSlotName(i)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <button type="button" className="aggregator-filter-btn" onClick={() => navigate('/settings')}>
            Settings
          </button>
        </div>
        <div className="aggregator-welcome__buybox">
          <h3 className="aggregator-welcome__buybox-title">
            {buyBoxesUiState.buyBoxes[buyBoxesUiState.activeBuyBoxIndex]?.name?.trim() || 'Buy box'}
          </h3>
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
              {hasTargetStates && (
                <>
                  <dt>States</dt>
                  <dd>{buyBox.targetStates.join(', ')}</dd>
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
              {dealViewStyle === 'card' && (
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
                    <div className="card-cols-popup card-cols-popup--viewport" role="listbox" aria-label="Cards per row">
                      {CARD_COLUMNS_OPTIONS.map((n) => (
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
              )}
            </div>
            {dealViewStyle === 'card' && (
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
            <div className="deal-age-legend" title="Listing age by date added">
              <span className="deal-age-legend__dot deal-age-legend__dot--fresh" />
              <span className="deal-age-legend__label">0–2w</span>
              <span className="deal-age-legend__dot deal-age-legend__dot--recent" />
              <span className="deal-age-legend__label">2–4w</span>
              <span className="deal-age-legend__dot deal-age-legend__dot--aging" />
              <span className="deal-age-legend__label">4–8w</span>
              <span className="deal-age-legend__dot deal-age-legend__dot--older" />
              <span className="deal-age-legend__label">8w+</span>
            </div>
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
            </div>
            {showExcludeSection && (
            <>
            <div className="exclude-list-controls">
              <select
                value={currentSelectedList}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) {
                    setCurrentSelectedList('');
                    persistActiveSlotFeed({ currentExcludeList: '' });
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
              <button type="button" className="exclude-btn" onClick={handleClearExcludeKeywords}>
                Clear All
              </button>
            </div>
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
            </>
            )}
          </div>
        </div>

        {dealViewStyle === 'table' && (
          <div className="sort-tip">
            <strong>Sorting tip:</strong> Click a column to sort. Hold <kbd>Shift</kbd> and click another column to add a tiebreaker (header numbers: 1 = first key, 2 = second key).
            {sortConfig.length >= 2 ? (
              <span className="sort-tip__multi">
                {' '}
                <strong>Important:</strong> column (2) only changes order when two rows <strong>tie</strong> on column (1) (exact same value). If every row has a different annual profit, dates will <strong>not</strong> look chronological—that is expected. For newest listings overall, sort <strong>Date Added</strong> first (click it without Shift to make it #1), then Shift+click <strong>Annual Profit</strong> as #2.
              </span>
            ) : (
              <span> Example: <strong>Annual Profit</strong> #1 (high → low), then Shift+ <strong>Date Added</strong> #2 (newest first only when profit matches).</span>
            )}
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
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={Object.keys(COLUMN_CONFIG).filter((columnId) => visibleColumns[columnId] !== false).length + 1} className="table-empty-cell">No deals found. Try adjusting your filters or search.</td>
                </tr>
              ) : dealsToShow.length === 0 ? (
                <tr>
                  <td colSpan={Object.keys(COLUMN_CONFIG).filter((columnId) => visibleColumns[columnId] !== false).length + 1} className="table-empty-cell">
                    {emptyFeedMessage}
                  </td>
                </tr>
              ) : (
                dealsToShow.map((deal) => {
                  const isHidden = isDealHidden(deal, hiddenDealIds);
                  const dealSaved = isDealInSavedList(deal, savedDealIdSet);
                  return (
                  <tr key={deal.id} className={isHidden ? 'deal-row-hidden' : ''} onClick={() => setSelectedDeal(deal)}>
                    {visibleColumns.name !== false && (
                      <td className="deal-name-cell" data-col="name">
                        <div className="deal-name-primary">{deal.name || 'Unnamed Business'}</div>
                      </td>
                    )}
                    {visibleColumns.date !== false && (
                      <td data-col="date">
                        <span className={`deal-date-age ${getListingAgeClass(deal.discoveredAt)}`} title={listingAgeTitle(deal.discoveredAt)}>
                          {formatDate(deal.discoveredAt)}
                        </span>
                      </td>
                    )}
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
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); handleToggleSaveDeal(deal); }}
                          className={
                            dealSaved
                              ? `btn-save ${showSavedHighlightInFeed ? 'btn-save--saved' : 'btn-save--saved-muted'}`
                              : 'btn-save'
                          }
                          disabled={savingDealId === deal.id}
                          title={dealSaved ? 'Click to remove from My Deals' : 'Save to My Deals'}
                        >
                          {dealSaved
                            ? savingDealId === deal.id
                              ? '…'
                              : 'Saved'
                            : savingDealId === deal.id
                              ? 'Saving…'
                              : 'Save'}
                        </button>
                        <button onClick={(event) => { event.stopPropagation(); handleToggleHidden(deal); }} className="btn-save btn-hide">{isHidden ? 'Unhide' : 'Hide'}</button>
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
              {deals.length === 0 ? (
                <div className="aggregator-cards-empty">No deals found. Try adjusting your filters or search.</div>
              ) : dealsToShow.length === 0 ? (
                <div className="aggregator-cards-empty">
                  {emptyFeedMessage}
                </div>
              ) : (
                dealsToShow.map((deal) => {
                  const isHidden = isDealHidden(deal, hiddenDealIds);
                  const dealSaved = isDealInSavedList(deal, savedDealIdSet);
                  const descCard = cardViewDescriptionPreview(deal.description, 4);
                  const cardLoc = cardMetricLocation(deal);
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
                          <button
                            type="button"
                            className={`deal-card__btn deal-card__btn-save${dealSaved ? (showSavedHighlightInFeed ? ' deal-card__btn-save--saved' : ' deal-card__btn-save--saved-muted') : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleToggleSaveDeal(deal); }}
                            disabled={savingDealId === deal.id}
                            title={dealSaved ? 'Click to remove from My Deals' : 'Save to My Deals'}
                            aria-label={dealSaved ? 'Saved — click to remove from My Deals' : 'Save to My Deals'}
                          >
                            {dealSaved ? 'Saved' : 'Save'}
                          </button>
                          <button type="button" className="deal-card__btn deal-card__btn-hide" onClick={(e) => { e.stopPropagation(); handleToggleHidden(deal); }} title={isHidden ? 'Unhide' : 'Hide'} aria-label={isHidden ? 'Unhide' : 'Hide'}>{isHidden ? 'Unhide' : 'Hide'}</button>
                        </div>
                      </div>
                      <div className="deal-card__date">
                        <span className={`deal-date-age ${getListingAgeClass(deal.discoveredAt)}`} title={listingAgeTitle(deal.discoveredAt)}>
                          Date Added: {formatDate(deal.discoveredAt)}
                        </span>
                      </div>
                      <p className="deal-card__subtitle" title={descCard.full || undefined}>
                        {descCard.preview || 'No description available.'}
                      </p>
                      <div
                        className="deal-card__metrics"
                        style={cardLoc ? { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' } : undefined}
                      >
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
                        {cardLoc && (
                          <div className="deal-card__metric">
                            <span className="deal-card__metric-value" title={cardLoc.value}>{cardLoc.value}</span>
                            <span className="deal-card__metric-label">{cardLoc.label}</span>
                          </div>
                        )}
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
        onUnsaveDeal={handleUnsaveDeal}
        isSavingDeal={savingDealId != null && selectedDeal?.id === savingDealId}
        dealSavedInMyDeals={selectedDeal ? isDealInSavedList(selectedDeal, savedDealIdSet) : false}
        savedHighlightStyle={showSavedHighlightInFeed}
        onPositionChange={handleDealPanelPositionChange}
        settings={settings}
        onSaveCalculatorDefaults={handleSaveCalculatorDefaults}
        onIOIPrefsSaved={onSettingsUpdate}
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

const MS_PER_DAY = 86_400_000;
const AGE_BUCKETS = [
  { max: 14, cls: 'deal-date-age--fresh',  label: 'fresh' },
  { max: 28, cls: 'deal-date-age--recent', label: 'recent' },
  { max: 56, cls: 'deal-date-age--aging',  label: 'aging' },
];

function getListingAgeDays(discoveredAt) {
  if (!discoveredAt) return null;
  const d = new Date(discoveredAt);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

function getListingAgeClass(discoveredAt) {
  const days = getListingAgeDays(discoveredAt);
  if (days == null) return '';
  for (const b of AGE_BUCKETS) {
    if (days < b.max) return b.cls;
  }
  return 'deal-date-age--older';
}

function listingAgeTitle(discoveredAt) {
  const days = getListingAgeDays(discoveredAt);
  const dateStr = formatDate(discoveredAt);
  if (days == null) return dateStr;
  if (days === 0) return `${dateStr} — today`;
  if (days === 1) return `${dateStr} — 1 day ago`;
  return `${dateStr} — ${days} days ago`;
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
      title={sortable ? 'Click to sort. Shift+Click for multi-sort (e.g. profit, then date).' : undefined}
    >
      <span>{label}</span>
      {sortMeta ? <span className="sort-priority"> {sortIndex + 1}</span> : null}
    </th>
  );
}


