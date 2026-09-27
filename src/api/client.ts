import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import type { ApiError } from './types';

/* ============================================================
 * ⭐ 方案 A：baseURL 设为空字符串
 *   前端请求路径保持原样（例如 /api/swimming_class_statistics）
 *   Vite 代理会把 /api/* 转发到 http://<IP>:4000/api/*
 *
 *   生产环境可用 VITE_API_BASE 覆盖成完整地址
 * ============================================================ */
export const API_BASE =
  import.meta.env.VITE_API_BASE || '';

console.log('[api] baseURL:', API_BASE || '(相对路径，由 Vite 代理转发)');

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