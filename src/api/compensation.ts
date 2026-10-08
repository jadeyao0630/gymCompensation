import { api } from './client';
import type { MonthlyCompensationPlan } from '../types/compensation';

export async function fetchPlanList(storeId: string) {
  const res = await api.get('/api/compensation/plans', {
    params: { store_id: storeId },
  });
  return res.data.data as {
    id: number;
    storeId: string;
    month: string;
    periodLabel: string;
    importedAt: string;
    isActive: number;
  }[];
}

export async function fetchPlanByMonth(
  storeId: string,
  month: string
): Promise<MonthlyCompensationPlan | null> {
  const res = await api.get('/api/compensation/plan', {
    params: { store_id: storeId, month },
  });
  return res.data.data as MonthlyCompensationPlan | null;
}

/** ⭐ 保存方案（带 departmentRewards + tempRewards） */
export async function savePlan(
  storeId: string,
  plan: MonthlyCompensationPlan
): Promise<{ id: number }> {
  const res = await api.post('/api/compensation/plan', {
    storeId,
    month: plan.month,
    periodLabel: plan.periodLabel,
    positions: plan.positions,
    departmentRewards: plan.departmentRewards ?? {},
    tempRewards: plan.tempRewards ?? {},       // ⭐
  });
  return res.data.data;
}

export async function deletePlan(storeId: string, month: string) {
  await api.delete('/api/compensation/plan', {
    params: { store_id: storeId, month },
  });
}

export async function initStorePlans(storeId: string) {
  const res = await api.post('/api/compensation/init', { storeId });
  return res.data.data as {
    initialized: boolean;
    months?: string[];
    reason?: string;
  };
}

export async function copyPlan(
  storeId: string,
  fromMonth: string,
  toMonth: string
) {
  const res = await api.post('/api/compensation/plan/copy', {
    storeId,
    fromMonth,
    toMonth,
  });
  return res.data.data as { id: number; positionCount: number };
}

export interface SimulationSetting {
  propertyFee: number;
  electricityFee: number;
  rent: number;
  waterFee: number;
  networkFee: number;
  otherFee: number;
}

export async function fetchSimulationSetting(
  storeId: string,
  month: string
): Promise<SimulationSetting> {
  const res = await api.get('/api/simulation/setting', {
    params: { store_id: storeId, month },
  });
  return res.data.data as SimulationSetting;
}

export async function saveSimulationSetting(
  storeId: string,
  month: string,
  input: SimulationSetting
) {
  const res = await api.post('/api/simulation/setting', {
    storeId,
    month,
    input,
  });
  return res.data;
}

export async function copySimulationSetting(
  storeId: string,
  fromMonth: string,
  toMonth: string
) {
  const res = await api.post('/api/simulation/setting/copy', {
    storeId,
    fromMonth,
    toMonth,
  });
  return res.data.data as { copied: boolean; reason?: string };
}