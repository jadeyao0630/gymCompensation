import React from 'react';
import { Plus, Trash2, Upload, Download } from 'lucide-react';
import { formatMonthLabel } from '../utils/format';

interface ToolbarProps {
  months: string[];
  selectedMonth: string;
  hasPlan: boolean;
  importing: boolean;
  importedFrom?: string;
  onSelectMonth: (m: string) => void;
  onAddMonth: () => void;
  onRemoveMonth: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  months,
  selectedMonth,
  hasPlan,
  importing,
  importedFrom,
  onSelectMonth,
  onAddMonth,
  onRemoveMonth,
  onImport,
  onExport,
}) => (
  <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-8">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 pl-3 border border-gray-100">
        <span className="text-xs font-medium text-gray-500">月份</span>
        <select
          value={selectedMonth}
          onChange={(e) => onSelectMonth(e.target.value)}
          className="bg-transparent border-none text-sm font-semibold text-gray-800 pr-2 py-1.5 focus:outline-none cursor-pointer"
        >
          {months.length === 0 && <option value="">请选择</option>}
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onAddMonth}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow active:scale-[0.97]"
      >
        <Plus className="w-4 h-4" />
        新增月份
      </button>

      {hasPlan && (
        <button
          onClick={onRemoveMonth}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
        >
          <Trash2 className="w-4 h-4" />
          删除
        </button>
      )}

      <div className="flex-1" />

      <label
        className={`cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all active:scale-[0.97] ${
          importing || !selectedMonth
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30'
        }`}
      >
        <Upload className="w-4 h-4" />
        {importing ? '解析中…' : '导入 Excel'}
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={onImport}
          disabled={!selectedMonth || importing}
          className="hidden"
        />
      </label>

      <button
        onClick={onExport}
        disabled={!hasPlan}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
      >
        <Download className="w-4 h-4" />
        导出
      </button>
    </div>

    {importedFrom && (
      <div className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        已导入：{importedFrom}
      </div>
    )}
  </div>
);

export default Toolbar;
