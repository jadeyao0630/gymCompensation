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

/* ---------------- ⭐ 新增 ---------------- */

/** 解析 'YYYY-MM' → { year, month }；非法值回退到当前年月 */
export function parseMonth(month: string): { year: number; month: number } {
  const [y, m] = (month || '').split('-').map(Number);
  const now = new Date();
  return {
    year: Number.isFinite(y) ? y : now.getFullYear(),
    month:
      Number.isFinite(m) && m >= 1 && m <= 12
        ? m
        : now.getMonth() + 1,
  };
}

/** 生成 'YYYY-MM'；非法输入回退到当前月 */
export function formatMonth(year: number, month: number): string {
  const now = new Date();
  const y = Number.isFinite(year) ? year : now.getFullYear();
  const m =
    Number.isFinite(month) && month >= 1 && month <= 12
      ? month
      : now.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** 当前月 'YYYY-MM' */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}