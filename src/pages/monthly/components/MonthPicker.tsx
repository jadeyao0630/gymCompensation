import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** 当前选中月份，格式 'YYYY-MM' */
  value: string;
  /** 选中回调（仅在确认选月后触发） */
  onChange: (month: string) => void;
  /** 是否禁用（如加载中） */
  disabled?: boolean;
  /** 允许选择的最早年份，默认当前年 - 10 */
  minYear?: number;
  /** 允许选择的最晚年份，默认当前年 + 1 */
  maxYear?: number;
  /** 亮/暗主题：头部渐变上一般用 'dark' */
  variant?: 'light' | 'dark';
}

const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

export const MonthPicker: React.FC<Props> = ({
  value,
  onChange,
  disabled = false,
  minYear,
  maxYear,
  variant = 'light',
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const min = minYear ?? currentYear - 10;
  const max = maxYear ?? currentYear + 1;

  const [open, setOpen] = useState(false);

  /* 解析当前值 */
  const parsed = useMemo(() => {
    const [y, m] = (value || '').split('-').map(Number);
    return {
      year: Number.isFinite(y) ? y : currentYear,
      month: Number.isFinite(m) ? m : currentMonth,
    };
  }, [value, currentYear, currentMonth]);

  /* 面板内正在浏览的年份（未确认选择时不会改变外部 value） */
  const [viewYear, setViewYear] = useState(parsed.year);

  useEffect(() => {
    if (open) setViewYear(parsed.year);
  }, [open, parsed.year]);

  const wrapRef = useRef<HTMLDivElement>(null);

  /* 点击外部关闭 + Esc 关闭 */
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

  const handlePickMonth = (m: number) => {
    onChange(`${viewYear}-${pad2(m)}`);
    setOpen(false);
  };

  const handlePickCurrent = () => {
    onChange(`${currentYear}-${pad2(currentMonth)}`);
    setOpen(false);
  };

  /* ------- 触发按钮样式 ------- */
  const triggerCls =
    variant === 'dark'
      ? 'bg-white/15 hover:bg-white/25 border-white/25 text-white'
      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700';

  const iconCls =
    variant === 'dark' ? 'text-white/90' : 'text-gray-500';

  return (
    <div ref={wrapRef} className="relative inline-block">
      {/* 触发按钮 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${triggerCls}`}
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
        <div
          className="absolute left-0 top-full mt-2 z-50 w-[280px] rounded-2xl bg-white border border-gray-200 shadow-xl p-3"
        >
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
                className="w-20 text-center text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
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
              const isSelected =
                viewYear === parsed.year && m === parsed.month;
              const isCurrent =
                viewYear === currentYear && m === currentMonth;

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handlePickMonth(m)}
                  className={[
                    'h-9 rounded-lg text-sm font-medium transition active:scale-[0.97]',
                    isSelected
                      ? 'bg-rose-600 text-white shadow-md'
                      : isCurrent
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 底部快捷 */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handlePickCurrent}
              className="text-rose-600 hover:text-rose-700 font-medium"
            >
              回到本月
            </button>
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

export default MonthPicker;