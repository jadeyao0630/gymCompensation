/* ============================================================
 * 月份工具
 * ============================================================ */
export function getMonthRange(month: string): { begin: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  return { begin: fmt(first), end: fmt(last) };
}

export function getRecentMonths(count = 24): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  }
  return months;
}

export function fmtMoney(v: number): string {
  return `¥${Math.round(v).toLocaleString('zh-CN')}`;
}