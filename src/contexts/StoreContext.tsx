import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { STORES } from '../constants/stores';
import type { StoreInfo } from '../constants/stores';
import { fetchStores } from '../utils/storeConfig';

const STORE_ID_KEY = 'gym_current_store_id_v1';
const STORES_UPDATED_EVENT = 'stores-updated';

interface StoreCtx {
  storeId: string;
  setStoreId: (id: string) => void;
  stores: StoreInfo[];
  refreshStores: () => Promise<void>;
  storesLoading: boolean;
  storesError: string | null;
}

const Ctx = createContext<StoreCtx | null>(null);

function getPreferredStoreId(): string {
  // URL 显式指定优先；否则恢复上次选中值。
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('store_id');
    if (fromUrl) return fromUrl;
  } catch {}
  try {
    return localStorage.getItem(STORE_ID_KEY) || '';
  } catch {
    return '';
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stores, setStores] = useState<StoreInfo[]>(() => [...STORES]);
  const [storeId, setStoreIdState] = useState<string>(getPreferredStoreId);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState<string | null>(null);

  const refreshStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const list = await fetchStores();
      if (!Array.isArray(list)) throw new Error('门店列表格式错误');
      const next = list.filter((s) => s && s.id != null).map((s) => ({
        ...s,
        id: String(s.id),
      }));
      setStores(next);
      setStoresError(null);
      setStoreIdState((previous) => {
        if (next.some((s) => String(s.id) === String(previous))) return previous;
        return next[0]?.id || '';
      });
    } catch (e) {
      console.error('[StoreContext] 读取门店失败', e);
      setStoresError(e instanceof Error ? e.message : '读取门店失败');
      // 请求失败时保留现有列表与选中项，避免暂时性断网导致切换。
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStores();
    const onUpdated = () => { void refreshStores(); };
    window.addEventListener(STORES_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(STORES_UPDATED_EVENT, onUpdated);
  }, [refreshStores]);

  const setStoreId = useCallback((id: string) => {
    const normalized = String(id || '');
    if (!normalized) return;
    // 仅允许选中当前已加载的门店。
    if (!stores.some((s) => String(s.id) === normalized)) return;
    setStoreIdState(normalized);
  }, [stores]);

  useEffect(() => {
    if (!storeId) return;
    try {
      localStorage.setItem(STORE_ID_KEY, storeId);
    } catch (e) {
      console.warn('[StoreContext] 写 localStorage 失败', e);
    }
  }, [storeId]);

  const value = useMemo<StoreCtx>(() => ({
    storeId,
    setStoreId,
    stores,
    refreshStores,
    storesLoading,
    storesError,
  }), [storeId, setStoreId, stores, refreshStores, storesLoading, storesError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('[useStore] 必须在 <StoreProvider> 内使用');
  return ctx;
}
