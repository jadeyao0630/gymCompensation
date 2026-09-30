import { api } from './client';

/* ============================================================
 * ⭐ 员工状态（新人 / 是否计入）
 * ============================================================ */

export interface StaffStatusItem {
  staffId: string;
  staffName?: string;
  isNewbie: boolean;
  isExcluded: boolean;
}

/** 拉取某门店某月份的全部员工状态 */
export async function fetchStaffStatus(
  busId: string,
  month: string
): Promise<StaffStatusItem[]> {
  try {
    const { data } = await api.get('/api/payroll/staff-status', {
      params: { bus_id: busId, month },
    });
    const list = data?.data || [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('[payrollStatus] 拉取失败，降级为空', e);
    return [];
  }
}

/** 批量覆盖保存（该门店该月份） */
export async function saveStaffStatus(
  busId: string,
  month: string,
  statuses: StaffStatusItem[]
): Promise<void> {
  await api.post('/api/payroll/staff-status', {
    bus_id: busId,
    month,
    statuses,
  });
}