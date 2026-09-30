import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, Loader2, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import StoreSwitcher from '../../components/StoreSwitcher';
import NavButtons from '../../components/NavButtons';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { getStoreById } from '../../constants/stores';
import { getCardOrderList, type FinancialFlowItem } from '../../api/stats';
import {
  aggregateOrders,
  fmtDate,
  getMonthRange,
  getLastMonth,
  getBusinessTypeLabel,
} from './utils/aggregate';
import { DateRangePicker } from './components/DateRangePicker';
import { SummaryCards } from './components/SummaryCards';
import { TypeBreakdown } from './components/TypeBreakdown';
import { CardBreakdown } from './components/CardBreakdown';
import { PayTypeBreakdown } from './components/PayTypeBreakdown';
import { MarketerBreakdown } from './components/MarketerBreakdown';
import { OrderDetailTable } from './components/OrderDetailTable';

const MarketingReportPage: React.FC = () => {
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const canView = hasPermission('report:marketing:view', storeId);
  const storeName = getStoreById(storeId)?.name || '门店';

  const initialRange = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { begin, end } = getMonthRange(month);
    return { begin, end };
  }, []);

  const [beginDate, setBeginDate] = useState(initialRange.begin);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState<FinancialFlowItem[]>([]);

  const fetchData = useCallback(async () => {
    if (!storeId || !beginDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const res = await getCardOrderList({
        bus_id: storeId,
        sale_id: '',
        begin_date: beginDate,
        end_date: endDate,
        page_no: 1,
        page_size: 2000,
      });
      setList(res.list || []);
    } catch (e: any) {
      console.error('[MarketingReport] 加载失败', e);
      setError(e?.response?.data?.errormsg || e?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [storeId, beginDate, endDate]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const handleQuick = (range: string) => {
    const now = new Date();
    let begin = '';
    let end = fmtDate(now);

    switch (range) {
      case 'today':
        begin = fmtDate(now);
        break;
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        begin = fmtDate(d);
        break;
      }
      case 'month': {
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const r = getMonthRange(month);
        begin = r.begin;
        end = r.end;
        break;
      }
      case 'lastMonth': {
        const r = getMonthRange(getLastMonth());
        begin = r.begin;
        end = r.end;
        break;
      }
      case 'quarter': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 2);
        d.setDate(1);
        begin = fmtDate(d);
        break;
      }
    }

    setBeginDate(begin);
    setEndDate(end);
    setTimeout(() => fetchData(), 0);
  };

  const summary = useMemo(() => aggregateOrders(list), [list]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    /* Sheet 1：汇总（含押金支付合计） */
    const summaryRows: any[][] = [
      ['营销收入报告'],
      ['门店', storeName],
      ['日期范围', `${beginDate} ~ ${endDate}`],
      ['导出时间', new Date().toLocaleString()],
      [],
      ['项目', '数值'],
      ['订单总数', summary.totalCount],
      ['卡金额合计', summary.totalCardAmount],
      ['实收金额合计', summary.totalIncomeAmount],
      ['押金支付合计', summary.totalPrePayment],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1['!cols'] = [{ wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, '汇总');

    /* Sheet 2：按类型 */
    const typeRows: any[][] = [
      ['业务类型', '订单数', '卡金额', '实收金额'],
    ];
    summary.types.forEach((t) => {
      typeRows.push([t.label, t.count, t.cardAmount, t.incomeAmount]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(typeRows);
    ws2['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, '按类型');

    /* Sheet 3：卡种细分 */
    const cardRows: any[][] = [
      ['业务类型', '卡种', '数量', '卡金额', '实收金额'],
    ];
    summary.cards.forEach((c) => {
      cardRows.push([
        c.label,
        c.cardName,
        c.count,
        c.cardAmount,
        c.incomeAmount,
      ]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(cardRows);
    ws3['!cols'] = [
      { wch: 20 },
      { wch: 24 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, '卡种细分');

    /* Sheet 4：收款方式 */
    const payRows: any[][] = [['收款方式', '金额']];
    summary.payTypes.forEach((p) => payRows.push([p.payType, p.amount]));
    const ws4 = XLSX.utils.aoa_to_sheet(payRows);
    ws4['!cols'] = [{ wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws4, '收款方式');

    /* Sheet 5：订单明细（押金合并进"收款方式"列） */
    const detailRows: any[][] = [
      ['日期', '会员名', '卡名', '备注', '类型', '收款方式 / 押金', '业绩归属', '卡金额', '实收'],
    ];
    list.forEach((item) => {
      const label = getBusinessTypeLabel(item);

      /* 收款方式 + 押金合并 */
      const payParts = (item.pay_detail || []).map(
        (p) => `${p.pay_type} ¥${p.amount}`
      );
      const prePayment = Number(item.pre_payment || 0);
      if (prePayment > 0) {
        payParts.push(`[押金] ¥${prePayment}`);
      }

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
      { wch: 18 },  // 日期
      { wch: 12 },  // 会员名
      { wch: 20 },  // 卡名
      { wch: 30 },  // 备注
      { wch: 18 },  // 类型
      { wch: 32 },  // 收款方式 / 押金
      { wch: 32 },  // 业绩归属
      { wch: 12 },  // 卡金额
      { wch: 12 },  // 实收
    ];
    XLSX.utils.book_append_sheet(wb, ws5, '订单明细');

    const safeName = storeName.replace(/[\\/:*?"<>|]/g, '_');
    XLSX.writeFile(wb, `${safeName}_营销收入_${beginDate}_${endDate}.xlsx`);
  };

  if (!canView) {
    return <Navigate to="/no-permission" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 shadow-2xl shadow-indigo-500/20 p-8 sm:p-10 mb-8 text-white">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between flex-wrap gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold tracking-widest uppercase">
                  Marketing Report
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                营销收入报告
              </h1>
              <p className="text-sm text-indigo-100/90 mt-3 max-w-md">
                汇总指定时段内的购卡 / 购泳教 / 购私教订单，按类型、卡种、收款方式分析
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={list.length === 0}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">导出 Excel</span>
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StoreSwitcher />
          <div className="flex-1" />
          <NavButtons active="marketing" />
        </div>

        <DateRangePicker
          beginDate={beginDate}
          endDate={endDate}
          loading={loading}
          onChange={(b, e) => {
            setBeginDate(b);
            setEndDate(e);
          }}
          onQuick={handleQuick}
          onRefresh={fetchData}
        />

        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            加载数据中…
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <SummaryCards summary={summary} />
            <TypeBreakdown summary={summary} />
            <CardBreakdown summary={summary} />
            <PayTypeBreakdown summary={summary} />
            <MarketerBreakdown summary={summary} />
            <OrderDetailTable list={list} />
          </>
        )}
      </div>
    </div>
  );
};

export default MarketingReportPage;