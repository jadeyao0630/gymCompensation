import { useCallback, useEffect, useState } from 'react';
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

  const savePlanToStorage = useCallback(
    (sid: string, month: string, plan: MonthlyCompensationPlan) => {
      setFullStore((prev) => {
        const next = {
          ...prev,
          [sid]: { ...(prev[sid] || {}), [month]: plan },
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          console.log(
            '[PayrollStorage] 已写入 plan',
            { sid, month, staffRewardsKeys: Object.keys(plan.staffRewards || {}) }
          );
        } catch (e) { console.error('[PayrollStorage] 写 fullStore 失败', e); }
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