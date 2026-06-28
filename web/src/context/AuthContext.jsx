import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, getToken, pingHealth } from '../utils/api';
import { pushSessionToChromeExtension, clearChromeExtensionSession } from '../utils/extensionBridge';
import { clearGuestSettings } from '../utils/guestSettings';

const AuthContext = createContext();

// Use Vite's dev flag so LAN access (e.g. http://192.168.x.x:5173) is still treated as dev.
const IS_DEV = Boolean(import.meta.env.DEV);
const WAKE_POLL_MS = 3000;
const WAKE_MAX_ATTEMPTS = 10;

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  /** True while waiting for Koyeb backend to wake from cold start (temporary — remove on paid plan). */
  const [wakingUp, setWakingUp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const waitForBackend = async () => {
      if (IS_DEV) return;
      const alive = await pingHealth();
      if (alive || cancelled) return;

      setWakingUp(true);
      for (let i = 0; i < WAKE_MAX_ATTEMPTS && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, WAKE_POLL_MS));
        if (await pingHealth()) break;
      }
      if (!cancelled) setWakingUp(false);
    };

    const checkAuth = async () => {
      await waitForBackend();
      if (cancelled) return;

      const token = getToken();
      if (token) {
        try {
          const data = await authAPI.getCurrentUser();
          if (!cancelled) setUser(data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          const isNetwork = error instanceof TypeError || (error.message || '').includes('Failed to fetch') || (error.message || '').includes('server is starting');
          if (!isNetwork) {
            authAPI.logout();
          }
        }
      }
      if (!cancelled) setLoading(false);
    };

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (token) {
      try {
        window.__vettrUserEmail = user.email || '';
      } catch {}
      pushSessionToChromeExtension(token);
    }
  }, [user]);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    setUser(data.user);
    return data;
  };

  const register = async (email, password) => {
    const data = await authAPI.register(email, password);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    try {
      sessionStorage.setItem('vettr_skip_guest_onboarding', '1');
    } catch {}
    clearGuestSettings();
    clearChromeExtensionSession();
    authAPI.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    wakingUp,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
