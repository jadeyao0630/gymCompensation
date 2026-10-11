import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertCircle, Loader2, Search, Store, Ban,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';

import { getDefaultMonth } from './utils/date';
import { getStoreFromPaymentUnit } from './utils/constants';
import { extractAmount, extractItems, extractPayeeAccount } from './utils/extract';
import { getStatusLabel } from './utils/statusLabel';

import { useDingTalkTemplates } from './hooks/useDingTalkTemplates';
import { useReportColumns } from './hooks/useReportColumns';
import { useDingTalkReport } from './hooks/useDingTalkReport';
import { useDingTalkFilters } from './hooks/useDingTalkFilters';
import { usePersistedMonth } from '../../hooks/usePersistedMonth';

import type { DingTalkReportItem } from '../../api/dingtalk';

import DingTalkHeader from './components/DingTalkHeader';
import DingTalkSyncPanel from './components/DingTalkSyncPanel';
import DingTalkFilterBar from './components/DingTalkFilterBar';
import GroupedResults from './components/GroupedResults';
import TypePieChart, { getPieColor } from './components/TypePieChart';

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

/* ============================================================
 * ⭐ 收款账户 → 类别覆盖规则
 *    命中后，该记录的分组类别改为对应的值（不再按 templateName）
 * ============================================================ */
const PAYEE_CATEGORY_OVERRIDES: Array<{
  payee: string;         // 精确匹配
  category: string;      // 覆盖后的类别名
}> = [
  { payee: '山东云优人力资源服务有限公司', category: '薪酬佣金' },
];

/**
 * ⭐ 根据收款账户获取「类别覆盖」
 * 返回 null 表示不覆盖，仍用 templateName
 */
function resolveCategoryOverride(
  payeeAccount: string | null | undefined
): string | null {
  const raw = payeeAccount == null ? '' : String(payeeAccount).trim();
  if (!raw) return null;
  for (const rule of PAYEE_CATEGORY_OVERRIDES) {
    if (raw === rule.payee) return rule.category;
  }
  return null;
}

const DingTalkReportPage: React.FC = () => {
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const canView = hasPermission('report:dingtalk:view', storeId);

  /* 月份持久化 */
  const { month: selectedMonth, setMonth: setSelectedMonth } =
    usePersistedMonth('dingtalk', storeId);

  const defaults = useMemo(() => getDefaultMonth(), []);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);

  /* ⭐ 筛选条件持久化（含收款账户排除规则） */
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
    grouped,
    groupedByStore,
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

  /* ============================================================
   * ⭐ 前端过滤：收款账户排除
   * ============================================================ */
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

  /* ============================================================
   * ⭐ 类别覆盖：给每条记录算出最终用于分组的 category
   * ============================================================ */
  const categorizedResults = useMemo(() => {
    return filteredResults.map((r) => {
      const payee = r.payeeAccount || extractPayeeAccount(r.formValues || {});
      const override = resolveCategoryOverride(payee);
      return {
        item: r,
        category: override || r.templateName || '未知',
        overridden: !!override,
      };
    });
  }, [filteredResults]);

  /* ============================================================
   * ⭐ 分组：如果排除规则 & 类别覆盖都没生效，直接用 hook 的 grouped；
   *    否则用 categorizedResults 重算
   * ============================================================ */
  const finalGrouped = useMemo(() => {
    const needRebuild =
      excludedPayeeIds.size > 0 ||
      categorizedResults.some((c) => c.overridden);

    if (!needRebuild) return grouped;

    const map = new Map<
      string,
      {
        typeName: string;
        total: number;
        count: number;
        totalCount: number;
        units: Map<
          string,
          {
            storeName: string;
            unitName: string;
            total: number;
            count: number;
            items: DingTalkReportItem[];
          }
        >;
      }
    >();

    for (const { item: r, category } of categorizedResults) {
      if (r.error) continue;
      const typeName = category;
      const unitName = r.paymentUnit || '未指定';
      const storeName = getStoreFromPaymentUnit(unitName) || '未归属门店';
      const amount = Number(
        extractAmount(r.templateName || '', r.formValues || {}) || 0
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
      u.items.push(r);
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
  }, [grouped, categorizedResults, excludedPayeeIds]);

  /* ⭐ 门店饼图数据 */
  const storeCharts = useMemo(() => {
    const needRebuild =
      excludedPayeeIds.size > 0 ||
      categorizedResults.some((c) => c.overridden);

    if (!needRebuild) {
      return groupedByStore
        .map((s) => ({
          storeName: s.storeName,
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
        if (!map.has(u.storeName)) {
          map.set(u.storeName, {
            storeName: u.storeName,
            totalCount: 0,
            totalAmount: 0,
            types: new Map(),
          });
        }
        const s = map.get(u.storeName)!;
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
  }, [groupedByStore, finalGrouped, excludedPayeeIds, categorizedResults]);

  const onSearch = () => {
    setSelectedType(null);
    setSelectedStore(null);
    handleSearch({ start, end, templateTypes, paymentUnits, onlyApproved });
  };

  const filteredGrouped = useMemo(() => {
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
      exportResults = exportResults.filter(
        (c) =>
          getStoreFromPaymentUnit(c.item.paymentUnit) === selectedStore
      );
    }
    if (selectedType) {
      exportResults = exportResults.filter(
        (c) => c.category === selectedType
      );
    }

    if (exportResults.length === 0) {
      alert('当前筛选下无数据');
      return;
    }

    const rows: any[][] = [
      ['流程类型', '门店', '付款单位', '标题', '事项', '金额', '收款账户', '状态', '创建时间', '完成时间'],
    ];
    exportResults.forEach(({ item: r, category, overridden }) => {
      rows.push([
        overridden ? `${r.templateName}（→${category}）` : r.templateName,
        getStoreFromPaymentUnit(r.paymentUnit),
        r.paymentUnit || '',
        r.title,
        extractItems(r.templateName, r.formValues),
        extractAmount(r.templateName, r.formValues) || 0,
        extractPayeeAccount(r.formValues) || '',
        getStatusLabel(r.status, r.result),
        r.createTime,
        r.finishTime || '',
      ]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    ws1['!cols'] = [
      { wch: 24 }, { wch: 10 }, { wch: 30 }, { wch: 40 }, { wch: 40 },
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

  const hasExcludeRules =
    excludeAccounts.length > 0 || excludeKeywords.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DingTalkHeader
          loading={loading}
          hasResults={filteredResults.length > 0}
          onSearch={onSearch}
          onExport={handleExport}
        />

        <DingTalkSyncPanel />

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
            {excludeAccounts.length > 0 && (
              <span className="text-rose-600">
                账户：{excludeAccounts.join('、')}
              </span>
            )}
            {excludeKeywords.length > 0 && (
              <span className="text-rose-600">
                关键字：{excludeKeywords.join('、')}
              </span>
            )}
          </div>
        )}

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
                : '全量拉取一次，之后所有筛选都是本地瞬时生效'}
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