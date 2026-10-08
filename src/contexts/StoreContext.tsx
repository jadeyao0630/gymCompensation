import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { STORES } from '../constants/stores';

const STORE_ID_KEY = 'gym_current_store_id_v1';

interface StoreCtx {
  storeId: string;
  setStoreId: (id: string) => void;
  /** 所有门店列表（含 id / name） */
  stores: typeof STORES;
}

const Ctx = createContext<StoreCtx | null>(null);

function getInitialStoreId(): string {
  /* 1) 优先 localStorage */
  try {
    const saved = localStorage.getItem(STORE_ID_KEY);
    if (saved && STORES.some((s) => s.id === saved)) {
      return saved;
    }
  } catch {}

  /* 2) 其次 URL query ?store_id= */
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('store_id');
    if (fromUrl && STORES.some((s) => s.id === fromUrl)) {
      return fromUrl;
    }
  } catch {}

  /* 3) 兜底：第一个门店 */
  return STORES[0]?.id || '';
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [storeId, setStoreIdState] = useState<string>(() => getInitialStoreId());

  /* ⭐ 每次变化 → 写 localStorage */
  const setStoreId = useCallback((id: string) => {
    if (!id) return;
    setStoreIdState(id);
    try {
      localStorage.setItem(STORE_ID_KEY, id);
    } catch (e) {
      console.warn('[StoreContext] 写 localStorage 失败', e);
    }
  }, []);

  /* ⭐ 首次挂载时，如果 storeId 是从 localStorage 恢复的，也同步写一次（保险） */
  useEffect(() => {
    if (storeId) {
      try {
        localStorage.setItem(STORE_ID_KEY, storeId);
      } catch {}
    }
  }, [storeId]);

  const value: StoreCtx = {
    storeId,
    setStoreId,
    stores: STORES,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('[useStore] 必须在 <StoreProvider> 内使用');
  return ctx;
}