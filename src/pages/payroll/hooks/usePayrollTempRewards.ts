import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { MonthlyCompensationPlan, TempReward } from '../../../types/compensation';
import type { PayrollResult } from '../../../utils/payroll';

type Rewards = NonNullable<PayrollResult['rewards']>;
type RewardRow = Rewards[number];

interface Params {
  storeId: string;
  selectedMonth: string;
  currentPlan?: MonthlyCompensationPlan;
  allResults: PayrollResult[];
  persistPlanToServer: (
    storeId: string,
    month: string,
    plan: MonthlyCompensationPlan
  ) => Promise<void>;
  setResultsByStore: Dispatch<SetStateAction<Record<string, PayrollResult[]>>>;
}

const signedAmount = (item: TempReward): number => {
  const value = Number(item.amount);
  const abs = Number.isFinite(value) ? Math.abs(value) : 0;
  const deduction = item.type === 'deduction' || (!item.type && value < 0);
  return deduction ? -abs : abs;
};

const sumItems = (items: TempReward[]) =>
  items.reduce((sum, item) => sum + signedAmount(item), 0);

const normalize = (items: TempReward[]): TempReward[] =>
  items.map((item) => ({
    ...item,
    type: item.type === 'deduction' || (!item.type && Number(item.amount) < 0)
      ? 'deduction'
      : 'reward',
    amount: signedAmount(item),
  }));

const staffItems = (map: Record<string, TempReward[]>, staffId: string) =>
  Object.entries(map)
    .filter(([key]) => key.trim() === staffId)
    .flatMap(([, items]) => Array.isArray(items) ? items : []);

export function usePayrollTempRewards({
  storeId,
  selectedMonth,
  currentPlan,
  allResults,
  persistPlanToServer,
  setResultsByStore,
}: Params) {
  const [savingTemp, setSavingTemp] = useState<{
    active: boolean;
    staffName?: string;
  }>({ active: false });
  const busy = useRef(false);

  const handleSaveTempRewards = async (staffId: string, next: TempReward[]) => {
    if (!currentPlan || !selectedMonth || busy.current) return;
    busy.current = true;
    const sid = String(staffId).trim();
    const staffName = allResults.find((r) => String(r.staffId).trim() === sid)?.staffName || staffId;
    setSavingTemp({ active: true, staffName });

    try {
      const existing = (currentPlan.tempRewards || {}) as Record<string, TempReward[]>;
      const previousItems = staffItems(existing, sid);
      const nextItems = normalize(next);
      const merged = { ...existing };
      Object.keys(merged).forEach((key) => {
        if (key.trim() === sid) delete merged[key];
      });
      if (nextItems.length) merged[sid] = nextItems;
      const nextPlan: MonthlyCompensationPlan = { ...currentPlan, tempRewards: merged };

      // Only apply local changes after the plan was successfully persisted.
      await persistPlanToServer(storeId, selectedMonth, nextPlan);

      const oldTotal = sumItems(previousItems);
      const newTotal = sumItems(nextItems);
      const delta = newTotal - oldTotal;
      const oldIds = new Set(previousItems.map((item) => String(item.id ?? '')).filter(Boolean));

      setResultsByStore((prev) => ({
        ...prev,
        [storeId]: (prev[storeId] || []).map((row) => {
          if (String(row.staffId).trim() !== sid) return row;
          const original = (row.rewards || []) as Rewards;
          // Keep automatic/department rewards; replace only previously saved temp IDs.
          const retained = original.filter((reward) =>
            !oldIds.has(String((reward as { id?: string }).id ?? ''))
          );
          const updatedRewards = [
            ...retained,
            ...(nextItems as unknown as RewardRow[]),
          ] as Rewards;
          return {
            ...row,
            rewards: updatedRewards,
            rewardsTotal: (Number(row.rewardsTotal) || 0) + delta,
            total: (Number(row.total) || 0) + delta,
          };
        }),
      }));
    } catch (error) {
      console.error('[usePayrollTempRewards] 保存临时奖扣失败', error);
      window.alert('保存临时奖扣失败，请重试');
    } finally {
      busy.current = false;
      setSavingTemp({ active: false });
    }
  };

  return { savingTemp, handleSaveTempRewards };
}
