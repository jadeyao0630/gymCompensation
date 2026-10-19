import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertCircle, Loader2, Search, Store, Ban,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';

import { getDefaultMonth } from './utils/date';
import {
  getStoreFromPaymentUnit,
  normalizeStoreName,
  extractPaymentUnitFromForm,
} from './utils/constants';
import { extractItems, extractPayeeAccount } from './utils/extract';
import { getStatusLabel } from './utils/statusLabel';
import { monthlyPieces, monthlyAmount } from '../../features/dingtalk/accounting';

import { useDingTalkTemplates } from './hooks/useDingTalkTemplates';
import { useReportColumns } from './hooks/useReportColumns';
import { useDingTalkReport } from './hooks/useDingTalkReport';
import { useDingTalkFilters } from './hooks/useDingTalkFilters';
import { usePersistedMonth } from '../../hooks/usePersistedMonth';

import type { DingTalkReportItem } from '../../api/dingtalk';

import {
  fetchStores,
  resolveStoreByPaymentUnit,
  resolveCompanyInStore,
} from '../../utils/storeConfig';
import type { StoreInfo } from '../../constants/stores';

import DingTalkHeader from './components/DingTalkHeader';
import DingTalkSyncPanel from './components/DingTalkSyncPanel';
import DingTalkFilterBar from './components/DingTalkFilterBar';
import GroupedResults from './components/GroupedResults';
import TypePieChart, { getPieColor } from './components/TypePieChart';

/* ⭐ 未指定门店 → 默认归到「富贵园」 */
const DEFAULT_STORE = '富贵园';

/* ⭐ 判断收款账户是否被排除 */
function isPayeeExcluded(
  payeeAccount: string | null | undefined,
  excludeAccounts: string[],
  excludeKeywords: string[]
): boolean {
  const raw = payeeAccount == null ? '' : String(payeeAccount).trim();
  if (!raw) return false;
  if (excludeAccounts.includes(raw)) return true;
  if (excludeKeywords.some((k) => k && raw.includes(k))) return true;
  return false;
}

/* ⭐ 分组类型，明确包含 total / count / totalCount */
interface UnitGroupInternal {
  storeName: string;
  unitName: string;
  total: number;
  count: number;
  items: DingTalkReportItem[];
}

interface TypeGroupInternal {
  typeName: string;
  total: number;
  count: number;
  totalCount: number;
  units: UnitGroupInternal[];
}

/* ⭐ 统一：拿到一条记录的最终门店名 + 公司 */
function resolveStoreAndCompanyForItem(
  r: DingTalkReportItem,
  manualOverrides: Record<string, { storeName: string | null; isManual: boolean }>
): { storeName: string; company: string | null } {
  const atDate = r.createTime || undefined;

  /* 1) 手动归属（本地覆盖） */
  const manualRaw = manualOverrides[r.processInstanceId || '']?.storeName;
  if (manualRaw) {
    const storeName = normalizeStoreName(manualRaw) || manualRaw;
    return { storeName, company: (r as any)._company || null };
  }

  /* 2) 数据库已保存的人工归属：绝不能被付款公司覆盖 */
  if ((r as any)._manualStore === true && (r as any)._storeName) {
    const manual = String((r as any)._storeName);
    return { storeName: normalizeStoreName(manual) || manual, company: (r as any)._company || r.paymentUnit || null };
  }

  /* 3) 有付款公司名称 → 直接按付款公司找门店 */
  const pu = r.paymentUnit || extractPaymentUnitFromForm(r.formValues || {});
  if (pu && String(pu).trim()) {
    const byUnit = resolveStoreByPaymentUnit(pu);
    if (byUnit) return { storeName: byUnit, company: String(pu).trim() };
  }

  /* 3) 后端非兜底 _storeName */
  const autoRaw = (r as any)._storeName as string | null | undefined;
  const assignReason = (r as any)._assignReason as string | undefined;
  if (autoRaw && assignReason && assignReason !== '未指定兜底') {
    return {
      storeName: normalizeStoreName(autoRaw) || autoRaw,
      company: (r as any)._company || null,
    };
  }

  /* 4) getStoreFromPaymentUnit 兜底 */
  const byPayment = getStoreFromPaymentUnit(r.paymentUnit || '');
  if (byPayment) {
    const storeName = normalizeStoreName(byPayment) || byPayment;
    const info = resolveCompanyInStore(storeName, atDate);
    return { storeName, company: info?.company || null };
  }

  /* 5) 富贵园兜底 */
  return { storeName: DEFAULT_STORE, company: null };
}

const DingTalkReportPage: React.FC = () => {
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const canView = hasPermission('report:dingtalk:view', storeId);

  const { month: selectedMonth, setMonth: setSelectedMonth } =
    usePersistedMonth('dingtalk', storeId);

  const defaults = useMemo(() => getDefaultMonth(), []);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);

  const {
    paymentUnits,
    templateTypes,
    onlyApproved,
    excludeAccounts,
    excludeKeywords,
    togglePaymentUnit,
    setPaymentUnits,
    toggleTemplateType,
    setTemplateTypes,
    toggleOnlyApproved,
    addExcludeAccount,
    removeExcludeAccount,
    addExcludeKeyword,
    removeExcludeKeyword,
    clearExcludeRules,
  } = useDingTalkFilters(storeId);

  const {
    results,
    loading,
    error,
    meta,
    setOnlyApproved,
    setPaymentUnits: setPaymentUnitsInHook,
    setTemplateTypes: setTemplateTypesInHook,
    handleSearch,
    groupedByStore,
    updateManualCategories, categorySaving, categoryError,
  } = useDingTalkReport();

  useEffect(() => {
    if (!selectedMonth) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const first = `${selectedMonth}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const last = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    setStart(first);
    setEnd(last);
  }, [selectedMonth]);

  const handleStartChange = (v: string) => {
    setStart(v);
    if (v && /^\d{4}-\d{2}/.test(v)) setSelectedMonth(v.slice(0, 7));
  };
  const handleEndChange = (v: string) => {
    setEnd(v);
    if (v && /^\d{4}-\d{2}/.test(v)) setSelectedMonth(v.slice(0, 7));
  };

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

  /* ⭐ 门店列表 & 手动归属本地覆盖 */
  const [storeOptions, setStoreOptions] = useState<string[]>([]);
  const [manualOverrides, setManualOverrides] = useState<
    Record<string, { storeName: string | null; isManual: boolean }>
  >({});

  useEffect(() => {
    fetchStores().then((list: StoreInfo[]) => {
      setStoreOptions(
        list.map((s) => normalizeStoreName(s.name) || s.name)
      );
    });
  }, []);

  const handleToggleOnlyApproved = () => {
    toggleOnlyApproved();
    setOnlyApproved((prev) => !prev);
  };

  const handleTogglePaymentUnit = (unit: string) => {
    togglePaymentUnit(unit);
    setPaymentUnitsInHook((prev) =>
      prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]
    );
  };

  const handleSetPaymentUnits = (units: string[]) => {
    setPaymentUnits(units);
    setPaymentUnitsInHook(units);
  };

  const handleToggleTemplateType = (name: string) => {
    toggleTemplateType(name);
    setTemplateTypesInHook((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSetTemplateTypes = (names: string[]) => {
    setTemplateTypes(names);
    setTemplateTypesInHook(names);
  };

  const [externalLastRun, setExternalLastRun] = useState<{
    finishedAt: string;
    status: 'success' | 'failed';
    message: string;
  } | null>(null);

  const excludedPayeeIds = useMemo(() => {
    const set = new Set<string>();
    if (excludeAccounts.length === 0 && excludeKeywords.length === 0) return set;
    for (const r of results) {
      const payee = r.payeeAccount || extractPayeeAccount(r.formValues || {});
      if (isPayeeExcluded(payee, excludeAccounts, excludeKeywords)) {
        if (r.processInstanceId) set.add(r.processInstanceId);
      }
    }
    return set;
  }, [results, excludeAccounts, excludeKeywords]);

  const filteredResults = useMemo(() => {
    if (excludedPayeeIds.size === 0) return results;
    return results.filter(
      (r) => !r.processInstanceId || !excludedPayeeIds.has(r.processInstanceId)
    );
  }, [results, excludedPayeeIds]);

  const categorizedResults = useMemo(() => filteredResults.map(r => {
    const pieces = monthlyPieces(r);
    const manual = String((r as any)._manualCategory || '').trim();
    const category = manual || (pieces.length === 1 ? pieces[0].category : '混合费用');
    return {item:r, category, overridden: Boolean(manual), overrideBy: manual ? 'manual' as const : null};
  }), [filteredResults]);

  const hasAnyOverride = useMemo(
    () => categorizedResults.some((c) => c.overridden),
    [categorizedResults]
  );

  const finalGrouped = useMemo<TypeGroupInternal[]>(() => {
    const map = new Map<
      string,
      {
        typeName: string;
        total: number;
        count: number;
        totalCount: number;
        units: Map<string, UnitGroupInternal>;
      }
    >();

    for (const { item: r, category } of categorizedResults) {
      if (r.error) continue;
      const typeName = category;
      const unitName = r.paymentUnit || '未指定';

      const { storeName } = resolveStoreAndCompanyForItem(r, manualOverrides);

      const amount = Number(
        monthlyAmount(r)
      );

      if (!map.has(typeName)) {
        map.set(typeName, {
          typeName,
          total: 0,
          count: 0,
          totalCount: 0,
          units: new Map(),
        });
      }
      const g = map.get(typeName)!;
      g.total += amount;
      g.count += 1;
      g.totalCount += 1;

      const uKey = `${storeName}||${unitName}`;
      if (!g.units.has(uKey)) {
        g.units.set(uKey, {
          storeName,
          unitName,
          total: 0,
          count: 0,
          items: [],
        });
      }
      const u = g.units.get(uKey)!;
      u.total += amount;
      u.count += 1;
      // 分组和明细必须共用本次解析出的最终门店，不再显示旧的 _storeName。
      u.items.push({
        ...r,
        _storeName: storeName,
        _manualStore: Boolean(manualOverrides[r.processInstanceId || '']?.isManual ?? (r as any)._manualStore),
        _assignReason: manualOverrides[r.processInstanceId || '']?.isManual
          ? '手动归属'
          : (r as any)._assignReason || '',
      });
    }

    return Array.from(map.values())
      .map((g) => ({
        typeName: g.typeName,
        total: g.total,
        count: g.count,
        totalCount: g.totalCount,
        units: Array.from(g.units.values()),
      }))
      .filter((g) => g.units.length > 0);
  }, [
    categorizedResults,
    manualOverrides,
  ]);

  const storeCharts = useMemo(() => {
    const needRebuild =
      excludedPayeeIds.size > 0 ||
      hasAnyOverride ||
      Object.keys(manualOverrides).length > 0;

    if (!needRebuild) {
      return groupedByStore
        .map((s) => ({
          storeName: normalizeStoreName(s.storeName || '') || DEFAULT_STORE,
          totalCount: s.count,
          totalAmount: s.total,
          slices: s.types
            .filter((t) => (t.total || 0) > 0)
            .map((t, i) => ({
              label: t.typeName,
              value: t.total,
              count: t.count,
              color: getPieColor(i),
            })),
        }))
        .filter((c) => c.slices.length > 0);
    }

    const map = new Map<
      string,
      {
        storeName: string;
        totalCount: number;
        totalAmount: number;
        types: Map<string, { typeName: string; total: number; count: number }>;
      }
    >();

    for (const g of finalGrouped) {
      for (const u of g.units) {
        const storeName =
          normalizeStoreName(u.storeName || '') || DEFAULT_STORE;
        if (!map.has(storeName)) {
          map.set(storeName, {
            storeName,
            totalCount: 0,
            totalAmount: 0,
            types: new Map(),
          });
        }
        const s = map.get(storeName)!;
        s.totalCount += u.count;
        s.totalAmount += u.total;

        if (!s.types.has(g.typeName)) {
          s.types.set(g.typeName, { typeName: g.typeName, total: 0, count: 0 });
        }
        const t = s.types.get(g.typeName)!;
        t.total += u.total;
        t.count += u.count;
      }
    }

    return Array.from(map.values())
      .map((s) => ({
        storeName: s.storeName,
        totalCount: s.totalCount,
        totalAmount: s.totalAmount,
        slices: Array.from(s.types.values())
          .filter((t) => (t.total || 0) > 0)
          .map((t, i) => ({
            label: t.typeName,
            value: t.total,
            count: t.count,
            color: getPieColor(i),
          })),
      }))
      .filter((c) => c.slices.length > 0);
  }, [
    groupedByStore,
    finalGrouped,
    excludedPayeeIds,
    hasAnyOverride,
    manualOverrides,
  ]);

  const onSearch = () => {
    setSelectedType(null);
    setSelectedStore(null);
    handleSearch({
      start,
      end,
      templateTypes,
      paymentUnits,
      onlyApproved,
      sync: 0,
    });
  };

  const onSyncAndSearch = async () => {
    setSelectedType(null);
    setSelectedStore(null);
    await handleSearch({
      start,
      end,
      templateTypes,
      paymentUnits,
      onlyApproved,
      sync: 1,
    });
  };

  useEffect(() => {
    if (meta?.syncResult) {
      setExternalLastRun(meta.syncResult);
    }
  }, [meta?.syncResult]);

  const filteredGrouped = useMemo<TypeGroupInternal[]>(() => {
    let groups = finalGrouped;
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
  }, [finalGrouped, selectedStore, selectedType]);

  const handleExport = () => {
    if (filteredResults.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    const wb = XLSX.utils.book_new();

    let exportResults = categorizedResults;
    if (selectedStore) {
      exportResults = exportResults.filter((c) => {
        const { storeName } = resolveStoreAndCompanyForItem(
          c.item,
          manualOverrides
        );
        return storeName === selectedStore;
      });
    }
    if (selectedType) {
      exportResults = exportResults.filter((c) => c.category === selectedType);
    }

    if (exportResults.length === 0) {
      alert('当前筛选下无数据');
      return;
    }

    const rows: any[][] = [
      ['流程类型', '门店', '付款公司', '付款单位', '标题', '事项', '金额', '收款账户', '状态', '创建时间', '完成时间'],
    ];
    exportResults.forEach(({ item: r, category, overridden }) => {
      const { storeName, company } = resolveStoreAndCompanyForItem(
        r,
        manualOverrides
      );

      const paymentUnitFromForm = extractPaymentUnitFromForm(
        r.formValues || {}
      );
      const paymentUnitDisplay = r.paymentUnit || paymentUnitFromForm || '';

      rows.push([
        overridden
          ? `${r.templateName || ''}（→${category}）`
          : (r.templateName || ''),
        storeName,
        company || '',
        paymentUnitDisplay,
        r.title || '',
        extractItems(r.templateName || '', r.formValues || {}),
        monthlyAmount(r),
        extractPayeeAccount(r.formValues || {}) || '',
        getStatusLabel(r.status || '', r.result || ''),
        r.createTime || '',
        r.finishTime || '',
      ]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    ws1['!cols'] = [
      { wch: 24 }, { wch: 10 }, { wch: 32 }, { wch: 30 }, { wch: 40 }, { wch: 40 },
      { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, '明细');

    const summaryRows: any[][] = [['流程类型', '门店', '付款公司', '笔数', '金额合计']];
    filteredGrouped.forEach((g) => {
      g.units.forEach((u) => {
        summaryRows.push([g.typeName, u.storeName, u.unitName, u.count, u.total]);
      });
    });
    const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws2['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 32 }, { wch: 10 }, { wch: 16 }];
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

  const hasExcludeRules =
    excludeAccounts.length > 0 || excludeKeywords.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DingTalkHeader
          loading={loading}
          hasResults={filteredResults.length > 0}
          onSearch={onSearch}
          onSyncAndSearch={onSyncAndSearch}
          onExport={handleExport}
        />

        <DingTalkSyncPanel externalLastRun={externalLastRun} />

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
          onlyApproved={onlyApproved}
          onToggleOnlyApproved={handleToggleOnlyApproved}
          onStartChange={handleStartChange}
          onEndChange={handleEndChange}
          onTogglePaymentUnit={handleTogglePaymentUnit}
          onSetPaymentUnits={handleSetPaymentUnits}
          onToggleTemplateType={handleToggleTemplateType}
          onSetTemplateTypes={handleSetTemplateTypes}
          onRefreshTemplates={refreshTemplates}
          onSearch={onSearch}
          onSyncAndSearch={onSyncAndSearch}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
          excludeAccounts={excludeAccounts}
          excludeKeywords={excludeKeywords}
          onAddExcludeAccount={addExcludeAccount}
          onRemoveExcludeAccount={removeExcludeAccount}
          onAddExcludeKeyword={addExcludeKeyword}
          onRemoveExcludeKeyword={removeExcludeKeyword}
          onClearExcludeRules={clearExcludeRules}
        />

        {hasExcludeRules && excludedPayeeIds.size > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 mb-4 text-xs text-rose-700 flex items-center gap-2 flex-wrap">
            <Ban className="w-3.5 h-3.5" />
            <span className="font-medium">
              已按排除规则过滤 {excludedPayeeIds.size} 条收款账户记录
            </span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            正在加载数据…
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!loading && !error && filteredResults.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5">
              <Search className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-2">
              {results.length > 0
                ? '当前排除规则下无数据'
                : '选择条件后点击「查询」'}
            </h3>
            <p className="text-sm text-gray-400">
              {results.length > 0
                ? '调整或清空排除规则后再看'
                : '「查询」读缓存；「同步并查询」才会从钉钉拉取未完成流程'}
            </p>
          </div>
        )}

        {!loading && !error && filteredResults.length > 0 && (
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
              storeOptions={storeOptions}
              onManualCategoriesChanged={updateManualCategories}
              categorySaving={categorySaving}
              categoryError={categoryError}
              onManualStoreChanged={(pid, next, isManual) => {
                setManualOverrides((prev) => ({
                  ...prev,
                  [pid]: {
                    storeName: next ? normalizeStoreName(next) || next : null,
                    isManual,
                  },
                }));
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DingTalkReportPage;