import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, getToken } from '../utils/api';
import { pushSessionToChromeExtension, clearChromeExtensionSession } from '../utils/extensionBridge';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const data = await authAPI.getCurrentUser();
          setUser(data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          authAPI.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (token) {
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
    clearChromeExtensionSession();
    authAPI.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
