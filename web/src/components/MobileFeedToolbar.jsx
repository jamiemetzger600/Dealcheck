/** Sticky mobile toolbar: Swipe / Card / Table + daily scope toggle. */
export default function MobileFeedToolbar({
  feedMode,
  onFeedModeChange,
  deckScope,
  onScopeChange,
  onConfigureBuyBox,
  onRefresh,
  isRefreshing = false,
  isPortrait,
}) {
  return (
    <div
      className={`mobile-feed-toolbar${isPortrait ? ' mobile-feed-toolbar--portrait' : ' mobile-feed-toolbar--landscape'}`}
      role="region"
      aria-label="Mobile feed options"
    >
      <div className="mobile-view-toggle" role="tablist" aria-label="View mode">
        <button
          type="button"
          role="tab"
          aria-selected={feedMode === 'deck'}
          className={`mobile-view-toggle__btn${feedMode === 'deck' ? ' active' : ''}`}
          onClick={() => onFeedModeChange('deck')}
        >
          Swipe
        </button>
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
      </div>
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
          <button type="button" className="mobile-feed-toolbar__scope-btn" onClick={onConfigureBuyBox}>
            Buy Box
          </button>
        )}
      </div>
    </div>
  );
}
