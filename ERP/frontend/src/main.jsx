import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Global axios: attach stored token to every request automatically
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token');
  if (token) {
    // Force header insertion securely to survive any interceptor conflicts
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handler: gracefully log errors instead of violently ejecting active sessions
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Caught 401 Unauthorized for URL:', error.config?.url);
      // Suppress immediate logout, rely on React components to explicitly redirect if their main fetches fail
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
