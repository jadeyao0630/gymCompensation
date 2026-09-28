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

  /* ============== Sheet 2：消课明细（按课程分组 + 课提信息） ============== */
  const details = result.classMemberDetail || [];
  if (details.length > 0) {
    const rates = result.courseCommissionRates || {};
    const classCommissionDetail = result.classCommissionDetail || {};

    /* 按课程分组，同时记录原始全局索引（与 updateMemberCommission 对应） */
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

      /* 课程小计 */
      detailRows.push([
        `${course} 小计`,
        '',
        '',
        groupCount,
        '',
        Number(groupAmount.toFixed(2)),
        '',
        Number(
          (classCommissionDetail[course] ?? groupCommission).toFixed(2)
        ),
        '',
      ]);
      detailRows.push([]); // 组间空行

      grandCount += groupCount;
      grandAmount += groupAmount;
      grandCommission += classCommissionDetail[course] ?? groupCommission;
    });

    /* 总计 */
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
      { wch: 22 }, // 课程名称
      { wch: 14 }, // 会员姓名
      { wch: 14 }, // 会员ID
      { wch: 10 }, // 消课节数
      { wch: 10 }, // 单价
      { wch: 12 }, // 金额
      { wch: 14 }, // 课提方式
      { wch: 12 }, // 课提金额
      { wch: 12 }, // 是否自定义
    ];
    XLSX.utils.book_append_sheet(wb, ws2, '消课明细');
  }

  /* ============== Sheet 3：课提汇总（保留原来的按课程汇总） ============== */
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