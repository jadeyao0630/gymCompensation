import React from 'react';
import { Store } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { STORES } from '../constants/stores';
import type { UserPermissionConfig } from '../constants/permissions';

/** ⭐ 判断某门店对当前用户是否可用 */
function isStoreAvailable(
  config: UserPermissionConfig,
  storeId: string
): boolean {
  if (config.permissions.length === 0) return false;
  if (!config.storeIds || config.storeIds.length === 0) return true;
  return config.storeIds.map(String).includes(String(storeId));
}

const StoreSwitcher: React.FC = () => {
  const { storeId, setStoreId } = useStore();
  const { isSuperAdmin, config } = useAuth();

  /* ⭐ 超管显示全部门店；普通用户只显示有权限的门店 */
  const visibleStores = isSuperAdmin
    ? STORES
    : STORES.filter((s) => isStoreAvailable(config, s.id));

  /* 无门店显示时，不渲染 */
  if (visibleStores.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 p-1 bg-white/80 backdrop-blur rounded-2xl border border-gray-200 shadow-sm">
      <div className="pl-2 pr-1 text-gray-400">
        <Store className="w-4 h-4" />
      </div>
      {visibleStores.map((s) => {
        const active = s.id === storeId;
        return (
          <button
            key={s.id}
            onClick={() => setStoreId(s.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s.shortName}
          </button>
        );
      })}
    </div>
  );
};

export default StoreSwitcher;