import React from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  beginDate: string;
  endDate: string;
  loading?: boolean;
  onChange: (begin: string, end: string) => void;
  onQuick?: (range: 'today' | 'week' | 'month' | 'lastMonth' | 'quarter') => void;
  onRefresh: () => void;
}

export const DateRangePicker: React.FC<Props> = ({
  beginDate,
  endDate,
  loading,
  onChange,
  onQuick,
  onRefresh,
}) => {
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

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onQuick?.('today')}
            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            今天
          </button>
          <button
            onClick={() => onQuick?.('week')}
            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            近7天
          </button>
          <button
            onClick={() => onQuick?.('month')}
            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            本月
          </button>
          <button
            onClick={() => onQuick?.('lastMonth')}
            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            上月
          </button>
          <button
            onClick={() => onQuick?.('quarter')}
            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            近3月
          </button>
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