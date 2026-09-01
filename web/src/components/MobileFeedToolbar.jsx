import { defaultBuyBoxSlotName } from '../utils/buyBoxes';

/** Sticky mobile toolbar: Cards / Table / Inbox (+ Focus when showFocus). */
export default function MobileFeedToolbar({
  feedMode,
  onFeedModeChange,
  showFocus = false,
  deckScope,
  onScopeChange,
  onConfigureBuyBox,
  onRefresh,
  isRefreshing = false,
  isPortrait,
  showFiltersToggle = false,
  filtersOpen = false,
  onToggleFilters,
  filterCount = 0,
  buyBoxes = null,
  activeBuyBoxIndex = 0,
  onSelectBuyBox = null,
  buyBoxSwitching = false,
}) {
  const slots = Array.isArray(buyBoxes) ? buyBoxes : [];

  return (
    <div
      className={`mobile-feed-toolbar${isPortrait ? ' mobile-feed-toolbar--portrait' : ' mobile-feed-toolbar--landscape'}`}
      role="region"
      aria-label="Mobile feed options"
    >
      <div className="mobile-view-toggle" role="tablist" aria-label="View mode">
        {showFocus ? (
          <button
            type="button"
            role="tab"
            aria-selected={feedMode === 'deck'}
            className={`mobile-view-toggle__btn${feedMode === 'deck' ? ' active' : ''}`}
            onClick={() => onFeedModeChange('deck')}
          >
            Focus
          </button>
        ) : null}
        <button
          type="button"
          role="tab"
          aria-selected={feedMode === 'card'}
          className={`mobile-view-toggle__btn${feedMode === 'card' ? ' active' : ''}`}
          onClick={() => onFeedModeChange('card')}
        >
          Cards
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={feedMode === 'table'}
          className={`mobile-view-toggle__btn${feedMode === 'table' ? ' active' : ''}`}
          onClick={() => onFeedModeChange('table')}
        >
          Table
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={feedMode === 'inbox'}
          className={`mobile-view-toggle__btn${feedMode === 'inbox' ? ' active' : ''}`}
          onClick={() => onFeedModeChange('inbox')}
        >
          Inbox
        </button>
      </div>
      {slots.length > 0 && typeof onSelectBuyBox === 'function' ? (
        <div className="mobile-feed-toolbar__buyboxes" role="tablist" aria-label="Buy box">
          {slots.map((slot, i) => {
            const label = slot?.name?.trim() || defaultBuyBoxSlotName(i);
            const isActive = i === activeBuyBoxIndex;
            return (
              <button
                key={`mobile-bb-${i}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`mobile-feed-toolbar__buybox${isActive ? ' is-active' : ''}`}
                disabled={buyBoxSwitching}
                title={label}
                onClick={() => {
                  if (i === activeBuyBoxIndex) return;
                  console.log('[MobileFeedToolbar] switch buy box', { from: activeBuyBoxIndex, to: i, label });
                  onSelectBuyBox(i);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="mobile-feed-toolbar__actions">
        {typeof onRefresh === 'function' && (
          <button
            type="button"
            className="mobile-feed-toolbar__scope-btn mobile-feed-toolbar__refresh-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh deals"
            title="Refresh deals"
          >
            <span className={`mobile-feed-toolbar__refresh-icon${isRefreshing ? ' is-spinning' : ''}`} aria-hidden="true">↻</span>
            <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        )}
        <button
          type="button"
          className="mobile-feed-toolbar__scope-btn"
          onClick={() => onScopeChange(deckScope === 'daily' ? 'all' : 'daily')}
        >
          {deckScope === 'daily' ? "Today's New" : 'All Matches'}
        </button>
        {typeof onConfigureBuyBox === 'function' && (
          <button
            type="button"
            className="mobile-feed-toolbar__scope-btn"
            onClick={onConfigureBuyBox}
            aria-label="Configure current buy box"
          >
            Edit box
          </button>
        )}
        {showFiltersToggle && typeof onToggleFilters === 'function' && (
          <button
            type="button"
            className={`mobile-feed-toolbar__scope-btn${filtersOpen ? ' is-active' : ''}${filterCount > 0 ? ' has-filters' : ''}`}
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
            aria-controls="aggregator-controls"
          >
            {filtersOpen ? 'Hide filters' : 'Filters'}
            {filterCount > 0 ? ` (${filterCount})` : ''}
          </button>
        )}
      </div>
    </div>
  );
}
