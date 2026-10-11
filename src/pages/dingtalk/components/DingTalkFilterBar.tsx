import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Search, ChevronDown, Store, X, RefreshCw, ChevronRight, Layers, Filter,
  CheckCircle2, Circle, Ban, Plus, RotateCcw,
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
import { DateRangePicker } from '../../../components/common/DateRangePicker';

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
  onlyApproved: boolean;
  onToggleOnlyApproved: () => void;
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

  /* ⭐ 收款账户排除规则 */
  excludeAccounts: string[];
  excludeKeywords: string[];
  onAddExcludeAccount: (v: string) => void;
  onRemoveExcludeAccount: (v: string) => void;
  onAddExcludeKeyword: (v: string) => void;
  onRemoveExcludeKeyword: (v: string) => void;
  onClearExcludeRules: () => void;
}

const STORE_ORDER = ['哈德门', '富贵园'];

export const DingTalkFilterBar: React.FC<Props> = ({
  start, end, paymentUnits, templateTypes, templates, loadingTemplates,
  refreshingTemplates, loading, meta, visibleColumns,
  onlyApproved, onToggleOnlyApproved,
  onStartChange, onEndChange, onTogglePaymentUnit, onSetPaymentUnits,
  onToggleTemplateType, onSetTemplateTypes, onRefreshTemplates, onSearch,
  onToggleColumn, onResetColumns,
  /* ⭐ 排除规则 */
  excludeAccounts, excludeKeywords,
  onAddExcludeAccount, onRemoveExcludeAccount,
  onAddExcludeKeyword, onRemoveExcludeKeyword, onClearExcludeRules,
}) => {
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [showTypePicker, setShowTypePicker] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<TemplateCategory>>(
    () => new Set()
  );

  /* ⭐ 排除规则面板的展开状态 + 输入 */
  const [excludeExpanded, setExcludeExpanded] = useState(false);
  const [accountInput, setAccountInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

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

  const handleRangeChange = (s: string, e: string) => {
    onStartChange(s);
    onEndChange(e);
  };

  /* ⭐ 排除规则的操作 */
  const handleAddAccount = () => {
    if (!accountInput.trim()) return;
    onAddExcludeAccount(accountInput.trim());
    setAccountInput('');
  };
  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    onAddExcludeKeyword(keywordInput.trim());
    setKeywordInput('');
  };

  const totalExcludeRules = excludeAccounts.length + excludeKeywords.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
      {/* 三列：日期范围 / 付款单位 / 流程类型 */}
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

      {/* ⭐ 收款账户排除规则 */}
      <div className="border-t border-gray-100 pt-3 mt-4">
        <button
          type="button"
          onClick={() => setExcludeExpanded((v) => !v)}
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
        >
          <Ban className="w-3.5 h-3.5 text-rose-500" />
          <span className="font-medium">收款账户排除规则</span>
          {totalExcludeRules > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
              {totalExcludeRules} 条生效
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
              excludeExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {excludeExpanded && (
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 精确账户 */}
            <div>
              <div className="text-[11px] text-gray-500 mb-1.5">
                排除指定账户（完全匹配）
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAccount();
                    }
                  }}
                  placeholder="输入账户名后回车"
                  className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  onClick={handleAddAccount}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {excludeAccounts.length === 0 && (
                  <span className="text-[11px] text-gray-400">暂无排除账户</span>
                )}
                {excludeAccounts.map((acc) => (
                  <span
                    key={acc}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]"
                  >
                    {acc}
                    <button
                      type="button"
                      onClick={() => onRemoveExcludeAccount(acc)}
                      className="text-rose-400 hover:text-rose-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 关键字 */}
            <div>
              <div className="text-[11px] text-gray-500 mb-1.5">
                排除关键字（包含匹配）
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="输入关键字后回车"
                  className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {excludeKeywords.length === 0 && (
                  <span className="text-[11px] text-gray-400">暂无排除关键字</span>
                )}
                {excludeKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => onRemoveExcludeKeyword(kw)}
                      className="text-rose-400 hover:text-rose-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 清空按钮 */}
            <div className="lg:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={onClearExcludeRules}
                disabled={totalExcludeRules === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 text-[11px] disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3" />
                清空全部规则
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作行 */}
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

        <button
          type="button"
          onClick={onToggleOnlyApproved}
          title={
            onlyApproved
              ? '当前只查询【已完成且同意】的流程，点击切换为查询全部状态'
              : '当前查询【全部状态】的流程（含审批中、已撤销等），点击切换为只查询已通过'
          }
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
            onlyApproved
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          {onlyApproved ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <Circle className="w-3.5 h-3.5" />
          )}
          {onlyApproved ? '只看已通过' : '全部状态'}
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