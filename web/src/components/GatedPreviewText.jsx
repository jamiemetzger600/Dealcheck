import { useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizePreviewText, truncateWithOverflow } from '../utils/textPreview';
import { getSignupCopy } from '../utils/guestEntitlements';

function isPlaceholderDescription(text) {
  const t = normalizePreviewText(text).toLowerCase();
  return !t || t === '—' || t === 'no description available' || t === 'no description available.';
}

export default function GatedPreviewText({
  text,
  limit = 120,
  className = '',
  reason = 'description_click',
  onRequireSignup = null,
  entitlements = null,
  serverTruncated = false,
}) {
  const [showModal, setShowModal] = useState(false);
  const gated = entitlements && entitlements.previewCharLimit != null;
  const { visible, remainder, hasMore, isTruncated, full } = truncateWithOverflow(text, gated ? limit : null);
  const hasContent = !isPlaceholderDescription(text);
  // Guests always see preview UX when there is description text (API may truncate below char limit).
  const showGuestPreview = gated && hasContent;
  const showEllipsis = isTruncated || hasMore || serverTruncated;

  if (!showGuestPreview) {
    return <div className={className}>{full || '—'}</div>;
  }

  const copy = getSignupCopy(reason);
  const handleUnlock = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onRequireSignup === 'function') {
      onRequireSignup(reason);
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <div
        className={`gated-preview-text ${className}`.trim()}
        role="button"
        tabIndex={0}
        title="Description continues — sign up to read the full text"
        onClick={handleUnlock}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleUnlock(e);
          }
        }}
      >
        <span className="gated-preview-text__visible">{visible}</span>
        {showEllipsis ? (
          <span className="gated-preview-text__ellipsis" aria-hidden="true">
            …
          </span>
        ) : null}
        {remainder ? (
          <span className="gated-preview-text__blur" aria-hidden="true">
            {remainder}
          </span>
        ) : null}
        <span className="gated-preview-text__hint">{entitlements.clickToUnlockCopy}</span>
      </div>
      {showModal && !onRequireSignup ? (
        <div className="gated-preview-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="gated-preview-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{copy.title}</h3>
            <p>{copy.body}</p>
            <div className="gated-preview-modal__actions">
              <Link to="/register" className="btn-primary">
                Sign up here for full access
              </Link>
              <Link to="/login" className="btn-secondary">
                Sign in
              </Link>
            </div>
            <button type="button" className="gated-preview-modal__close" onClick={() => setShowModal(false)}>
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
