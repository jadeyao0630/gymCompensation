import * as XLSX from 'xlsx';
import type { PayrollResult } from '../../../utils/payroll';
import type { FinancialFlowItem } from '../../../api/stats';
import {
  getCardAmount,
  getIncomeAmount,
  getPrePayment,
  type OverallSummary,
} from '../../marketing/utils/aggregate';
import type { FixedCostDetail } from '../hooks/useMonthlyReport';
import type { DingTalkReportItem } from '../../../api/dingtalk';
import { getStoreFromPaymentUnit } from '../../dingtalk/utils/constants';
import {
  extractAmount,
  extractItems,
  extractPayeeAccount,
} from '../../dingtalk/utils/extract';

interface ExportParams {
  storeName: string;
  month: string;
  payrollResults: PayrollResult[];
  payrollSummary: {
    headcount: number;
    baseSalary: number;
    salesCommission: number;
    classCommission: number;
    absentDeduction: number;
    total: number;
  };
  orderList: FinancialFlowItem[];
  marketingSummary: OverallSummary & {
    cardAmount: number;
    incomeAmount: number;
    prePayment: number;
  };
  fixedCost: number;
  fixedCostDetail: FixedCostDetail;
  profit: number;
  /* ⭐ 钉钉流程 */
  dingtalkItems?: DingTalkReportItem[];
}

export function exportMonthlyReport(params: ExportParams) {
  const {
    storeName,
    month,
    payrollResults,
    payrollSummary,
    orderList,
    marketingSummary,
    fixedCost,
    fixedCostDetail,
    profit,
    dingtalkItems = [],
  } = params;

  const wb = XLSX.utils.book_new();

  /* Sheet 1：经营总览 */
  const overview: any[][] = [
    ['月度经营综合报告'],
    ['门店', storeName],
    ['月份', month],
    ['导出时间', new Date().toLocaleString()],
    [],
    ['项目', '数值'],
    ['— 收入 —', ''],
    ['营销收入（实收）', marketingSummary.incomeAmount],
    ['押金支付', marketingSummary.prePayment],
    ['卡金额合计', marketingSummary.cardAmount],
    [],
    ['— 支出 —', ''],
    ['薪酬合计（底薪+销提+课提-缺勤）', payrollSummary.total],
    ['  底薪合计', payrollSummary.baseSalary],
    ['  销提合计', payrollSummary.salesCommission],
    ['  课提合计', payrollSummary.classCommission],
    ['  缺勤扣款', -payrollSummary.absentDeduction],
    ['固定成本合计', fixedCost],
    ['  物业费', fixedCostDetail.propertyFee],
    ['  电费', fixedCostDetail.electricityFee],
    ['  租金', fixedCostDetail.rent],
    ['  水费', fixedCostDetail.waterFee],
    ['  网络费', fixedCostDetail.networkFee],
    ['  其他杂项', fixedCostDetail.otherFee],
    [],
    ['— 利润 —', ''],
    ['净利润', profit],
    [
      '利润率',
      marketingSummary.incomeAmount > 0
        ? `${((profit / marketingSummary.incomeAmount) * 100).toFixed(2)}%`
        : '—',
    ],
    [],
    ['— 钉钉流程（仅参考） —', ''],
    ['钉钉流程笔数', dingtalkItems.length],
    [
      '钉钉流程金额',
      dingtalkItems.reduce(
        (s, r) =>
          s + (extractAmount(r.templateName || '', r.formValues || {}) || 0),
        0
      ),
    ],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(overview);
  ws1['!cols'] = [{ wch: 32 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, '经营总览');

  /* Sheet 2：薪酬明细 */
  const payRows: any[][] = [
    ['姓名', '岗位', '新人', '底薪', '销提', '课提', '缺勤扣款', '合计'],
  ];
  payrollResults.forEach((r) => {
    payRows.push([
      r.staffName || '',
      r.positionTitle || '',
      r.isNewbie ? '是' : '',
      r.baseSalary,
      r.salesCommission,
      r.classCommission,
      -r.absentDeduction,
      r.total,
    ]);
  });
  payRows.push([
    '合计',
    '',
    '',
    payrollSummary.baseSalary,
    payrollSummary.salesCommission,
    payrollSummary.classCommission,
    -payrollSummary.absentDeduction,
    payrollSummary.total,
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet(payRows);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 6 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '薪酬明细');

  /* Sheet 3：营销收入明细 */
  const mktRows: any[][] = [
    ['日期', '会员名', '卡名', '类型', '卡金额', '押金', '实收'],
  ];
  orderList.forEach((it) => {
    mktRows.push([
      it.deal_time || '',
      it.username || '',
      it.card_name || '',
      it.operate_type || '',
      getCardAmount(it),
      getPrePayment(it),
      getIncomeAmount(it),
    ]);
  });
  mktRows.push([
    '合计',
    '',
    '',
    '',
    marketingSummary.cardAmount,
    marketingSummary.prePayment,
    marketingSummary.incomeAmount,
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet(mktRows);
  ws3['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, '营销收入');

  /* Sheet 4：固定成本 */
  const costRows: any[][] = [
    ['项目', '金额'],
    ['物业费', fixedCostDetail.propertyFee],
    ['电费', fixedCostDetail.electricityFee],
    ['租金', fixedCostDetail.rent],
    ['水费', fixedCostDetail.waterFee],
    ['网络费', fixedCostDetail.networkFee],
    ['其他杂项', fixedCostDetail.otherFee],
    ['合计', fixedCost],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(costRows);
  ws4['!cols'] = [{ wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws4, '固定成本');

  /* ⭐ Sheet 5：钉钉流程 */
  const dtRows: any[][] = [
    ['流程类型', '门店', '付款单位', '标题', '事项', '金额', '收款账户', '状态', '创建时间', '完成时间'],
  ];
  dingtalkItems.forEach((r) => {
    dtRows.push([
      r.templateName || '',
      getStoreFromPaymentUnit(r.paymentUnit) || '',
      r.paymentUnit || '',
      r.title || '',
      extractItems(r.templateName || '', r.formValues || {}),
      extractAmount(r.templateName || '', r.formValues || {}) || 0,
      extractPayeeAccount(r.formValues || {}) || '',
      r.status || '',
      r.createTime || '',
      r.finishTime || '',
    ]);
  });
  if (dingtalkItems.length > 0) {
    dtRows.push([
      '合计',
      '',
      '',
      '',
      '',
      dingtalkItems.reduce(
        (s, r) =>
          s + (extractAmount(r.templateName || '', r.formValues || {}) || 0),
        0
      ),
      '',
      '',
      '',
      '',
    ]);
  }
  const ws5 = XLSX.utils.aoa_to_sheet(dtRows);
  ws5['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 36 }, { wch: 36 },
    { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws5, '钉钉流程');

  const safeName = storeName.replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, `${safeName}_${month}_月度经营报告.xlsx`);
}