import { useCallback, useEffect, useRef, useState } from 'react';

export function usePersistedMonth(
  pageKey: string,
  storeId: string,
  defaultMonth?: string
) {
  const storageKey = `gym_${pageKey}_month_v1_${storeId || 'default'}`;

  const getDefault = useCallback(() => {
    if (defaultMonth && /^\d{4}-\d{2}$/.test(defaultMonth)) return defaultMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [defaultMonth]);

  const [month, setMonthState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    } catch {}
    return getDefault();
  });

  useEffect(() => {
    if (!month) return;
    try {
      localStorage.setItem(storageKey, month);
    } catch (e) {
      console.warn(`[usePersistedMonth] 写入 ${storageKey} 失败`, e);
    }
  }, [month, storageKey]);

  const prevStoreRef = useRef(storeId);
  useEffect(() => {
    if (prevStoreRef.current === storeId) return;
    prevStoreRef.current = storeId;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && /^\d{4}-\d{2}$/.test(saved)) {
        setMonthState(saved);
        return;
      }
    } catch {}
    setMonthState(getDefault());
  }, [storeId, storageKey, getDefault]);

  const setMonth = useCallback((m: string) => {
    if (!m) return;
    setMonthState(m);
  }, []);

  return { month, setMonth, changeMonth: setMonth };
}