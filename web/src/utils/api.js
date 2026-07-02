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
        throw new Error(error.error || `Request failed (${response.status})`);
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
  getSavedDeals: () => apiRequest('/deals'),

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

export const crmAPI = {
  getToday: () => apiRequest('/crm/today'),

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

  getKanban: () => apiRequest('/crm/kanban'),

  updateStage: (savedDealId, progressStage) =>
    apiRequest(`/crm/deals/${savedDealId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ progressStage: progressStage ?? null })
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

  startDealDd: (savedDealId) =>
    apiRequest(`/crm/deals/${savedDealId}/dd/start`, { method: 'POST' }),

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

export const ddPublicAPI = {
  getPortal: (token) => apiRequest(`/dd/public/${token}`),

  patchItem: (token, itemId, payload) =>
    apiRequest(`/dd/public/${token}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  addComment: (token, itemId, payload) =>
    apiRequest(`/dd/public/${token}/items/${itemId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  addDocument: (token, itemId, payload) =>
    apiRequest(`/dd/public/${token}/items/${itemId}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
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
