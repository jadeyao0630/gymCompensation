import * as XLSX from 'xlsx';
import type { PayrollResult } from './payroll';
import type { MonthlyCompensationPlan } from '../types/compensation';
import { getDepartmentOf } from './payroll';

export function exportEmployeePayrollToExcel(
  result: PayrollResult,
  plan: MonthlyCompensationPlan,
  month: string
) {
  const wb = XLSX.utils.book_new();
  const dept = getDepartmentOf(result.positionTitle);
  const isCoach = dept === '泳教' || dept === '私教';
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
    summaryRows.push(['合计', result.total]);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{ wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, '汇总');

  /* ============== Sheet 2：上课明细（泳教 / 私教） ============== */
  if (isCoach && result.classMemberDetail && result.classMemberDetail.length > 0) {
    const detailRows: any[][] = [
      ['课程名称', '会员姓名', '会员ID', '消课节数', '单价', '金额'],
    ];
    result.classMemberDetail.forEach((d) => {
      detailRows.push([
        d.courseName,
        d.memberName,
        d.memberId,
        d.signNum,
        d.price,
        d.amount,
      ]);
    });
    detailRows.push([
      '合计',
      '',
      '',
      result.classMemberDetail.reduce((s, d) => s + d.signNum, 0),
      '',
      result.classMemberDetail.reduce((s, d) => s + d.amount, 0),
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
    ws2['!cols'] = [
      { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, '上课明细');
  }

  /* ============== Sheet 3：课提明细 ============== */
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
    XLSX.utils.book_append_sheet(wb, ws3, '课提明细');
  }

  /* ============== Sheet 4：岗位配置 ============== */
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
    const ws4 = XLSX.utils.aoa_to_sheet(cfgRows);
    ws4['!cols'] = [{ wch: 24 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws4, '岗位配置');
  }

  const fileName = `${result.staffName || '员工'}_${month}_薪酬计算过程.xlsx`;
  XLSX.writeFile(wb, fileName);
}