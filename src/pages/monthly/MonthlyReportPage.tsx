import { fetchStores } from '../../utils/storeConfig';
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import StoreSwitcher from '../../components/layout/StoreSwitcher';
import StoreStatusBadge from '../../components/layout/StoreStatusBadge';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAppData } from '../../contexts/AppDataContext';
import { getStoreById } from '../../constants/stores';

import { useMonthlyReport } from './hooks/useMonthlyReport';
import { exportMonthlyReport } from './utils/exportExcel';
import {
  buildPayload,
  generateAiReport,
} from '../../services/monthlyReportApi';

import { MonthlyHeader } from './components/MonthlyHeader';
import { MonthlyEmptyState } from './components/MonthlyEmptyState';
import { MonthlySummaryCards } from './components/MonthlySummaryCards';
import { MonthlyDetailPanels } from './components/MonthlyDetailPanels';
import { MonthlyProfitPanel } from './components/MonthlyProfitPanel';
import { MonthlyCharts } from './components/MonthlyCharts';
import { MonthPicker } from '../../components/common/MonthPicker';
import { usePersistedMonth } from '../../hooks/usePersistedMonth';

const MonthlyReportPage: React.FC = () => {
  const { storeId } = useStore();
  const { hasPermission } = useAuth();
  const { data: appData, update: updateAppData } = useAppData();

  const canView = hasPermission('report:monthly:view', storeId);
  const storeName = getStoreById(storeId)?.name || '门店';

  const { month: selectedMonth, changeMonth } = usePersistedMonth(
    'monthly',
    storeId
  );

  const {
    hasLoaded,
    loading,
    error,
    payrollResults,
    orderList,
    fixedCost,
    fixedCostDetail,
    payrollSummary,
    marketingSummary,
    /* 两套利润 */
    estimatedProfit,
    actualProfit,
    isEstimatedProfit,
    /* 兼容旧字段 */
    profit,
    isProfit,
    fetchAll,
    /* 钉钉 */
    dingtalkItems,
    updateManualCategories,
    categorySaving,
    dingtalkSummary,
    dingtalkBreakdown,
    hasDingtalkData,
    /* 口径拆分 */
    estimatedExpense,
    actualExpense,
    adjustedPayroll,
    adjustedFixedCost,
  } = useMonthlyReport(storeId, selectedMonth);

  const aiCacheKey = `${storeId}_${selectedMonth}`;

  /* AI 报告：Context + localStorage */
  const aiReport = appData.monthlyAiReportByKey[aiCacheKey] || '';
  const setAiReport = (text: string) => {
    updateAppData('monthlyAiReportByKey', (prev) => ({
      ...prev,
      [aiCacheKey]: text,
    }));
  };

  /* 图表 payload：Context + localStorage */
  const aiPayload = appData.monthlyAiPayloadByKey[aiCacheKey] || null;
  const setAiPayload = (payload: any) => {
    updateAppData('monthlyAiPayloadByKey', (prev) => ({
      ...prev,
      [aiCacheKey]: payload,
    }));
  };

  const [storeOptions, setStoreOptions] = useState<string[]>([]);
  React.useEffect(()=>{let active=true;fetchStores().then(list=>{if(active)setStoreOptions(list.map(s=>s.name));}).catch(console.error);return()=>{active=false;};},[]);
  // StoreAssignCell 已完成数据库保存，此处只刷新报表，避免重复写入。
  const handleManualStoreChange = async (_id:string,_store:string|null,_manual:boolean)=>{
    const snapshot = await fetchAll(selectedMonth);
    if (snapshot) {
      setAiReport('');
      setAiPayload(buildPayload({
        storeId, storeName, month:selectedMonth,
        orderList:snapshot.orders, payrollResults:snapshot.payrollResults,
        fixedCostDetail:snapshot.fixedCostDetail,
        dingtalkItems:snapshot.dingtalkItems,
      } as any));
    }
  };
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiExpanded, setAiExpanded] = useState(false);

  const handleMonthChange = changeMonth;

  /* 获取报告：拉数据 + 自动生成 payload */
  const handleFetch = async () => {
    const snapshot = await fetchAll(selectedMonth);

    const payload = buildPayload({
      storeId,
      storeName,
      month: selectedMonth,
      orderList: snapshot?.orders ?? orderList,
      payrollResults: snapshot?.payrollResults ?? payrollResults,
      fixedCostDetail: snapshot?.fixedCostDetail ?? fixedCostDetail,
      dingtalkItems: snapshot?.dingtalkItems ?? dingtalkItems,
      // 首次获取的数据为最新快照；避免引用上一轮 render 的钉钉汇总。
    } as any);
    if (snapshot) { setAiPayload(payload); setAiReport(''); }
  };

  /* 生成 AI 报告 */
  const handleGenerateAi = async () => {
    if (!hasLoaded) {
      alert('请先点击「获取报告」加载业务数据');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const payload = buildPayload({
        storeId,
        storeName,
        month: selectedMonth,
        orderList,
        payrollResults,
        fixedCostDetail,
        dingtalkItems,
        dingtalkBreakdown,
        estimatedExpense,
        actualExpense,
        adjustedPayroll,
        adjustedFixedCost,
      } as any);

      console.log('[AI payload]', payload);

      setAiPayload(payload);

      const text = await generateAiReport(payload);
      setAiReport(text);
      setAiExpanded(true);
    } catch (e: any) {
      console.error('[handleGenerateAi]', e);
      setAiError(e?.message || '生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handleExport = () => {
    if (!hasLoaded) {
      alert('请先点击"获取报告"加载数据');
      return;
    }
    exportMonthlyReport({
      storeName,
      month: selectedMonth,
      payrollResults,
      payrollSummary,
      orderList,
      marketingSummary,
      fixedCost,
      fixedCostDetail,
      profit,
      dingtalkItems,
      dingtalkBreakdown,
      estimatedExpense,
      actualExpense,
      adjustedPayroll,
      adjustedFixedCost,
    } as any);
  };

  if (!canView) {
    return <Navigate to="/no-permission" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MonthlyHeader
          storeName={storeName}
          isLoading={loading}
          hasLoaded={hasLoaded}
          month={selectedMonth}
          onFetch={handleFetch}
          onExport={handleExport}
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StoreSwitcher />
          <StoreStatusBadge
            dbOnline={true}
            saveStatus="idle"
            lastSavedAt={null}
          />

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">月份</label>
            <MonthPicker
              value={selectedMonth}
              onChange={handleMonthChange}
              disabled={loading}
              allowAnyMonth
              showDot={false}
              showHint={false}
              minYear={new Date().getFullYear() - 10}
              maxYear={new Date().getFullYear() + 1}
            />
          </div>

          <div className="flex-1" />

          <button
            onClick={handleGenerateAi}
            disabled={aiLoading || loading}
            title="基于本月业务数据生成 AI 分析报告"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 生成中…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />{' '}
                {aiReport ? '重新生成' : '生成 AI 报告'}
              </>
            )}
          </button>
        </div>

        {!hasLoaded && !loading && !error && (
          <MonthlyEmptyState
            month={selectedMonth}
            isLoading={loading}
            onFetch={handleFetch}
          />
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            正在加载：拉订单 + 员工状态 + 计算薪酬 + 拉成本 + 拉钉钉流程…
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!loading && !error && hasLoaded && (
          <>
            {/* AI 报告区（可选，折叠） */}
            {(aiReport || aiLoading || aiError) && (
              <div className="bg-gradient-to-br from-violet-50 via-white to-indigo-50/60 rounded-2xl border border-violet-100 shadow-sm mb-6">
                <button
                  type="button"
                  onClick={() => setAiExpanded((v) => !v)}
                  className="w-full px-5 py-3 flex items-center gap-2 hover:bg-violet-50/50 transition text-left rounded-2xl"
                >
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-gray-800">
                    AI 月报分析
                  </h3>
                  {aiReport && !aiLoading && (
                    <span className="text-[11px] text-gray-400 ml-1">
                      {aiExpanded ? '点击收起' : '点击展开'}
                    </span>
                  )}
                  <div className="flex-1" />
                  {aiReport && !aiLoading && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard
                          .writeText(aiReport)
                          .catch(() => {});
                      }}
                      className="text-[11px] text-violet-600 hover:text-violet-800 underline"
                    >
                      复制
                    </span>
                  )}
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        aiExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {aiExpanded && (
                  <div className="px-5 pb-5">
                    {aiLoading && (
                      <div className="flex items-center gap-2 text-sm text-violet-600 py-6">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        正在生成 AI 分析报告…
                      </div>
                    )}
                    {!aiLoading && aiError && (
                      <div className="text-sm text-red-600 py-2">
                        {aiError}
                      </div>
                    )}
                    {!aiLoading && !aiError && aiReport && (
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                        <ReactMarkdown>{aiReport}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 顶部卡片：两套利润 */}
            <MonthlySummaryCards
              marketing={marketingSummary}
              payrollTotal={payrollSummary.total}
              payrollHeadcount={payrollSummary.headcount}
              payrollRewardsTotal={payrollSummary.rewardsTotal ?? 0}
              fixedCost={fixedCost}
              estimatedProfit={estimatedProfit}
              actualProfit={actualProfit}
              isEstimatedProfit={isEstimatedProfit}
              profit={profit}
              isProfit={isProfit}
              dingtalkSummary={dingtalkSummary}
              dingtalkBreakdown={dingtalkBreakdown}
              hasDingtalkData={hasDingtalkData}
              estimatedExpense={estimatedExpense}
              actualExpense={actualExpense}
              storeName={storeName}
            />

            {/* 明细面板 */}
            <MonthlyDetailPanels
              marketing={marketingSummary}
              orderCount={orderList.length}
              payrollSummary={payrollSummary}
              fixedCost={fixedCost}
              fixedCostDetail={fixedCostDetail}
              dingtalkItems={dingtalkItems}
              onManualCategoriesChange={updateManualCategories}
              storeOptions={storeOptions}
              onManualStoreChanged={handleManualStoreChange}
              categorySaving={categorySaving}
              dingtalkSummary={dingtalkSummary}
              dingtalkBreakdown={dingtalkBreakdown}
              adjustedPayroll={adjustedPayroll}
              adjustedFixedCost={adjustedFixedCost}
              actualExpense={actualExpense}
              estimatedExpense={estimatedExpense}
              storeLabel={storeName}
            />

            {/* 利润面板：显示两套利润 */}
            <MonthlyProfitPanel
              incomeAmount={marketingSummary.incomeAmount}
              payrollTotal={payrollSummary.total}
              fixedCost={fixedCost}
              profit={profit}
              isProfit={isProfit}
              estimatedProfit={estimatedProfit}
              actualProfit={actualProfit}
              isEstimatedProfit={isEstimatedProfit}
            />

            {/* 图表区 */}
            {aiPayload && <MonthlyCharts payload={aiPayload} />}
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyReportPage;