import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Search, ChevronDown, Store, X, RefreshCw, ChevronRight, Layers,
  Calendar, Filter,
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

/* 日期格式校验 */
function isValidDate(str: string): boolean {
  if (!str) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return !isNaN(d.getTime());
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function getQuickRange(key: 'today' | 'month' | 'lastMonth' | 'quarter') {
  const now = new Date();
  if (key === 'today') {
    const s = fmtDate(now);
    return { start: s, end: s };
  }
  if (key === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: fmtDate(first), end: fmtDate(last) };
  }
  if (key === 'lastMonth') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmtDate(first), end: fmtDate(last) };
  }
  const d = new Date(now);
  d.setMonth(d.getMonth() - 2);
  d.setDate(1);
  return { start: fmtDate(d), end: fmtDate(now) };
}

export const DingTalkFilterBar: React.FC<Props> = ({
  start, end, paymentUnits, templateTypes, templates, loadingTemplates,
  refreshingTemplates, loading, meta, visibleColumns,
  onStartChange, onEndChange, onTogglePaymentUnit, onSetPaymentUnits,
  onToggleTemplateType, onSetTemplateTypes, onRefreshTemplates, onSearch,
  onToggleColumn, onResetColumns,
}) => {
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  /* ⭐ 流程类型下拉 */
  const [showTypePicker, setShowTypePicker] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<TemplateCategory>>(
    () => new Set()
  );

  /* 日期输入的本地副本 */
  const [startInput, setStartInput] = useState(start);
  const [endInput, setEndInput] = useState(end);

  useEffect(() => {
    setStartInput(start);
  }, [start]);
  useEffect(() => {
    setEndInput(end);
  }, [end]);

  const handleStartInput = (v: string) => {
    setStartInput(v);
    if (isValidDate(v)) onStartChange(v);
  };

  const handleEndInput = (v: string) => {
    setEndInput(v);
    if (isValidDate(v)) onEndChange(v);
  };

  const startValid = !startInput || isValidDate(startInput);
  const endValid = !endInput || isValidDate(endInput);

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

  /* ⭐ 流程类型 - 分类 checkbox 状态 */
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

  /* 快捷日期 */
  const applyQuick = (key: 'today' | 'month' | 'lastMonth' | 'quarter') => {
    const r = getQuickRange(key);
    setStartInput(r.start);
    setEndInput(r.end);
    onStartChange(r.start);
    onEndChange(r.end);
  };

  /* 打开日期选择器 */
  const openPicker = (
    inputEl: HTMLInputElement | null,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!inputEl) return;
    if (typeof (inputEl as any).showPicker === 'function') {
      try {
        (inputEl as any).showPicker();
        return;
      } catch {
        /* ignore */
      }
    }
    inputEl.focus();
  };

  /* ⭐ 已选流程类型标签 */
  const selectedTypeTags = templateTypes;

  /* ⭐ 清空全部类型 */
  const clearAllTypes = () => {
    if (onSetTemplateTypes) onSetTemplateTypes([]);
    else templateTypes.forEach((t) => onToggleTemplateType(t));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
      {/* ⭐ 四列同行：开始日期 / 结束日期 / 付款单位 / 流程类型 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 开始日期 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            开始日期
          </label>
          <div
            className={`relative flex items-center border rounded-lg bg-gray-50 focus-within:ring-2 ${
              startValid
                ? 'border-gray-200 focus-within:ring-blue-500'
                : 'border-red-300 focus-within:ring-red-400'
            }`}
          >
            <input
              type="text"
              value={startInput}
              placeholder="YYYY-MM-DD"
              onChange={(e) => handleStartInput(e.target.value)}
              onBlur={() => {
                if (isValidDate(startInput)) onStartChange(startInput);
              }}
              className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none tabular-nums"
            />
            <input
              type="date"
              value={isValidDate(startInput) ? startInput : ''}
              onChange={(e) => handleStartInput(e.target.value)}
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={(e) => {
                const picker = (e.currentTarget.parentElement?.querySelector(
                  'input[type="date"]'
                ) as HTMLInputElement) || null;
                openPicker(picker, e);
              }}
              className="px-2 py-2 text-gray-400 hover:text-blue-600"
              title="打开日历"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          {!startValid && (
            <p className="text-[11px] text-red-500 mt-1">格式应为 YYYY-MM-DD</p>
          )}
        </div>

        {/* 结束日期 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            结束日期
          </label>
          <div
            className={`relative flex items-center border rounded-lg bg-gray-50 focus-within:ring-2 ${
              endValid
                ? 'border-gray-200 focus-within:ring-blue-500'
                : 'border-red-300 focus-within:ring-red-400'
            }`}
          >
            <input
              type="text"
              value={endInput}
              placeholder="YYYY-MM-DD"
              onChange={(e) => handleEndInput(e.target.value)}
              onBlur={() => {
                if (isValidDate(endInput)) onEndChange(endInput);
              }}
              className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none tabular-nums"
            />
            <input
              type="date"
              value={isValidDate(endInput) ? endInput : ''}
              onChange={(e) => handleEndInput(e.target.value)}
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={(e) => {
                const picker = (e.currentTarget.parentElement?.querySelector(
                  'input[type="date"]'
                ) as HTMLInputElement) || null;
                openPicker(picker, e);
              }}
              className="px-2 py-2 text-gray-400 hover:text-blue-600"
              title="打开日历"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          {!endValid && (
            <p className="text-[11px] text-red-500 mt-1">格式应为 YYYY-MM-DD</p>
          )}
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

        {/* ⭐ 流程类型：改成下拉面板 */}
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
              {/* 顶部：全选 / 展开 / 更新 */}
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

              {/* 模板列表 */}
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

          {/* ⭐ 已选流程类型标签 */}
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

      {/* 快捷日期按钮 */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-gray-400 mr-1">快捷：</span>
        <button
          type="button"
          onClick={() => applyQuick('today')}
          className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
        >
          今天
        </button>
        <button
          type="button"
          onClick={() => applyQuick('month')}
          className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
        >
          本月
        </button>
        <button
          type="button"
          onClick={() => applyQuick('lastMonth')}
          className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
        >
          上月
        </button>
        <button
          type="button"
          onClick={() => applyQuick('quarter')}
          className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
        >
          近3月
        </button>
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