// In dev, always use the same-origin Vite proxy at `/api` so LAN clients don't try to call their own localhost.
import { requestExtensionDealsSync } from './extensionBridge';

const IS_DEV = Boolean(import.meta.env.DEV);
const API_URL = IS_DEV ? '/api' : (import.meta.env.VITE_API_URL || '/api');

const RETRY_DELAYS = [2000, 4000];
const MAX_ATTEMPTS = 1 + RETRY_DELAYS.length;

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

function isNetworkError(err) {
  return err instanceof TypeError || err.message === 'Failed to fetch';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ping the backend health endpoint. Resolves true if the server responds
 * (any HTTP status), false on network error.
 */
export async function pingHealth() {
  try {
    await fetch(`${API_URL.replace(/\/api\/?$/, '')}/health`, { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const isAuthAttempt = endpoint === '/auth/login' || endpoint === '/auth/register';

  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401 && !isAuthAttempt) {
        removeToken();
        const path = typeof window !== 'undefined' ? window.location.pathname || '' : '';
        if (!path.startsWith('/dashboard')) {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (response.status === 401 && isAuthAttempt) {
          throw new Error(error.error || 'Invalid email or password');
        }
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error(
            error.error
              || 'The API is temporarily unavailable. If you are developing locally, ensure the backend is running on port 3001.'
          );
        }
        const err = new Error(error.error || `Request failed (${response.status})`);
        err.status = response.status;
        if (error.requiresPassword) err.requiresPassword = true;
        if (error.code) {
          err.code = error.code;
          // Invite short codes are short alphanumeric — keep legacy field for accept flow
          if (!String(error.code).includes('_')) err.inviteCode = error.code;
        }
        if (error.existingTask) err.existingTask = error.existingTask;
        throw err;
      }

      return response.json();
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      lastError = err;
      if (attempt < RETRY_DELAYS.length) {
        console.log(`[api] Network error, retrying in ${RETRY_DELAYS[attempt]}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})...`);
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  if (IS_DEV) {
    throw new Error(
      'Failed to fetch. Start the backend (default port 3001). Open the app at http://localhost:5173.'
    );
  }
  throw new Error(
    'The server is starting up — please wait a moment and try again.'
  );
}

// Auth API
export const authAPI = {
  register: async (email, password) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    return data;
  },

  login: async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    return data;
  },

  logout: () => {
    removeToken();
  },

  getCurrentUser: () => apiRequest('/auth/me')
};

// User settings API
export const userAPI = {
  getSettings: () => apiRequest('/user/settings'),
  
  updateSettings: (settings) => apiRequest('/user/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  }),

  getEntitlements: () => apiRequest('/user/entitlements')
};

// Deals API
function notifyExtensionDealsSync() {
  try {
    requestExtensionDealsSync();
  } catch (err) {
    console.debug('[dealsAPI] extension sync notify skipped', err);
  }
}

export const dealsAPI = {
  getSavedDeals: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.scope) params.set('scope', opts.scope);
    if (opts.teamId) params.set('teamId', String(opts.teamId));
    const qs = params.toString();
    return apiRequest(`/deals${qs ? `?${qs}` : ''}`);
  },

  saveDeal: async (deal) => {
    const result = await apiRequest('/deals', {
      method: 'POST',
      body: JSON.stringify(deal)
    });
    notifyExtensionDealsSync();
    return result;
  },

  updateDeal: async (id, updates) => {
    const result = await apiRequest(`/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    notifyExtensionDealsSync();
    return result;
  },

  deleteDeal: async (id) => {
    const result = await apiRequest(`/deals/${id}`, {
      method: 'DELETE'
    });
    notifyExtensionDealsSync();
    return result;
  }
};

export const teamsAPI = {
  list: () => apiRequest('/teams'),

  create: (name) =>
    apiRequest('/teams', {
      method: 'POST',
      body: JSON.stringify({ name })
    }),

  get: (teamId) => apiRequest(`/teams/${teamId}`),

  invite: (teamId, { email, role = 'member' }) =>
    apiRequest(`/teams/${teamId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role })
    }),

  createInviteLink: (teamId, { role = 'member', expiresInDays = 14, password = '' } = {}) =>
    apiRequest(`/teams/${teamId}/invite-links`, {
      method: 'POST',
      body: JSON.stringify({
        role,
        expiresInDays,
        ...(password ? { password } : {})
      })
    }),

  revokeInvite: (teamId, inviteId) =>
    apiRequest(`/teams/${teamId}/invites/${inviteId}`, { method: 'DELETE' }),

  acceptInvite: (token, { password } = {}) =>
    apiRequest('/teams/invites/accept', {
      method: 'POST',
      body: JSON.stringify({
        token,
        ...(password ? { password } : {})
      })
    }),

  removeMember: (teamId, userId) =>
    apiRequest(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),

  updateMemberRole: (teamId, userId, role) =>
    apiRequest(`/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    }),

  shareDeal: (teamId, dealId) =>
    apiRequest(`/teams/${teamId}/deals/${dealId}/share`, { method: 'POST' }),

  unshareDeal: (dealId) =>
    apiRequest(`/teams/deals/${dealId}/unshare`, { method: 'POST' }),

  listApprovals: (teamId) =>
    apiRequest(`/teams/approvals${teamId ? `?teamId=${teamId}` : ''}`),

  reviewApproval: (approvalId, { decision, note }) =>
    apiRequest(`/teams/approvals/${approvalId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, note })
    })
};

export const crmAPI = {
  getToday: () => apiRequest('/crm/today'),

  getAlerts: () => apiRequest('/crm/alerts'),

  markAlertRead: (alertId) =>
    apiRequest(`/crm/alerts/${alertId}/read`, { method: 'PATCH' }),

  markAllAlertsRead: () =>
    apiRequest('/crm/alerts/read-all', { method: 'POST' }),

  getTasks: (status = 'open') => apiRequest(`/crm/tasks?status=${encodeURIComponent(status)}`),

  getContacts: () => apiRequest('/crm/contacts'),

  getAnalytics: () => apiRequest('/crm/analytics'),

  getCalendarStatus: () => apiRequest('/crm/calendar/status'),

  getCalendarOAuthConfig: () => apiRequest('/crm/calendar/oauth-config'),

  startCalendarOAuth: () => apiRequest('/crm/calendar/oauth/start'),

  disconnectCalendar: () =>
    apiRequest('/crm/calendar/connection', { method: 'DELETE' }),

  getCalendarEvents: (start, end) =>
    apiRequest(`/crm/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),

  createCalendarEvent: (payload) =>
    apiRequest('/crm/calendar/events', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateCalendarEvent: (eventId, payload) =>
    apiRequest(`/crm/calendar/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  deleteCalendarEvent: (eventId) =>
    apiRequest(`/crm/calendar/events/${eventId}`, { method: 'DELETE' }),

  syncCalendar: (start, end) =>
    apiRequest('/crm/calendar/sync', {
      method: 'POST',
      body: JSON.stringify({ start, end })
    }),

  getKanban: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.scope) params.set('scope', opts.scope);
    if (opts.teamId) params.set('teamId', String(opts.teamId));
    const qs = params.toString();
    return apiRequest(`/crm/kanban${qs ? `?${qs}` : ''}`);
  },

  updateStage: (savedDealId, progressStage) =>
    apiRequest(`/crm/deals/${savedDealId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ progressStage: progressStage ?? null })
    }),

  getThread: (savedDealId, afterId) => {
    const qs = afterId ? `?afterId=${afterId}` : '';
    return apiRequest(`/crm/deals/${savedDealId}/thread${qs}`);
  },

  getThreadMembers: (savedDealId) =>
    apiRequest(`/crm/deals/${savedDealId}/thread/members`),

  postThreadMessage: (savedDealId, { body, assigneeUserId, dueAt, linkedDdItemId }) =>
    apiRequest(`/crm/deals/${savedDealId}/thread`, {
      method: 'POST',
      body: JSON.stringify({ body, assigneeUserId, dueAt, linkedDdItemId })
    }),

  reactThreadMessage: (savedDealId, messageId, emoji) =>
    apiRequest(`/crm/deals/${savedDealId}/thread/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    }),

  resolveThreadMessage: (savedDealId, messageId, resolved = true) =>
    apiRequest(`/crm/deals/${savedDealId}/thread/messages/${messageId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolved })
    }),

  getDealDocuments: (savedDealId) => apiRequest(`/crm/deals/${savedDealId}/documents`),

  addDealDocument: (savedDealId, payload) =>
    apiRequest(`/crm/deals/${savedDealId}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getDealActivities: (savedDealId) => apiRequest(`/crm/deals/${savedDealId}/activities`),

  addActivity: (savedDealId, { body, activityType = 'note' }) =>
    apiRequest(`/crm/deals/${savedDealId}/activities`, {
      method: 'POST',
      body: JSON.stringify({ body, activityType })
    }),

  refreshFromListing: (savedDealId) =>
    apiRequest(`/crm/deals/${savedDealId}/refresh-from-listing`, { method: 'POST' }),

  getDealTasks: (savedDealId) => apiRequest(`/crm/deals/${savedDealId}/tasks`),

  createTask: (savedDealId, payload) =>
    apiRequest(`/crm/deals/${savedDealId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  quickFollowUp: (savedDealId, payload) =>
    apiRequest(`/crm/deals/${savedDealId}/follow-up`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateTask: (taskId, payload) =>
    apiRequest(`/crm/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  getDealDd: (savedDealId) => apiRequest(`/crm/deals/${savedDealId}/dd`),

  getDealDdTemplates: (savedDealId) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/templates`),

  startDealDd: (savedDealId, payload = {}) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/start`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  patchDdItem: (savedDealId, itemId, payload) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  addDdGroup: (savedDealId, name) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/groups`, {
      method: 'POST',
      body: JSON.stringify({ name })
    }),

  addDdItem: (savedDealId, groupId, payload) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/groups/${groupId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  addDdItemDocument: (savedDealId, itemId, payload) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/items/${itemId}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  createDdShareLink: (savedDealId, payload) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/share-links`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  revokeDdShareLink: (savedDealId, linkId) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/share-links/${linkId}`, { method: 'DELETE' })
};

function ddPortalHeaders(guest = {}) {
  const headers = {};
  if (guest.password) headers['X-DD-Password'] = guest.password;
  if (guest.guestName) headers['X-DD-Guest-Name'] = guest.guestName;
  if (guest.guestEmail) headers['X-DD-Guest-Email'] = guest.guestEmail;
  if (guest.guestSessionId) headers['X-DD-Guest-Session'] = guest.guestSessionId;
  return headers;
}

export const ddPublicAPI = {
  getPortal: (token, guest = {}) =>
    apiRequest(`/dd/public/${token}`, { headers: ddPortalHeaders(guest) }),

  patchItem: (token, itemId, payload, guest = {}) =>
    apiRequest(`/dd/public/${token}/items/${itemId}`, {
      method: 'PATCH',
      headers: ddPortalHeaders(guest),
      body: JSON.stringify(payload)
    }),

  addComment: (token, itemId, payload, guest = {}) =>
    apiRequest(`/dd/public/${token}/items/${itemId}/comments`, {
      method: 'POST',
      headers: ddPortalHeaders(guest),
      body: JSON.stringify({ ...payload, ...guest })
    }),

  addDocument: (token, itemId, payload, guest = {}) =>
    apiRequest(`/dd/public/${token}/items/${itemId}/documents`, {
      method: 'POST',
      headers: ddPortalHeaders(guest),
      body: JSON.stringify({ ...payload, ...guest })
    })
};

// Feedback engine API
export const feedbackAPI = {
  create: (payload) =>
    apiRequest('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  mine: () => apiRequest('/feedback/mine'),

  unread: () => apiRequest('/feedback/unread'),

  openBugs: () => apiRequest('/feedback/open-bugs'),

  adminList: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.status) qs.set('status', params.status);
    if (params.severity) qs.set('severity', params.severity);
    if (params.q) qs.set('q', params.q);
    const s = qs.toString();
    return apiRequest(`/feedback/admin${s ? `?${s}` : ''}`);
  },

  get: (id) => apiRequest(`/feedback/${id}`),

  reply: (id, body, attachments = []) =>
    apiRequest(`/feedback/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, attachments }),
    }),

  setStatus: (id, status) =>
    apiRequest(`/feedback/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  meToo: (id) =>
    apiRequest(`/feedback/${id}/me-too`, { method: 'POST' }),

  /** Fetch attachment as object URL (caller should revoke). */
  attachmentObjectUrl: async (attachmentId) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/feedback/attachments/${attachmentId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to load attachment');
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
};

// Payments API
export const paymentsAPI = {
  createCheckoutSession: (plan) => apiRequest('/payments/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ plan })
  }),

  confirmCheckout: (sessionId) => apiRequest('/payments/confirm-checkout', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  }),

  createPortalSession: () => apiRequest('/payments/create-portal-session', {
    method: 'POST'
  })
};

export { getToken, setToken, removeToken };

/** Bearer token for public market-deals routes that use optionalAuth. */
export function buildAuthHeaders(extraHeaders = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}
