import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_STORE_ID, getStoreById } from '../constants/stores';
import type { StoreInfo } from '../constants/stores';

const STORAGE_KEY = 'gym_current_store_id';

interface StoreContextValue {
  storeId: string;
  store: StoreInfo;
  setStoreId: (id: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [storeId, setStoreIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_STORE_ID;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, storeId);
  }, [storeId]);

  const store = getStoreById(storeId) || getStoreById(DEFAULT_STORE_ID)!;

  const setStoreId = (id: string) => {
    const valid = getStoreById(id);
    if (valid) setStoreIdState(id);
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