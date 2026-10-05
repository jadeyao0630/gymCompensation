import * as XLSX from 'xlsx';
import type { FinancialFlowItem, FrontMoneyItem } from '../../../api/stats';
import {
  aggregateOrders,
  aggregateFrontMoney,
  getBusinessTypeLabel,
} from './aggregate';

interface ExportArgs {
  storeName: string;
  beginDate: string;
  endDate: string;
  list: FinancialFlowItem[];
  frontMoneyList: FrontMoneyItem[];
}

export function exportMarketingExcel({
  storeName,
  beginDate,
  endDate,
  list,
  frontMoneyList,
}: ExportArgs) {
  const summary = aggregateOrders(list);
  const frontMoneySummary = aggregateFrontMoney(frontMoneyList);

  const wb = XLSX.utils.book_new();

  /* ---------- 汇总 ---------- */
  const summaryRows: any[][] = [
    ['营销收入报告'],
    ['门店', storeName],
    ['日期范围', `${beginDate} ~ ${endDate}`],
    ['导出时间', new Date().toLocaleString()],
    [],
    ['— 销售订单 —', ''],
    ['订单总数', summary.totalCount],
    ['卡金额合计', summary.totalCardAmount],
    ['实收金额合计', summary.totalIncomeAmount],
    ['押金支付合计', summary.totalPrePayment],
  ];

  if (frontMoneyList.length > 0) {
    summaryRows.push(
      [],
      ['— 定金/押金 —', ''],
      ['定金笔数', frontMoneySummary.totalCount],
      ['定金金额合计', frontMoneySummary.totalAmount],
      ['  已启用笔数', frontMoneySummary.startUsingCount],
      ['  已启用金额', frontMoneySummary.startUsingAmount],
      ['  未启用笔数', frontMoneySummary.notStartCount],
      ['  未启用金额', frontMoneySummary.notStartAmount],
      ['  已退款笔数', frontMoneySummary.drawbackCount],
      ['  已退款金额', frontMoneySummary.drawbackAmount]
    );
  }

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{ wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, '汇总');

  /* ---------- 卡种细分 ---------- */
  const cardRows: any[][] = [
    ['业务类型', '卡种', '数量', '卡金额', '实收金额'],
  ];
  summary.cards.forEach((c) => {
    cardRows.push([c.label, c.cardName, c.count, c.cardAmount, c.incomeAmount]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(cardRows);
  ws3['!cols'] = [
    { wch: 20 }, { wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, '卡种细分');

  /* ---------- 收款方式 ---------- */
  const payRows: any[][] = [['收款方式', '金额']];
  summary.payTypes.forEach((p) => payRows.push([p.payType, p.amount]));
  const ws4 = XLSX.utils.aoa_to_sheet(payRows);
  ws4['!cols'] = [{ wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws4, '收款方式');

  /* ---------- 订单明细 ---------- */
  const detailRows: any[][] = [
    [
      '日期', '会员名', '卡名', '备注', '类型',
      '收款方式 / 押金', '业绩归属', '卡金额', '实收',
    ],
  ];
  list.forEach((item) => {
    const label = getBusinessTypeLabel(item);
    const payParts = (item.pay_detail || []).map(
      (p) => `${p.pay_type} ¥${p.amount}`
    );
    const prePayment = Number(item.pre_payment || 0);
    if (prePayment > 0) payParts.push(`[押金] ¥${prePayment}`);

    detailRows.push([
      item.deal_time || '',
      item.username || '',
      item.card_name || '',
      item.remark || '',
      label,
      payParts.join(' + '),
      (item.marketers_detail || [])
        .map((m) => `${m.name}[${m.role}] ${m.percent} ¥${m.amount}`)
        .join('\n'),
      Number(item.amount || 0),
      Number(item.income_amount || item.amount || 0),
    ]);
  });
  const ws5 = XLSX.utils.aoa_to_sheet(detailRows);
  ws5['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
    { wch: 18 }, { wch: 32 }, { wch: 32 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws5, '订单明细');

  /* ---------- 定金明细 ---------- */
  if (frontMoneyList.length > 0) {
    const fmRows: any[][] = [
      [
        '日期', '会员名', '手机', '金额', '状态',
        '收款方式', '收款人', '启用时间', '退款时间', '描述',
      ],
    ];
    frontMoneyList.forEach((it) => {
      const isRefund = Number(it.refund_time || 0) > 0;
      const statusText = isRefund
        ? '已退款'
        : it.status === '1'
        ? '已启用'
        : '未启用';

      fmRows.push([
        it.date || it.create_time || '',
        it.username || '',
        it.phone || '',
        Number(it.amount || 0),
        statusText,
        it.pay_type_name || '',
        it.marketers_name || '',
        it.start_refund_date || '',
        isRefund ? new Date(Number(it.refund_time) * 1000).toLocaleString() : '',
        it.description || '',
      ]);
    });
    fmRows.push([
      '合计', '', '',
      frontMoneySummary.totalAmount,
      `${frontMoneySummary.totalCount} 笔`,
      '', '', '', '', '',
    ]);
    const ws6 = XLSX.utils.aoa_to_sheet(fmRows);
    ws6['!cols'] = [
      { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, ws6, '定金明细');
  }

  const safeName = storeName.replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, `${safeName}_营销收入_${beginDate}_${endDate}.xlsx`);
}