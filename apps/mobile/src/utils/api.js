/**
 * API Client for Mobile App
 * Handles authenticated API requests
 */

import * as SecureStore from 'expo-secure-store';
import { authKey } from './auth/store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:4000';

/**
 * Get stored auth token
 */
async function getAuthToken() {
  try {
    const authStr = await SecureStore.getItemAsync(authKey);
    if (!authStr) return null;
    const auth = JSON.parse(authStr);
    return auth?.jwt || null;
  } catch (error) {
    console.error('[API] Error getting auth token:', error);
    return null;
  }
}

/**
 * Make authenticated API request
 */
export async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // For cookie-based auth fallback
  };

  try {
    const response = await fetch(url, config);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        data: text,
        error: !response.ok ? text : null,
      };
    }

    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data: data.data || data,
      error: !response.ok ? (data.error || data.message || 'Request failed') : null,
      raw: data,
    };
  } catch (error) {
    console.error('[API] Request error:', error);
    return {
      ok: false,
      status: 0,
      error: error.message || 'Network error',
    };
  }
}

/**
 * GET request
 */
export async function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 */
export async function apiPut(endpoint, body, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 */
export async function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Get current auth object
 */
export async function getCurrentAuth() {
  try {
    const authStr = await SecureStore.getItemAsync(authKey);
    return authStr ? JSON.parse(authStr) : null;
  } catch {
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const auth = await getCurrentAuth();
  return auth?.user || null;
}

