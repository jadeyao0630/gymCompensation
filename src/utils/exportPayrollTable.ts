import * as XLSX from 'xlsx-js-style';
import type { PayrollResult } from './payroll';
import type { MonthlyCompensationPlan } from '../types/compensation';
import { getDepartmentOf, calcDepartmentStats } from './payroll';

interface ExportOptions {
  allResults: PayrollResult[];
  excludedSet: Set<string>;
  plan?: MonthlyCompensationPlan;
  month: string;
  storeName: string;
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

/* ⭐ 深红字体样式 */
const RED_FONT = { font: { color: { rgb: 'C00000' } } };
/* ⭐ 浅红背景 + 深红字体（用于整行） */
const RED_ROW_STYLE = {
  font: { color: { rgb: 'C00000' } },
  fill: { fgColor: { rgb: 'FEE2E2' } },
};

export function exportPayrollTableToExcel({
  allResults,
  excludedSet,
  plan,
  month,
  storeName,
}: ExportOptions) {
  const wb = XLSX.utils.book_new();

  const included = allResults.filter((r) => !excludedSet.has(r.staffId));

  const summary = included.reduce(
    (acc, r) => ({
      headcount: acc.headcount + 1,
      baseSalary: acc.baseSalary + r.baseSalary,
      salesCommission: acc.salesCommission + r.salesCommission,
      classCommission: acc.classCommission + r.classCommission,
      rewardsTotal: acc.rewardsTotal + (r.rewardsTotal ?? 0),
      total: acc.total + r.total,
    }),
    {
      headcount: 0,
      baseSalary: 0,
      salesCommission: 0,
      classCommission: 0,
      rewardsTotal: 0,
      total: 0,
    }
  );

  /* ============== Sheet 1：汇总 ============== */
  const summaryRows: any[][] = [
    ['薪酬佣金计算汇总'],
    ['门店', storeName],
    ['月份', month],
    ['导出时间', new Date().toLocaleString()],
    [],
    ['项目', '数值'],
    ['计算人数', summary.headcount],
    ['底薪合计', summary.baseSalary],
    ['销提合计', summary.salesCommission],
    ['课提合计', summary.classCommission],
    ['奖金 / 扣款合计', summary.rewardsTotal],
    ['总计', summary.total],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{ wch: 18 }, { wch: 18 }];

  /* ⭐ 「奖金/扣款合计」行，负数标红 */
  if (summary.rewardsTotal < 0) {
    const cellAddr = 'B11';
    if (ws1[cellAddr]) ws1[cellAddr].s = RED_FONT;
  }
  XLSX.utils.book_append_sheet(wb, ws1, '汇总');

  /* ============== Sheet 2：全部员工 ============== */
  const allHeader = [
    '序号', '姓名', '电话', '岗位', '部门',
    '计入', '全勤', '缺勤天数',
    '销售金额', '消课节数', '消课金额',
    '底薪', '销提', '课提',
    '奖金 / 扣款',
    '合计',
  ];
  const allRows: any[][] = [allHeader];

  allResults.forEach((r, i) => {
    const isIncluded = !excludedSet.has(r.staffId);
    allRows.push([
      i + 1,
      r.staffName || '',
      r.staffPhone || '',
      r.positionTitle || '',
      getDepartmentOf(r.positionTitle),
      isIncluded ? '是' : '否',
      r.fullAttendance ? '是' : '否',
      r.fullAttendance ? 0 : r.absentDays || 0,
      r.salesAmount,
      r.classCount,
      r.classAmount,
      r.baseSalary,
      r.salesCommission,
      r.classCommission,
      r.rewardsTotal ?? 0,
      r.total,
    ]);
  });

  allRows.push([
    '', '合计（计入 ' + summary.headcount + ' 人）', '', '', '', '', '', '',
    '', '', '',
    summary.baseSalary,
    summary.salesCommission,
    summary.classCommission,
    summary.rewardsTotal,
    summary.total,
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet(allRows);
  ws2['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
    { wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
  ];

  /* ⭐ 奖金列为负 → 红字 */
  const rewardColIdx = allHeader.indexOf('奖金 / 扣款');   // 14
  allResults.forEach((r, i) => {
    const rowIdx = i + 1;
    if ((r.rewardsTotal ?? 0) < 0 && rewardColIdx >= 0) {
      const addr = XLSX.utils.encode_cell({ r: rowIdx, c: rewardColIdx });
      if (ws2[addr]) ws2[addr].s = RED_FONT;
    }
  });
  /* 表尾奖金合计负数也标红 */
  if (summary.rewardsTotal < 0 && rewardColIdx >= 0) {
    const tailRowIdx = allRows.length - 1;
    const addr = XLSX.utils.encode_cell({ r: tailRowIdx, c: rewardColIdx });
    if (ws2[addr]) ws2[addr].s = RED_FONT;
  }

  XLSX.utils.book_append_sheet(wb, ws2, '全部员工');

  /* ============== Sheet 3：按部门 ============== */
  const deptStats = calcDepartmentStats(included, plan);
  const deptRows: any[][] = [];

  deptStats.forEach((d) => {
    const deptRewards = included
      .filter((r) => getDepartmentOf(r.positionTitle) === d.department)
      .reduce((s, r) => s + (r.rewardsTotal ?? 0), 0);

    deptRows.push([
      `【${d.department}】  人数：${d.headcount}  底薪：${d.baseSalary}  销提：${d.salesCommission}  课提：${d.classCommission}  奖金/扣款：${deptRewards}  总计：${d.total}`,
    ]);
    deptRows.push([
      '姓名', '电话', '岗位', '计入', '全勤', '缺勤天数',
      '销售金额', '消课节数', '消课金额',
      '底薪', '销提', '课提', '奖金 / 扣款', '合计',
    ]);

    const deptMembers = allResults.filter(
      (r) => getDepartmentOf(r.positionTitle) === d.department
    );
    deptMembers.forEach((r) => {
      const isIncluded = !excludedSet.has(r.staffId);
      deptRows.push([
        r.staffName || '',
        r.staffPhone || '',
        r.positionTitle || '',
        isIncluded ? '是' : '否',
        r.fullAttendance ? '是' : '否',
        r.fullAttendance ? 0 : r.absentDays || 0,
        r.salesAmount,
        r.classCount,
        r.classAmount,
        r.baseSalary,
        r.salesCommission,
        r.classCommission,
        r.rewardsTotal ?? 0,
        r.total,
      ]);
    });

    deptRows.push([
      '小计', '', '', '', '', '',
      d.salesAmount,
      d.classCount,
      d.classAmount,
      d.baseSalary,
      d.salesCommission,
      d.classCommission,
      deptRewards,
      d.total,
    ]);
    deptRows.push([]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(deptRows);
  ws3['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 6 }, { wch: 6 }, { wch: 8 },
    { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
  ];

  /* ⭐ 按部门 sheet 里，扫描 "奖金 / 扣款" 列（索引 12）的负数单元格标红 */
  const deptRewardColIdx = 12;
  const range3 = XLSX.utils.decode_range(ws3['!ref'] || 'A1');
  for (let R = range3.s.r; R <= range3.e.r; R++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: deptRewardColIdx });
    const cell = ws3[addr];
    if (cell && typeof cell.v === 'number' && cell.v < 0) {
      cell.s = RED_FONT;
    }
  }

  XLSX.utils.book_append_sheet(wb, ws3, '按部门');

  /* ============== Sheet 4：部门汇总 ============== */
  const deptSummaryRows: any[][] = [
    ['部门', '人数', '销售金额', '消课节数', '消课金额', '底薪', '销提', '课提', '奖金 / 扣款', '总计'],
  ];
  deptStats.forEach((d) => {
    const deptRewards = included
      .filter((r) => getDepartmentOf(r.positionTitle) === d.department)
      .reduce((s, r) => s + (r.rewardsTotal ?? 0), 0);
    deptSummaryRows.push([
      d.department,
      d.headcount,
      d.salesAmount,
      d.classCount,
      d.classAmount,
      d.baseSalary,
      d.salesCommission,
      d.classCommission,
      deptRewards,
      d.total,
    ]);
  });
  deptSummaryRows.push([
    '合计',
    deptStats.reduce((s, d) => s + d.headcount, 0),
    deptStats.reduce((s, d) => s + d.salesAmount, 0),
    deptStats.reduce((s, d) => s + d.classCount, 0),
    deptStats.reduce((s, d) => s + d.classAmount, 0),
    deptStats.reduce((s, d) => s + d.baseSalary, 0),
    deptStats.reduce((s, d) => s + d.salesCommission, 0),
    deptStats.reduce((s, d) => s + d.classCommission, 0),
    summary.rewardsTotal,
    deptStats.reduce((s, d) => s + d.total, 0),
  ]);

  const ws4 = XLSX.utils.aoa_to_sheet(deptSummaryRows);
  ws4['!cols'] = [
    { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
  ];
  /* ⭐ 部门汇总"奖金"列标红负数 */
  const deptSumRewardColIdx = 8;
  const range4 = XLSX.utils.decode_range(ws4['!ref'] || 'A1');
  for (let R = range4.s.r; R <= range4.e.r; R++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: deptSumRewardColIdx });
    const cell = ws4[addr];
    if (cell && typeof cell.v === 'number' && cell.v < 0) {
      cell.s = RED_FONT;
    }
  }
  XLSX.utils.book_append_sheet(wb, ws4, '部门汇总');

  /* ============== Sheet 5：奖金明细 ============== */
  const rewardRows: any[][] = [
    ['姓名', '部门', '名称', '金额', '类型', '来源', '触发方式', '备注'],
  ];

  let rewardDetailCount = 0;

  included.forEach((r) => {
    (r.rewards || []).forEach((h) => {
      const isDeduction = h.amount < 0 || h.type === 'deduction';
      rewardRows.push([
        r.staffName || '',
        getDepartmentOf(r.positionTitle),
        h.name,
        h.amount,
        isDeduction ? '扣款' : '奖励',
        SOURCE_LABEL[h.source] ?? h.source,
        TRIGGER_LABEL[h.trigger] ?? h.trigger,
        h.note ?? '',
      ]);
      rewardDetailCount++;
    });
  });

  rewardRows.push([]);
  rewardRows.push([
    '合计',
    '',
    `${rewardDetailCount} 条`,
    summary.rewardsTotal,
    '',
    '',
    '',
    '',
  ]);

  const ws5 = XLSX.utils.aoa_to_sheet(rewardRows);
  ws5['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 12 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 30 },
  ];

  /* ⭐ 奖金明细 sheet：扣款行（type 列 == '扣款'）整行标红 */
  const range5 = XLSX.utils.decode_range(ws5['!ref'] || 'A1');
  for (let R = 1; R <= range5.e.r; R++) {
    /* 类型列：索引 4（A=0, B=1, ..., E=4） */
    const typeAddr = XLSX.utils.encode_cell({ r: R, c: 4 });
    const typeCell = ws5[typeAddr];
    if (typeCell && typeCell.v === '扣款') {
      for (let C = 0; C <= 7; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws5[addr]) {
          ws5[addr].s = { font: { color: { rgb: 'C00000' } } };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws5, '奖金明细');

  const safeName = storeName.replace(/[\\/:*?"<>|]/g, '_');
  const fileName = `${safeName}_${month}_薪酬佣金计算.xlsx`;
  XLSX.writeFile(wb, fileName);
}