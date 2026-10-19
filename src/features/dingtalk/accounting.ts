import type { DingTalkReportItem } from '../../api/dingtalk';
import { classifyDingtalkItems } from '../../pages/dingtalk/utils/classify';

export type CategoryPiece = { category: string; amount: number };

/** monthly-summary 后端已统一金额，禁止用表单字段再次覆盖。 */
export function monthlyAmount(item: DingTalkReportItem): number {
  const value = item.amount;
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/[,，¥￥\s]/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** 使用公共分类规则；明细拆分总额不一致时回退整条金额，避免金额虚增/丢失。 */
export function monthlyPieces(item: DingTalkReportItem): CategoryPiece[] {
  const total = monthlyAmount(item);
  const manual = String((item as any)._manualCategory || "").trim();
  if (manual) return [{ category: manual, amount: total }];
  const pieces = classifyDingtalkItems(item, monthlyAmount).filter(p => Number.isFinite(p.amount));
  const splitTotal = pieces.reduce((sum, p) => sum + p.amount, 0);
  if (!pieces.length || Math.abs(splitTotal - total) > 0.02) {
    const category = pieces[0]?.category || item.templateName || '其它';
    return [{ category, amount: total }];
  }
  return pieces;
}

export function validMonthlyItems(items: DingTalkReportItem[]): DingTalkReportItem[] {
  const ids = new Set<string>();
  return items.filter((item) => {
    if (item.error) return false;
    const id = String(item.processInstanceId || '').trim();
    if (id) {
      if (ids.has(id)) return false;
      ids.add(id);
    }
    return true;
  });
}

export function monthlyCategorySummary(items: DingTalkReportItem[]) {
  const map = new Map<string, { category: string; total: number; ids: Set<string> }>();
  validMonthlyItems(items).forEach((item, index) => {
    const id = item.processInstanceId || `__row_${index}`;
    for (const piece of monthlyPieces(item)) {
      if (!map.has(piece.category)) map.set(piece.category, { category: piece.category, total: 0, ids: new Set() });
      const row = map.get(piece.category)!;
      row.total += piece.amount;
      row.ids.add(id);
    }
  });
  return [...map.values()].map(({ category, total, ids }) => ({ category, total, count: ids.size }))
    .sort((a, b) => b.total - a.total);
}
