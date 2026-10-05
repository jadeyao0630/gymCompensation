import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface Props {
  /** 当前选中月份，格式 'YYYY-MM' */
  value: string;
  /** 可用月份列表（该月有薪酬方案配置） */
  availableMonths: string[];
  /** 选中回调（仅在选中可用月时触发） */
  onChange: (month: string) => void;
  /** 是否禁用（如加载中） */
  disabled?: boolean;
  /** 允许浏览的最早年份，默认当前年 - 5 */
  minYear?: number;
  /** 允许浏览的最晚年份，默认当前年 + 1 */
  maxYear?: number;
}

const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

export const PayrollMonthPicker: React.FC<Props> = ({
  value,
  availableMonths,
  onChange,
  disabled = false,
  minYear,
  maxYear,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const min = minYear ?? currentYear - 5;
  const max = maxYear ?? currentYear + 1;

  /* ⭐ 可用月份集合，O(1) 判定 */
  const availableSet = useMemo(
    () => new Set(availableMonths || []),
    [availableMonths]
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

  const handlePick = (m: number) => {
    const month = `${viewYear}-${pad2(m)}`;
    if (!availableSet.has(month)) return; // 不可选，直接忽略
    onChange(month);
    setOpen(false);
  };

  /* 当前展示年份里，有几个可选月 */
  const availableCountInYear = useMemo(() => {
    let n = 0;
    for (let m = 1; m <= 12; m++) {
      if (availableSet.has(`${viewYear}-${pad2(m)}`)) n++;
    }
    return n;
  }, [availableSet, viewYear]);

  return (
    <div ref={wrapRef} className="relative inline-block">
      {/* 触发按钮 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CalendarDays className="w-4 h-4 text-gray-500" />
        <span className="tabular-nums font-medium text-gray-700">
          {parsed.year} 年 {parsed.month} 月
        </span>
        <ChevronRight
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
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
                className="w-20 text-center text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

          {/* 12 个月宫格 */}
          <div className="grid grid-cols-3 gap-2">
            {MONTH_LABELS.map((label, i) => {
              const m = i + 1;
              const monthKey = `${viewYear}-${pad2(m)}`;
              const isAvailable = availableSet.has(monthKey);
              const isSelected =
                viewYear === parsed.year && m === parsed.month;
              const isCurrent =
                viewYear === currentYear && m === currentMonth;

              /* 不可选：灰色 + 禁用 + 小锁感 */
              if (!isAvailable) {
                return (
                  <button
                    key={m}
                    type="button"
                    disabled
                    title="该月暂无薪酬配置"
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
                  {/* ⭐ 可选月份右上角小绿点 */}
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

          {/* 底部信息 */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {availableCountInYear > 0
                ? `${viewYear} 年有 ${availableCountInYear} 个月可算`
                : `${viewYear} 年暂无可算月份`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollMonthPicker;