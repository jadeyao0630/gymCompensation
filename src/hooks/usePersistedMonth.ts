import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 页面级月份持久化（完全不依赖 URL，纯 localStorage）
 * key = `gym_${pageKey}_month_v1_${storeId}`
 * 每个页面 + 每个门店各自独立，互不覆盖。
 */
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

  /** 初始值：只读本页面 + 本门店的 localStorage */
  const [month, setMonthState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    } catch {}
    return getDefault();
  });

  /** month 变化 → 写 localStorage */
  useEffect(() => {
    if (!month) return;
    try {
      localStorage.setItem(storageKey, month);
    } catch (e) {
      console.warn(`[usePersistedMonth] 写入 ${storageKey} 失败`, e);
    }
  }, [month, storageKey]);

  /** 门店切换 → 从该门店该页面的 localStorage 重新读取（不读 URL） */
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