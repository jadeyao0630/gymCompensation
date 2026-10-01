import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

type QuickKey = 'today' | 'week' | 'month' | 'lastMonth' | 'quarter';

interface Props {
  beginDate: string;
  endDate: string;
  loading?: boolean;
  onChange: (begin: string, end: string) => void;
  onQuick?: (range: QuickKey) => void;
  onRefresh: () => void;
}

/* 日期格式化 */
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/* 月份范围 */
function getMonthRange(month: string): { begin: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { begin: fmtDate(first), end: fmtDate(last) };
}

function getLastMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ⭐ 计算每个快捷按钮对应的日期范围 */
function calcQuickRange(range: QuickKey): { begin: string; end: string } {
  const now = new Date();
  let begin = '';
  let end = fmtDate(now);

  switch (range) {
    case 'today':
      begin = fmtDate(now);
      break;
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      begin = fmtDate(d);
      break;
    }
    case 'month': {
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const r = getMonthRange(month);
      begin = r.begin;
      end = r.end;
      break;
    }
    case 'lastMonth': {
      const r = getMonthRange(getLastMonth());
      begin = r.begin;
      end = r.end;
      break;
    }
    case 'quarter': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 2);
      d.setDate(1);
      begin = fmtDate(d);
      break;
    }
  }
  return { begin, end };
}

/* 快捷按钮定义 */
const QUICK_BUTTONS: { key: QuickKey; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: 'week', label: '近7天' },
  { key: 'month', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'quarter', label: '近3月' },
];

export const DateRangePicker: React.FC<Props> = ({
  beginDate,
  endDate,
  loading,
  onChange,
  onQuick,
  onRefresh,
}) => {
  /* ⭐ 根据当前 beginDate / endDate 推断激活的快捷按钮 */
  const activeQuick = useMemo<QuickKey | null>(() => {
    if (!beginDate || !endDate) return null;
    for (const { key } of QUICK_BUTTONS) {
      const r = calcQuickRange(key);
      if (r.begin === beginDate && r.end === endDate) return key;
    }
    return null;
  }, [beginDate, endDate]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <label className="text-sm font-medium text-gray-600">日期范围</label>
        </div>

        <input
          type="date"
          value={beginDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-gray-400 text-sm">至</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange(beginDate, e.target.value)}
          className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {/* ⭐ 快捷按钮：匹配时高亮 */}
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_BUTTONS.map(({ key, label }) => {
            const isActive = activeQuick === key;
            return (
              <button
                key={key}
                onClick={() => onQuick?.(key)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-semibold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-indigo-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md transition disabled:opacity-60"
        >
          {loading ? '加载中…' : '刷新'}
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker;