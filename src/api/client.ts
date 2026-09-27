import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import type { ApiError } from './types';

export const API_BASE = import.meta.env.VITE_API_BASE || '';

console.log('[api] baseURL:', API_BASE || '(相对路径，由 Vite 代理转发)');

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  /* ⭐ 自动带上 Authorization */
  const token =
    localStorage.getItem('gym_admin_token') ||
    sessionStorage.getItem('gym_admin_token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  console.log('[api request]', config.method?.toUpperCase(), config.url, config.data);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[api response]', response.config.url, response.status);
    return response;
  },
  (error: AxiosError<ApiError>) => {
    console.error('[api error]', error.config?.url, error.message, error.response?.data);

    /* ⭐ 401 → 清 token + 跳登录 */
    if (error.response?.status === 401) {
      localStorage.removeItem('gym_admin_token');
      localStorage.removeItem('gym_admin_user');
      sessionStorage.removeItem('gym_admin_token');
      sessionStorage.removeItem('gym_admin_user');
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    return data?.message || data?.error || err.message;
  }
  if (err instanceof Error) return err.message;
  return '未知错误';
}