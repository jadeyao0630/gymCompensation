import * as XLSX from 'xlsx-js-style';
import type { PayrollResult } from './payroll';
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
  manual: '手动勾选',
};

const RED_FONT = { font: { color: { rgb: 'C00000' } } };

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

  /* ⭐ 奖金/扣款合计行负数标红 */
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

  /* ⭐ 明细区每行扣款标红 */
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

    /* ⭐ 标红扣款行 */
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

  /* ============== Sheet 3：消课明细 ============== */
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
    const { begin_date, end_date } = getMonthRange(month);
    const saleId = needsSaleIdPrefix(result.positionTitle)
      ? `c${result.staffId}`
      : result.staffId;

    const { list } = await getCardOrderList({
      bus_id: storeId,
      sale_id: saleId,
      begin_date,
      end_date,
      page_no: 1,
      page_size: 1000,
    });

    if (list.length > 0) {
      const myName = (result.staffName || '').trim();

      const rows: any[][] = [
        ['会员名', '卡种', '收款方式', '业绩归属', '卡金额', '本人业绩', '日期'],
      ];

      let totalAmount = 0;
      let totalCardAmount = 0;

      const paySummary = new Map<
        string,
        { pay_type: string; amount: number }
      >();

      list.forEach((item) => {
        const hit = item.marketers_detail?.find(
          (m) => (m.name || '').trim() === myName
        );
        const performanceAmount = hit?.amount ? Number(hit.amount) : 0;
        totalAmount += performanceAmount;
        totalCardAmount += Number(item.amount || 0);

        (item.pay_detail || []).forEach((p) => {
          const key = String(p.pay_type_id || p.pay_type);
          const cur = paySummary.get(key);
          const amt = Number(p.amount) || 0;
          if (cur) cur.amount += amt;
          else paySummary.set(key, { pay_type: p.pay_type, amount: amt });
        });

        rows.push([
          item.username || '',
          item.card_name || '',
          formatPayDetail(item.pay_detail),
          formatMarketers(item.marketers_detail),
          Number(item.amount || 0),
          performanceAmount,
          item.deal_time || '',
        ]);
      });

      rows.push([
        '合计', '', '', '',
        Number(totalCardAmount.toFixed(2)),
        Number(totalAmount.toFixed(2)),
        '',
      ]);

      rows.push([]);
      rows.push(['收款方式汇总', '', '', '', '', '', '']);
      paySummary.forEach((v) => {
        rows.push([v.pay_type, '', '', '', '', Number(v.amount.toFixed(2)), '']);
      });

      const wsSales = XLSX.utils.aoa_to_sheet(rows);
      wsSales['!cols'] = [
        { wch: 14 }, { wch: 20 }, { wch: 28 }, { wch: 40 },
        { wch: 12 }, { wch: 12 }, { wch: 18 },
      ];

      const wrapCols = ['C', 'D'];
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
    const staffRefs = plan.staffRewards?.[result.staffId];
    if (staffRefs && staffRefs.length > 0) {
      cfgRows.push(['个人奖金 / 扣款', '']);
      staffRefs.forEach((ref) => {
        cfgRows.push([`  ID`, ref.rewardId]);
      });
    }

    const ws4 = XLSX.utils.aoa_to_sheet(cfgRows);
    ws4['!cols'] = [{ wch: 24 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws4, '岗位配置');
  }

  const fileName = `${result.staffName || '员工'}_${month}_薪酬计算过程.xlsx`;
  XLSX.writeFile(wb, fileName);
}