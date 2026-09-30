import type { Department } from '../../types/payroll';

export function getDepartmentOf(title: string): Department {
  if (!title) return '运营';
  if (title.includes('会籍')) return '会籍';
  if (
    title.includes('私教') ||
    title.includes('私人教练') ||
    title.includes('瑜伽') ||
    title.includes('舞蹈') ||
    title.includes('团操') ||
    title.includes('团体操')
  ) {
    return '私教';
  }
  if (title.includes('泳教') || title.includes('游泳')) return '泳教';
  return '运营';
}

export function needsSaleIdPrefix(positionTitle: string): boolean {
  if (!positionTitle) return false;
  const dept = getDepartmentOf(positionTitle);
  return dept === '私教' || dept === '泳教';
}