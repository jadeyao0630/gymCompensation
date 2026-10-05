import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import StoreSwitcher from '../../components/layout/StoreSwitcher';
import StoreStatusBadge from '../../components/layout/StoreStatusBadge';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { getStoreById } from '../../constants/stores';

import { useMonthlyReport } from './hooks/useMonthlyReport';
import { exportMonthlyReport } from './utils/exportExcel';

import { MonthlyHeader } from './components/MonthlyHeader';
import { MonthlyEmptyState } from './components/MonthlyEmptyState';
import { MonthlySummaryCards } from './components/MonthlySummaryCards';
import { MonthlyDetailPanels } from './components/MonthlyDetailPanels';
import { MonthlyProfitPanel } from './components/MonthlyProfitPanel';
import { MonthPicker } from '../../components/common/MonthPicker';

const MonthlyReportPage: React.FC = () => {
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const canView = hasPermission('report:monthly:view', storeId);
  const storeName = getStoreById(storeId)?.name || '门店';

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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
    profit,
    isProfit,
    fetchAll,
  } = useMonthlyReport(storeId, selectedMonth);

  const handleFetch = () => fetchAll(selectedMonth);

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
    });
  };

  if (!canView) {
    return <Navigate to="/no-permission" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <MonthlyHeader
          storeName={storeName}
          isLoading={loading}
          hasLoaded={hasLoaded}
          month={selectedMonth}
          onFetch={handleFetch}
          onExport={handleExport}
        />

        {/* ⭐ 顶部工具行：门店 + 连接状态 + 月份选择器 */}
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
              onChange={setSelectedMonth}
              disabled={loading}
              allowAnyMonth
              minYear={new Date().getFullYear() - 10}
              maxYear={new Date().getFullYear() + 1}
            />
          </div>

          <div className="flex-1" />
        </div>

        {/* 空状态 */}
        {!hasLoaded && !loading && !error && (
          <MonthlyEmptyState
            month={selectedMonth}
            isLoading={loading}
            onFetch={handleFetch}
          />
        )}

        {/* 加载中 */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            正在加载：拉订单 + 员工状态 + 计算薪酬 + 拉成本…
          </div>
        )}

        {/* 错误 */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* 主体 */}
        {!loading && !error && hasLoaded && (
          <>
            <MonthlySummaryCards
              marketing={marketingSummary}
              payrollTotal={payrollSummary.total}
              payrollHeadcount={payrollSummary.headcount}
              fixedCost={fixedCost}
              profit={profit}
              isProfit={isProfit}
            />
            <MonthlyDetailPanels
              marketing={marketingSummary}
              orderCount={orderList.length}
              payrollSummary={payrollSummary}
              fixedCost={fixedCost}
              fixedCostDetail={fixedCostDetail}
            />
            <MonthlyProfitPanel
              incomeAmount={marketingSummary.incomeAmount}
              payrollTotal={payrollSummary.total}
              fixedCost={fixedCost}
              profit={profit}
              isProfit={isProfit}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyReportPage;