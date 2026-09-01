import { useEffect } from 'react';
import { logGuestEvent } from '../utils/guestAnalytics';

export default function GuestFirstVisitSheet({ isOpen, onSetBuyBox, onBrowse }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    logGuestEvent('guest_first_visit_shown');
    console.log('[GuestFirstVisit] shown');
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onBrowse();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onBrowse]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay guest-first-visit-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onBrowse();
      }}
    >
      <div
        className="modal-card guest-first-visit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-first-visit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="guest-first-visit__header">
          <h2 id="guest-first-visit-title">See deals that fit you</h2>
          <button
            type="button"
            className="column-close-btn"
            onClick={onBrowse}
            aria-label="Browse deals without a buy box"
          >
            ×
          </button>
        </div>
        <p className="guest-first-visit__body">
          Set a buy box and Vettr only loads listings that match your price, cash flow, and location.
          Skip to browse the pool — you can set this anytime from Configure Buy Box.
        </p>
        <div className="guest-first-visit__actions">
          <button type="button" className="btn-secondary" onClick={onBrowse}>
            Browse deals
          </button>
          <button type="button" className="btn-primary" onClick={onSetBuyBox}>
            Set buy box
          </button>
        </div>
      </div>
    </div>
  );
}
