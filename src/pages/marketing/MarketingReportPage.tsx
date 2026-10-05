import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

import StoreSwitcher from '../../components/StoreSwitcher';
import StoreStatusBadge from '../../components/StoreStatusBadge';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { getStoreById } from '../../constants/stores';

import { aggregateOrders } from './utils/aggregate';
import { exportMarketingExcel } from './utils/exportExcel';
import { useMarketingData } from './hooks/useMarketingData';

import { MarketingHeader } from './components/MarketingHeader';
import { DateRangePicker } from './components/DateRangePicker';
import { SummaryCards } from './components/SummaryCards';
import { CardBreakdown } from './components/CardBreakdown';
import { PayTypeBreakdown } from './components/PayTypeBreakdown';
import { MarketerBreakdown } from './components/MarketerBreakdown';
import { OrderDetailTable } from './components/OrderDetailTable';
import { FrontMoneySection, type FrontMoneyFilter } from './components/FrontMoneySection';
import { FrontMoneyDialog } from './components/FrontMoneyDialog';

const MarketingReportPage: React.FC = () => {
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const canView = hasPermission('report:marketing:view', storeId);
  const storeName = getStoreById(storeId)?.name || '门店';

  const {
    beginDate, endDate,
    loading, error,
    list, frontMoneyList,
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