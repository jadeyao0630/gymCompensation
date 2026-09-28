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

/* ============================================================
 * ⭐ 初始化状态
 * ============================================================ */

/** 检查数据库是否已初始化 */
export async function adminCheckInitStatus() {
  const res = await api.get('/api/admin/init-status');
  return res.data.data as {
    initialized: boolean;
    adminCount: number;
    reason?: 'no_table' | 'no_admin';
  };
}

/** 主动初始化数据库（幂等） */
export async function adminInitDatabase() {
  const res = await api.post('/api/admin/init');
  return res.data.data as {
    initialized: boolean;
    adminCount: number;
    message?: string;
  };
}

/* ============================================================
 * 登录 / 登出
 * ============================================================ */

export async function adminLogin(username: string, password: string) {
  const res = await api.post('/api/admin/login', { username, password });
  return res.data.data as { token: string; user: AdminUser };
}

export async function adminMe(token: string) {
  const res = await api.get('/api/admin/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data as { user: AdminUser };
}

export async function adminLogout() {
  try {
    await api.post('/api/admin/logout');
  } catch {
    /* ignore */
  }
}

/* ============================================================
 * 密码
 * ============================================================ */

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

/* ============================================================
 * 用户管理（仅超管）
 * ============================================================ */

export async function adminListUsers() {
  const res = await api.get('/api/admin/users');
  return res.data.data as AdminUserListItem[];
}

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

export async function adminDeleteUser(id: number) {
  const res = await api.delete(`/api/admin/users/${id}`);
  return res.data.data as { ok: boolean };
}

export async function adminResetUserPassword(
  id: number,
  newPassword: string
) {
  const res = await api.post(`/api/admin/users/${id}/reset-password`, {
    newPassword,
  });
  return res.data.data as { ok: boolean };
}