import axios from 'axios';
import { supabase } from './supabase';
import Constants from 'expo-constants';

const apiBaseUrl = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

// Attach auth token
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 401 — auto sign out on expired/invalid token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

export default api;
