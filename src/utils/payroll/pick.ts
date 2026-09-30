import type { Gender } from '../../types/payroll';

export function pickId(r: Record<string, any>): string {
  return String(
    r.id ?? r.coach_id ?? r.staff_id ?? r.employee_id ?? r.user_id ?? r.coachId ?? ''
  ).trim();
}

export function pickName(r: Record<string, any>): string {
  return String(
    r.name ?? r.staff_name ?? r.coach_name ?? r.employee_name ?? r.username ?? ''
  ).trim();
}

export function pickPhone(r: Record<string, any>): string {
  return String(r.phone ?? r.mobile ?? r.tel ?? '');
}

export function pickSaleAmount(r: Record<string, any>): number {
  const v =
    r.achievement ?? r.sale_amount ?? r.amount ?? r.total_amount ?? r.sales ?? r.money ?? 0;
  return Number(v) || 0;
}

export function pickGender(r: Record<string, any>): Gender {
  const raw = String(r.gender ?? r.sex ?? r.coach_gender ?? r.coach_sex ?? '')
    .toLowerCase()
    .trim();
  if (!raw) return 'male';
  if (raw.includes('新人') || raw.includes('newbie') || raw === 'new') return 'newbie';
  if (raw === 'female' || raw === 'f' || raw.includes('女')) return 'female';
  return 'male';
}

export function sexToGender(sex: string | number | undefined): Gender | undefined {
  if (sex === undefined || sex === null || sex === '') return undefined;
  const s = String(sex).trim();
  if (s === '1' || s === 'male' || s === '男') return 'male';
  if (s === '2' || s === 'female' || s === '女') return 'female';
  if (s === '3' || s === 'newbie' || s === '新人') return 'newbie';
  return undefined;
}

export function isInvalidId(id: string): boolean {
  if (!id) return true;
  if (id === '0') return true;
  const num = Number(id);
  return Number.isNaN(num) || num <= 0;
}