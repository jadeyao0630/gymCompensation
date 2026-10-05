import React from 'react';
import { LayoutGrid, LayoutList, Eye, EyeOff } from 'lucide-react';
import { MonthPicker } from '../../../components/MonthPicker';

interface Props {
  month: string;
  /** ⭐ 改为「可用月份列表」（该月有薪酬方案配置） */
  availableMonths: string[];
  viewMode: 'all' | 'department';
  showViewToggle: boolean;
  hideExcluded: boolean;
  onMonthChange: (m: string) => void;
  onViewModeChange: (v: 'all' | 'department') => void;
  onHideExcludedChange: (v: boolean) => void;
  hasPlan: boolean;
  /** 可选月份加载中（可选） */
  monthsLoading?: boolean;
}

export const PayrollToolbar: React.FC<Props> = ({
  month,
  availableMonths,
  viewMode,
  showViewToggle,
  hideExcluded,
  onMonthChange,
  onViewModeChange,
  onHideExcludedChange,
  hasPlan,
  monthsLoading = false,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">月份</label>
        {/* ⭐ 换成日历式月份选择器 */}
        <MonthPicker
          value={month}
          availableMonths={availableMonths}
          onChange={onMonthChange}
          disabled={monthsLoading}
          theme="light"
          unavailableHint="该月暂无薪酬配置"
        />
      </div>

      <div className="flex-1" />

      {/* 隐藏未计入 开关 */}
      <button
        onClick={() => onHideExcludedChange(!hideExcluded)}
        title={
          hideExcluded
            ? '当前隐藏未计入员工，点击显示'
            : '当前显示全部员工，点击隐藏未计入'
        }
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
          hideExcluded
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        }`}
      >
        {hideExcluded ? (
          <>
            <EyeOff className="w-3.5 h-3.5" /> 隐藏未计入
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5" /> 显示未计入
          </>
        )}
      </button>

      {showViewToggle && (
        <div className="inline-flex p-1 bg-gray-100 rounded-xl gap-1">
          <button
            onClick={() => onViewModeChange('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === 'all'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />全部员工
          </button>
          <button
            onClick={() => onViewModeChange('department')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === 'department'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />按部门
          </button>
        </div>
      )}
    </div>
    {!hasPlan && (
      <p className="text-xs text-amber-600 mt-3">
        该月份暂无薪酬配置，请先到「薪酬配置」页面导入 Excel
      </p>
    )}
  </div>
);