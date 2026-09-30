import { useCallback, useEffect, useState } from 'react';
import type {
  CompensationStore,
  MonthlyCompensationPlan,
} from '../types/compensation';

/* ============================================================
 * localStorage 键
 * ============================================================ */
const STORAGE_KEY = 'gym_compensation_store_v2';
const OVERRIDES_KEY = 'gym_position_overrides_v1';
const NEWBIE_KEY = 'gym_newbie_staff_v1';
const EXCLUDED_KEY = 'gym_excluded_staff_v1';   // ⭐ 新增

export type FullStore = Record<string, CompensationStore>;

/* 把 Set 结构序列化为 string[] */
function serializeSetMap(map: Record<string, Set<string>>): Record<string, string[]> {
  const raw: Record<string, string[]> = {};
  Object.entries(map).forEach(([sid, set]) => {
    raw[sid] = Array.from(set);
  });
  return raw;
}

/* 把 string[] 反序列化为 Set 结构 */
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
  const [newbieByStore, setNewbieByStore] = useState<
    Record<string, Set<string>>
  >({});
  const [excludedByStore, setExcludedByStore] = useState<
    Record<string, Set<string>>
  >({});   // ⭐ 新增

  /* ============================================================
   * 初始化：从 localStorage 恢复所有键
   * ============================================================ */
  useEffect(() => {
    /* fullStore */
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFullStore(JSON.parse(saved));
      } catch (e) {
        console.error('[PayrollStorage] fullStore 解析失败', e);
      }
    }

    /* overrides */
    const savedOv = localStorage.getItem(OVERRIDES_KEY);
    if (savedOv) {
      try {
        setOverridesByStore(JSON.parse(savedOv));
      } catch (e) {
        console.error('[PayrollStorage] overrides 解析失败', e);
      }
    }

    /* newbie */
    const savedNewbie = localStorage.getItem(NEWBIE_KEY);
    if (savedNewbie) {
      try {
        const raw = JSON.parse(savedNewbie) as Record<string, string[]>;
        setNewbieByStore(deserializeSetMap(raw));
      } catch (e) {
        console.error('[PayrollStorage] newbie 解析失败', e);
      }
    }

    /* ⭐ excluded */
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

  /* ============================================================
   * 持久化：newbie
   * ============================================================ */
  const persistNewbie = useCallback((next: Record<string, Set<string>>) => {
    try {
      localStorage.setItem(NEWBIE_KEY, JSON.stringify(serializeSetMap(next)));
    } catch (e) {
      console.error('[PayrollStorage] 写 newbie 失败', e);
    }
  }, []);

  /* ============================================================
   * 持久化：excluded
   * ============================================================ */
  const persistExcluded = useCallback(
    (next: Record<string, Set<string>>) => {
      try {
        localStorage.setItem(
          EXCLUDED_KEY,
          JSON.stringify(serializeSetMap(next))
        );
      } catch (e) {
        console.error('[PayrollStorage] 写 excluded 失败', e);
      }
    },
    []
  );

  /* ============================================================
   * 保存方案
   * ============================================================ */
  const savePlanToStorage = useCallback(
    (sid: string, month: string, plan: MonthlyCompensationPlan) => {
      setFullStore((prev) => {
        const next = {
          ...prev,
          [sid]: { ...(prev[sid] || {}), [month]: plan },
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error('[PayrollStorage] 写 fullStore 失败', e);
        }
        return next;
      });
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
  };
}