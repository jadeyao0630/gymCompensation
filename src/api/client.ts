import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import type { ApiError } from './types';

export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:4000';

console.log('[api] baseURL:', API_BASE);

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
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