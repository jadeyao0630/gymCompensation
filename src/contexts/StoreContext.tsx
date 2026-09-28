import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_STORE_ID, getStoreById, STORES } from '../constants/stores';
import type { StoreInfo } from '../constants/stores';
import { useAuth } from './AuthContext';
import type { UserPermissionConfig } from '../constants/permissions';

const STORAGE_KEY = 'gym_current_store_id';

interface StoreContextValue {
  storeId: string;
  store: StoreInfo;
  setStoreId: (id: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/* ============================================================
 * ⭐ 判断某门店对当前用户是否可用
 * - 没有任何权限 → 不可用
 * - storeIds 为空数组（全部门店）→ 可用
 * - storeIds 包含当前门店 → 可用
 * ============================================================ */
function isStoreAvailable(
  config: UserPermissionConfig,
  storeId: string
): boolean {
  if (config.permissions.length === 0) return false;
  if (!config.storeIds || config.storeIds.length === 0) return true;
  return config.storeIds.map(String).includes(String(storeId));
}

function findFirstAvailableStore(
  config: UserPermissionConfig
): string | null {
  for (const s of STORES) {
    if (isStoreAvailable(config, s.id)) return s.id;
  }
  return null;
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isSuperAdmin, config, loading: authLoading } = useAuth();

  const [storeId, setStoreIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_STORE_ID;
  });

  const autoSwitchedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, storeId);
  }, [storeId]);

  /* ============================================================
   * ⭐ 自动切换到可用门店
   * ============================================================ */
  useEffect(() => {
    if (authLoading) return;
    if (isSuperAdmin) return;
    if (config.permissions.length === 0) return;

    if (isStoreAvailable(config, storeId)) {
      autoSwitchedRef.current = false;
      return;
    }

    if (autoSwitchedRef.current) return;

    const next = findFirstAvailableStore(config);
    if (next && next !== storeId) {
      console.log(
        `[StoreContext] 当前门店 ${storeId} 无权限，自动切换到 ${next}`
      );
      autoSwitchedRef.current = true;
      setStoreIdState(next);
    }
  }, [authLoading, isSuperAdmin, config, storeId]);

  const store = getStoreById(storeId) || getStoreById(DEFAULT_STORE_ID)!;

  const setStoreId = (id: string) => {
    const valid = getStoreById(id);
    if (valid) {
      autoSwitchedRef.current = false;
      setStoreIdState(id);
    }
  };

  return (
    <StoreContext.Provider value={{ storeId, store, setStoreId }}>
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}