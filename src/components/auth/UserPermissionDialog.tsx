import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  PERMISSION_LIST,
  isPermissionAvailable,
  type PermissionKey,
  type PermissionMeta,
} from '../../constants/permissions';
import {
  fetchUserPermissions,
  saveUserPermissions,
  type UserPermissionConfig,
} from '../../api/permissions';
import { STORES } from '../../constants/stores';
import type { AdminUserListItem } from '../../api/adminAuth';

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

  const toggleStore = (storeId: string) => {
    setConfig((prev) => {
      const has = prev.storeIds.includes(storeId);
      const next = has
        ? prev.storeIds.filter((s) => s !== storeId)
        : [...prev.storeIds, storeId];
      return { ...prev, storeIds: next };
    });
  };

  const toggleAllStores = () => {
    setConfig((prev) => ({
      ...prev,
      storeIds: prev.storeIds.length === 0 ? STORES.map((s) => s.id) : [],
    }));
  };

  const togglePermission = (key: PermissionKey) => {
    setConfig((prev) => {
      const has = prev.permissions.includes(key);
      let next = [...prev.permissions];

      if (has) {
        next = next.filter((p) => p !== key);
        let changed = true;
        while (changed) {
          changed = false;
          for (const meta of PERMISSION_LIST) {
            if (
              next.includes(meta.key) &&
              meta.requires?.some((r) => !next.includes(r))
            ) {
              next = next.filter((p) => p !== meta.key);
              changed = true;
            }
          }
        }
      } else {
        if (!isPermissionAvailable(key, next)) {
          const meta = PERMISSION_LIST.find((p) => p.key === key);
          const missing = (meta?.requires || [])
            .filter((r) => !next.includes(r))
            .map((r) => PERMISSION_LIST.find((p) => p.key === r)?.label || r)
            .join('、');
          alert(`请先勾选：${missing}`);
          return prev;
        }
        next.push(key);
      }

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

  /* ⭐ 特殊分组结构：'薪酬佣金设置' 里的"查看方案 / 设置方案"作为基础项，其他作为其子分组 */
  const structuredGroups = useMemo(() => {
    const result: Array<{
      group: string;
      /** 基础项（无子分组） */
      baseItems: PermissionMeta[];
      /** 挂在"设置方案"下的子分组 */
      nestedSubGroups: Array<{ subGroup: string; items: PermissionMeta[] }>;
      /** 其他无关联的子分组（未来扩展用） */
      otherSubGroups: Array<{ subGroup: string; items: PermissionMeta[] }>;
    }> = [];

    const groupOrder: string[] = [];
    const groupData = new Map<
      string,
      {
        baseItems: PermissionMeta[];
        subGroups: Map<string, PermissionMeta[]>;
      }
    >();

    PERMISSION_LIST.forEach((meta) => {
      if (!isPermissionAvailable(meta.key, config.permissions)) return;

      if (!groupData.has(meta.group)) {
        groupOrder.push(meta.group);
        groupData.set(meta.group, {
          baseItems: [],
          subGroups: new Map(),
        });
      }
      const g = groupData.get(meta.group)!;

      if (meta.subGroup) {
        if (!g.subGroups.has(meta.subGroup)) {
          g.subGroups.set(meta.subGroup, []);
        }
        g.subGroups.get(meta.subGroup)!.push(meta);
      } else {
        g.baseItems.push(meta);
      }
    });

    groupOrder.forEach((group) => {
      const g = groupData.get(group)!;
      const subGroups = Array.from(g.subGroups.entries()).map(
        ([subGroup, items]) => ({ subGroup, items })
      );

      /* 特殊处理："薪酬佣金设置" 下的子分组，作为"设置方案"的下级 */
      if (group === '薪酬佣金设置') {
        result.push({
          group,
          baseItems: g.baseItems,
          nestedSubGroups: subGroups,
          otherSubGroups: [],
        });
      } else {
        result.push({
          group,
          baseItems: g.baseItems,
          nestedSubGroups: [],
          otherSubGroups: subGroups,
        });
      }
    });

    return result;
  }, [config.permissions]);

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
              {/* 门店范围 */}
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

              {/* 权限列表 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  权限
                </h4>
                <div className="space-y-5">
                  {structuredGroups.map(({ group, baseItems, nestedSubGroups, otherSubGroups }) => {
                    /* 判断是否需要把"设置方案"作为锚点（只有"薪酬佣金设置"需要） */
                    const isCompensationGroup = group === '薪酬佣金设置';
                    const hasPlanEdit = isCompensationGroup
                      ? baseItems.some((m) => m.key === 'plan:edit')
                      : false;

                    return (
                      <div key={group}>
                        <div className="text-xs font-semibold text-gray-700 mb-2 pb-1.5 border-b border-gray-100">
                          {group}
                        </div>

                        <div className="space-y-2 pl-1">
                          {/* 基础项 */}
                          {baseItems.map((meta) => {
                            const checked = config.permissions.includes(
                              meta.key
                            );
                            const isAnchor = meta.key === 'plan:edit';

                            return (
                              <div key={meta.key}>
                                <label
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

                                {/* ⭐ 把子分组缩进挂在"设置方案"下面 */}
                                {isAnchor && hasPlanEdit && nestedSubGroups.length > 0 && (
                                  <div className="mt-2 ml-4 pl-4 border-l-2 border-emerald-100 space-y-3">
                                    {nestedSubGroups.map(
                                      ({ subGroup, items }) => (
                                        <div key={subGroup}>
                                          <div className="flex items-center gap-1.5 mb-1.5">
                                            <span className="w-1 h-3 rounded-full bg-emerald-400" />
                                            <span className="text-[11px] font-medium text-gray-500">
                                              {subGroup}
                                            </span>
                                            <span className="text-[10px] text-gray-300">
                                              （{items.length}）
                                            </span>
                                          </div>
                                          <div className="space-y-1.5">
                                            {items.map((m) => {
                                              const c =
                                                config.permissions.includes(
                                                  m.key
                                                );
                                              return (
                                                <label
                                                  key={m.key}
                                                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                                                    c
                                                      ? 'border-emerald-200 bg-emerald-50/40'
                                                      : 'border-gray-100 bg-white hover:border-gray-200'
                                                  }`}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={c}
                                                    onChange={() =>
                                                      togglePermission(m.key)
                                                    }
                                                    className="mt-0.5 accent-emerald-600 w-4 h-4"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-800">
                                                      {m.label}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 mt-0.5">
                                                      {m.desc}
                                                    </div>
                                                  </div>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* 其他分组（非薪酬佣金设置）的子分组 */}
                          {otherSubGroups.map(({ subGroup, items }) => (
                            <div key={subGroup}>
                              <div className="flex items-center gap-1.5 mb-1.5 mt-2">
                                <span className="w-1 h-3 rounded-full bg-emerald-400" />
                                <span className="text-[11px] font-medium text-gray-500">
                                  {subGroup}
                                </span>
                                <span className="text-[10px] text-gray-300">
                                  （{items.length}）
                                </span>
                              </div>
                              <div className="space-y-1.5 pl-4">
                                {items.map((m) => {
                                  const c = config.permissions.includes(
                                    m.key
                                  );
                                  return (
                                    <label
                                      key={m.key}
                                      className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                                        c
                                          ? 'border-emerald-200 bg-emerald-50/40'
                                          : 'border-gray-100 bg-white hover:border-gray-200'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={c}
                                        onChange={() =>
                                          togglePermission(m.key)
                                        }
                                        className="mt-0.5 accent-emerald-600 w-4 h-4"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-800">
                                          {m.label}
                                        </div>
                                        <div className="text-[11px] text-gray-400 mt-0.5">
                                          {m.desc}
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
                    );
                  })}
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