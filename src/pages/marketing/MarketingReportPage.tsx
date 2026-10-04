import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarChart3, Loader2, AlertCircle, Download, Wallet, ChevronRight,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import StoreSwitcher from '../../components/StoreSwitcher';
import StoreStatusBadge from '../../components/StoreStatusBadge';
import NavButtons from '../../components/NavButtons';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { getStoreById } from '../../constants/stores';
import {
  getCardOrderList,
  getFrontMoneyList,
  type FinancialFlowItem,
  type FrontMoneyItem,
} from '../../api/stats';
import {
  aggregateOrders,
  aggregateFrontMoney,
  fmtDate,
  getMonthRange,
  getLastMonth,
  getBusinessTypeLabel,
} from './utils/aggregate';
import { DateRangePicker } from './components/DateRangePicker';
import { SummaryCards } from './components/SummaryCards';
// import { TypeBreakdown } from './components/TypeBreakdown';   // 按业务类型板块已隐藏
import { CardBreakdown } from './components/CardBreakdown';
import { PayTypeBreakdown } from './components/PayTypeBreakdown';
import { MarketerBreakdown } from './components/MarketerBreakdown';
import { OrderDetailTable } from './components/OrderDetailTable';
import { FrontMoneyDialog } from './components/FrontMoneyDialog';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

type FrontMoneyFilter = 'all' | 'startUsing' | 'notStart' | 'drawback';

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
  const [frontMoneyList, setFrontMoneyList] = useState<FrontMoneyItem[]>([]);

  const [fmDialog, setFmDialog] = useState<{
    open: boolean;
    filter: FrontMoneyFilter;
    title: string;
  }>({ open: false, filter: 'all', title: '' });

  const openFmDialog = (filter: FrontMoneyFilter, title: string) => {
    setFmDialog({ open: true, filter, title });
  };

  const closeFmDialog = () => {
    setFmDialog((prev) => ({ ...prev, open: false }));
  };

  const fetchData = useCallback(
    async (begin: string, end: string) => {
      if (!storeId || !begin || !end) return;
      setLoading(true);
      setError('');
      try {
        const [orderRes, frontMoneyRes] = await Promise.all([
          getCardOrderList({
            bus_id: storeId,
            sale_id: '',
            begin_date: begin,
            end_date: end,
            page_no: 1,
            page_size: 2000,
          }).catch((e) => {
            console.warn('[MarketingReport] 拉订单失败', e);
            return { list: [], totalAmount: 0 };
          }),
          getFrontMoneyList({
            bus_id: storeId,
            s_date: begin,
            e_date: end,
            page_no: 1,
            page_size: 1000,
          }).catch((e) => {
            console.warn('[MarketingReport] 拉定金失败', e);
            return { list: [], count: 0 };
          }),
        ]);

        setList(orderRes.list || []);
        setFrontMoneyList(frontMoneyRes.list || []);
      } catch (e: any) {
        console.error('[MarketingReport] 加载失败', e);
        setError(e?.response?.data?.errormsg || e?.message || '加载数据失败');
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    fetchData(beginDate, endDate);
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
    fetchData(begin, end);
  };

  const handleDateChange = (b: string, e: string) => {
    setBeginDate(b);
    setEndDate(e);
  };

  const handleRefresh = () => {
    fetchData(beginDate, endDate);
  };

  const summary = useMemo(() => aggregateOrders(list), [list]);
  const frontMoneySummary = useMemo(
    () => aggregateFrontMoney(frontMoneyList),
    [frontMoneyList]
  );

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

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

    const payRows: any[][] = [['收款方式', '金额']];
    summary.payTypes.forEach((p) => payRows.push([p.payType, p.amount]));
    const ws4 = XLSX.utils.aoa_to_sheet(payRows);
    ws4['!cols'] = [{ wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws4, '收款方式');

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
          <div className="relative">
            <div className="flex items-start justify-between flex-wrap gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold tracking-widest uppercase">
                    Marketing Report
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                  营销收入报告
                </h1>
                <p className="text-sm text-indigo-100/90 mt-3 max-w-md leading-relaxed">
                  汇总订单销售 + 定金/押金，按类型、卡种、收款方式分析
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-white/90 rounded-2xl px-5 py-2.5 shadow-lg transition disabled:opacity-50 font-semibold text-sm"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 加载中…</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> 刷新</>
                  )}
                </button>

                <button
                  onClick={handleExport}
                  disabled={list.length === 0 && frontMoneyList.length === 0}
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">导出 Excel</span>
                </button>
              </div>
            </div>

            {/* ⭐ 底部：页面切换按钮 */}
            <div className="mt-6">
              <NavButtons active="marketing" />
            </div>
          </div>
        </div>

        {/* 顶部工具行：只剩门店 + 连接状态 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StoreSwitcher />
          <StoreStatusBadge
            dbOnline={true}
            saveStatus="idle"
            lastSavedAt={null}
          />
        </div>

        <DateRangePicker
          beginDate={beginDate}
          endDate={endDate}
          loading={loading}
          onChange={handleDateChange}
          onQuick={handleQuick}
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

            {frontMoneyList.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-500" />
                    定金 / 押金汇总
                  </h3>
                  <span className="text-xs text-gray-400">点击卡片查看明细</span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => openFmDialog('all', '定金 / 押金明细')}
                    className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-left transition hover:border-amber-300 hover:shadow-md active:scale-[0.98] group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-amber-600">
                        定金金额合计（{frontMoneySummary.totalCount} 笔）
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="text-xl font-bold text-amber-700 tabular-nums">
                      {fmtMoney(frontMoneySummary.totalAmount)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openFmDialog('startUsing', '已启用定金明细')}
                    className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-left transition hover:border-emerald-300 hover:shadow-md active:scale-[0.98] group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-emerald-600">
                        已启用（{frontMoneySummary.startUsingCount} 笔）
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="text-xl font-bold text-emerald-700 tabular-nums">
                      {fmtMoney(frontMoneySummary.startUsingAmount)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openFmDialog('notStart', '未启用定金明细')}
                    className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-left transition hover:border-gray-300 hover:shadow-md active:scale-[0.98] group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-500">
                        未启用（{frontMoneySummary.notStartCount} 笔）
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="text-xl font-bold text-gray-700 tabular-nums">
                      {fmtMoney(frontMoneySummary.notStartAmount)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openFmDialog('drawback', '已退款定金明细')}
                    className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-left transition hover:border-rose-300 hover:shadow-md active:scale-[0.98] group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-rose-600">
                        已退款（{frontMoneySummary.drawbackCount} 笔）
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-rose-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="text-xl font-bold text-rose-700 tabular-nums">
                      {fmtMoney(frontMoneySummary.drawbackAmount)}
                    </div>
                  </button>
                </div>
              </div>
            )}

            <CardBreakdown summary={summary} />
            <PayTypeBreakdown summary={summary} />
            <MarketerBreakdown summary={summary} />
            <OrderDetailTable list={list} />

            {frontMoneyList.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">
                    定金 / 押金明细（{frontMoneyList.length} 笔）
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium">日期</th>
                        <th className="px-3 py-2.5 text-left font-medium">会员名</th>
                        <th className="px-3 py-2.5 text-left font-medium">手机</th>
                        <th className="px-3 py-2.5 text-right font-medium">金额</th>
                        <th className="px-3 py-2.5 text-center font-medium">状态</th>
                        <th className="px-3 py-2.5 text-left font-medium">收款方式</th>
                        <th className="px-3 py-2.5 text-left font-medium">收款人</th>
                        <th className="px-3 py-2.5 text-left font-medium">
                          启用/退款时间
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium">描述</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {frontMoneyList.map((it) => {
                        const isRefund = Number(it.refund_time || 0) > 0;
                        const statusText = isRefund
                          ? '已退款'
                          : it.status === '1'
                          ? '已启用'
                          : '未启用';
                        const statusCls = isRefund
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : it.status === '1'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200';

                        return (
                          <tr key={it.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                              {it.date || it.create_time || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {it.username || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-500 tabular-nums">
                              {it.phone || '—'}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-amber-700">
                              {fmtMoney(Number(it.amount || 0))}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] border ${statusCls}`}
                              >
                                {statusText}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {(it.new_pay_type || []).map((p, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  >
                                    {p.pay_type_name}
                                    <span className="font-medium tabular-nums">
                                      ¥{Number(p.amount).toLocaleString()}
                                    </span>
                                  </span>
                                ))}
                                {(!it.new_pay_type ||
                                  it.new_pay_type.length === 0) && (
                                  <span className="text-gray-300">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {it.marketers_name || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                              {it.start_refund_date || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              <span
                                className="inline-block max-w-[280px] truncate align-middle"
                                title={it.description}
                              >
                                {it.description || '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <FrontMoneyDialog
        open={fmDialog.open}
        onClose={closeFmDialog}
        title={fmDialog.title}
        filter={fmDialog.filter}
        list={frontMoneyList}
      />
    </div>
  );
};

export default MarketingReportPage;