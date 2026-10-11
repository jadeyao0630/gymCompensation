export interface MonthlyReportPayload {
  storeId: string;
  storeName: string;
  month: string;
  revenue: {
    cardSales: {
      total: number;
      byCategory: Record<string, { count: number; total: number }>;
    };
    courseSales: {
      total: number;
      byCategory: Record<string, { count: number; total: number }>;
    };
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
    byDepartment: Record<string, {
      headcount: number;
      baseSalary: number;
      salesCommission: number;
      classCommission: number;
      rewardsTotal: number;
      total: number;
      salesCommissionRatio: number;
      classCommissionRatio: number;
    }>;
    individual: {
      salesTop: Array<{
        staffName: string;
        positionTitle: string;
        department: string;
        salesAmount: number;
        salesCommission: number;
        shareInDept: number;
      }>;
      classTop: Array<{
        staffName: string;
        positionTitle: string;
        department: string;
        classCount: number;
        classAmount: number;
        classCommission: number;
        shareInDept: number;
      }>;
      totals: {
        salesAmount: number;
        classAmount: number;
        classCount: number;
      };
    };
  };
  dingtalkExpenses: {
    total: number;
    items: any[];
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    profit: number;
    isProfit: boolean;
  };
}

/* ============================================================
 * 智能提取"金额"
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

/* ============================================================
 * 智能判断"售卡 / 售课"
 * ============================================================ */
function classifyOrder(it: any): 'card' | 'course' {
  if (!it || typeof it !== 'object') return 'card';

  const typeVal = String(
    it.card_type_id ??
      it.card_type ??
      it.cardType ??
      it.order_type ??
      it.orderType ??
      it.type ??
      it.sale_type ??
      it.saleType ??
      it.category ??
      ''
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
  ) {
    return 'course';
  }
  if (typeVal === '1' || typeVal === '2' || typeVal === '3') return 'card';
  if (typeVal.includes('card')) return 'card';
  return 'card';
}

/* ============================================================
 * ⭐ 按职位名判断部门
 * ============================================================ */
function getDepartmentOf(positionTitle: string | undefined): string {
  const t = String(positionTitle || '').trim();
  if (!t) return '其他';
  if (t.includes('会籍')) return '会籍';
  if (t.includes('私教')) return '私教';
  if (t.includes('泳教') || t.includes('游泳')) return '泳教';
  if (
    t.includes('运营') ||
    t.includes('店长') ||
    t.includes('前台') ||
    t.includes('保洁') ||
    t.includes('维修')
  ) {
    return '运营';
  }
  return '其他';
}

/* ============================================================
 * ⭐ 是否管理岗（业绩为部门汇总，不计入个人排行）
 * ============================================================ */
function isManagerRole(r: any): boolean {
  const title = String(r?.positionTitle || '').trim();

  /* 明确的店长、运营主管 */
  if (title.includes('店长')) return true;
  if (title.includes('运营主管')) return true;

  /* 部门经理（会籍经理 / 私教经理 / 泳教经理 / 经理） */
  if (title.includes('经理')) return true;

  /* 兜底字段（如果 PayrollResult 里有） */
  if (r?.isManager === true) return true;
  if (r?.performanceSource === 'manager') return true;
  if (r?.managerAggregateByDept === true) return true;

  return false;
}

/* ============================================================
 * 按类别聚合
 * ============================================================ */
function aggregateByCategory(
  list: any[]
): Record<string, { count: number; total: number }> {
  const map: Record<string, { count: number; total: number }> = {};
  list.forEach((it) => {
    const name =
      it.card_name || it.cardName ||
      it.course_name || it.courseName ||
      it.ci_name ||
      '未知类别';
    if (!map[name]) map[name] = { count: 0, total: 0 };
    map[name].count += 1;
    map[name].total += pickAmount(it);
  });
  return Object.fromEntries(
    Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  );
}

/* ============================================================
 * ⭐ 拼 AI payload
 * ============================================================ */
export function buildPayload(params: {
  storeId: string;
  storeName: string;
  month: string;
  orderList: any[];
  payrollResults: any[];
  fixedCostDetail: {
    propertyFee: number;
    electricityFee: number;
    rent: number;
    waterFee: number;
    networkFee: number;
    otherFee: number;
  };
}): MonthlyReportPayload {
  const {
    storeId, storeName, month,
    orderList, payrollResults, fixedCostDetail,
  } = params;

  console.log('[buildPayload] 订单总数 =', orderList?.length || 0);

  /* 拆出售卡 / 售课 */
  const cardOrders: any[] = [];
  const courseOrders: any[] = [];
  (orderList || []).forEach((o) => {
    if (classifyOrder(o) === 'course') courseOrders.push(o);
    else cardOrders.push(o);
  });

  const sum = (list: any[]) => list.reduce((s, it) => s + pickAmount(it), 0);

  const cardByCategory = aggregateByCategory(cardOrders);
  const courseByCategory = aggregateByCategory(courseOrders);

  console.log(
    '[buildPayload] 售卡 %d 条（¥%s），售课 %d 条（¥%s）',
    cardOrders.length, sum(cardOrders),
    courseOrders.length, sum(courseOrders)
  );

  /* ============================================================
   * 薪酬汇总：整体 + 按部门拆分
   * ============================================================ */
  const EMPTY_PAYROLL = {
    headcount: 0,
    baseSalary: 0,
    salesCommission: 0,
    classCommission: 0,
    rewardsTotal: 0,
    total: 0,
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

  /* ============================================================
   * ⭐ 个人销售 / 消课排行（排除管理岗）
   * ============================================================ */
  const filteredResults = (payrollResults || []).filter(
    (r: any) => !isManagerRole(r)
  );

  console.log(
    '[buildPayload] 个人排行：过滤掉 %d 个管理岗，剩 %d 人',
    (payrollResults || []).length - filteredResults.length,
    filteredResults.length
  );

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
      shareInDept:
        deptSalesTotal[s.department] > 0
          ? s.salesAmount / deptSalesTotal[s.department]
          : 0,
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
      shareInDept:
        deptClassTotal[s.department] > 0
          ? s.classAmount / deptClassTotal[s.department]
          : 0,
    }));

  console.log('[buildPayload] 销售 Top:', salesTop);
  console.log('[buildPayload] 消课 Top:', classTop);
  console.log('[buildPayload] 个人合计:', totals);

  /* ============================================================
   * 固定成本 / 汇总
   * ============================================================ */
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

  const dingtalkExpenses = { total: 0, items: [] };

  const totalIncome = sum(cardOrders) + sum(courseOrders);
  const totalExpense = fixedCost.total + payrollSummary.total;
  const profit = totalIncome - totalExpense;

  console.log(
    '[buildPayload] 收入合计 = ¥%s，支出合计 = ¥%s，利润 = ¥%s',
    totalIncome, totalExpense, profit
  );

  return {
    storeId,
    storeName,
    month,
    revenue: {
      cardSales: {
        total: sum(cardOrders),
        byCategory: cardByCategory,
      },
      courseSales: {
        total: sum(courseOrders),
        byCategory: courseByCategory,
      },
      renewals: { total: 0 },
      courseConsumed: { total: 0, count: 0 },
    },
    fixedCost,
    payroll: {
      ...payrollSummary,
      byDepartment: payrollByDepartment,
      individual: {
        salesTop,
        classTop,
        totals,
      },
    },
    dingtalkExpenses,
    summary: {
      totalIncome,
      totalExpense,
      profit,
      isProfit: profit >= 0,
    },
  };
}

/* ============================================================
 * 调后端 → 豆包生成报告
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