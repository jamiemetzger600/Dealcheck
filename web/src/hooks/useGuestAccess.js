
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getEntitlementsForUser, getSignupCopy } from '../utils/guestEntitlements';
import { logGuestEvent } from '../utils/guestAnalytics';
import { setPendingSaveDealDbId } from '../utils/pendingSaveDeal';

/** Only same-origin relative paths (blocks open redirects). */
export function sanitizeInternalPath(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    /* already decoded */
  }
  if (!path.startsWith('/') || path.startsWith('//') || /\\|:/.test(path.split('?')[0])) {
    return null;
  }
  return path;
}

export function parseAuthReturnParams(searchString) {
  const params = new URLSearchParams(searchString || '');
  const raw = params.get('returnTo') || params.get('redirect') || params.get('next') || null;
  const returnTo = sanitizeInternalPath(raw);
  const dealDbId = params.get('dealDbId') || null;
  return { returnTo, dealDbId };
}

export function buildRegisterHref({ reason, dealDbId, returnTo } = {}) {
  const p = new URLSearchParams();
  if (reason) p.set('reason', reason);
  if (dealDbId != null && dealDbId !== '') p.set('dealDbId', String(dealDbId));
  if (returnTo) p.set('returnTo', returnTo);
  const qs = p.toString();
  return `/register${qs ? `?${qs}` : ''}`;
}

export function useGuestAccess(user) {
  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = !user;
  const entitlements = useMemo(() => getEntitlementsForUser(user), [user]);

  const requireSignup = useCallback(
    (reason = 'default', meta = {}) => {
      logGuestEvent('guest_signup_prompt', { reason, ...meta });
      if (reason === 'save' && meta.dealDbId != null && meta.dealDbId !== '') {
        setPendingSaveDealDbId(meta.dealDbId);
      }
      const copy = getSignupCopy(reason);
      const href = buildRegisterHref({
        reason,
        dealDbId: meta.dealDbId,
        returnTo: location.pathname,
      });
      navigate(href, { state: { signupCopy: copy } });
    },
    [navigate, location.pathname]
  );

  return { isGuest, entitlements, requireSignup };
}
