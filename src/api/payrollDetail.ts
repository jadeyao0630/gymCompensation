import { api } from './client';

export interface SalesDetailPatch {
  staffId: string;
  orderId: string;
  mode: 'percent' | 'fixed' | null;
  value: number | null;
}

export interface ClassDetailPatch {
  staffId: string;
  courseName: string;
  memberId: string;
  mode: 'percent' | 'fixed' | null;
  value: number | null;
}

export async function fetchSalesDetail(
  busId: string,
  month: string
): Promise<SalesDetailPatch[]> {
  const res = await api.get('/api/payroll/sales-detail', {
    params: { bus_id: busId, month },
  });
  return res.data?.data || [];
}

export async function saveSalesDetail(
  busId: string,
  month: string,
  patch: SalesDetailPatch
): Promise<void> {
  await api.post('/api/payroll/sales-detail', {
    bus_id: busId,
    month,
    staff_id: patch.staffId,
    order_id: patch.orderId,
    mode: patch.mode,
    value: patch.value,
  });
}

export async function fetchClassDetail(
  busId: string,
  month: string
): Promise<ClassDetailPatch[]> {
  const res = await api.get('/api/payroll/class-detail', {
    params: { bus_id: busId, month },
  });
  return res.data?.data || [];
}

export async function saveClassDetail(
  busId: string,
  month: string,
  patch: ClassDetailPatch
): Promise<void> {
  await api.post('/api/payroll/class-detail', {
    bus_id: busId,
    month,
    staff_id: patch.staffId,
    course_name: patch.courseName,
    member_id: patch.memberId,
    mode: patch.mode,
    value: patch.value,
  });
}