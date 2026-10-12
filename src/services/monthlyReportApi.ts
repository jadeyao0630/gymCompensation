import type { DingTalkReportItem } from '../api/dingtalk';
import { extractAmount, extractItems } from '../pages/dingtalk/utils/extract';

export interface DingtalkBreakdown {
  salary: { count: number; total: number };
  property: { count: number; total: number };
  utility: { count: number; total: number };
  repair: { count: number; total: number };
  daily: { count: number; total: number };
  refund: { count: number; total: number };
  other: { count: number; total: number };
  total: number;
  extraExpense: number;
  categories: Array<{ category: string; count: number; total: number }>;
}

export interface MonthlyReportPayload {
  storeId: string;
  storeName: string;
  month: string;
  revenue: {
    cardSales: { total: number; byCategory: Record<string, { count: number; total: number }> };
    courseSales: { total: number; byCategory: Record<string, { count: number; total: number }> };
    renewals: { total: number };
    courseConsumed: { total: number; count: number };
  };
  fixedCost: {
    propertyFee: number;
    electricityFee: number;
    rent: number;
    waterFee: number;
    networkFee: number;
    otherFee: number;
    total: number;
  };
  payroll: {
    headcount: number;
    baseSalary: number;
    salesCommission: number;
    classCommission: number;
    rewardsTotal: number;
    total: number;
    byDepartment: Record<string, any>;
    individual: {
      salesTop: any[];
      classTop: any[];
      totals: { salesAmount: number; classAmount: number; classCount: number };
    };
  };
  dingtalkExpenses: {
    total: number;
    count: number;
    categories: Array<{
      category: string;
      count: number;
      total: number;
      samples: string[];
    }>;
  };
  /** ⭐ 钉钉分类明细 */
  dingtalkBreakdown: DingtalkBreakdown | null;
  /** ⭐ 扣除钉钉已发薪酬后的剩余（用于实际支出） */
  adjustedPayroll: number;
  /** ⭐ 扣除钉钉已付物业/水电后的剩余 */
  adjustedFixedCost: number;
  /** ⭐ 实际总支出 */
  actualExpense: number;
  /** ⭐ 预估总支出（payroll + fixedCost） */
  estimatedExpense: number;
  /** ⭐ 门店画像 */
  storeProfile: {
    name: string;
    area: string;
    facilities: string[];
    positioning: string;
    focus: string[];
  } | null;
  summary: {
    totalIncome: number;
    totalExpense: number;
    profit: number;
    isProfit: boolean;
  };
}

/* ============================================================
 * ⭐ 门店画像（与后端 routes/ai.js 的 STORE_PROFILES 一致）
 * ============================================================ */
const STORE_PROFILES: Record<string, {
  name: string;
  area: string;
  facilities: string[];
  positioning: string;
  focus: string[];
}> = {
  '富贵园': {
    name: '富贵园店',
    area: '3000 多平米',
    facilities: ['泳池','操房','乒乓球','篮球场','私教区','搏击区','有氧区','器械区'],
    positioning:
      '综合型旗舰店，设施齐全、面积大、可承载泳教 / 篮球 / 搏击 / 操课等多业态；固定成本（水电、物业、租金、保洁）体量明显高于哈德门。',
    focus: [
      '泳池、篮球场、操房等高能耗 / 高维护区域是水电费、保洁费、维修费的主要来源，需要单独关注其坪效。',
      '多业态意味着收入结构更分散，需关注各业态（售卡 vs 售课 vs 泳教）的毛利差异。',
      '大面积场地固定成本刚性高，盈亏平衡点更依赖收入规模，需重点看坪效与人效。',
    ],
  },
  '哈德门': {
    name: '哈德门店',
    area: '600 多平米',
    facilities: ['私教区','有氧区','器械区','操房','乒乓球'],
    positioning:
      '小而精社区型门店，以私教、有氧、器械、操房为主；固定成本相对低，坪效 / 人效是关键指标。',
    focus: [
      '面积小、私教占比高，需关注私教课提与私教销售的贡献度。',
      '无泳池 / 篮球场，水电与保洁负担轻，固定成本压力小，利润率更容易做正。',
      '场地有限，器械 / 操房高峰期冲突概率高，需关注排课与会员体验。',
    ],
  },
};

function getStoreProfile(storeName: string) {
  if (!storeName) return null;
  if (STORE_PROFILES[storeName]) return STORE_PROFILES[storeName];
  const hit = Object.keys(STORE_PROFILES).find(
    (k) => storeName.includes(k) || k.includes(storeName)
  );
  return hit ? STORE_PROFILES[hit] : null;
}

/* ============================================================
 * 通用工具
 * ============================================================ */
function pickAmount(it: any): number {
  if (!it || typeof it !== 'object') return 0;
  const preferred = [
    'amount', 'total_amount', 'totalAmount',
    'real_amount', 'realAmount', 'pay_amount', 'payAmount',
    'money', 'price', 'sale_amount', 'saleAmount',
    'received_amount', 'receivedAmount', 'income', 'income_amount',
    'card_amount', 'cardAmount', 'course_amount', 'courseAmount',
  ];
  for (const k of preferred) {
    const v = it[k];
    if (v !== undefined && v !== null && v !== '') {
      const n = Number(String(v).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(n) && n !== 0) return n;
    }
  }
  for (const k of Object.keys(it)) {
    const lk = String(k).toLowerCase();
    if (lk.includes('amount') || lk.includes('money') || k.includes('金额')) {
      const v = it[k];
      const n = Number(String(v).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(n) && n !== 0) return n;
    }
  }
  return 0;
}

function classifyOrder(it: any): 'card' | 'course' {
  if (!it || typeof it !== 'object') return 'card';
  const typeVal = String(
    it.card_type_id ?? it.card_type ?? it.cardType ??
    it.order_type ?? it.orderType ?? it.type ??
    it.sale_type ?? it.saleType ?? it.category ?? ''
  ).toLowerCase();
  const nameVal = String(
    it.card_name ?? it.cardName ?? it.course_name ?? it.courseName ??
    it.product_name ?? it.productName ?? it.title ?? it.name ?? ''
  ).toLowerCase();
  if (typeVal === '4' || typeVal === '5') return 'course';
  if (
    typeVal.includes('course') ||
    nameVal.includes('课') ||
    nameVal.includes('私教') ||
    nameVal.includes('泳教')
  ) return 'course';
  if (typeVal === '1' || typeVal === '2' || typeVal === '3') return 'card';
  if (typeVal.includes('card')) return 'card';
  return 'card';
}

function getDepartmentOf(positionTitle: string | undefined): string {
  const t = String(positionTitle || '').trim();
  if (!t) return '其他';
  if (t.includes('会籍')) return '会籍';
  if (t.includes('私教')) return '私教';
  if (t.includes('泳教') || t.includes('游泳')) return '泳教';
  if (
    t.includes('运营') || t.includes('店长') || t.includes('前台') ||
    t.includes('保洁') || t.includes('维修')
  ) return '运营';
  return '其他';
}

function isManagerRole(r: any): boolean {
  const title = String(r?.positionTitle || '').trim();
  if (title.includes('店长')) return true;
  if (title.includes('运营主管')) return true;
  if (title.includes('经理')) return true;
  if (r?.isManager === true) return true;
  if (r?.performanceSource === 'manager') return true;
  if (r?.managerAggregateByDept === true) return true;
  return false;
}

function aggregateByCategory(list: any[]): Record<string, { count: number; total: number }> {
  const map: Record<string, { count: number; total: number }> = {};
  list.forEach((it) => {
    const name =
      it.card_name || it.cardName ||
      it.course_name || it.courseName ||
      it.ci_name || '未知类别';
    if (!map[name]) map[name] = { count: 0, total: 0 };
    map[name].count += 1;
    map[name].total += pickAmount(it);
  });
  return Object.fromEntries(
    Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  );
}

/* ============================================================
 * 钉钉摘要（给 prompt 用）
 * ============================================================ */
const MEMBER_REFUND_TEMPLATE = '会员退费';
const PAYEE_CATEGORY_OVERRIDES: Array<{ payee: string; category: string }> = [
  { payee: '山东云优人力资源服务有限公司', category: '工资底薪佣金' },
];
const SUBJECT_RULES: Array<{ key: string; keywords: string[] }> = [
  { key: '物业费', keywords: ['物业费', '物业'] },
  { key: '水电费', keywords: ['电费', '水费', '水电'] },
  { key: '工资底薪佣金', keywords: ['工资','底薪','佣金','提成','薪酬','薪金','劳务','派遣','人力资源'] },
  { key: '修理', keywords: ['修理','维修','修缮','保养','配件更换','更换','安装','装修'] },
  {
    key: '日常支出',
    keywords: [
      '办公','办公用品','日用','清洁','保洁','耗材','快递','邮寄',
      '差旅','交通','通讯','话费','劳保','低值易耗','消耗',
      '采购','购买','宣传','广告','推广','营销','物料','印刷',
    ],
  },
];

function collectDingtalkText(item: DingTalkReportItem): string {
  const parts: string[] = [];
  if (Array.isArray(item.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }
  const fv = item.formValues || {};
  const rawDetail = fv['明细列表'];
  if (typeof rawDetail === 'string' && rawDetail && rawDetail !== 'null') {
    try {
      const parsed = JSON.parse(rawDetail);
      if (Array.isArray(parsed)) {
        parsed.forEach((row: any) => {
          (row?.rowValue || []).forEach((f: any) => {
            const label = String(f?.label || '');
            if (label.includes('事项') || label.includes('内容') || label.includes('名称')) {
              if (f?.value != null && f.value !== 'null') {
                parts.push(String(f.value));
              }
            }
          });
        });
      }
    } catch { /* ignore */ }
  }
  if (item.title) parts.push(String(item.title));
  [
    '事项','事项/明细','报销事由','费用类型','明细',
    '备注','事由','用途','摘要','说明',
    '付款内容提要','付款事由','付款用途',
    '借款提要','退卡原因',
  ].forEach((k) => {
    const v = fv[k];
    if (v == null || v === 'null' || v === '') return;
    if (typeof v === 'object') {
      try { parts.push(JSON.stringify(v)); } catch {}
    } else {
      parts.push(String(v));
    }
  });
  return parts.join(' ');
}

function classifyDingtalk(item: DingTalkReportItem): string {
  const tpl = String(item.templateName || '').trim();
  if (tpl.includes('退费') || tpl.includes('退款')) return '退费';
  if (tpl === MEMBER_REFUND_TEMPLATE) return '退费';

  const payee = String(item.payeeAccount || '').trim();
  for (const rule of PAYEE_CATEGORY_OVERRIDES) {
    if (payee === rule.payee) return rule.category;
  }

  const text = collectDingtalkText(item);
  if (text) {
    if (['退费','退款','退卡','退课'].some((k) => text.includes(k))) {
      return '退费';
    }
    for (const rule of SUBJECT_RULES) {
      if (rule.keywords.some((k) => k && text.includes(k))) {
        return rule.key;
      }
    }
  }
  return tpl || '其它';
}

function pickDingtalkAmount(item: DingTalkReportItem): number {
  const candidates = [
    '补退金额（元）','补退金额','退款金额（元）','退款金额',
    '报销金额','借款金额（元）','借款金额',
    '本次申请支付金额（元）','本次申请支付金额',
    '总价款（元）','金额（元）','金额',
  ];
  const fv = item.formValues || {};
  for (const k of candidates) {
    const v = fv[k];
    if (v != null && v !== 'null' && v !== '') {
      const n = Number(String(v).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(n) && n !== 0) return n;
    }
  }
  const n0 = Number(item.amount);
  if (Number.isFinite(n0) && n0 !== 0) return n0;
  return 0;
}

function summarizeDingtalk(items: DingTalkReportItem[]) {
  const map = new Map<
    string,
    { category: string; count: number; total: number; samples: string[] }
  >();
  let total = 0;
  let count = 0;

  for (const r of items) {
    if (r.error) continue;
    const amount = pickDingtalkAmount(r);
    const category = classifyDingtalk(r);

    if (!map.has(category)) {
      map.set(category, { category, count: 0, total: 0, samples: [] });
    }
    const g = map.get(category)!;
    g.count += 1;
    g.total += amount;

    if (g.samples.length < 5) {
      const label = extractItems(r.templateName || '', r.formValues || {}) || r.title || '';
      if (label && label !== '—') g.samples.push(label.slice(0, 60));
    }
    total += amount;
    count += 1;
  }

  return {
    total,
    count,
    categories: Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((g) => ({
        category: g.category,
        count: g.count,
        total: g.total,
        samples: g.samples,
      })),
  };
}

/* ============================================================
 * buildPayload
 * ============================================================ */
export interface BuildPayloadParams {
  storeId: string;
  storeName: string;
  month: string;
  orderList: any[];
  payrollResults: any[];
  fixedCostDetail: {
    propertyFee: number; electricityFee: number; rent: number;
    waterFee: number; networkFee: number; otherFee: number;
  };
  dingtalkItems?: DingTalkReportItem[];
  dingtalkBreakdown?: DingtalkBreakdown;
  adjustedPayroll?: number;
  adjustedFixedCost?: number;
  actualExpense?: number;
  estimatedExpense?: number;
}

export function buildPayload(params: BuildPayloadParams): MonthlyReportPayload {
  const {
    storeId, storeName, month,
    orderList, payrollResults, fixedCostDetail,
    dingtalkItems = [],
    dingtalkBreakdown,
    adjustedPayroll,
    adjustedFixedCost,
    actualExpense,
    estimatedExpense,
  } = params;

  const cardOrders: any[] = [];
  const courseOrders: any[] = [];
  (orderList || []).forEach((o) => {
    if (classifyOrder(o) === 'course') courseOrders.push(o);
    else cardOrders.push(o);
  });

  const sum = (list: any[]) => list.reduce((s, it) => s + pickAmount(it), 0);

  const cardByCategory = aggregateByCategory(cardOrders);
  const courseByCategory = aggregateByCategory(courseOrders);

  const EMPTY_PAYROLL = {
    headcount: 0, baseSalary: 0, salesCommission: 0,
    classCommission: 0, rewardsTotal: 0, total: 0,
  };

  const payrollSummary = (payrollResults || []).reduce(
    (acc: any, r: any) => ({
      headcount: acc.headcount + 1,
      baseSalary: acc.baseSalary + Number(r.baseSalary || 0),
      salesCommission: acc.salesCommission + Number(r.salesCommission || 0),
      classCommission: acc.classCommission + Number(r.classCommission || 0),
      rewardsTotal: acc.rewardsTotal + Number(r.rewardsTotal || 0),
      total: acc.total + Number(r.total || 0),
    }),
    { ...EMPTY_PAYROLL }
  );

  const deptMap: Record<string, typeof EMPTY_PAYROLL> = {};
  (payrollResults || []).forEach((r: any) => {
    const dept = getDepartmentOf(r.positionTitle);
    if (!deptMap[dept]) deptMap[dept] = { ...EMPTY_PAYROLL };
    deptMap[dept].headcount += 1;
    deptMap[dept].baseSalary += Number(r.baseSalary || 0);
    deptMap[dept].salesCommission += Number(r.salesCommission || 0);
    deptMap[dept].classCommission += Number(r.classCommission || 0);
    deptMap[dept].rewardsTotal += Number(r.rewardsTotal || 0);
    deptMap[dept].total += Number(r.total || 0);
  });

  const payrollByDepartment: Record<string, any> = {};
  Object.entries(deptMap).forEach(([dept, s]) => {
    payrollByDepartment[dept] = {
      ...s,
      salesCommissionRatio: s.total > 0 ? s.salesCommission / s.total : 0,
      classCommissionRatio: s.total > 0 ? s.classCommission / s.total : 0,
    };
  });

  const filteredResults = (payrollResults || []).filter((r: any) => !isManagerRole(r));

  const allStaff = filteredResults.map((r: any) => ({
    staffName: r.staffName || '未命名',
    positionTitle: r.positionTitle || '',
    department: getDepartmentOf(r.positionTitle),
    salesAmount: Number(r.salesAmount || 0),
    salesCommission: Number(r.salesCommission || 0),
    classCount: Number(r.classCount || 0),
    classAmount: Number(r.classAmount || 0),
    classCommission: Number(r.classCommission || 0),
  }));

  const deptSalesTotal: Record<string, number> = {};
  const deptClassTotal: Record<string, number> = {};
  allStaff.forEach((s) => {
    deptSalesTotal[s.department] = (deptSalesTotal[s.department] || 0) + s.salesAmount;
    deptClassTotal[s.department] = (deptClassTotal[s.department] || 0) + s.classAmount;
  });

  const totals = {
    salesAmount: allStaff.reduce((s, x) => s + x.salesAmount, 0),
    classAmount: allStaff.reduce((s, x) => s + x.classAmount, 0),
    classCount: allStaff.reduce((s, x) => s + x.classCount, 0),
  };

  const salesTop = [...allStaff]
    .filter((s) => s.salesAmount > 0)
    .sort((a, b) => b.salesAmount - a.salesAmount)
    .slice(0, 15)
    .map((s) => ({
      staffName: s.staffName,
      positionTitle: s.positionTitle,
      department: s.department,
      salesAmount: s.salesAmount,
      salesCommission: s.salesCommission,
      shareInDept: deptSalesTotal[s.department] > 0 ? s.salesAmount / deptSalesTotal[s.department] : 0,
    }));

  const classTop = [...allStaff]
    .filter((s) => s.classAmount > 0 || s.classCount > 0)
    .sort((a, b) => b.classAmount - a.classAmount)
    .slice(0, 15)
    .map((s) => ({
      staffName: s.staffName,
      positionTitle: s.positionTitle,
      department: s.department,
      classCount: s.classCount,
      classAmount: s.classAmount,
      classCommission: s.classCommission,
      shareInDept: deptClassTotal[s.department] > 0 ? s.classAmount / deptClassTotal[s.department] : 0,
    }));

  const fixedCost = {
    ...fixedCostDetail,
    total:
      fixedCostDetail.propertyFee +
      fixedCostDetail.electricityFee +
      fixedCostDetail.rent +
      fixedCostDetail.waterFee +
      fixedCostDetail.networkFee +
      fixedCostDetail.otherFee,
  };

  const dingtalkExpenses = summarizeDingtalk(dingtalkItems);
  const storeProfile = getStoreProfile(storeName);

  const finalAdjustedPayroll = adjustedPayroll ?? payrollSummary.total;
  const finalAdjustedFixedCost = adjustedFixedCost ?? fixedCost.total;
  const finalEstimatedExpense = estimatedExpense ?? (payrollSummary.total + fixedCost.total);
  const finalActualExpense =
    actualExpense ??
    (finalAdjustedPayroll +
      finalAdjustedFixedCost +
      (dingtalkBreakdown?.salary.total ?? 0) +
      (dingtalkBreakdown?.property.total ?? 0) +
      (dingtalkBreakdown?.utility.total ?? 0) +
      (dingtalkBreakdown?.repair.total ?? 0) +
      (dingtalkBreakdown?.daily.total ?? 0) +
      (dingtalkBreakdown?.refund.total ?? 0) +
      (dingtalkBreakdown?.other.total ?? 0));

  const totalIncome = sum(cardOrders) + sum(courseOrders);
  const profit = totalIncome - finalActualExpense;

  return {
    storeId,
    storeName,
    month,
    revenue: {
      cardSales: { total: sum(cardOrders), byCategory: cardByCategory },
      courseSales: { total: sum(courseOrders), byCategory: courseByCategory },
      renewals: { total: 0 },
      courseConsumed: { total: 0, count: 0 },
    },
    fixedCost,
    payroll: {
      ...payrollSummary,
      byDepartment: payrollByDepartment,
      individual: { salesTop, classTop, totals },
    },
    dingtalkExpenses,
    dingtalkBreakdown: dingtalkBreakdown ?? null,
    adjustedPayroll: finalAdjustedPayroll,
    adjustedFixedCost: finalAdjustedFixedCost,
    actualExpense: finalActualExpense,
    estimatedExpense: finalEstimatedExpense,
    storeProfile,
    summary: {
      totalIncome,
      totalExpense: finalActualExpense,
      profit,
      isProfit: profit >= 0,
    },
  };
}

/* ============================================================
 * AI 生成
 * ============================================================ */
export async function generateAiReport(
  payload: MonthlyReportPayload
): Promise<string> {
  const res = await fetch(`/api/ai/monthly-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`后端返回 ${res.status}：${text.slice(0, 300)}`);
  }

  const json = await res.json();
  if (json.errorcode !== 0) {
    throw new Error(json.errormsg || 'AI 报告生成失败');
  }
  return json.data?.analysis || '';
}