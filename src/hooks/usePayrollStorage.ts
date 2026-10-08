import { useCallback, useEffect, useState } from 'react';
import { savePlan } from '../api/compensation';
import type {
  CompensationStore,
  MonthlyCompensationPlan,
} from '../types/compensation';

const STORAGE_KEY = 'gym_compensation_store_v2';
const OVERRIDES_KEY = 'gym_position_overrides_v1';
const NEWBIE_KEY = 'gym_newbie_staff_v1';
const EXCLUDED_KEY = 'gym_excluded_staff_v1';

export type FullStore = Record<string, CompensationStore>;

function serializeSetMap(map: Record<string, Set<string>>): Record<string, string[]> {
  const raw: Record<string, string[]> = {};
  Object.entries(map).forEach(([sid, set]) => {
    raw[sid] = Array.from(set);
  });
  return raw;
}

function deserializeSetMap(raw: Record<string, string[]>): Record<string, Set<string>> {
  const next: Record<string, Set<string>> = {};
  Object.entries(raw || {}).forEach(([sid, ids]) => {
    next[sid] = new Set(Array.isArray(ids) ? ids : []);
  });
  return next;
}

export function usePayrollStorage() {
  const [fullStore, setFullStore] = useState<FullStore>({});
  const [overridesByStore, setOverridesByStore] = useState<
    Record<string, Record<string, string>>
  >({});
  const [newbieByStore, setNewbieByStore] = useState<Record<string, Set<string>>>({});
  const [excludedByStore, setExcludedByStore] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setFullStore(JSON.parse(saved)); } catch (e) {
        console.error('[PayrollStorage] fullStore 解析失败', e);
      }
    }
    const savedOv = localStorage.getItem(OVERRIDES_KEY);
    if (savedOv) {
      try { setOverridesByStore(JSON.parse(savedOv)); } catch (e) {
        console.error('[PayrollStorage] overrides 解析失败', e);
      }
    }
    const savedNewbie = localStorage.getItem(NEWBIE_KEY);
    if (savedNewbie) {
      try {
        const raw = JSON.parse(savedNewbie) as Record<string, string[]>;
        setNewbieByStore(deserializeSetMap(raw));
      } catch (e) {
        console.error('[PayrollStorage] newbie 解析失败', e);
      }
    }
    const savedExcluded = localStorage.getItem(EXCLUDED_KEY);
    if (savedExcluded) {
      try {
        const raw = JSON.parse(savedExcluded) as Record<string, string[]>;
        setExcludedByStore(deserializeSetMap(raw));
      } catch (e) {
        console.error('[PayrollStorage] excluded 解析失败', e);
      }
    }
  }, []);

  const persistNewbie = useCallback((next: Record<string, Set<string>>) => {
    try {
      localStorage.setItem(NEWBIE_KEY, JSON.stringify(serializeSetMap(next)));
    } catch (e) { console.error('[PayrollStorage] 写 newbie 失败', e); }
  }, []);

  const persistExcluded = useCallback(
    (next: Record<string, Set<string>>) => {
      try {
        localStorage.setItem(EXCLUDED_KEY, JSON.stringify(serializeSetMap(next)));
      } catch (e) { console.error('[PayrollStorage] 写 excluded 失败', e); }
    },
    []
  );

  /* ⭐ 只写内存 + localStorage（不落库），保留兼容 */
  const savePlanToStorage = useCallback(
    (sid: string, month: string, plan: MonthlyCompensationPlan) => {
      setFullStore((prev) => {
        const next = {
          ...prev,
          [sid]: { ...(prev[sid] || {}), [month]: plan },
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) { console.error('[PayrollStorage] 写 fullStore 失败', e); }
        return next;
      });
    },
    []
  );

  /* ⭐ 新增：写内存 + 落库（MySQL），不写 localStorage */
  const persistPlanToServer = useCallback(
    async (sid: string, month: string, plan: MonthlyCompensationPlan) => {
      /* 1) 更新内存（让 UI 立即刷新） */
      setFullStore((prev) => ({
        ...prev,
        [sid]: { ...(prev[sid] || {}), [month]: plan },
      }));

      /* 2) 落库 MySQL */
      await savePlan(sid, plan);
    },
    []
  );

  return {
    fullStore,
    setFullStore,
    overridesByStore,
    setOverridesByStore,
    newbieByStore,
    setNewbieByStore,
    excludedByStore,
    setExcludedByStore,
    persistNewbie,
    persistExcluded,
    savePlanToStorage,
    persistPlanToServer,       // ⭐ 新增
  };
}