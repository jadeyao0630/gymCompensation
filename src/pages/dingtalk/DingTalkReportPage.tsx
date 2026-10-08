import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Loader2, Search, Store } from 'lucide-react';
import * as XLSX from 'xlsx';

import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';

import { getDefaultMonth } from './utils/date';
import { getStoreFromPaymentUnit } from './utils/constants';
import { extractAmount, extractItems, extractPayeeAccount } from './utils/extract';

import { useDingTalkTemplates } from './hooks/useDingTalkTemplates';
import { useReportColumns } from './hooks/useReportColumns';
import { useDingTalkReport } from './hooks/useDingTalkReport';
import { usePersistedMonth } from '../../hooks/usePersistedMonth';

import DingTalkHeader from './components/DingTalkHeader';
import DingTalkFilterBar from './components/DingTalkFilterBar';
import GroupedResults from './components/GroupedResults';
import TypePieChart, { getPieColor } from './components/TypePieChart';

const DingTalkReportPage: React.FC = () => {
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const canView = hasPermission('report:dingtalk:view', storeId);

  /* ⭐ 页面级月份持久化：key = gym_dingtalk_month_v1_<storeId> */
  const { month: selectedMonth, setMonth: setSelectedMonth } =
    usePersistedMonth('dingtalk', storeId);

  /* 由 selectedMonth 派生 start/end；用户手动改日期时不写回月份，只作临时查询 */
  const defaults = useMemo(() => getDefaultMonth(), []);

  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);

  /* ⭐ 月份变化 → 同步 start/end */
  useEffect(() => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const first = `${selectedMonth}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const last = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    setStart(first);
    setEnd(last);
  }, [selectedMonth]);

  /* ⭐ 用户手动改日期时，反向推导月份写回持久化（可选） */
  const handleStartChange = (v: string) => {
    setStart(v);
    if (v && /^\d{4}-\d{2}/.test(v)) setSelectedMonth(v.slice(0, 7));
  };
  const handleEndChange = (v: string) => {
    setEnd(v);
    if (v && /^\d{4}-\d{2}/.test(v)) setSelectedMonth(v.slice(0, 7));
  };

  const [paymentUnits, setPaymentUnits] = useState<string[]>([]);
  const [templateTypes, setTemplateTypes] = useState<string[]>([]);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const {
    templates,
    loading: loadingTemplates,
    refreshing: refreshingTemplates,
    refresh: refreshTemplates,
  } = useDingTalkTemplates();

  const { visibleColumns, toggleColumn, resetColumns, isColVisible } =
    useReportColumns();
  const {
    results,
    loading,
    error,
    meta,
    handleSearch,
    grouped,
    groupedByStore,
  } = useDingTalkReport();

  const storeCharts = useMemo(
    () =>
      groupedByStore.map((s) => ({
        storeName: s.storeName,
        totalCount: s.count,
        totalAmount: s.total,
        slices: s.types.map((t, i) => ({
          label: t.typeName,
          value: t.total,
          count: t.count,
          color: getPieColor(i),
        })),
      })),
    [groupedByStore]
  );

  const onSearch = () => {
    setSelectedType(null);
    setSelectedStore(null);
    handleSearch({ start, end, templateTypes, paymentUnits });
  };

  const togglePaymentUnit = (unit: string) => {
    setPaymentUnits((prev) =>
      prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]
    );
  };

  const toggleTemplateType = (name: string) => {
    setTemplateTypes((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const setTemplateTypesDirect = (names: string[]) => {
    setTemplateTypes(names);
  };

  const filteredGrouped = useMemo(() => {
    let groups = grouped;
    if (selectedStore) {
      groups = groups
        .map((g) => ({
          ...g,
          units: g.units.filter((u) => u.storeName === selectedStore),
        }))
        .filter((g) => g.units.length > 0);
    }
    if (selectedType) {
      groups = groups.filter((g) => g.typeName === selectedType);
    }
    return groups;
  }, [grouped, selectedStore, selectedType]);

  const handleExport = () => {
    if (results.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    const wb = XLSX.utils.book_new();

    let exportResults = results;
    if (selectedStore) {
      exportResults = exportResults.filter(
        (r) => getStoreFromPaymentUnit(r.paymentUnit) === selectedStore
      );
    }
    if (selectedType) {
      exportResults = exportResults.filter(
        (r) => r.templateName === selectedType
      );
    }

    if (exportResults.length === 0) {
      alert('当前筛选下无数据');
      return;
    }

    const rows: any[][] = [
      ['流程类型', '门店', '付款单位', '标题', '事项', '金额', '收款账户', '状态', '创建时间', '完成时间'],
    ];
    exportResults.forEach((r) => {
      rows.push([
        r.templateName,
        getStoreFromPaymentUnit(r.paymentUnit),
        r.paymentUnit || '',
        r.title,
        extractItems(r.templateName, r.formValues),
        extractAmount(r.templateName, r.formValues) || 0,
        extractPayeeAccount(r.formValues) || '',
        r.status,
        r.createTime,
        r.finishTime || '',
      ]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    ws1['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 40 }, { wch: 40 },
      { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, '明细');

    const summaryRows: any[][] = [['流程类型', '门店', '付款单位', '笔数', '金额合计']];
    filteredGrouped.forEach((g) => {
      g.units.forEach((u) => {
        summaryRows.push([g.typeName, u.storeName, u.unitName, u.count, u.total]);
      });
    });
    const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws2['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, '汇总');

    const suffix = [
      selectedStore ? `_${selectedStore}` : '',
      selectedType ? `_${selectedType}` : '',
    ].join('');
    XLSX.writeFile(wb, `钉钉流程报告_${start}_${end}${suffix}.xlsx`);
  };

  if (!canView) {
    return <Navigate to="/no-permission" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DingTalkHeader
          loading={loading}
          hasResults={results.length > 0}
          onSearch={onSearch}
          onExport={handleExport}
        />

        <DingTalkFilterBar
          start={start}
          end={end}
          paymentUnits={paymentUnits}
          templateTypes={templateTypes}
          templates={templates}
          loadingTemplates={loadingTemplates}
          refreshingTemplates={refreshingTemplates}
          loading={loading}
          meta={meta}
          visibleColumns={visibleColumns}
          onStartChange={handleStartChange}
          onEndChange={handleEndChange}
          onTogglePaymentUnit={togglePaymentUnit}
          onSetPaymentUnits={setPaymentUnits}
          onToggleTemplateType={toggleTemplateType}
          onSetTemplateTypes={setTemplateTypesDirect}
          onRefreshTemplates={refreshTemplates}
          onSearch={onSearch}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
        />

        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            正在从钉钉拉取数据…
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5">
              <Search className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-2">选择条件后点击「查询」</h3>
            <p className="text-sm text-gray-400">
              系统将拉取钉钉审批流程，按"门店 → 流程类型 → 付款单位"分组展示
            </p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {storeCharts.map((chart) => {
                const isStoreSelected = selectedStore === chart.storeName;
                return (
                  <div
                    key={chart.storeName}
                    className={`bg-white rounded-2xl border shadow-sm p-5 transition ${
                      isStoreSelected
                        ? 'border-emerald-300 ring-2 ring-emerald-100'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold">
                          <Store className="w-3.5 h-3.5" />
                          {chart.storeName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {chart.totalCount} 笔 ·{' '}
                          <span className="font-semibold text-emerald-700 tabular-nums">
                            ¥{Math.round(chart.totalAmount).toLocaleString('zh-CN')}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isStoreSelected && (
                          <button
                            onClick={() => {
                              setSelectedStore(null);
                              setSelectedType(null);
                            }}
                            className="text-[11px] text-gray-500 hover:text-gray-700 underline"
                          >
                            清除门店筛选
                          </button>
                        )}
                        <button
                          onClick={() =>
                            isStoreSelected
                              ? (setSelectedStore(null), setSelectedType(null))
                              : (setSelectedStore(chart.storeName),
                                setSelectedType(null))
                          }
                          className={`text-[11px] px-2 py-1 rounded-lg border transition ${
                            isStoreSelected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {isStoreSelected ? '取消门店筛选' : '仅看该门店'}
                        </button>
                      </div>
                    </div>

                    <TypePieChart
                      data={chart.slices}
                      selectedLabel={isStoreSelected ? selectedType : null}
                      onSelect={(label) => {
                        if (!isStoreSelected && label) {
                          setSelectedStore(chart.storeName);
                          setSelectedType(label);
                        } else {
                          setSelectedType(label);
                        }
                      }}
                      size={200}
                    />
                  </div>
                );
              })}
            </div>

            {(selectedStore || selectedType) && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-4 text-xs text-blue-700 flex items-center gap-2 flex-wrap">
                <span className="font-medium">当前筛选：</span>
                {selectedStore && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-blue-200">
                    <Store className="w-3 h-3" />
                    门店：{selectedStore}
                    <button
                      onClick={() => setSelectedStore(null)}
                      className="ml-1 text-blue-400 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedType && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-blue-200">
                    类型：{selectedType}
                    <button
                      onClick={() => setSelectedType(null)}
                      className="ml-1 text-blue-400 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedStore(null);
                    setSelectedType(null);
                  }}
                  className="ml-auto text-blue-500 hover:text-blue-700 underline"
                >
                  清除全部
                </button>
              </div>
            )}

            <GroupedResults
              grouped={filteredGrouped}
              isColVisible={isColVisible}
              selectedType={null}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DingTalkReportPage;