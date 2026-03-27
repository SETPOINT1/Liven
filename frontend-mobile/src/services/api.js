import axios from 'axios';
import { supabase } from './supabase';
import Constants from 'expo-constants';

const apiBaseUrl = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export default api;
