import { useCallback, useEffect, useState } from 'react';
import type {
  RewardDefinition,
  RewardsCatalog,
} from '../types/compensation';
import { uid } from '../utils/id';

const CATALOG_KEY = 'gym_rewards_catalog_v1';

export function useRewardsCatalog() {
  const [catalog, setCatalog] = useState<RewardsCatalog>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CATALOG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as RewardsCatalog;
        setCatalog(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error('[RewardsCatalog] 解析失败', e);
    }
  }, []);

  const persist = useCallback((next: RewardsCatalog) => {
    setCatalog(next);
    try {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('[RewardsCatalog] 写入失败', e);
    }
  }, []);

  const addReward = useCallback(
    (partial?: Partial<RewardDefinition>) => {
      const next: RewardDefinition = {
        id: uid(),
        name: partial?.name ?? '新奖金',
        amount: partial?.amount ?? 0,
        mode: partial?.mode ?? 'manual',
        conditionType: partial?.conditionType,
        conditionValue: partial?.conditionValue,
        note: partial?.note,
        enabledByDefault: partial?.enabledByDefault ?? false,
      };
      const list = [...catalog, next];
      persist(list);
      return next;
    },
    [catalog, persist]
  );

  const updateReward = useCallback(
    (id: string, patch: Partial<RewardDefinition>) => {
      const list = catalog.map((r) => (r.id === id ? { ...r, ...patch } : r));
      persist(list);
    },
    [catalog, persist]
  );

  const removeReward = useCallback(
    (id: string) => {
      persist(catalog.filter((r) => r.id !== id));
    },
    [catalog, persist]
  );

  return {
    catalog,
    setCatalog: persist,
    addReward,
    updateReward,
    removeReward,
  };
}