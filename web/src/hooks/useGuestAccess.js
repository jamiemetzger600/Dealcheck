
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getEntitlementsForUser, getSignupCopy } from '../utils/guestEntitlements';
import { logGuestEvent } from '../utils/guestAnalytics';

export function parseAuthReturnParams(searchString) {
  const params = new URLSearchParams(searchString || '');
  const returnTo = params.get('returnTo') || params.get('redirect') || null;
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
