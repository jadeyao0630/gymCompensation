import { api } from './client';

export interface AdminUser {
  id: number;
  username: string;
  displayName: string;
}

/** 登录 */
export async function adminLogin(username: string, password: string) {
  const res = await api.post('/api/admin/login', { username, password });
  return res.data.data as { token: string; user: AdminUser };
}

/** 校验 token（免密登录） */
export async function adminMe(token: string) {
  const res = await api.get('/api/admin/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data as { user: AdminUser };
}

/** 登出 */
export async function adminLogout() {
  try {
    await api.post('/api/admin/logout');
  } catch {
    /* ignore */
  }
}

/** ⭐ 修改密码 */
export async function adminChangePassword(
  oldPassword: string,
  newPassword: string
) {
  const res = await api.post('/api/admin/change-password', {
    oldPassword,
    newPassword,
  });
  return res.data.data as { ok: boolean };
}