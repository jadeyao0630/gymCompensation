import { api } from './client';
import type { PayrollResult } from '../types/payroll';

export interface PayrollDraft {
  results: PayrollResult[];
  overrides: Record<string, string>;
  updatedAt: string;
}

export async function fetchPayrollDraft(busId: string, month: string): Promise<PayrollDraft | null> {
  const res = await api.get('/api/payroll/draft', { params: { bus_id: busId, month } });
  if (res.data?.errorcode !== 0) throw new Error(res.data?.errormsg || '读取草稿失败');
  return res.data.data ?? null;
}

export async function savePayrollDraft(busId: string, month: string, results: PayrollResult[], overrides: Record<string, string>): Promise<void> {
  const res = await api.put('/api/payroll/draft', { bus_id: busId, month, results, overrides });
  if (res.data?.errorcode !== 0) throw new Error(res.data?.errormsg || '保存草稿失败');
}

export async function deletePayrollDraft(busId: string, month: string): Promise<void> {
  const res = await api.delete('/api/payroll/draft', { params: { bus_id: busId, month } });
  if (res.data?.errorcode !== 0) throw new Error(res.data?.errormsg || '删除草稿失败');
}
