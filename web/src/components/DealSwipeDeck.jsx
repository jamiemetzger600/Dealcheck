import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GatedPreviewText from './GatedPreviewText';
import {
  cardMetricLocation,
  cardViewDescriptionPreview,
  formatMoneyShort,
  formatRatio,
  formatDealDate,
  getListingAgeClass,
  listingAgeTitle,
} from '../utils/dealCardDisplay';

const PREFETCH_THRESHOLD = 5;

// Tinder-style drag gestures are paused — use Hide / Pass / Save buttons instead.
// Re-enable via useSwipeGesture when we ship a better implementation.

function DealSwipeCard({
  deal,
  isPortrait,
  isGuest,
  entitlements,
  requireSignup,
  onOpenDetails,
  isTop,
  stackIndex,
}) {
  const descCard = cardViewDescriptionPreview(deal.description, isPortrait ? 4 : 3);
  const cardLoc = cardMetricLocation(deal);
  const scale = isTop ? 1 : 1 - stackIndex * 0.04;
  const translateY = isTop ? 0 : stackIndex * 8;
  const zIndex = 10 - stackIndex;
  const opacity = isTop ? 1 : 0.85 - stackIndex * 0.15;

  const transform = isTop
    ? 'none'
    : `scale(${scale}) translateY(${translateY}px)`;

  return (
    <div
      className={`deal-swipe-card-outer${isTop ? ' deal-swipe-card-outer--active' : ''}${!isPortrait ? ' deal-swipe-card-outer--landscape' : ''}`}
      style={{
        transform,
        transition: 'transform 0.28s ease-out',
        zIndex,
        opacity: isTop ? 1 : opacity,
        pointerEvents: isTop ? 'auto' : 'none',
      }}
    >
      <div
        className={`deal-swipe-card${!isPortrait ? ' deal-swipe-card--landscape' : ''}`}
        role={isTop ? 'button' : undefined}
        tabIndex={isTop ? 0 : -1}
        onClick={isTop ? () => onOpenDetails(deal) : undefined}
        onKeyDown={isTop ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetails(deal);
          }
        } : undefined}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="deal-swipe-card__body">
          <div className="deal-swipe-card__main">
            <h3 className="deal-swipe-card__name">{deal.name || 'Unnamed Business'}</h3>
            <div className="deal-swipe-card__date">
              <span className={`deal-date-age ${getListingAgeClass(deal.discoveredAt)}`} title={listingAgeTitle(deal.discoveredAt)}>
                {formatDealDate(deal.discoveredAt)}
              </span>
            </div>
            <div className="deal-swipe-card__metrics">
              <div className="deal-swipe-card__metric">
                <span className="deal-swipe-card__metric-value">{formatMoneyShort(deal.askingPrice)}</span>
                <span className="deal-swipe-card__metric-label">Asking</span>
              </div>
              <div className="deal-swipe-card__metric">
                <span className="deal-swipe-card__metric-value">{formatMoneyShort(deal.ebitda)}</span>
                <span className="deal-swipe-card__metric-label">Cash Flow</span>
              </div>
              <div className="deal-swipe-card__metric">
                <span className="deal-swipe-card__metric-value">{formatMoneyShort(deal.revenue)}</span>
                <span className="deal-swipe-card__metric-label">Revenue</span>
              </div>
              <div className="deal-swipe-card__metric">
                <span className="deal-swipe-card__metric-value">
                  {deal.profitMultiple != null ? `${formatRatio(deal.profitMultiple)}×` : '—'}
                </span>
                <span className="deal-swipe-card__metric-label">Multiple</span>
              </div>
              {cardLoc && (
                <div className="deal-swipe-card__metric">
                  <span className="deal-swipe-card__metric-value" title={cardLoc.value}>{cardLoc.value}</span>
                  <span className="deal-swipe-card__metric-label">{cardLoc.label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="deal-swipe-card__desc-col">
            <p className="deal-swipe-card__subtitle" title={descCard.full || undefined}>
              {isGuest ? (
                <GatedPreviewText
                  text={deal.description}
                  limit={entitlements?.previewCharLimit ?? 120}
                  entitlements={entitlements}
                  serverTruncated={deal.descriptionTruncated}
                  reason="description_click"
                  onRequireSignup={(reason) => requireSignup?.(reason, { dealDbId: deal.dbId })}
                  className="deal-card-description"
                />
              ) : (
                descCard.preview || 'No description available.'
              )}
            </p>
            {deal.industry ? (
              <p className="deal-swipe-card__industry">{deal.industry}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DealSwipeDeck({
  deals,
  deckScope = 'all',
  isPortrait = true,
  orientationKey = 'portrait',
  totalFromAPI = 0,
  isFetching = false,
  isGuest = false,
  entitlements = null,
  requireSignup = null,
  onHide,
  onSave,
  onPass,
  onOpenDetails,
  onNeedMore,
  onShowAllMatches,
}) {
  const [queue, setQueue] = useState(deals);
  const dealsKeyRef = useRef('');

  useEffect(() => {
    const key = deals.map((d) => d.id).join('|');
    if (key !== dealsKeyRef.current) {
      dealsKeyRef.current = key;
      setQueue(deals);
    } else if (deals.length > queue.length) {
      const queueIds = new Set(queue.map((d) => d.id));
      const appended = deals.filter((d) => !queueIds.has(d.id));
      if (appended.length > 0) {
        setQueue((prev) => [...prev, ...appended]);
      }
    }
  }, [deals, queue.length]);

  const remaining = queue.length;
  const visibleStack = useMemo(() => queue.slice(0, 3), [queue]);

  useEffect(() => {
    if (remaining > 0 && remaining <= PREFETCH_THRESHOLD && typeof onNeedMore === 'function') {
      onNeedMore();
    }
  }, [remaining, onNeedMore]);

  const advanceQueue = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const handleHide = useCallback(async (deal) => {
    await onHide(deal);
    advanceQueue();
  }, [onHide, advanceQueue]);

  const handleSave = useCallback(async (deal) => {
    await onSave(deal);
    advanceQueue();
  }, [onSave, advanceQueue]);

  const handlePass = useCallback((deal) => {
    onPass?.(deal);
    advanceQueue();
  }, [onPass, advanceQueue]);

  const scopeLabel = deckScope === 'daily' ? "Today's New" : 'All Matches';

  return (
    <div className={`deal-swipe-deck${isPortrait ? ' deal-swipe-deck--portrait' : ' deal-swipe-deck--landscape'}`}>
      <header className="deal-swipe-deck__header">
        <div className="deal-swipe-deck__header-main">
          <h2 className="deal-swipe-deck__title">{scopeLabel}</h2>
          <span className="deal-swipe-deck__count">
            {remaining > 0 ? `${remaining} left` : isFetching ? 'Loading…' : 'Done for now'}
            {totalFromAPI > 0 && remaining === 0 ? ` · ${totalFromAPI.toLocaleString()} total` : ''}
          </span>
        </div>
      </header>

      <div className="deal-swipe-deck__stack" aria-live="polite">
        {remaining === 0 ? (
          <div className="deal-swipe-deck__empty">
            <p>
              {deckScope === 'daily'
                ? "No new deals matched your buy box today."
                : 'No more deals in this view.'}
            </p>
            {deckScope === 'daily' && typeof onShowAllMatches === 'function' ? (
              <>
                <p className="deal-swipe-deck__empty-hint">
                  Focus, Cards, and Table all use the same filter. Switch to All Matches to browse your full buy box.
                </p>
                <button
                  type="button"
                  className="btn-primary deal-swipe-deck__empty-cta"
                  onClick={onShowAllMatches}
                >
                  Show All Matches
                </button>
              </>
            ) : (
              <p className="deal-swipe-deck__empty-hint">
                Try Cards or Table above, or adjust your buy box filters.
              </p>
            )}
          </div>
        ) : (
          visibleStack.map((deal, i) => (
            <DealSwipeCard
              key={`${deal.id}-${orientationKey}`}
              deal={deal}
              isPortrait={isPortrait}
              isGuest={isGuest}
              entitlements={entitlements}
              requireSignup={requireSignup}
              onOpenDetails={onOpenDetails}
              isTop={i === 0}
              stackIndex={i}
            />
          ))
        )}
      </div>

      {remaining > 0 && (
        <div className={`deal-swipe-actions${isPortrait ? '' : ' deal-swipe-actions--landscape'}`} role="toolbar" aria-label="Deal actions">
          <button
            type="button"
            className="deal-swipe-actions__btn deal-swipe-actions__btn--hide"
            aria-label="Hide deal"
            onClick={() => handleHide(queue[0])}
          >
            ✕
          </button>
          <button
            type="button"
            className="deal-swipe-actions__btn deal-swipe-actions__btn--pass"
            aria-label="Pass on deal"
            onClick={() => handlePass(queue[0])}
          >
            Pass
          </button>
          <button
            type="button"
            className="deal-swipe-actions__btn deal-swipe-actions__btn--save"
            aria-label="Save deal"
            onClick={() => handleSave(queue[0])}
          >
            ♥
          </button>
        </div>
      )}
    </div>
  );
}
