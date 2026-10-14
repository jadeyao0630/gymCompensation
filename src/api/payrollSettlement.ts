import { api } from './client';
import type { PayrollResult } from '../types/payroll';
import type { MonthlyCompensationPlan } from '../types/compensation';

export interface SettlementData {
  status: string;
  planHash: string | null;
  results: PayrollResult[];
  summary: any;
  settledBy: string;
  settledAt: string;
  updatedAt: string;
}

/* 提交结算 */
export async function submitSettlement(
  busId: string,
  month: string,
  results: PayrollResult[],
  summary: any,
  plan: MonthlyCompensationPlan
): Promise<void> {
  await api.post('/api/payroll/settlement', {
    bus_id: busId,
    month,
    results,
    summary,
    plan,
  });
}

/* 读取结算 */
export async function fetchSettlement(
  busId: string,
  month: string
): Promise<SettlementData | null> {
  const res = await api.get('/api/payroll/settlement', {
    params: { bus_id: busId, month },
  });
  return res.data?.data || null;
}

/* 删除结算 */
export async function deleteSettlement(
  busId: string,
  month: string
): Promise<void> {
  await api.delete('/api/payroll/settlement', {
    params: { bus_id: busId, month },
  });
}

/* 检查方案是否过期 */
export async function checkSettlement(
  busId: string,
  month: string
): Promise<{ hasSettlement: boolean; planHash: string | null }> {
  const res = await api.get('/api/payroll/settlement/check', {
    params: { bus_id: busId, month },
  });
  return res.data?.data || { hasSettlement: false, planHash: null };
}