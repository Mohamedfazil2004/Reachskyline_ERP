import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Set the base URL for API calls in production
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('erp_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token && !user) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchUser();
      } else {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error("Auth verification failed", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, userData) => {
    setLoading(true); // Set loading while we persist
    localStorage.setItem('erp_token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    setLoading(false); // Done
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
