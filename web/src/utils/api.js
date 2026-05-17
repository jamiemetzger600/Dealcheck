// In dev, always use the same-origin Vite proxy at `/api` so LAN clients don't try to call their own localhost.
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

  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        removeToken();
        const path = typeof window !== 'undefined' ? window.location.pathname || '' : '';
        if (!path.startsWith('/dashboard')) {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
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
export const dealsAPI = {
  getSavedDeals: () => apiRequest('/deals'),

  saveDeal: (deal) => apiRequest('/deals', {
    method: 'POST',
    body: JSON.stringify(deal)
  }),

  updateDeal: (id, updates) => apiRequest(`/deals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),

  deleteDeal: (id) => apiRequest(`/deals/${id}`, {
    method: 'DELETE'
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
