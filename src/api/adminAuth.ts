import { api } from './client';

export interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
}

export interface AdminUserListItem {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

/** 登录 */
export async function adminLogin(username: string, password: string) {
  const res = await api.post('/api/admin/login', { username, password });
  return res.data.data as { token: string; user: AdminUser };
}

/** 校验 token */
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

/** 修改自己的密码 */
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

/* ============== 以下仅超管可调 ============== */

/** 用户列表 */
export async function adminListUsers() {
  const res = await api.get('/api/admin/users');
  return res.data.data as AdminUserListItem[];
}

/** 新增用户 */
export async function adminCreateUser(
  username: string,
  password: string,
  displayName?: string
) {
  const res = await api.post('/api/admin/users', {
    username,
    password,
    displayName,
  });
  return res.data.data as {
    id: number;
    username: string;
    displayName: string;
    role: string;
  };
}

/** 删除用户 */
export async function adminDeleteUser(id: number) {
  const res = await api.delete(`/api/admin/users/${id}`);
  return res.data.data as { ok: boolean };
}

/** ⭐ 重置用户密码 */
export async function adminResetUserPassword(
  id: number,
  newPassword: string
) {
  const res = await api.post(`/api/admin/users/${id}/reset-password`, {
    newPassword,
  });
  return res.data.data as { ok: boolean };
}