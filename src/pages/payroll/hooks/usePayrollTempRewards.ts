import { useState } from 'react';
import type {
  MonthlyCompensationPlan,
  TempReward,
} from '../../../types/compensation';
import type { PayrollResult } from '../../../utils/payroll';

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
  runAndUpdate: (nextPlan: MonthlyCompensationPlan) => Promise<void>;
}

export function usePayrollTempRewards({
  storeId,
  selectedMonth,
  currentPlan,
  allResults,
  persistPlanToServer,
  runAndUpdate,
}: Params) {
  const [savingTemp, setSavingTemp] = useState<{
    active: boolean;
    staffName?: string;
  }>({ active: false });

  const handleSaveTempRewards = async (staffId: string, next: TempReward[]) => {
    if (!currentPlan || !selectedMonth) return;

    const sid = String(staffId).trim();
    const staffName =
      allResults.find((r) => String(r.staffId).trim() === sid)?.staffName ||
      staffId;

    setSavingTemp({ active: true, staffName });
    const startedAt = Date.now();

    try {
      /* ⭐ 收窄为 Record<string, TempReward[]>，避免 no index signature */
      const currentTemp =
        (currentPlan.tempRewards as Record<string, TempReward[]> | undefined) ||
        {};

      const merged: Record<string, TempReward[]> = {};
      Object.keys(currentTemp).forEach((k) => {
        merged[String(k)] = currentTemp[k];
      });
      if (next.length === 0) delete merged[sid];
      else merged[sid] = next;

      const nextPlan: MonthlyCompensationPlan = {
        ...currentPlan,
        tempRewards: merged,
      };

      await persistPlanToServer(storeId, selectedMonth, nextPlan);
      await runAndUpdate(nextPlan);
    } catch (e) {
      console.error('[usePayrollTempRewards] 重算失败', e);
    } finally {
      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, 400 - elapsed);
      if (remain > 0) {
        setTimeout(() => setSavingTemp({ active: false }), remain);
      } else {
        setSavingTemp({ active: false });
      }
    }
  };

  return { savingTemp, handleSaveTempRewards };
}