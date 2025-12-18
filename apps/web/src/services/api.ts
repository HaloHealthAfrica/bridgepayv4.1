import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Use cookies for auth
});

// Request interceptor - add auth token if needed
api.interceptors.request.use((config) => {
  // Auth is handled via cookies, so we don't need to add tokens manually
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/account/signin';
    }
    return Promise.reject(error);
  }
);

// Wallet APIs
export const walletAPI = {
  getBalance: (currency?: string) => {
    const params = currency ? { currency } : {};
    return api.get('/wallet/balance', { params });
  },
  getSummary: (currency?: string) => {
    const params = currency ? { currency } : {};
    return api.get('/wallet/summary', { params });
  },
  getTransactions: (params?: { limit?: number; cursor?: string; currency?: string }) => {
    return api.get('/wallet/transactions', { params });
  },
  getActivity: (params?: { limit?: number; filter?: 'all' | 'sent' | 'received' }) => {
    return api.get('/activity', { params });
  },
  topup: (data: { amount: number; method: string; phone?: string; currency?: string }) => {
    return api.post('/wallet/topup', data);
  },
  transfer: (data: {
    amount: number;
    recipient_user_id?: string;
    recipient_email?: string;
    narration?: string;
    currency?: string;
  }) => {
    return api.post('/wallet/transfer', data);
  },
};

// Auth APIs
export const authAPI = {
  getMe: () => api.get('/auth/me'),
};

export default api;

