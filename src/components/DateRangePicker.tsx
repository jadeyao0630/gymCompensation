import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

/* ============================================================
 * 工具
 * ============================================================ */
const pad2 = (n: number) => String(n).padStart(2, '0');

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDate = (s: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const isSameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isBetween = (d: Date, a: Date | null, b: Date | null) => {
  if (!a || !b) return false;
  const t = d.getTime();
  const s = Math.min(a.getTime(), b.getTime());
  const e = Math.max(a.getTime(), b.getTime());
  return t > s && t < e;
};

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const WEEK_LABELS = ['一','二','三','四','五','六','日'];

/** 生成某月的 6×7 网格（周一为一周第一天） */
function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month - 1, 1);
  // getDay() 周日=0，转成「周一=0」
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month - 1, d));
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}

/* ============================================================
 * 快捷区间
 * ============================================================ */
type QuickKey =
  | 'today' | 'yesterday'
  | 'week'  | 'lastWeek'
  | 'month' | 'lastMonth'
  | 'quarter' | 'last7' | 'last30' | 'ytd';

function getQuickRange(key: QuickKey): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (key) {
    case 'today':
      return { start: fmtDate(now), end: fmtDate(now) };
    case 'yesterday': {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      return { start: fmtDate(d), end: fmtDate(d) };
    }
    case 'week': {
      const day = (now.getDay() + 6) % 7;      // 周一=0
      const first = new Date(now); first.setDate(now.getDate() - day);
      return { start: fmtDate(first), end: fmtDate(now) };
    }
    case 'lastWeek': {
      const day = (now.getDay() + 6) % 7;
      const firstThis = new Date(now); firstThis.setDate(now.getDate() - day);
      const lastPrev = new Date(firstThis); lastPrev.setDate(firstThis.getDate() - 1);
      const firstPrev = new Date(lastPrev); firstPrev.setDate(lastPrev.getDate() - 6);
      return { start: fmtDate(firstPrev), end: fmtDate(lastPrev) };
    }
    case 'month': {
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      return { start: fmtDate(first), end: fmtDate(last) };
    }
    case 'lastMonth': {
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      return { start: fmtDate(first), end: fmtDate(last) };
    }
    case 'quarter': {
      const first = new Date(y, m - 2, 1);
      return { start: fmtDate(first), end: fmtDate(now) };
    }
    case 'last7': {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { start: fmtDate(d), end: fmtDate(now) };
    }
    case 'last30': {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { start: fmtDate(d), end: fmtDate(now) };
    }
    case 'ytd': {
      const first = new Date(y, 0, 1);
      return { start: fmtDate(first), end: fmtDate(now) };
    }
  }
}

const QUICK_ITEMS: { key: QuickKey; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'week', label: '本周' },
  { key: 'lastWeek', label: '上周' },
  { key: 'month', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'last7', label: '近 7 天' },
  { key: 'last30', label: '近 30 天' },
  { key: 'quarter', label: '近 3 月' },
  { key: 'ytd', label: '今年至今' },
];

/* ============================================================
 * 组件
 * ============================================================ */
export interface DateRangePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  /** 触发按钮前的小标签，比如 "日期范围" */
  label?: string;
  /** 面板宽度：'md' = 双月历（默认），'sm' = 单月历 */
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** 自定义快捷项子集（默认全量） */
  quickKeys?: QuickKey[];
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  start,
  end,
  onChange,
  label,
  size = 'md',
  disabled = false,
  quickKeys,
}) => {
  const [open, setOpen] = useState(false);

  /* 面板内部临时选择（未点确定前不影响外部） */
  const [tmpStart, setTmpStart] = useState<string>(start);
  const [tmpEnd, setTmpEnd] = useState<string>(end);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [pickingEnd, setPickingEnd] = useState<boolean>(false);

  /* 面板可见的月份：从 start 所在月份开始 */
  const [viewYear, setViewYear] = useState<number>(() => {
    const d = parseDate(start) || new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const d = parseDate(start) || new Date();
    return d.getMonth() + 1;
  });

  const wrapRef = useRef<HTMLDivElement>(null);

  /* 打开时同步外部值 */
  useEffect(() => {
    if (!open) return;
    setTmpStart(start);
    setTmpEnd(end);
    setPickingEnd(false);
    setHoverDate(null);
    const d = parseDate(start) || new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }, [open, start, end]);

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

  /* 计算双月历要展示的两个月 */
  const months = useMemo(() => {
    const list: { year: number; month: number }[] = [];
    const count = size === 'md' ? 2 : 1;
    let y = viewYear;
    let m = viewMonth;
    for (let i = 0; i < count; i++) {
      list.push({ year: y, month: m });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return list;
  }, [viewYear, viewMonth, size]);

  const goPrev = () => {
    let y = viewYear;
    let m = viewMonth - 1;
    if (m < 1) { m = 12; y--; }
    setViewYear(y); setViewMonth(m);
  };
  const goNext = () => {
    let y = viewYear;
    let m = viewMonth + 1;
    if (m > 12) { m = 1; y++; }
    setViewYear(y); setViewMonth(m);
  };

  const tmpStartDate = parseDate(tmpStart);
  const tmpEndDate = parseDate(tmpEnd);

  /* 点击某一天 */
  const handleDayClick = (d: Date) => {
    const s = fmtDate(d);
    if (!pickingEnd) {
      // 第一次点击：重设 start，进入选 end 阶段
      setTmpStart(s);
      setTmpEnd('');
      setPickingEnd(true);
    } else {
      // 第二次点击：比较大小
      const a = parseDate(tmpStart);
      if (a && d.getTime() < a.getTime()) {
        // 先点后点颠倒 → 交换
        setTmpStart(s);
        setTmpEnd(fmtDate(a));
      } else {
        setTmpEnd(s);
      }
      setPickingEnd(false);
    }
  };

  /* 应用快捷区间 */
  const applyQuick = (key: QuickKey) => {
    const r = getQuickRange(key);
    setTmpStart(r.start);
    setTmpEnd(r.end);
    setPickingEnd(false);
    const d = parseDate(r.start) || new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  };

  /* 确认 / 清除 */
  const handleConfirm = () => {
    if (!tmpStart || !tmpEnd) return;
    onChange(tmpStart, tmpEnd);
    setOpen(false);
  };
  const handleClear = () => {
    setTmpStart('');
    setTmpEnd('');
    setPickingEnd(false);
  };

  const displayText =
    start && end ? `${start} ~ ${end}` : '请选择日期范围';

  const activeQuickKeys = quickKeys ?? QUICK_ITEMS.map((q) => q.key);
  const activeQuickItems = QUICK_ITEMS.filter((q) => activeQuickKeys.includes(q.key));

  const canConfirm = !!tmpStart && !!tmpEnd;

  return (
    <div ref={wrapRef} className="relative inline-block w-full">
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
        </label>
      )}

      {/* 触发按钮 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm transition hover:bg-white disabled:opacity-50 ${
          open
            ? 'border-blue-400 ring-2 ring-blue-500/20'
            : 'border-gray-200'
        }`}
      >
        <span className={`truncate tabular-nums ${start && end ? 'text-gray-700' : 'text-gray-400'}`}>
          {displayText}
        </span>
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {/* 面板 */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl border border-gray-200 shadow-2xl p-3"
          style={{ width: size === 'md' ? 640 : 320 }}
        >
          {/* 快捷区 */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeQuickItems.map((q) => (
              <button
                key={q.key}
                type="button"
                onClick={() => applyQuick(q.key)}
                className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* 月份头 */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={goPrev}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex items-center justify-center gap-6 text-sm font-semibold text-gray-800 tabular-nums">
              {months.map((mo) => (
                <span key={`${mo.year}-${mo.month}`}>
                  {mo.year} 年 {mo.month} 月
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 双月历 */}
          <div className={`grid gap-4 ${size === 'md' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {months.map((mo) => {
              const cells = buildMonthGrid(mo.year, mo.month);
              return (
                <div key={`${mo.year}-${mo.month}`}>
                  {/* 星期表头 */}
                  <div className="grid grid-cols-7 mb-1">
                    {WEEK_LABELS.map((w) => (
                      <div
                        key={w}
                        className="text-center text-[10px] text-gray-400 py-1"
                      >
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* 日期格 */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((d, idx) => {
                      if (!d) {
                        return <div key={idx} className="h-8" />;
                      }
                      const s = fmtDate(d);
                      const isStart = isSameDay(d, parseDate(tmpStart));
                      const isEnd = isSameDay(d, parseDate(tmpEnd));
                      const inRange = isBetween(d, parseDate(tmpStart), parseDate(tmpEnd));
                      const previewEnd =
                        pickingEnd && tmpStartDate && hoverDate
                          ? hoverDate
                          : null;
                      const previewRange = previewEnd
                        ? isBetween(d, tmpStartDate, previewEnd)
                        : false;
                      const isToday = isSameDay(d, new Date());

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleDayClick(d)}
                          onMouseEnter={() => setHoverDate(d)}
                          onMouseLeave={() => setHoverDate(null)}
                          className={[
                            'h-8 rounded-md text-xs tabular-nums transition relative',
                            isStart || isEnd
                              ? 'bg-blue-600 text-white font-semibold shadow-sm'
                              : inRange || previewRange
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100',
                            isToday && !isStart && !isEnd
                              ? 'ring-1 ring-blue-300'
                              : '',
                          ].join(' ')}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部状态 + 操作 */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-gray-500 tabular-nums">
              {tmpStart && tmpEnd ? (
                <>
                  已选：
                  <span className="font-semibold text-gray-700 ml-1">
                    {tmpStart} ~ {tmpEnd}
                  </span>
                </>
              ) : pickingEnd ? (
                <span className="text-blue-600">请选择结束日期</span>
              ) : (
                <span className="text-gray-400">请选择开始日期</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" /> 清除
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={handleConfirm}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-3 h-3" /> 确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
export { getQuickRange };
export type { QuickKey };