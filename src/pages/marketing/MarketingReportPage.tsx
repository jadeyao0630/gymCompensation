import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

import StoreSwitcher from '../../components/layout/StoreSwitcher';
import StoreStatusBadge from '../../components/layout/StoreStatusBadge';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { getStoreById } from '../../constants/stores';

import { aggregateOrders } from './utils/aggregate';
import { exportMarketingExcel } from './utils/exportExcel';
import { useMarketingData } from './hooks/useMarketingData';

import { MarketingHeader } from './components/MarketingHeader';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { SummaryCards } from './components/SummaryCards';
import { CardBreakdown } from './components/CardBreakdown';
import { PayTypeBreakdown } from './components/PayTypeBreakdown';
import { MarketerBreakdown } from './components/MarketerBreakdown';
import { OrderDetailTable } from './components/OrderDetailTable';
import { FrontMoneySection, type FrontMoneyFilter } from './components/FrontMoneySection';
import { FrontMoneyDialog } from './components/FrontMoneyDialog';
import { MarketingEmptyState } from './components/MarketingEmptyState';

const MarketingReportPage: React.FC = () => {
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const canView = hasPermission('report:marketing:view', storeId);
  const storeName = getStoreById(storeId)?.name || '门店';

  const {
    beginDate, endDate,
    loading, error,
    list, frontMoneyList,
    hasLoadedOnce,
    handleQuick, handleDateChange, handleRefresh,
  } = useMarketingData();

  const [fmDialog, setFmDialog] = useState<{
    open: boolean;
    filter: FrontMoneyFilter;
    title: string;
  }>({ open: false, filter: 'all', title: '' });

  const summary = useMemo(() => aggregateOrders(list), [list]);
  const hasData = list.length > 0 || frontMoneyList.length > 0;

  const handleExport = () => {
    exportMarketingExcel({
      storeName, beginDate, endDate, list, frontMoneyList,
    });
  };

  if (!canView) return <Navigate to="/no-permission" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MarketingHeader
          loading={loading}
          hasData={hasData}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StoreSwitcher />
          <StoreStatusBadge dbOnline saveStatus="idle" lastSavedAt={null} />
        </div>

        {/* 日期范围 + 获取按钮 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-[320px] shrink-0">
              <DateRangePicker
                start={beginDate}
                end={endDate}
                onChange={handleDateChange}
                label="日期范围"
                size="md"
              />
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 获取中…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> 获取
                </>
              )}
            </button>
          </div>

          {/* 快捷区间 */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 mr-1">快捷：</span>
            <button
              type="button"
              onClick={() => handleQuick('today')}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
            >
              今天
            </button>
            <button
              type="button"
              onClick={() => handleQuick('week')}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
            >
              近 7 天
            </button>
            <button
              type="button"
              onClick={() => handleQuick('month')}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
            >
              本月
            </button>
            <button
              type="button"
              onClick={() => handleQuick('lastMonth')}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
            >
              上月
            </button>
            <button
              type="button"
              onClick={() => handleQuick('quarter')}
              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
            >
              近 3 月
            </button>
          </div>
        </div>

        {/* 错误条 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* 主体渲染 */}
        {hasData ? (
          <>
            {loading && (
              <div className="mb-4 flex items-center gap-2 text-xs text-indigo-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在刷新数据…
              </div>
            )}

            <SummaryCards summary={summary} />

            <FrontMoneySection
              frontMoneyList={frontMoneyList}
              onOpenDialog={(filter, title) =>
                setFmDialog({ open: true, filter, title })
              }
            />

            <CardBreakdown summary={summary} />
            <PayTypeBreakdown summary={summary} />
            <MarketerBreakdown summary={summary} />
            <OrderDetailTable list={list} />
          </>
        ) : loading && !hasLoadedOnce ? (
          /* 首次加载中 */
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            加载数据中…
          </div>
        ) : (
          /* ⭐ 未获取 vs 无数据 */
          <MarketingEmptyState
            beginDate={beginDate}
            endDate={endDate}
            isLoading={loading}
            mode={hasLoadedOnce ? 'no-data' : 'idle'}
            onFetch={handleRefresh}
          />
        )}
      </div>

      <FrontMoneyDialog
        open={fmDialog.open}
        onClose={() => setFmDialog((p) => ({ ...p, open: false }))}
        title={fmDialog.title}
        filter={fmDialog.filter}
        list={frontMoneyList}
      />
    </div>
  );
};

export default MarketingReportPage;