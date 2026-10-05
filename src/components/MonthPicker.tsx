import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface MonthPickerProps {
  /** 当前选中月份，格式 'YYYY-MM' */
  value: string;
  /** 选中回调 */
  onChange: (month: string) => void;

  /**
   * 可用月份列表；
   * - 传数组 → 只有列表里的月份可选，其它灰掉不可点
   * - 传 undefined 且 allowAnyMonth=false → 所有月份灰掉（相当于禁用）
   */
  availableMonths?: string[];

  /** true → 忽略 availableMonths，任何月份都可选（配置页「快速切月」用） */
  allowAnyMonth?: boolean;

  /** 是否禁用整个选择器 */
  disabled?: boolean;

  /** 主题：light（白底）/ dark（深色头部） */
  theme?: 'light' | 'dark';

  /** 尺寸 */
  size?: 'sm' | 'md';

  /** 面板底部是否显示「N 个月可算」提示 */
  showHint?: boolean;

  /** 面板提示文案（可选月份时的提示，默认「该月暂无薪酬配置」） */
  unavailableHint?: string;

  minYear?: number;
  maxYear?: number;
}

const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  availableMonths,
  allowAnyMonth = false,
  disabled = false,
  theme = 'light',
  size = 'md',
  showHint = true,
  unavailableHint = '该月暂无方案',
  minYear,
  maxYear,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const min = minYear ?? currentYear - 5;
  const max = maxYear ?? currentYear + 1;

  /* 可用月份集合（allowAnyMonth 时忽略） */
  const availableSet = useMemo(
    () => new Set(allowAnyMonth ? [] : availableMonths || []),
    [availableMonths, allowAnyMonth]
  );

  const [open, setOpen] = useState(false);

  const parsed = useMemo(() => {
    const [y, m] = (value || '').split('-').map(Number);
    return {
      year: Number.isFinite(y) ? y : currentYear,
      month: Number.isFinite(m) ? m : currentMonth,
    };
  }, [value, currentYear, currentMonth]);

  const [viewYear, setViewYear] = useState(parsed.year);

  useEffect(() => {
    if (open) setViewYear(parsed.year);
  }, [open, parsed.year]);

  const wrapRef = useRef<HTMLDivElement>(null);

  /* 点击外部 / Esc 关闭 */
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const canPrev = viewYear > min;
  const canNext = viewYear < max;

  const isAvailable = (monthKey: string) =>
    allowAnyMonth || availableSet.has(monthKey);

  const handlePick = (m: number) => {
    const month = `${viewYear}-${pad2(m)}`;
    if (!isAvailable(month)) return;
    onChange(month);
    setOpen(false);
  };

  /* 当前年份可选月数 */
  const availableCountInYear = useMemo(() => {
    if (allowAnyMonth) return 12;
    let n = 0;
    for (let m = 1; m <= 12; m++) {
      if (availableSet.has(`${viewYear}-${pad2(m)}`)) n++;
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSet, viewYear, allowAnyMonth]);

  /* ---------- 主题样式 ---------- */
  const triggerCls =
    theme === 'dark'
      ? 'bg-white/15 hover:bg-white/25 border-white/25 text-white'
      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700';

  const iconCls = theme === 'dark' ? 'text-white/80' : 'text-gray-500';

  const sizeCls =
    size === 'sm' ? 'px-2.5 py-1.5 text-xs gap-1.5' : 'px-3 py-2 text-sm gap-2';

  const yearInputFocusRing =
    'focus:ring-emerald-500'; // 三处统一绿色主题

  return (
    <div ref={wrapRef} className="relative inline-block">
      {/* 触发按钮 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center rounded-xl border shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${triggerCls} ${sizeCls}`}
      >
        <CalendarDays className={`w-4 h-4 ${iconCls}`} />
        <span className="tabular-nums font-medium">
          {parsed.year} 年 {parsed.month} 月
        </span>
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform ${iconCls} ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* 面板 */}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[300px] rounded-2xl bg-white border border-gray-200 shadow-xl p-3">
          {/* 年份切换 */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => canPrev && setViewYear((y) => y - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={viewYear}
                min={min}
                max={max}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= min && v <= max) {
                    setViewYear(v);
                  }
                }}
                className={`w-20 text-center text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 tabular-nums focus:outline-none focus:ring-2 ${yearInputFocusRing}`}
              />
              <span className="text-sm text-gray-500">年</span>
            </div>

            <button
              type="button"
              disabled={!canNext}
              onClick={() => canNext && setViewYear((y) => y + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 12 月宫格 */}
          <div className="grid grid-cols-3 gap-2">
            {MONTH_LABELS.map((label, i) => {
              const m = i + 1;
              const monthKey = `${viewYear}-${pad2(m)}`;
              const avail = isAvailable(monthKey);
              const isSelected =
                viewYear === parsed.year && m === parsed.month;
              const isCurrent =
                viewYear === currentYear && m === currentMonth;

              if (!avail) {
                return (
                  <button
                    key={m}
                    type="button"
                    disabled
                    title={unavailableHint}
                    className="relative h-9 rounded-lg text-sm font-medium text-gray-300 bg-gray-50 cursor-not-allowed"
                  >
                    {label}
                  </button>
                );
              }

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handlePick(m)}
                  className={[
                    'relative h-9 rounded-lg text-sm font-medium transition active:scale-[0.97]',
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md'
                      : isCurrent
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700',
                  ].join(' ')}
                >
                  {label}
                  {!isSelected && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  {isSelected && (
                    <Check className="absolute top-1 right-1 w-3 h-3" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 底部 */}
          {showHint && (
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {allowAnyMonth
                  ? '任何月份均可选择'
                  : availableCountInYear > 0
                  ? `${viewYear} 年有 ${availableCountInYear} 个月可选`
                  : `${viewYear} 年暂无可用月份`}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthPicker;