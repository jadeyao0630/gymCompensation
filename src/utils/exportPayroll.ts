import * as XLSX from 'xlsx-js-style';
import type { PayrollResult, SalesMemberDetail } from './payroll';
import type { MonthlyCompensationPlan } from '../types/compensation';
import { getDepartmentOf, needsSaleIdPrefix } from './payroll';
import { getCardOrderList } from '../api/stats';

function getMonthRange(month: string): { begin_date: string; end_date: string } {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  return { begin_date: fmt(first), end_date: fmt(last) };
}

function formatPayDetail(
  payDetail?: Array<{ pay_type: string; amount: string; pay_type_id: string }>
): string {
  if (!payDetail || payDetail.length === 0) return '—';
  return payDetail
    .map((p) => `${p.pay_type} ¥${Number(p.amount).toLocaleString()}`)
    .join(' + ');
}

function formatMarketers(
  marketers?: Array<{
    name: string;
    role: string;
    percent: string;
    amount: string;
  }>
): string {
  if (!marketers || marketers.length === 0) return '—';
  return marketers
    .map(
      (m) =>
        `${m.name}[${m.role === '主归属' ? '主' : '协'}] ${m.percent} ¥${m.amount}`
    )
    .join('\n');
}

const SOURCE_LABEL: Record<string, string> = {
  position: '职位',
  department: '部门',
  staff: '个人',
};
const TRIGGER_LABEL: Record<string, string> = {
  auto: '自动命中',
  manual: '手动添加',
};

const RED_FONT = { font: { color: { rgb: 'C00000' } } };

/**
 * ⭐ 从后台实时拉取销售明细（当 result.salesDetail 为空时回退）
 * - 经理聚合：按 salesSourceStaffIds 逐个拉
 * - 普通员工：只拉自己
 */
async function fetchSalesDetailFallback(
  result: PayrollResult,
  storeId: string,
  month: string
): Promise<SalesMemberDetail[]> {
  const { begin_date, end_date } = getMonthRange(month);
  const sourceList =
    result.salesSourceStaffIds && result.salesSourceStaffIds.length > 0
      ? result.salesSourceStaffIds
      : [
          {
            id: result.staffId,
            name: result.staffName,
            positionTitle: result.positionTitle,
          },
        ];

  const isAggregated = sourceList.length > 1;

  const tasks = sourceList.map(async (src) => {
    const saleId = needsSaleIdPrefix(src.positionTitle)
      ? `c${src.id}`
      : src.id;
    try {
      const res = await getCardOrderList({
        bus_id: storeId,
        sale_id: saleId,
        begin_date,
        end_date,
        page_no: 1,
        page_size: 1000,
      });
      return { sid: src.id, owner: src.name, list: res.list };
    } catch {
      return { sid: src.id, owner: src.name, list: [] };
    }
  });

  const settled = await Promise.all(tasks);
  const merged: SalesMemberDetail[] = [];

  settled.forEach(({ sid, owner, list }) => {
    list.forEach((item) => {
      const marketers = item.marketers_detail || [];
      const hit = marketers.find(
        (m) => (m.name || '').trim() === (owner || '').trim()
      );
      const myAmount = hit?.amount ? Number(hit.amount) : 0;

      if (isAggregated) {
        if (myAmount <= 0 && !hit) return;
      } else {
        if (!hit) return;
      }

      merged.push({
        orderId: String(item.id),
        memberName: item.username || '—',
        cardName: item.card_name || '—',
        amount: myAmount,
        cardAmount: Number(item.amount || 0),
        dealTime: item.deal_time || '',
        sourceStaffId: sid,
        sourceStaffName: owner,
        marketers: marketers.map((m) => ({
          name: m.name,
          role: m.role,
          percent: m.percent,
          amount: m.amount,
        })),
        payDetail: item.pay_detail,
      });
    });
  });

  return merged;
}

export async function exportEmployeePayrollToExcel(
  result: PayrollResult,
  plan: MonthlyCompensationPlan,
  month: string,
  storeId: string
): Promise<void> {
  const wb = XLSX.utils.book_new();
  const dept = getDepartmentOf(result.positionTitle);
  const isOpsManager = result.positionTitle === '运营主管';

  /* ============== Sheet 1：汇总 ============== */
  const summaryRows: any[][] = [
    ['薪酬佣金计算 - 员工明细'],
    ['月份', month],
    ['姓名', result.staffName],
    ['电话', result.staffPhone],
    ['岗位', result.positionTitle],
    ['部门', dept],
    ['性别', result.gender],
    ['新人', result.isNewbie ? '是' : '否'],
    ['经理', result.isManager ? '是' : '否'],
    [],
    ['项目', '数值'],
  ];

  if (isOpsManager) {
    summaryRows.push(['店长销售基数', result.salesAmount]);
    summaryRows.push(['佣金比例', `${(result.hitCommissionRate * 100).toFixed(2)}%`]);
    summaryRows.push(['底薪', result.baseSalary]);
    summaryRows.push(['销提（佣金）', result.salesCommission]);
    summaryRows.push(['缺勤扣款', -result.absentDeduction]);
    summaryRows.push(['奖金 / 扣款合计', result.rewardsTotal ?? 0]);
    summaryRows.push(['合计', result.total]);
  } else {
    summaryRows.push(['销售金额', result.salesAmount]);
    summaryRows.push(['消课节数', result.classCount]);
    summaryRows.push(['消课金额', result.classAmount]);
    summaryRows.push(['命中销提档位', `${(result.hitCommissionRate * 100).toFixed(2)}%`]);
    summaryRows.push(['底薪', result.baseSalary]);
    summaryRows.push(['销提', result.salesCommission]);
    summaryRows.push(['课提', result.classCommission]);
    summaryRows.push(['缺勤扣款', -result.absentDeduction]);
    summaryRows.push(['奖金 / 扣款合计', result.rewardsTotal ?? 0]);
    summaryRows.push(['合计', result.total]);
  }

  if (result.rewards && result.rewards.length > 0) {
    summaryRows.push([]);
    summaryRows.push(['奖金 / 扣款明细']);
    summaryRows.push(['名称', '金额', '类型', '来源', '触发方式', '备注']);
    result.rewards.forEach((h) => {
      const isDeduction = h.amount < 0 || h.type === 'deduction';
      summaryRows.push([
        h.name,
        h.amount,
        isDeduction ? '扣款' : '奖励',
        SOURCE_LABEL[h.source] ?? h.source,
        TRIGGER_LABEL[h.trigger] ?? h.trigger,
        h.note ?? '',
      ]);
    });
  }

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 24 }, { wch: 24 },
  ];

  if ((result.rewardsTotal ?? 0) < 0) {
    const range = XLSX.utils.decode_range(ws1['!ref'] || 'A1');
    for (let R = 0; R <= range.e.r; R++) {
      const labelAddr = XLSX.utils.encode_cell({ r: R, c: 0 });
      const labelCell = ws1[labelAddr];
      if (labelCell && labelCell.v === '奖金 / 扣款合计') {
        const valAddr = XLSX.utils.encode_cell({ r: R, c: 1 });
        if (ws1[valAddr]) ws1[valAddr].s = RED_FONT;
        break;
      }
    }
  }

  if (result.rewards && result.rewards.length > 0) {
    const range = XLSX.utils.decode_range(ws1['!ref'] || 'A1');
    for (let R = 0; R <= range.e.r; R++) {
      const typeAddr = XLSX.utils.encode_cell({ r: R, c: 2 });
      const typeCell = ws1[typeAddr];
      if (typeCell && typeCell.v === '扣款') {
        for (let C = 0; C <= 5; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws1[addr]) ws1[addr].s = RED_FONT;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws1, '汇总');

  /* ============== Sheet 2：奖金明细 ============== */
  if (result.rewards && result.rewards.length > 0) {
    const rewardRows: any[][] = [
      ['薪酬奖金 / 扣款明细'],
      ['月份', month],
      ['姓名', result.staffName],
      ['岗位', result.positionTitle],
      ['部门', dept],
      [],
      ['名称', '金额', '类型', '来源', '触发方式', '备注'],
    ];
    result.rewards.forEach((h) => {
      const isDeduction = h.amount < 0 || h.type === 'deduction';
      rewardRows.push([
        h.name,
        h.amount,
        isDeduction ? '扣款' : '奖励',
        SOURCE_LABEL[h.source] ?? h.source,
        TRIGGER_LABEL[h.trigger] ?? h.trigger,
        h.note ?? '',
      ]);
    });
    rewardRows.push([]);
    rewardRows.push(['合计', result.rewardsTotal ?? 0, '', '', '', '']);

    const wsReward = XLSX.utils.aoa_to_sheet(rewardRows);
    wsReward['!cols'] = [
      { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 30 },
    ];

    const range = XLSX.utils.decode_range(wsReward['!ref'] || 'A1');
    for (let R = 0; R <= range.e.r; R++) {
      const typeAddr = XLSX.utils.encode_cell({ r: R, c: 2 });
      const typeCell = wsReward[typeAddr];
      if (typeCell && typeCell.v === '扣款') {
        for (let C = 0; C <= 5; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (wsReward[addr]) wsReward[addr].s = RED_FONT;
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, wsReward, '奖金明细');
  }

  /* ============== Sheet 3：消课明细（课提） ============== */
  const details = result.classMemberDetail || [];
  if (details.length > 0) {
    const rates = result.courseCommissionRates || {};
    const classCommissionDetail = result.classCommissionDetail || {};

    const grouped: Record<
      string,
      Array<{
        memberName: string;
        memberId?: string;
        signNum: number;
        price: number;
        amount: number;
        mode?: 'percent' | 'fixed';
        value?: number;
        _globalIdx: number;
      }>
    > = {};

    details.forEach((d, globalIdx) => {
      if (!grouped[d.courseName]) grouped[d.courseName] = [];
      grouped[d.courseName].push({
        memberName: d.memberName,
        memberId: d.memberId,
        signNum: d.signNum,
        price: d.price,
        amount: d.amount,
        mode: d.mode,
        value: d.value,
        _globalIdx: globalIdx,
      });
    });

    const detailRows: any[][] = [
      ['课程名称', '会员姓名', '会员ID', '消课节数', '单价', '金额', '课提方式', '课提金额', '是否自定义'],
    ];

    let grandCount = 0;
    let grandAmount = 0;
    let grandCommission = 0;

    Object.entries(grouped).forEach(([course, list]) => {
      const fallbackRate = rates[course];
      let groupCount = 0;
      let groupAmount = 0;
      let groupCommission = 0;

      list.forEach((row) => {
        const custom = row.mode != null && row.value != null;
        const mode = row.mode ?? fallbackRate?.mode ?? 'percent';
        const value = row.value ?? fallbackRate?.rate ?? 0;
        const fee =
          mode === 'percent' ? row.amount * value : row.signNum * value;

        groupCount += row.signNum;
        groupAmount += row.amount;
        groupCommission += fee;

        detailRows.push([
          course,
          row.memberName,
          row.memberId ?? '',
          row.signNum,
          row.price,
          row.amount,
          mode === 'percent'
            ? `${(value * 100).toFixed(2)}%`
            : `${value.toFixed(2)} 元/节`,
          Number(fee.toFixed(2)),
          custom ? '是' : '否',
        ]);
      });

      detailRows.push([
        `${course} 小计`,
        '',
        '',
        groupCount,
        '',
        Number(groupAmount.toFixed(2)),
        '',
        Number((classCommissionDetail[course] ?? groupCommission).toFixed(2)),
        '',
      ]);
      detailRows.push([]);

      grandCount += groupCount;
      grandAmount += groupAmount;
      grandCommission += classCommissionDetail[course] ?? groupCommission;
    });

    detailRows.push([
      '总计',
      '',
      '',
      grandCount,
      '',
      Number(grandAmount.toFixed(2)),
      '',
      Number(grandCommission.toFixed(2)),
      '',
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
    ws2['!cols'] = [
      { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, '消课明细');
  }

  /* ============== Sheet 4：销售明细 ============== */
  try {
    /* ⭐ 优先用 result.salesDetail；为空时回退实时拉取 */
    let salesList: SalesMemberDetail[] = result.salesDetail || [];
    if (salesList.length === 0) {
      salesList = await fetchSalesDetailFallback(result, storeId, month);
    }

    if (salesList.length > 0) {
      const isAggregated = salesList.some(
        (d) => d.sourceStaffId && d.sourceStaffId !== result.staffId
      );

      const rows: any[][] = [];

      /* 表头 */
      const header = isAggregated
        ? ['来源员工', '会员名', '卡种', '收款方式', '业绩归属', '卡金额', '本人业绩', '提点方式', '销提金额', '是否自定义', '日期']
        : ['会员名', '卡种', '收款方式', '业绩归属', '卡金额', '本人业绩', '提点方式', '销提金额', '是否自定义', '日期'];
      rows.push(header);

      let totalCardAmount = 0;
      let totalPerformance = 0;
      let totalCommission = 0;

      const paySummary = new Map<string, { pay_type: string; amount: number }>();

      salesList.forEach((d) => {
        const custom = d.mode != null && d.value != null;
        const mode = d.mode ?? 'percent';
        const value = d.value ?? result.hitCommissionRate ?? 0;
        const fee = mode === 'percent' ? d.amount * value : value;

        totalCardAmount += d.cardAmount;
        totalPerformance += d.amount;
        totalCommission += fee;

        (d.payDetail || []).forEach((p) => {
          const key = String(p.pay_type_id || p.pay_type);
          const cur = paySummary.get(key);
          const amt = Number(p.amount) || 0;
          if (cur) cur.amount += amt;
          else paySummary.set(key, { pay_type: p.pay_type, amount: amt });
        });

        const rateStr =
          mode === 'percent'
            ? `${(value * 100).toFixed(2)}%`
            : `${value.toFixed(2)} 元`;

        const baseRow = [
          d.memberName || '',
          d.cardName || '',
          formatPayDetail(d.payDetail),
          formatMarketers(d.marketers),
          Number(d.cardAmount.toFixed(2)),
          Number(d.amount.toFixed(2)),
          rateStr,
          Number(fee.toFixed(2)),
          custom ? '是' : '否',
          d.dealTime || '',
        ];

        if (isAggregated) {
          rows.push([d.sourceStaffName || d.sourceStaffId || '', ...baseRow]);
        } else {
          rows.push(baseRow);
        }
      });

      /* 合计行 */
      const totalRow = isAggregated
        ? ['合计', '', '', '', '', Number(totalCardAmount.toFixed(2)), Number(totalPerformance.toFixed(2)), '', Number(totalCommission.toFixed(2)), '', '']
        : ['合计', '', '', '', Number(totalCardAmount.toFixed(2)), Number(totalPerformance.toFixed(2)), '', Number(totalCommission.toFixed(2)), '', ''];
      rows.push(totalRow);

      /* 收款方式汇总 */
      rows.push([]);
      rows.push(['收款方式汇总']);
      paySummary.forEach((v) => {
        rows.push([v.pay_type, Number(v.amount.toFixed(2))]);
      });

      const wsSales = XLSX.utils.aoa_to_sheet(rows);
      wsSales['!cols'] = isAggregated
        ? [
            { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 28 }, { wch: 40 },
            { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
          ]
        : [
            { wch: 14 }, { wch: 20 }, { wch: 28 }, { wch: 40 },
            { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
          ];

      /* ⭐ 自动换行 */
      const wrapCols = isAggregated ? ['C', 'D', 'E'] : ['B', 'C', 'D'];
      const range = XLSX.utils.decode_range(wsSales['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; R++) {
        wrapCols.forEach((col) => {
          const addr = `${col}${R + 1}`;
          const cell = wsSales[addr];
          if (!cell) return;
          cell.s = {
            ...(cell.s || {}),
            alignment: { wrapText: true, vertical: 'top' },
          };
        });
      }

      XLSX.utils.book_append_sheet(wb, wsSales, '销售明细');
    }
  } catch (e) {
    console.warn('[export] 拉销售明细失败，跳过', e);
  }

  /* ============== Sheet 5：课提汇总 ============== */
  if (
    result.classCommissionDetail &&
    Object.keys(result.classCommissionDetail).length > 0
  ) {
    const detailRows: any[][] = [['课程', '课提金额']];
    Object.entries(result.classCommissionDetail).forEach(([course, fee]) => {
      detailRows.push([course, fee]);
    });
    detailRows.push(['合计', result.classCommission]);
    const ws3 = XLSX.utils.aoa_to_sheet(detailRows);
    ws3['!cols'] = [{ wch: 24 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws3, '课提汇总');
  }

  /* ============== Sheet 6：岗位配置 ============== */
  const pos = plan.positions.find((p) => p.title === result.positionTitle);
  if (pos) {
    const cfgRows: any[][] = [['配置项', '值']];
    cfgRows.push(['岗位', pos.title]);
    cfgRows.push(['底薪阶梯', '']);
    (pos.baseSalaryTiers || []).forEach((t) => {
      cfgRows.push([`  门槛 ${t.threshold}`, t.amount]);
    });
    cfgRows.push(['销提阶梯', '']);
    (pos.commissionTiers || []).forEach((t) => {
      cfgRows.push([`  门槛 ${t.threshold}`, `${(t.rate * 100).toFixed(2)}%`]);
    });
    cfgRows.push(['性别底薪阶梯', '']);
    (pos.genderSalaryTiers || []).forEach((t) => {
      cfgRows.push([
        `  门槛 ${t.threshold}`,
        `男 ${t.male ?? 0} / 女 ${t.female ?? 0} / 新人 ${t.newbie ?? 0}`,
      ]);
    });
    if (pos.oldClassFees && pos.oldClassFees.length > 0) {
      cfgRows.push(['老课费用（按档位）', '']);
      pos.oldClassFees.forEach((f) => {
        cfgRows.push([`  门槛 ${f.threshold}`, `${f.fee} 元/节`]);
      });
    } else if (pos.oldClassFee !== undefined) {
      cfgRows.push(['老课费用', `${pos.oldClassFee} 元/节`]);
    }

    if (pos.rewards && pos.rewards.length > 0) {
      cfgRows.push(['职位奖金 / 扣款', '']);
      pos.rewards.forEach((ref) => {
        cfgRows.push([`  ID`, ref.rewardId]);
      });
    }

    if (plan.departmentRewards) {
      const deptKey = dept as '会籍' | '私教' | '泳教' | '运营';
      const list = plan.departmentRewards[deptKey];
      if (list && list.length > 0) {
        cfgRows.push([`部门奖金 / 扣款（${dept}）`, '']);
        list.forEach((ref) => {
          cfgRows.push([`  ID`, ref.rewardId]);
        });
      }
    }

    const tempRewards =
      plan.tempRewards?.[String(result.staffId)] || [];
    if (tempRewards.length > 0) {
      cfgRows.push(['临时奖金 / 扣款', '']);
      tempRewards.forEach((t) => {
        const isDeduction = t.type === 'deduction';
        cfgRows.push([
          `  ${t.name}`,
          `${isDeduction ? '-' : '+'}¥${Math.abs(t.amount)}${t.note ? ' · ' + t.note : ''}`,
        ]);
      });
    }

    const ws4 = XLSX.utils.aoa_to_sheet(cfgRows);
    ws4['!cols'] = [{ wch: 24 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws4, '岗位配置');
  }

  const fileName = `${result.staffName || '员工'}_${month}_薪酬计算过程.xlsx`;
  XLSX.writeFile(wb, fileName);
}