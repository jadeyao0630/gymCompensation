import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompensationStore, MonthlyCompensationPlan } from '../types/compensation';
import { fetchPlanByMonth, fetchPlanList, initStorePlans, savePlan } from '../api/compensation';

const STORAGE_KEY = 'gym_compensation_store_v2';
const UNDO_LIMIT = 20;
const SAVE_DEBOUNCE_MS = 400;
const INIT_FLAG_PREFIX = 'gym_store_initialized_';

export type FullStore = Record<string, CompensationStore>;
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface UndoEntry {
  month: string;
  plan: MonthlyCompensationPlan;
  label: string;
  at: number;
}

export function useCompensationPlan(storeId: string) {
  const [fullStore, setFullStore] = useState<FullStore>({});
  const [dbOnline, setDbOnline] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const undoStackRef = useRef<UndoEntry[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);
  const saveTimerRef = useRef<number | null>(null);
  const isInitialSelectDoneRef = useRef<boolean>(false);

  const persistToLocalStorage = useCallback((nextFullStore: FullStore) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFullStore));
    } catch (e) {
      console.error('[CompensationPlan] 写 localStorage 失败', e);
    }
  }, []);

  const pushUndo = useCallback((month: string, plan: MonthlyCompensationPlan, label: string) => {
    const stack = undoStackRef.current;
    stack.push({ month, plan: JSON.parse(JSON.stringify(plan)), label, at: Date.now() });
    if (stack.length > UNDO_LIMIT) stack.shift();
    setUndoDepth(stack.length);
  }, []);

  /* ============================================================
   * ⭐ 只写本地（用于复制模式：后端已由 copyPlan 创建好，不需要再 savePlan）
   * ============================================================ */
  const persistLocalOnly = useCallback(
    (month: string, plan: MonthlyCompensationPlan) => {
      setFullStore((prev) => {
        const next = {
          ...prev,
          [storeId]: { ...(prev[storeId] || {}), [month]: plan },
        };
        persistToLocalStorage(next);
        return next;
      });
      // 明确：不触发 savePlan
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    },
    [storeId, persistToLocalStorage]
  );

  /* ============================================================
   * 常规持久化：写本地 + 防抖落库
   * ============================================================ */
  const persistPlan = useCallback((month: string, plan: MonthlyCompensationPlan) => {
    setFullStore((prev) => {
      const next = { ...prev, [storeId]: { ...(prev[storeId] || {}), [month]: plan } };
      persistToLocalStorage(next);
      return next;
    });

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      if (!dbOnline) {
        setSaveStatus('offline');
        return;
      }
      setSaveStatus('saving');
      try {
        await savePlan(storeId, plan);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } catch (e) {
        console.error('[persistPlan] 保存到数据库失败', e);
        setSaveStatus('error');
      }
    }, SAVE_DEBOUNCE_MS);
  }, [storeId, dbOnline, persistToLocalStorage]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const last = stack.pop()!;
    setUndoDepth(stack.length);

    setFullStore((prev) => {
      const next = { ...prev, [storeId]: { ...(prev[storeId] || {}), [last.month]: last.plan } };
      persistToLocalStorage(next);
      return next;
    });

    if (dbOnline) {
      setSaveStatus('saving');
      savePlan(storeId, last.plan)
        .then(() => { setSaveStatus('saved'); setLastSavedAt(new Date()); })
        .catch(() => setSaveStatus('error'));
    } else {
      setSaveStatus('offline');
    }
    return last.month;
  }, [storeId, dbOnline, persistToLocalStorage]);

  // 初始化加载与版本迁移
  useEffect(() => {
    const v1 = localStorage.getItem('gym_compensation_store_v1');
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v1 && !v2) {
      try {
        const old = JSON.parse(v1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ '12279': old }));
      } catch (e) { console.error('[migrate] 失败', e); }
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setFullStore(JSON.parse(saved)); } catch {}
    }
  }, []);

  // API 数据拉取
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setInitLoading(true);
        let list = await fetchPlanList(storeId);
        if (cancelled) return;

        if (list.length === 0) {
          const initFlagKey = `${INIT_FLAG_PREFIX}${storeId}`;
          if (!localStorage.getItem(initFlagKey)) {
            const initRes = await initStorePlans(storeId);
            if (cancelled) return;
            localStorage.setItem(initFlagKey, '1');
            list = await fetchPlanList(storeId);
            if (cancelled) return;
            if (initRes.initialized) setShowGuide(true);
          }
        }

        setDbOnline(true);
        setFullStore((prev) => {
          const curStore = prev[storeId] || {};
          const nextStore: CompensationStore = {};
          list.forEach((p) => {
            const local = curStore[p.month];
            nextStore[p.month] = (local && local.positions && local.positions.length > 0)
              ? local
              : { month: p.month, periodLabel: p.periodLabel, positions: [], importedAt: p.importedAt };
          });
          const next = { ...prev, [storeId]: nextStore };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      } catch (e) {
        console.warn('[CompensationPlan] API 不可用，使用本地缓存', e);
        if (!cancelled) setDbOnline(false);
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  // 切换门店重置
  useEffect(() => {
    undoStackRef.current = [];
    setUndoDepth(0);
    isInitialSelectDoneRef.current = false;
  }, [storeId]);

  return {
    fullStore, setFullStore,
    persistPlan,          // 常规：写本地 + 落库
    persistLocalOnly,     // ⭐ 新增：只写本地，复制模式专用
    pushUndo, handleUndo, undoDepth,
    dbOnline, saveStatus, lastSavedAt, showGuide, setShowGuide, initLoading,
    isInitialSelectDoneRef,
  };
}