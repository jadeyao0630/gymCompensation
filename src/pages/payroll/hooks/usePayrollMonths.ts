import { useEffect, useRef, useState } from 'react';
import type {
  MonthlyCompensationPlan,
  CompensationStore,
} from '../../../types/compensation';
import { fetchPlanByMonth, fetchPlanList } from '../../../api/compensation';

interface Params {
  storeId: string;
  selectedMonth: string;
  /** ⭐ 当前门店的 store（month → plan），由页面从 fullStore[storeId] 取 */
  store: CompensationStore;
  savePlanToStorage: (
    storeId: string,
    month: string,
    plan: MonthlyCompensationPlan
  ) => void;
}

export function usePayrollMonths({
  storeId,
  selectedMonth,
  store,
  savePlanToStorage,
}: Params) {
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(false);
  const fetchedKeyRef = useRef<string>('');

  /* 可用月份列表：远端 + 本地合并 */
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setMonthsLoading(true);
    (async () => {
      const localMonths = Object.keys(store || {});
      let remoteMonths: string[] = [];
      try {
        const plans = await fetchPlanList(storeId);
        remoteMonths = (plans || [])
          .filter((p) => p.isActive !== 0)
          .map((p) => p.month);
      } catch (e) {
        console.warn('[usePayrollMonths] 拉取可用月份列表失败，使用本地缓存', e);
      }
      if (cancelled) return;
      const merged = Array.from(new Set([...remoteMonths, ...localMonths])).sort();
      setAvailableMonths(merged);
      setMonthsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, store]);

  /* 切门店时清空 fetchedKey */
  useEffect(() => {
    fetchedKeyRef.current = '';
  }, [storeId]);

  /* 按需加载当前月份方案详情 */
  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    const key = `${storeId}:${selectedMonth}`;
    if (fetchedKeyRef.current === key) return;

    const localPlan = store[selectedMonth];
    if (localPlan && localPlan.positions && localPlan.positions.length > 0) {
      fetchedKeyRef.current = key;
      return;
    }

    let cancelled = false;
    fetchedKeyRef.current = key;
    (async () => {
      try {
        const remote = await fetchPlanByMonth(storeId, selectedMonth);
        if (cancelled || !remote) return;
        savePlanToStorage(storeId, selectedMonth, remote);
      } catch (e) {
        console.warn('[usePayrollMonths] API 加载失败，使用本地缓存', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedMonth, store]);

  return {
    availableMonths,
    monthsLoading,
    /** 供外部（切月份时）主动失效 */
    invalidate: () => {
      fetchedKeyRef.current = '';
    },
  };
}