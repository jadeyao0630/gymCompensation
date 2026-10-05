import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Search, ChevronDown, Store, X, RefreshCw, ChevronRight, Layers, Filter,
} from 'lucide-react';
import {
  PAYMENT_UNITS,
  PAYMENT_UNIT_TO_STORE,
  TEMPLATE_CATEGORY_ORDER,
  getTemplateCategory,
  type TemplateCategory,
  type ColumnKey,
} from '../utils/constants';
import type { DingTalkTemplate } from '../../../api/dingtalk';
import ColumnPicker from './ColumnPicker';
import { DateRangePicker } from '../../../components/DateRangePicker';

interface Props {
  start: string;
  end: string;
  paymentUnits: string[];
  templateTypes: string[];
  templates: DingTalkTemplate[];
  loadingTemplates: boolean;
  refreshingTemplates?: boolean;
  loading: boolean;
  meta: {
    totalCount: number;
    totalTemplates: number;
    costMs: number;
  } | null;
  visibleColumns: Set<ColumnKey>;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onTogglePaymentUnit: (u: string) => void;
  onSetPaymentUnits: (u: string[]) => void;
  onToggleTemplateType: (name: string) => void;
  onSetTemplateTypes?: (names: string[]) => void;
  onRefreshTemplates: () => void;
  onSearch: () => void;
  onToggleColumn: (key: ColumnKey) => void;
  onResetColumns: () => void;
}

const STORE_ORDER = ['哈德门', '富贵园'];

export const DingTalkFilterBar: React.FC<Props> = ({
  start, end, paymentUnits, templateTypes, templates, loadingTemplates,
  refreshingTemplates, loading, meta, visibleColumns,
  onStartChange, onEndChange, onTogglePaymentUnit, onSetPaymentUnits,
  onToggleTemplateType, onSetTemplateTypes, onRefreshTemplates, onSearch,
  onToggleColumn, onResetColumns,
}) => {
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [showTypePicker, setShowTypePicker] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<TemplateCategory>>(
    () => new Set()
  );

  /* 点击外部关闭 */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowUnitPicker(false);
      }
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) {
        setShowTypePicker(false);
      }
    };
    if (showUnitPicker || showTypePicker) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showUnitPicker, showTypePicker]);

  const groupedByStore = useMemo(() => {
    const map: Record<string, string[]> = {};
    PAYMENT_UNITS.forEach((u) => {
      const store = PAYMENT_UNIT_TO_STORE[u];
      if (!map[store]) map[store] = [];
      map[store].push(u);
    });
    return STORE_ORDER
      .filter((s) => map[s])
      .map((s) => ({ store: s, units: map[s] }));
  }, []);

  const templatesByCategory = useMemo(() => {
    const map: Record<TemplateCategory, DingTalkTemplate[]> = {
      假勤管理: [], 智能财务: [], 法务管理: [], 业务管理: [], 其他: [],
    };
    templates.forEach((t) => {
      const cat = getTemplateCategory(t.name);
      if (!map[cat]) map[cat] = [];
      map[cat].push(t);
    });
    return map;
  }, [templates]);

  const getStoreCheckState = (units: string[]) => {
    const checkedCount = units.filter((u) => paymentUnits.includes(u)).length;
    if (checkedCount === 0) return 'none';
    if (checkedCount === units.length) return 'all';
    return 'partial';
  };

  const toggleStore = (units: string[]) => {
    const state = getStoreCheckState(units);
    if (state === 'all') {
      onSetPaymentUnits(paymentUnits.filter((u) => !units.includes(u)));
    } else {
      const next = new Set([...paymentUnits, ...units]);
      onSetPaymentUnits(Array.from(next));
    }
  };

  const allSelected = paymentUnits.length === PAYMENT_UNITS.length;

  const getCategoryCheckState = (items: DingTalkTemplate[]) => {
    const names = items.map((t) => t.name);
    const checkedCount = names.filter((n) => templateTypes.includes(n)).length;
    if (checkedCount === 0) return 'none';
    if (checkedCount === names.length) return 'all';
    return 'partial';
  };

  const toggleCategory = (cat: TemplateCategory, items: DingTalkTemplate[]) => {
    if (!onSetTemplateTypes) {
      const state = getCategoryCheckState(items);
      items.forEach((t) => {
        const checked = templateTypes.includes(t.name);
        if (state === 'all' && checked) onToggleTemplateType(t.name);
        else if (state !== 'all' && !checked) onToggleTemplateType(t.name);
      });
      return;
    }
    const names = items.map((t) => t.name);
    const state = getCategoryCheckState(items);
    if (state === 'all') {
      onSetTemplateTypes(templateTypes.filter((n) => !names.includes(n)));
    } else {
      const next = new Set([...templateTypes, ...names]);
      onSetTemplateTypes(Array.from(next));
    }
  };

  const toggleCategoryExpand = (cat: TemplateCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const allCategoriesExpanded = TEMPLATE_CATEGORY_ORDER.every((c) =>
    expandedCategories.has(c)
  );
  const toggleAllCategories = () => {
    if (allCategoriesExpanded) setExpandedCategories(new Set());
    else setExpandedCategories(new Set(TEMPLATE_CATEGORY_ORDER));
  };

  const selectedTypeTags = templateTypes;

  const clearAllTypes = () => {
    if (onSetTemplateTypes) onSetTemplateTypes([]);
    else templateTypes.forEach((t) => onToggleTemplateType(t));
  };

  /* ⭐ 区间变化：同时刷新 start / end，不自动查询 */
  const handleRangeChange = (s: string, e: string) => {
    onStartChange(s);
    onEndChange(e);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
      {/* ⭐ 三列：日期范围 / 付款单位 / 流程类型 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 日期范围 */}
        <div>
          <DateRangePicker
            start={start}
            end={end}
            onChange={handleRangeChange}
            label="日期范围"
            size="md"
          />
        </div>

        {/* 付款单位多选 */}
        <div className="relative" ref={pickerRef}>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            付款单位（多选）
          </label>
          <button
            type="button"
            onClick={() => {
              setShowUnitPicker((v) => !v);
              setShowTypePicker(false);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between gap-1 min-h-[38px]"
          >
            <span className="truncate text-gray-700">
              {paymentUnits.length === 0 ? '全部' : `已选 ${paymentUnits.length} 个`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          </button>

          {showUnitPicker && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl border border-gray-200 shadow-xl p-2 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 mb-1">
                <span className="text-[11px] text-gray-400">按门店分组</span>
                <button
                  onClick={() =>
                    onSetPaymentUnits(allSelected ? [] : [...PAYMENT_UNITS])
                  }
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  {allSelected ? '清空全部' : '全选全部'}
                </button>
              </div>
              {groupedByStore.map(({ store, units }) => {
                const state = getStoreCheckState(units);
                return (
                  <div key={store} className="mb-1">
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-emerald-50 cursor-pointer text-xs bg-emerald-50/40 mb-0.5">
                      <input
                        type="checkbox"
                        checked={state === 'all'}
                        ref={(el) => {
                          if (el) el.indeterminate = state === 'partial';
                        }}
                        onChange={() => toggleStore(units)}
                        className="accent-emerald-600"
                      />
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-emerald-800">{store}</span>
                      <span className="text-[10px] text-emerald-600">
                        （{units.length}）
                      </span>
                    </label>
                    <div className="pl-5 space-y-0.5">
                      {units.map((u) => {
                        const checked = paymentUnits.includes(u);
                        return (
                          <label
                            key={u}
                            className="flex items-start gap-2 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onTogglePaymentUnit(u)}
                              className="mt-0.5 accent-blue-600"
                            />
                            <span className="text-gray-700 flex-1 min-w-0 break-words">
                              {u}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {paymentUnits.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {paymentUnits.map((u) => (
                <span
                  key={u}
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                >
                  [{PAYMENT_UNIT_TO_STORE[u]}] {u.length > 10 ? u.slice(0, 10) + '…' : u}
                  <button onClick={() => onTogglePaymentUnit(u)} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 流程类型 */}
        <div className="relative" ref={typePickerRef}>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            流程类型（不选=全部）
          </label>
          <button
            type="button"
            onClick={() => {
              setShowTypePicker((v) => !v);
              setShowUnitPicker(false);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between gap-1 min-h-[38px]"
          >
            <span className="truncate text-gray-700">
              {templateTypes.length === 0
                ? '全部'
                : `已选 ${templateTypes.length} 个`}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </button>

          {showTypePicker && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl border border-gray-200 shadow-xl p-2 max-h-96 overflow-y-auto w-full sm:w-80">
              <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 mb-1 gap-2 flex-wrap">
                <button
                  onClick={() =>
                    onSetTemplateTypes?.(
                      templateTypes.length === templates.length
                        ? []
                        : templates.map((t) => t.name)
                    )
                  }
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  {templateTypes.length === templates.length ? '清空全部' : '全选全部'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAllCategories}
                    className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-800"
                  >
                    <Layers className="w-3 h-3" />
                    {allCategoriesExpanded ? '收起' : '展开'}
                  </button>
                  <button
                    onClick={onRefreshTemplates}
                    disabled={refreshingTemplates}
                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {refreshingTemplates ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> 更新中…</>
                    ) : (
                      <><RefreshCw className="w-3 h-3" /> 更新</>
                    )}
                  </button>
                </div>
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-4 text-xs text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" /> 加载中
                </div>
              ) : templates.length === 0 ? (
                <div className="text-xs text-gray-400 py-4 text-center">暂无模板</div>
              ) : (
                <div className="space-y-1">
                  {TEMPLATE_CATEGORY_ORDER.map((cat) => {
                    const items = templatesByCategory[cat] || [];
                    if (items.length === 0) return null;
                    const isExpanded = expandedCategories.has(cat);
                    const state = getCategoryCheckState(items);
                    const selectedCount = items.filter((t) =>
                      templateTypes.includes(t.name)
                    ).length;

                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-indigo-50 cursor-pointer">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategoryExpand(cat);
                            }}
                            className="p-0.5 text-gray-400 hover:text-gray-600"
                          >
                            <ChevronRight
                              className={`w-3 h-3 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                          <input
                            type="checkbox"
                            checked={state === 'all'}
                            ref={(el) => {
                              if (el) el.indeterminate = state === 'partial';
                            }}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleCategory(cat, items);
                            }}
                            className="accent-indigo-600"
                          />
                          <span
                            onClick={() => toggleCategoryExpand(cat)}
                            className="text-xs font-semibold text-indigo-800 flex-1"
                          >
                            {cat}
                          </span>
                          <span className="text-[10px] text-indigo-500">
                            {selectedCount}/{items.length}
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="pl-7 space-y-0.5 mt-0.5">
                            {items.map((t) => {
                              const checked = templateTypes.includes(t.name);
                              return (
                                <label
                                  key={t.processCode}
                                  className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-blue-50 cursor-pointer text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => onToggleTemplateType(t.name)}
                                    className="accent-blue-600"
                                  />
                                  <span className="truncate">{t.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedTypeTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 max-h-16 overflow-y-auto">
              {selectedTypeTags.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {t.length > 8 ? t.slice(0, 8) + '…' : t}
                  <button onClick={() => onToggleTemplateType(t)} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedTypeTags.length > 5 && (
                <span className="text-[10px] text-gray-400 px-1.5 py-0.5">
                  +{selectedTypeTags.length - 5}
                </span>
              )}
              <button
                onClick={clearAllTypes}
                className="text-[10px] text-gray-400 hover:text-gray-700 underline ml-1"
              >
                清空
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={onSearch}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 查询中…</>
          ) : (
            <><Search className="w-4 h-4" /> 查询</>
          )}
        </button>

        <ColumnPicker
          visibleColumns={visibleColumns}
          onToggle={onToggleColumn}
          onReset={onResetColumns}
        />

        {meta && (
          <div className="ml-auto text-xs text-gray-500">
            命中 <span className="font-semibold text-blue-700">{meta.totalCount}</span> 条
            · 扫描 <span className="font-semibold">{meta.totalTemplates}</span> 个模板
            · 耗时 {(meta.costMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
};

export default DingTalkFilterBar;