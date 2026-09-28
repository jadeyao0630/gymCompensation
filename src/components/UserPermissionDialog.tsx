import React, { useEffect, useState } from 'react';
import { X, Loader2, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  PERMISSION_LIST,
  type PermissionKey,
} from '../constants/permissions';
import {
  fetchUserPermissions,
  saveUserPermissions,
  type UserPermissionConfig,
} from '../api/permissions';
import { STORES } from '../constants/stores';
import type { AdminUserListItem } from '../api/adminAuth';

interface Props {
  user: AdminUserListItem;
  onClose: () => void;
  onSaved?: () => void;
}

const UserPermissionDialog: React.FC<Props> = ({ user, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<UserPermissionConfig>({
    storeIds: [],
    permissions: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const c = await fetchUserPermissions(user.id);
        if (!cancelled) setConfig(c);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.errormsg || e?.message || '加载权限失败'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  /* ⭐ 门店开关 */
  const toggleStore = (storeId: string) => {
    setConfig((prev) => {
      const has = prev.storeIds.includes(storeId);
      const next = has
        ? prev.storeIds.filter((s) => s !== storeId)
        : [...prev.storeIds, storeId];
      return { ...prev, storeIds: next };
    });
  };

  /* ⭐ 全部门店开关 */
  const toggleAllStores = () => {
    setConfig((prev) => ({
      ...prev,
      storeIds: prev.storeIds.length === 0 ? STORES.map((s) => s.id) : [],
    }));
  };

  /* ⭐ 权限开关 */
  const togglePermission = (key: PermissionKey) => {
    setConfig((prev) => {
      const has = prev.permissions.includes(key);
      const next = has
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key];
      return { ...prev, permissions: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await saveUserPermissions(user.id, config);
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.errormsg || e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const groups = Array.from(new Set(PERMISSION_LIST.map((p) => p.group)));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">权限设置</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              为「{user.username}」
              {user.displayName ? `（${user.displayName}）` : ''}配置门店和权限
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <>
              {/* ⭐ 门店范围 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  门店范围
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleAllStores}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      config.storeIds.length === 0
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    全部门店
                  </button>
                  {STORES.map((s) => {
                    const active = config.storeIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStore(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  当前：
                  {config.storeIds.length === 0
                    ? '全部门店'
                    : config.storeIds
                        .map(
                          (id) =>
                            STORES.find((s) => s.id === id)?.name || id
                        )
                        .join('、')}
                </p>
              </div>

              {/* ⭐ 权限列表 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  权限
                </h4>
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div key={group}>
                      <div className="text-[11px] font-medium text-gray-400 mb-1.5">
                        {group}
                      </div>
                      <div className="space-y-1.5">
                        {PERMISSION_LIST.filter(
                          (p) => p.group === group
                        ).map((meta) => {
                          const checked = config.permissions.includes(
                            meta.key
                          );
                          return (
                            <label
                              key={meta.key}
                              className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                                checked
                                  ? 'border-emerald-200 bg-emerald-50/40'
                                  : 'border-gray-100 bg-white hover:border-gray-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  togglePermission(meta.key)
                                }
                                className="mt-0.5 accent-emerald-600 w-4 h-4"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800">
                                  {meta.label}
                                </div>
                                <div className="text-[11px] text-gray-400 mt-0.5">
                                  {meta.desc}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-[11px] text-gray-400">
            门店{' '}
            {config.storeIds.length === 0
              ? '全部'
              : `${config.storeIds.length} 个`}{' '}
            · 权限 {config.permissions.length} 项
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97] disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  保存
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionDialog;