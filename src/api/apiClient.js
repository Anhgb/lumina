import axios from 'axios';

/**
 * apiClient.js — 3 Axios instances according to PRD 3.2:
 * 1. mockApiClient: MockAPI.io for products & categories
 * 2. postmanClient: Postman Mock Server for vouchers, charms, ai_face_rules
 * 3. backendClient: Backend service for order verification & XAMPP DB
 */

const MOCKAPI_BASE_URL = import.meta.env.VITE_MOCKAPI_URL || '';
const POSTMAN_BASE_URL = import.meta.env.VITE_POSTMAN_MOCK_URL || '';
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000';

// 1. MockAPI instance (Products, Categories)
export const mockApiClient = axios.create({
  baseURL: MOCKAPI_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Postman Mock Server instance (Vouchers, Charms, ai_face_rules)
export const postmanClient = axios.create({
  baseURL: POSTMAN_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 3. Backend instance (Order checkout, MySQL XAMPP)
export const backendClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach simulated auth token if available
backendClient.interceptors.request.use(
  (config) => {
    try {
      const storedUser = localStorage.getItem('lumina_auth_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch {
      // Ignore parse error on token read
    }
    return config;
  },
  (error) => Promise.reject(error)
);
