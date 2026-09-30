import type { FinancialFlowItem } from '../../../api/stats';

/* ============================================================
 * 业务类型识别
 * ============================================================ */
export type BusinessType = '购卡' | '购泳教' | '购私教' | '其他';

export function getBusinessType(item: FinancialFlowItem): BusinessType {
  const op = String(item.operate_type || '');
  const ci = String(item.ci_name || '');
  const cardTypeId = String(item.card_type_id || '');

  if (op.includes('泳教') || ci.includes('泳教') || cardTypeId === '5') {
    return '购泳教';
  }
  if (op.includes('私教') || ci.includes('私教')) {
    return '购私教';
  }
  if (
    op.includes('购卡') ||
    op.includes('换卡') ||
    op.includes('升卡') ||
    ci.includes('购卡') ||
    ci.includes('换卡')
  ) {
    return '购卡';
  }
  return '其他';
}

/* ============================================================
 * 单条订单的实收金额
 * ============================================================ */
export function getIncomeAmount(item: FinancialFlowItem): number {
  const v = item.income_amount ?? item.amount ?? 0;
  return Number(v) || 0;
}

/* ============================================================
 * 单条订单的卡金额（含定金抵扣前的原价）
 * ============================================================ */
export function getCardAmount(item: FinancialFlowItem): number {
  return Number(item.amount || 0);
}

/* ============================================================
 * 汇总结果类型
 * ============================================================ */
export interface TypeSummary {
  type: BusinessType;
  count: number;      // 订单数
  cardAmount: number; // 卡金额
  incomeAmount: number; // 实收金额
}

export interface CardSummary {
  cardName: string;
  type: BusinessType;
  count: number;
  cardAmount: number;
  incomeAmount: number;
}

export interface PayTypeSummary {
  payType: string;
  payTypeId: string;
  amount: number;
}

export interface MarketerSummary {
  name: string;
  count: number;
  amount: number;
}

export interface OverallSummary {
  totalCount: number;
  totalCardAmount: number;
  totalIncomeAmount: number;
  types: TypeSummary[];
  cards: CardSummary[];
  payTypes: PayTypeSummary[];
  marketers: MarketerSummary[];
}

/* ============================================================
 * 主汇总函数
 * ============================================================ */
export function aggregateOrders(list: FinancialFlowItem[]): OverallSummary {
  const typeMap = new Map<BusinessType, TypeSummary>();
  const cardMap = new Map<string, CardSummary>();
  const payTypeMap = new Map<string, PayTypeSummary>();
  const marketerMap = new Map<string, MarketerSummary>();

  let totalCardAmount = 0;
  let totalIncomeAmount = 0;

  list.forEach((item) => {
    const type = getBusinessType(item);
    const cardAmount = getCardAmount(item);
    const incomeAmount = getIncomeAmount(item);
    const cardName = String(item.card_name || '未命名');

    /* 汇总总金额 */
    totalCardAmount += cardAmount;
    totalIncomeAmount += incomeAmount;

    /* 按业务类型 */
    if (!typeMap.has(type)) {
      typeMap.set(type, { type, count: 0, cardAmount: 0, incomeAmount: 0 });
    }
    const ts = typeMap.get(type)!;
    ts.count += 1;
    ts.cardAmount += cardAmount;
    ts.incomeAmount += incomeAmount;

    /* 按卡种（同卡名 + 同类型合并） */
    const cardKey = `${type}__${cardName}`;
    if (!cardMap.has(cardKey)) {
      cardMap.set(cardKey, {
        cardName,
        type,
        count: 0,
        cardAmount: 0,
        incomeAmount: 0,
      });
    }
    const cs = cardMap.get(cardKey)!;
    cs.count += 1;
    cs.cardAmount += cardAmount;
    cs.incomeAmount += incomeAmount;

    /* 按收款方式 */
    (item.pay_detail || []).forEach((p) => {
      const key = String(p.pay_type_id || p.pay_type);
      const amt = Number(p.amount) || 0;
      if (!payTypeMap.has(key)) {
        payTypeMap.set(key, {
          payType: p.pay_type,
          payTypeId: String(p.pay_type_id || ''),
          amount: 0,
        });
      }
      payTypeMap.get(key)!.amount += amt;
    });

    /* 按业绩归属 */
    (item.marketers_detail || []).forEach((m) => {
      const name = String(m.name || '').trim();
      if (!name) return;
      const amt = Number(m.amount) || 0;
      if (!marketerMap.has(name)) {
        marketerMap.set(name, { name, count: 0, amount: 0 });
      }
      const ms = marketerMap.get(name)!;
      ms.count += 1;
      ms.amount += amt;
    });
  });

  /* 排序：类型按固定顺序，卡按金额倒序，支付按金额倒序，归属按金额倒序 */
  const typeOrder: BusinessType[] = ['购卡', '购泳教', '购私教', '其他'];

  return {
    totalCount: list.length,
    totalCardAmount,
    totalIncomeAmount,
    types: typeOrder
      .map((t) => typeMap.get(t))
      .filter((x): x is TypeSummary => !!x),
    cards: Array.from(cardMap.values()).sort(
      (a, b) => b.incomeAmount - a.incomeAmount
    ),
    payTypes: Array.from(payTypeMap.values()).sort(
      (a, b) => b.amount - a.amount
    ),
    marketers: Array.from(marketerMap.values()).sort(
      (a, b) => b.amount - a.amount
    ),
  };
}

/* ============================================================
 * 日期工具
 * ============================================================ */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function getMonthRange(month: string): { begin: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { begin: fmtDate(first), end: fmtDate(last) };
}

export function getLastMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based，上月
  const d = new Date(y, m - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}