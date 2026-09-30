import type { FinancialFlowItem } from '../../../api/stats';

/* ============================================================
 * 业务类型识别
 * ============================================================ */
export type BusinessType = '购卡' | '购泳教' | '购私教' | '其他';

export interface TypeResult {
  type: BusinessType;
  subType?: string;
}

export function getBusinessTypeInfo(item: FinancialFlowItem): TypeResult {
  const op = String(item.operate_type || '').trim();
  const ci = String(item.ci_name || '').trim();
  const cardTypeId = String(item.card_type_id || '').trim();

  if (op.includes('泳教') || ci.includes('泳教') || cardTypeId === '5') {
    return { type: '购泳教' };
  }
  if (op.includes('私教') || ci.includes('私教')) {
    return { type: '购私教' };
  }
  if (
    op.includes('购卡') ||
    op.includes('换卡') ||
    op.includes('升卡') ||
    ci.includes('购卡') ||
    ci.includes('换卡')
  ) {
    return { type: '购卡' };
  }

  const subType = op || ci || '未分类';
  return { type: '其他', subType };
}

export function getBusinessType(item: FinancialFlowItem): BusinessType {
  return getBusinessTypeInfo(item).type;
}

export function getBusinessTypeLabel(item: FinancialFlowItem): string {
  const info = getBusinessTypeInfo(item);
  if (info.type === '其他' && info.subType) {
    return `其他 (${info.subType})`;
  }
  return info.type;
}

/* ⭐ 从订单业务类型推断职位 */
function inferPosition(item: FinancialFlowItem): string {
  const info = getBusinessTypeInfo(item);
  if (info.type === '购泳教') return '泳教';
  if (info.type === '购私教') return '私教';
  if (info.type === '购卡') return '会籍';
  const sub = info.subType || '';
  if (sub.includes('泳教')) return '泳教';
  if (sub.includes('私教')) return '私教';
  if (sub.includes('卡')) return '会籍';
  return '运营';
}

/* ============================================================
 * 金额工具
 * ============================================================ */
export function getIncomeAmount(item: FinancialFlowItem): number {
  const v = item.income_amount ?? item.amount ?? 0;
  return Number(v) || 0;
}

export function getCardAmount(item: FinancialFlowItem): number {
  return Number(item.amount || 0);
}

/* ⭐ 新增：押金支付金额 */
export function getPrePayment(item: FinancialFlowItem): number {
  return Number(item.pre_payment || 0) || 0;
}

/* ============================================================
 * 单笔订单
 * ============================================================ */
export interface CardOrderItem {
  id: string;
  flowSn: string;
  memberName: string;
  dealTime: string;
  cardAmount: number;
  incomeAmount: number;
  /* ⭐ 新增：押金支付 */
  prePayment: number;
  remark: string;
  payDetail: { pay_type: string; amount: string; pay_type_id: string }[];
  marketers: { name: string; role: string; percent: string; amount: string }[];
}

export interface MarketerOrderItem extends CardOrderItem {
  cardName: string;
  businessLabel: string;
  myPercent: string;
  myAmount: number;
  myRole: string;
}

/* ============================================================
 * 汇总结果类型
 * ============================================================ */
export interface TypeSummary {
  type: BusinessType;
  label: string;
  subType?: string;
  count: number;
  cardAmount: number;
  incomeAmount: number;
}

export interface CardSummary {
  cardName: string;
  type: BusinessType;
  label: string;
  subType?: string;
  count: number;
  cardAmount: number;
  incomeAmount: number;
  orders: CardOrderItem[];
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
  position: string;
  positions: string[];
  orders: MarketerOrderItem[];
}

export interface OverallSummary {
  totalCount: number;
  totalCardAmount: number;
  totalIncomeAmount: number;
  /* ⭐ 新增：押金支付合计 */
  totalPrePayment: number;
  types: TypeSummary[];
  cards: CardSummary[];
  payTypes: PayTypeSummary[];
  marketers: MarketerSummary[];
}

/* ============================================================
 * 主汇总函数
 * ============================================================ */
export function aggregateOrders(list: FinancialFlowItem[]): OverallSummary {
  const typeMap = new Map<string, TypeSummary>();
  const cardMap = new Map<string, CardSummary>();
  const payTypeMap = new Map<string, PayTypeSummary>();
  const marketerMap = new Map<
    string,
    MarketerSummary & { _positionCount: Map<string, number> }
  >();

  let totalCardAmount = 0;
  let totalIncomeAmount = 0;
  let totalPrePayment = 0;   // ⭐ 押金合计

  list.forEach((item) => {
    const info = getBusinessTypeInfo(item);
    const type = info.type;
    const subType = info.subType;
    const cardAmount = getCardAmount(item);
    const incomeAmount = getIncomeAmount(item);
    const prePayment = getPrePayment(item);           // ⭐ 押金
    const cardName = String(item.card_name || '未命名');
    const remark = String(item.remark || '').trim();
    const label = subType ? `其他 (${subType})` : type;
    const inferredPosition = inferPosition(item);

    totalCardAmount += cardAmount;
    totalIncomeAmount += incomeAmount;
    totalPrePayment += prePayment;                    // ⭐ 累计押金

    /* 类型汇总 */
    const typeKey = subType ? `${type}__${subType}` : type;
    if (!typeMap.has(typeKey)) {
      typeMap.set(typeKey, {
        type, label, subType,
        count: 0, cardAmount: 0, incomeAmount: 0,
      });
    }
    const ts = typeMap.get(typeKey)!;
    ts.count += 1;
    ts.cardAmount += cardAmount;
    ts.incomeAmount += incomeAmount;

    /* 卡种汇总 */
    const cardKey = `${type}__${subType || ''}__${cardName}`;
    if (!cardMap.has(cardKey)) {
      cardMap.set(cardKey, {
        cardName, type, label, subType,
        count: 0, cardAmount: 0, incomeAmount: 0,
        orders: [],
      });
    }
    const cs = cardMap.get(cardKey)!;
    cs.count += 1;
    cs.cardAmount += cardAmount;
    cs.incomeAmount += incomeAmount;

    cs.orders.push({
      id: String(item.id || item.flow_sn || ''),
      flowSn: String(item.flow_sn || ''),
      memberName: String(item.username || ''),
      dealTime: String(item.deal_time || ''),
      cardAmount,
      incomeAmount,
      prePayment,                                     // ⭐ 押金
      remark,
      payDetail: (item.pay_detail || []).map((p) => ({
        pay_type: String(p.pay_type || ''),
        amount: String(p.amount || '0'),
        pay_type_id: String(p.pay_type_id || ''),
      })),
      marketers: (item.marketers_detail || []).map((m) => ({
        name: String(m.name || ''),
        role: String(m.role || ''),
        percent: String(m.percent || ''),
        amount: String(m.amount || '0'),
      })),
    });

    /* 收款方式 */
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

    /* 归属人 */
    (item.marketers_detail || []).forEach((m) => {
      const name = String(m.name || '').trim();
      if (!name) return;
      const amt = Number(m.amount) || 0;

      if (!marketerMap.has(name)) {
        marketerMap.set(name, {
          name,
          count: 0,
          amount: 0,
          position: inferredPosition,
          positions: [],
          orders: [],
          _positionCount: new Map(),
        });
      }
      const ms = marketerMap.get(name)!;
      ms.count += 1;
      ms.amount += amt;

      const cnt = ms._positionCount.get(inferredPosition) || 0;
      ms._positionCount.set(inferredPosition, cnt + 1);

      ms.orders.push({
        id: String(item.id || item.flow_sn || ''),
        flowSn: String(item.flow_sn || ''),
        memberName: String(item.username || ''),
        dealTime: String(item.deal_time || ''),
        cardName,
        businessLabel: label,
        cardAmount,
        incomeAmount,
        prePayment,                                   // ⭐ 押金
        remark,
        myRole: String(m.role || ''),
        myPercent: String(m.percent || ''),
        myAmount: amt,
        payDetail: (item.pay_detail || []).map((p) => ({
          pay_type: String(p.pay_type || ''),
          amount: String(p.amount || '0'),
          pay_type_id: String(p.pay_type_id || ''),
        })),
        marketers: (item.marketers_detail || []).map((mm) => ({
          name: String(mm.name || ''),
          role: String(mm.role || ''),
          percent: String(mm.percent || ''),
          amount: String(mm.amount || '0'),
        })),
      });
    });
  });

  /* 排序 */
  Array.from(cardMap.values()).forEach((cs) => {
    cs.orders.sort((a, b) => (b.dealTime > a.dealTime ? 1 : -1));
  });
  Array.from(marketerMap.values()).forEach((ms) => {
    ms.orders.sort((a, b) => (b.dealTime > a.dealTime ? 1 : -1));
    const sorted = Array.from(ms._positionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pos]) => pos);
    ms.positions = sorted;
    ms.position = sorted[0] || '—';
  });

  const typeOrder: BusinessType[] = ['购卡', '购泳教', '购私教', '其他'];
  const sortedTypes = Array.from(typeMap.values()).sort((a, b) => {
    const ai = typeOrder.indexOf(a.type);
    const bi = typeOrder.indexOf(b.type);
    if (ai !== bi) return ai - bi;
    return b.incomeAmount - a.incomeAmount;
  });

  return {
    totalCount: list.length,
    totalCardAmount,
    totalIncomeAmount,
    totalPrePayment,                                // ⭐ 押金合计
    types: sortedTypes,
    cards: Array.from(cardMap.values()).sort(
      (a, b) => b.incomeAmount - a.incomeAmount
    ),
    payTypes: Array.from(payTypeMap.values()).sort(
      (a, b) => b.amount - a.amount
    ),
    marketers: Array.from(marketerMap.values())
      .map(({ _positionCount, ...rest }) => rest)
      .sort((a, b) => b.amount - a.amount),
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
  const m = now.getMonth();
  const d = new Date(y, m - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}