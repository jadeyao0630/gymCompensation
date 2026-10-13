import { useCallback, useEffect, useRef } from 'react';
import {
  fetchStaffStatus,
  saveStaffStatus,
  type StaffStatusItem,
} from '../../../api/payrollStatus';

interface Params {
  storeId: string;
  selectedMonth: string;
  newbieSet: Set<string>;
  excludedSet: Set<string>;
  setNewbieByStore: (
    updater: (prev: Record<string, Set<string>>) => Record<string, Set<string>>
  ) => void;
  setExcludedByStore: (
    updater: (prev: Record<string, Set<string>>) => Record<string, Set<string>>
  ) => void;
  persistNewbie: (next: Record<string, Set<string>>) => void;
  persistExcluded: (next: Record<string, Set<string>>) => void;
}

export function usePayrollStaffStatus({
  storeId,
  selectedMonth,
  newbieSet,
  excludedSet,
  setNewbieByStore,
  setExcludedByStore,
  persistNewbie,
  persistExcluded,
}: Params) {
  const syncTimerRef = useRef<number | null>(null);

  /* 拉取员工状态 */
  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    let cancelled = false;
    (async () => {
      try {
        const statuses = await fetchStaffStatus(storeId, selectedMonth);
        if (cancelled) return;
        const newbie = new Set<string>();
        const excluded = new Set<string>();
        statuses.forEach((s) => {
          if (s.isNewbie) newbie.add(s.staffId);
          if (s.isExcluded) excluded.add(s.staffId);
        });
        if (statuses.length > 0) {
          setNewbieByStore((prev) => {
            const next = { ...prev, [storeId]: newbie };
            persistNewbie(next);
            return next;
          });
          setExcludedByStore((prev) => {
            const next = { ...prev, [storeId]: excluded };
            persistExcluded(next);
            return next;
          });
        }
      } catch (e) {
        console.warn('[usePayrollStaffStatus] 拉取员工状态失败，使用本地缓存', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedMonth]);

  /* 防抖同步到后端 */
  const syncToServer = useCallback(
    (newbie: Set<string>, excluded: Set<string>) => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(async () => {
        try {
          const ids = new Set<string>([...newbie, ...excluded]);
          const statuses: StaffStatusItem[] = Array.from(ids).map((id) => ({
            staffId: id,
            isNewbie: newbie.has(id),
            isExcluded: excluded.has(id),
          }));
          await saveStaffStatus(storeId, selectedMonth, statuses);
        } catch (e) {
          console.warn('[usePayrollStaffStatus] 保存员工状态到后端失败', e);
        }
      }, 600);
    },
    [storeId, selectedMonth]
  );

  /* 业务动作 */
  const toggleExclude = useCallback(
    (staffId: string) => {
      setExcludedByStore((prev) => {
        const cur = new Set(prev[storeId] || []);
        if (cur.has(staffId)) cur.delete(staffId);
        else cur.add(staffId);
        const next = { ...prev, [storeId]: cur };
        persistExcluded(next);
        syncToServer(newbieSet, cur);
        return next;
      });
    },
    [storeId, newbieSet, setExcludedByStore, persistExcluded, syncToServer]
  );

  const toggleNewbie = useCallback(
    (staffId: string, afterToggle?: () => void) => {
      setNewbieByStore((prev) => {
        const cur = new Set(prev[storeId] || []);
        const willBeNewbie = !cur.has(staffId);
        if (willBeNewbie) cur.add(staffId);
        else cur.delete(staffId);
        const next = { ...prev, [storeId]: cur };
        persistNewbie(next);
        syncToServer(cur, excludedSet);
        return next;
      });
      afterToggle?.();
    },
    [storeId, excludedSet, setNewbieByStore, persistNewbie, syncToServer]
  );

  return { toggleExclude, toggleNewbie };
}