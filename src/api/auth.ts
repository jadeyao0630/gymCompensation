import { api } from './client';
import type { LoginRequest, LoginResponse } from './types';

/**
 * 登录
 * 成功后浏览器会收到后端透传的 Set-Cookie
 */
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/login', payload);
  return data;
}

/**
 * 登出（后端如果有 /api/logout 就调）
 */
export async function logout(): Promise<void> {
  await api.post('/api/logout').catch(() => {
    /* 忽略错误 */
  });
}