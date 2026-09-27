import * as XLSX from 'xlsx';
import type { PayrollResult, Department } from './payroll';
import type { MonthlyCompensationPlan } from '../types/compensation';
import { getDepartmentOf, calcDepartmentStats } from './payroll';

interface ExportOptions {
  allResults: PayrollResult[];
  excludedSet: Set<string>;
  plan?: MonthlyCompensationPlan;
  month: string;
  storeName: string;
}

/**
 * 导出薪酬佣金计算整表为 Excel
 * Sheet: 汇总 / 全部员工 / 按部门 / 部门汇总
 */
export function exportPayrollTableToExcel({
  allResults,
  excludedSet,
  plan,
  month,
  storeName,
}: ExportOptions) {
  const wb = XLSX.utils.book_new();

  /* ---------- 过滤出计入的员工 ---------- */
  const included = allResults.filter((r) => !excludedSet.has(r.staffId));

  /* ---------- 总汇总 ---------- */
  const summary = included.reduce(
    (acc, r) => ({
      headcount: acc.headcount + 1,
      baseSalary: acc.baseSalary + r.baseSalary,
      salesCommission: acc.salesCommission + r.salesCommission,
      classCommission: acc.classCommission + r.classCommission,
      total: acc.total + r.total,
    }),
    { headcount: 0, baseSalary: 0, salesCommission: 0, classCommission: 0, total: 0 }
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
    ['总计', summary.total],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{ wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, '汇总');

  /* ============== Sheet 2：全部员工 ============== */
  const allHeader = [
    '序号', '姓名', '电话', '岗位', '部门',
    '计入', '全勤', '缺勤天数',
    '销售金额', '消课节数', '消课金额',
    '底薪', '销提', '课提', '合计',
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
      r.total,
    ]);
  });

  /* 表尾合计 */
  allRows.push([
    '', '合计（计入 ' + summary.headcount + ' 人）', '', '', '', '', '', '',
    '', '', '',
    summary.baseSalary,
    summary.salesCommission,
    summary.classCommission,
    summary.total,
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet(allRows);
  ws2['!cols'] = [
    { wch: 6 },  // 序号
    { wch: 12 }, // 姓名
    { wch: 14 }, // 电话
    { wch: 12 }, // 岗位
    { wch: 8 },  // 部门
    { wch: 6 },  // 计入
    { wch: 6 },  // 全勤
    { wch: 8 },  // 缺勤天数
    { wch: 12 }, // 销售金额
    { wch: 10 }, // 消课节数
    { wch: 12 }, // 消课金额
    { wch: 10 }, // 底薪
    { wch: 10 }, // 销提
    { wch: 10 }, // 课提
    { wch: 12 }, // 合计
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '全部员工');

  /* ============== Sheet 3：按部门 ============== */
  const deptStats = calcDepartmentStats(included, plan);
  const deptRows: any[][] = [];

  deptStats.forEach((d) => {
    /* 部门标题行 */
    deptRows.push([
      `【${d.department}】  人数：${d.headcount}  底薪：${d.baseSalary}  销提：${d.salesCommission}  课提：${d.classCommission}  总计：${d.total}`,
    ]);
    deptRows.push([
      '姓名', '电话', '岗位', '计入', '全勤', '缺勤天数',
      '销售金额', '消课节数', '消课金额',
      '底薪', '销提', '课提', '合计',
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
        r.total,
      ]);
    });

    /* 部门小计 */
    deptRows.push([
      '小计', '', '', '', '', '',
      d.salesAmount,
      d.classCount,
      d.classAmount,
      d.baseSalary,
      d.salesCommission,
      d.classCommission,
      d.total,
    ]);
    deptRows.push([]); // 空行分隔
  });

  const ws3 = XLSX.utils.aoa_to_sheet(deptRows);
  ws3['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 6 }, { wch: 6 }, { wch: 8 },
    { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, '按部门');

  /* ============== Sheet 4：部门汇总 ============== */
  const deptSummaryRows: any[][] = [
    ['部门', '人数', '销售金额', '消课节数', '消课金额', '底薪', '销提', '课提', '总计'],
  ];
  deptStats.forEach((d) => {
    deptSummaryRows.push([
      d.department,
      d.headcount,
      d.salesAmount,
      d.classCount,
      d.classAmount,
      d.baseSalary,
      d.salesCommission,
      d.classCommission,
      d.total,
    ]);
  });
  /* 合计 */
  deptSummaryRows.push([
    '合计',
    deptStats.reduce((s, d) => s + d.headcount, 0),
    deptStats.reduce((s, d) => s + d.salesAmount, 0),
    deptStats.reduce((s, d) => s + d.classCount, 0),
    deptStats.reduce((s, d) => s + d.classAmount, 0),
    deptStats.reduce((s, d) => s + d.baseSalary, 0),
    deptStats.reduce((s, d) => s + d.salesCommission, 0),
    deptStats.reduce((s, d) => s + d.classCommission, 0),
    deptStats.reduce((s, d) => s + d.total, 0),
  ]);

  const ws4 = XLSX.utils.aoa_to_sheet(deptSummaryRows);
  ws4['!cols'] = [
    { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws4, '部门汇总');

  /* ---------- 下载 ---------- */
  const safeName = storeName.replace(/[\\/:*?"<>|]/g, '_');
  const fileName = `${safeName}_${month}_薪酬佣金计算.xlsx`;
  XLSX.writeFile(wb, fileName);
}