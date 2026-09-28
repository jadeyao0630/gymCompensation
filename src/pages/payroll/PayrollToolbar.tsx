import React from 'react';
import {
  Calculator, Loader2, LayoutGrid, LayoutList, Eye, EyeOff, FileDown,
} from 'lucide-react';

interface Props {
  month: string;
  months: string[];
  viewMode: 'all' | 'department';
  loading: boolean;
  showViewToggle: boolean;
  hideExcluded: boolean;
  canExport: boolean;
  /** ⭐ 导出整表权限（无权限时按钮不显示） */
  canExportPayroll: boolean;
  onMonthChange: (m: string) => void;
  onViewModeChange: (v: 'all' | 'department') => void;
  onHideExcludedChange: (v: boolean) => void;
  onRun: () => void;
  onExportTable: () => void;
  hasPlan: boolean;
}

export const PayrollToolbar: React.FC<Props> = ({
  month, months, viewMode, loading, showViewToggle, hideExcluded, canExport,
  canExportPayroll,
  onMonthChange, onViewModeChange, onHideExcludedChange, onRun, onExportTable, hasPlan,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">月份</label>
        <select value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {months.sort().map((m) => (<option key={m} value={m}>{m}</option>))}
          {!month && <option value="">请选择月份</option>}
        </select>
      </div>

      <div className="flex-1" />

      {/* 隐藏未计入 开关 */}
      <button
        onClick={() => onHideExcludedChange(!hideExcluded)}
        title={hideExcluded ? '当前隐藏未计入员工，点击显示' : '当前显示全部员工，点击隐藏未计入'}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
          hideExcluded
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        }`}
      >
        {hideExcluded ? (<><EyeOff className="w-3.5 h-3.5" /> 隐藏未计入</>) : (<><Eye className="w-3.5 h-3.5" /> 显示未计入</>)}
      </button>

      {showViewToggle && (
        <div className="inline-flex p-1 bg-gray-100 rounded-xl gap-1">
          <button onClick={() => onViewModeChange('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'all' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutList className="w-3.5 h-3.5" />全部员工
          </button>
          <button onClick={() => onViewModeChange('department')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'department' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutGrid className="w-3.5 h-3.5" />按部门
          </button>
        </div>
      )}

      {/* ⭐ 导出整表：无 export:payroll 权限时按钮不显示 */}
      {canExportPayroll && (
        <button
          onClick={onExportTable}
          disabled={!canExport}
          title="导出整表为 Excel"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="w-3.5 h-3.5" /> 导出整表
        </button>
      )}

      <button onClick={onRun} disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] disabled:cursor-not-allowed">
        {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />计算中…</>) : (<><Calculator className="w-4 h-4" />开始计算</>)}
      </button>
    </div>
    {!hasPlan && (<p className="text-xs text-amber-600 mt-3">该月份暂无薪酬配置，请先到「薪酬配置」页面导入 Excel</p>)}
  </div>
);