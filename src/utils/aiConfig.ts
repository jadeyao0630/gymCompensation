export interface AIStoreProfile {
  name: string;
  area: string;
  facilities: string[];
  positioning: string;
  focus: string[];
}
export interface AIConfig {
  prompt: string;
  profiles: Record<string, AIStoreProfile>;
  defaultPrompt: string;
  defaultProfiles: Record<string, AIStoreProfile>;
}
const BASE = '/api'; // 与现有 AI 路由挂载前缀一致时使用；若挂载不同请修改
function headers(): HeadersInit {
  // 与 AuthContext.tsx 完全一致：记住登录放 localStorage，否则放 sessionStorage。
  const token = localStorage.getItem('gym_admin_token') || sessionStorage.getItem('gym_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(BASE + path, {
    method,
    headers: headers(),
    credentials: 'include',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.errorcode !== 0) {
    const message = json.errormsg || json.message || `HTTP ${response.status}`;
    throw new Error(response.status === 401 ? `认证失败（401）：${message}` : message);
  }
  return json.data as T;
}
export const fetchAIConfig = () => request<AIConfig>('/ai/config');
export const saveAIPrompt = (prompt: string) => request<{prompt: string}>('/ai/config/prompt', 'PUT', { prompt });
export const saveAIProfile = (storeId: string, profile: AIStoreProfile) =>
  request<{profile: AIStoreProfile}>(`/ai/config/profiles/${encodeURIComponent(storeId)}`, 'PUT', { profile });
