const API_URL = import.meta.env.VITE_API_URL || '/api';

// Get auth token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Set auth token
function setToken(token) {
  localStorage.setItem('token', token);
}

// Remove auth token
function removeToken() {
  localStorage.removeItem('token');
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
  } catch (err) {
    const hint = err.message === 'Failed to fetch'
      ? ' Start the backend (default port 3001). Open the app at http://localhost:5173. If the API uses another port, set VITE_API_PROXY in web/.env (e.g. VITE_API_PROXY=http://localhost:3002) and restart npm run dev.'
      : '';
    throw new Error(err.message + hint);
  }

  if (response.status === 401) {
    removeToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
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

  createPortalSession: () => apiRequest('/payments/create-portal-session', {
    method: 'POST'
  })
};

export { getToken, setToken, removeToken };
