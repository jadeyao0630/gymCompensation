
import React, { useCallback, useEffect, useState } from 'react';
import { Store, RefreshCw } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import type { UserPermissionConfig } from '../../constants/permissions';

interface StoreItem {
  id: string;
  name: string;
  shortName: string;
}

function isStoreAvailable(
  config: UserPermissionConfig,
  storeId: string
): boolean {
  if (config.permissions.length === 0) return false;

  if (!config.storeIds || config.storeIds.length === 0) {
    return true;
  }

  return config.storeIds.map(String).includes(String(storeId));
}

function parseStores(payload: any): StoreItem[] {
  const data = payload?.data ?? payload;

  const raw = Array.isArray(data)
    ? data
    : Array.isArray(data?.stores)
      ? data.stores
      : [];

  return raw
    .filter((s: any) => s && s.id != null)
    .map((s: any) => ({
      id: String(s.id),
      name: String(s.name || s.shortName || s.id),
      shortName: String(s.shortName || s.name || s.id),
    }));
}

const StoreSwitcher: React.FC = () => {
  const { storeId, setStoreId } = useStore();
  const { isSuperAdmin, config } = useAuth();

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/dingtalk/store-config', {
        method: 'GET',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();

      if (payload?.errorcode != null && payload.errorcode !== 0) {
        throw new Error(payload.errormsg || '获取门店失败');
      }

      setStores(parseStores(payload));
    } catch (err) {
      console.error('[StoreSwitcher] 获取门店失败:', err);
      setError('门店列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadStores();
    };

    window.addEventListener('stores-updated', handleRefresh);

    return () => {
      window.removeEventListener('stores-updated', handleRefresh);
    };
  }, [loadStores]);

  const visibleStores = isSuperAdmin
    ? stores
    : stores.filter((s) => isStoreAvailable(config, s.id));

  if (loading && stores.length === 0) {
    return (
      <div className="text-xs text-gray-400 px-3 py-2">
        加载门店中…
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 p-1 bg-white/80 backdrop-blur rounded-2xl border border-gray-200 shadow-sm">
      <div className="pl-2 pr-1 text-gray-400">
        <Store className="w-4 h-4" />
      </div>

      {visibleStores.map((s) => {
        const active = String(s.id) === String(storeId);

        return (
          <button
            key={s.id}
            type="button"
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

      <button
        type="button"
        onClick={() => void loadStores()}
        disabled={loading}
        title={error || '刷新门店列表'}
        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-xl disabled:opacity-50"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
        />
      </button>
    </div>
  );
};

export default StoreSwitcher;
