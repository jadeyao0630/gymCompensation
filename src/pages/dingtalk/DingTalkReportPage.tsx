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
 * ⭐ 类别覆盖规则 1：收款账户 → 类别
 * ============================================================ */
const PAYEE_CATEGORY_OVERRIDES: Array<{ payee: string; category: string }> = [
  { payee: '山东云优人力资源服务有限公司', category: '薪酬佣金' },
];

/* ============================================================
 * ⭐ 类别覆盖规则 2：明细关键字 → 类别
 * ============================================================ */
interface KeywordCategoryRule {
  category: string;
  keywords: string[];
  applyTemplates?: string[];
}

const KEYWORD_CATEGORY_RULES: KeywordCategoryRule[] = [
  {
    category: '固定费用',
    keywords: ['水费', '电费', '物业费'],
    applyTemplates: ['员工费用报销', '付款申请单'],
  },
];

/**
 * ⭐ 把一条记录的所有文本（事项 / 明细 / 标题 / 付款内容提要）合并成字符串
 */
function collectItemText(item: DingTalkReportItem): string {
  const parts: string[] = [];

  /* 1. items 数组（已解析） */
  if (Array.isArray(item.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }

  const fv = item.formValues || {};

  /* 2. 明细列表：可能是 JSON 字符串 */
  const rawDetail = fv['明细列表'];
  if (rawDetail != null && rawDetail !== 'null' && rawDetail !== '') {
    if (typeof rawDetail === 'string') {
      try {
        const parsed = JSON.parse(rawDetail);
        if (Array.isArray(parsed)) {
          parsed.forEach((row: any) => {
            (row?.rowValue || []).forEach((f: any) => {
              const label = String(f?.label || '');
              if (
                label.includes('事项') ||
                label.includes('内容') ||
                label.includes('名称')
              ) {
                if (f?.value != null && f.value !== 'null' && f.value !== '') {
                  parts.push(String(f.value));
                }
              }
            });
          });
        }
      } catch {
        parts.push(String(rawDetail));
      }
    } else if (typeof rawDetail === 'object') {
      try { parts.push(JSON.stringify(rawDetail)); } catch {}
    }
  }

  /* 3. 标题 */
  if (item.title) parts.push(String(item.title));

  /* ⭐ 4. 常见文本字段（含「付款内容提要」） */
  [
    '事项',
    '事项/明细',
    '报销事由',
    '费用类型',
    '明细',
    '备注',
    '事由',
    '用途',
    '摘要',
    '说明',
    '付款内容提要', // ⭐ 付款申请单用这个
    '付款事由',
    '付款用途',
  ].forEach((k) => {
    const v = fv[k];
    if (v == null || v === 'null' || v === '') return;
    if (typeof v === 'object') {
      try { parts.push(JSON.stringify(v)); } catch {}
    } else {
      parts.push(String(v));
    }
  });

  return parts.join(' ');
}

function resolveKeywordCategory(item: DingTalkReportItem): string | null {
  const text = collectItemText(item);
  if (!text) return null;

  for (const rule of KEYWORD_CATEGORY_RULES) {
    if (
      rule.applyTemplates &&
      rule.applyTemplates.length > 0 &&
      !rule.applyTemplates.includes(item.templateName || '')
    ) {
      continue;
    }
    if (rule.keywords.some((k) => k && text.includes(k))) {
      return rule.category;
    }
  }
  return null;
}

function resolvePayeeCategory(
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

  const categorizedResults = useMemo(() => {
    return filteredResults.map((r) => {
      const payee = r.payeeAccount || extractPayeeAccount(r.formValues || {});

      const payeeCategory = resolvePayeeCategory(payee);
      if (payeeCategory) {
        return {
          item: r,
          category: payeeCategory,
          overridden: true,
          overrideBy: 'payee' as const,
        };
      }

      const kwCategory = resolveKeywordCategory(r);
      if (kwCategory) {
        return {
          item: r,
          category: kwCategory,
          overridden: true,
          overrideBy: 'keyword' as const,
        };
      }

      return {
        item: r,
        category: r.templateName || '未知',
        overridden: false,
        overrideBy: null,
      };
    });
  }, [filteredResults]);

  const hasAnyOverride = useMemo(
    () => categorizedResults.some((c) => c.overridden),
    [categorizedResults]
  );

  const finalGrouped = useMemo(() => {
    if (excludedPayeeIds.size === 0 && !hasAnyOverride) return grouped;

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
  }, [grouped, categorizedResults, excludedPayeeIds, hasAnyOverride]);

  const storeCharts = useMemo(() => {
    const needRebuild = excludedPayeeIds.size > 0 || hasAnyOverride;

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
  }, [groupedByStore, finalGrouped, excludedPayeeIds, hasAnyOverride]);

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
        (c) => getStoreFromPaymentUnit(c.item.paymentUnit) === selectedStore
      );
    }
    if (selectedType) {
      exportResults = exportResults.filter((c) => c.category === selectedType);
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
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DingTalkReportPage;