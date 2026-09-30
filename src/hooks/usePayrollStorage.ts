import { useEffect, useState } from 'react';
import type { CompensationStore, MonthlyCompensationPlan } from '../types/compensation';

export const STORAGE_KEY = 'gym_compensation_store_v2';
export const OVERRIDES_KEY = 'gym_position_overrides_v1';
export const NEWBIE_KEY = 'gym_newbie_staff_v1';

export type FullStore = Record<string, CompensationStore>;

export function usePayrollStorage() {
  const [fullStore, setFullStore] = useState<FullStore>({});
  const [overridesByStore, setOverridesByStore] = useState<Record<string, Record<string, string>>>({});
  const [newbieByStore, setNewbieByStore] = useState<Record<string, Set<string>>>({});

  // 初始化加载
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setFullStore(JSON.parse(saved)); } catch (e) { console.error('[PayrollStorage] 解析失败', e); }
    }
    const savedOv = localStorage.getItem(OVERRIDES_KEY);
    if (savedOv) {
      try { setOverridesByStore(JSON.parse(savedOv)); } catch (e) { console.error('[PayrollStorage] 覆盖表解析失败', e); }
    }
    const savedNewbie = localStorage.getItem(NEWBIE_KEY);
    if (savedNewbie) {
      try {
        const raw = JSON.parse(savedNewbie) as Record<string, string[]>;
        const next: Record<string, Set<string>> = {};
        Object.entries(raw).forEach(([sid, ids]) => { next[sid] = new Set(ids); });
        setNewbieByStore(next);
      } catch (e) { console.error('[PayrollStorage] 新人表解析失败', e); }
    }
  }, []);

  // 持久化新人表
  const persistNewbie = (next: Record<string, Set<string>>) => {
    try {
      const raw: Record<string, string[]> = {};
      Object.entries(next).forEach(([sid, set]) => { raw[sid] = Array.from(set); });
      localStorage.setItem(NEWBIE_KEY, JSON.stringify(raw));
    } catch (e) { console.error('[PayrollStorage] 写新人表失败', e); }
  };

  // 保存薪酬方案
  const savePlanToStorage = (storeId: string, month: string, plan: MonthlyCompensationPlan) => {
    setFullStore((prev) => {
      const next = {
        ...prev,
        [storeId]: { ...(prev[storeId] || {}), [month]: plan },
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return {
    fullStore,
    setFullStore,
    overridesByStore,
    setOverridesByStore,
    newbieByStore,
    setNewbieByStore,
    persistNewbie,
    savePlanToStorage,
  };
}