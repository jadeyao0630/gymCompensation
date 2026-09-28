import { api } from './client';
import type { PermissionKey } from '../constants/permissions';

/** ⭐ 用户权限配置 */
export interface UserPermissionConfig {
  storeIds: string[];
  permissions: PermissionKey[];
}

/** 读取某用户权限配置 */
export async function fetchUserPermissions(
  userId: number
): Promise<UserPermissionConfig> {
  const res = await api.get(`/api/admin/users/${userId}/permissions`);
  const data = res.data.data || {};
  return {
    storeIds: Array.isArray(data.storeIds) ? data.storeIds.map(String) : [],
    permissions: Array.isArray(data.permissions)
      ? data.permissions.map((p: any) => (p?.permission ?? p) as PermissionKey)
      : [],
  };
}

/** 保存某用户权限配置 */
export async function saveUserPermissions(
  userId: number,
  config: UserPermissionConfig
): Promise<void> {
  await api.put(`/api/admin/users/${userId}/permissions`, {
    storeIds: config.storeIds,
    permissions: config.permissions,
  });
}

/** 读取当前登录用户自己的权限配置 */
export async function fetchMyPermissions(): Promise<UserPermissionConfig> {
  const res = await api.get('/api/admin/me/permissions');
  const data = res.data.data || {};
  return {
    storeIds: Array.isArray(data.storeIds) ? data.storeIds.map(String) : [],
    permissions: Array.isArray(data.permissions)
      ? data.permissions.map((p: any) => (p?.permission ?? p) as PermissionKey)
      : [],
  };
}