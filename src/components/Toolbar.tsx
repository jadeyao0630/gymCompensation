import React from 'react';
import {
  Plus,
  Trash2,
  Upload,
  Download,
  Calendar,
  Loader2,
} from 'lucide-react';
import { formatMonthLabel } from '../utils/format';

interface ToolbarProps {
  months: string[];
  selectedMonth: string;
  hasPlan: boolean;
  importing: boolean;
  importedFrom?: string;
  /** ⭐ 是否有方案编辑权限（基础权限，plan:edit） */
  canEdit: boolean;

  /* ⭐ 新增：细粒度权限（默认 true 保持向后兼容） */
  /** 新增月份权限 */
  canAddMonth?: boolean;
  /** 删除月份权限 */
  canDeleteMonth?: boolean;
  /** 导入薪酬佣金设置权限 */
  canImport?: boolean;
  /** 导出薪酬佣金设置权限 */
  canExport?: boolean;

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
  canEdit,
  canAddMonth = true,
  canDeleteMonth = true,
  canImport = true,
  canExport = true,
  onSelectMonth,
  onAddMonth,
  onRemoveMonth,
  onImport,
  onExport,
}) => {
  /* ⭐ 排序后的月份列表（升序，最新在最后） */
  const sortedMonths = React.useMemo(
    () => months.slice().sort(),
    [months]
  );

  /* ⭐ 各按钮的最终可用状态 */
  const addMonthEnabled = canEdit && canAddMonth;
  const deleteMonthEnabled = canEdit && canDeleteMonth && hasPlan;
  const importEnabled = canEdit && canImport && !importing;
  const exportEnabled = canExport && hasPlan;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* 月份选择 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">月份</label>
          <select
            value={selectedMonth}
            onChange={(e) => {
              const next = e.target.value;
              if (next) onSelectMonth(next);
            }}
            className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {sortedMonths.length === 0 && <option value="">暂无月份</option>}
            {sortedMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </div>

        {/* ⭐ 新增月份（需要 plan:edit + month:add） */}
        {canEdit && (
          <button
            type="button"
            onClick={onAddMonth}
            disabled={!addMonthEnabled}
            title={!canAddMonth ? '无权限：新增月份' : '新增月份'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition ${
              addMonthEnabled
                ? 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            新增月份
          </button>
        )}

        {/* 已导入信息 */}
        {importedFrom && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 max-w-xs truncate">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate" title={importedFrom}>
              来源：{importedFrom}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* ⭐ 导入（需要 plan:edit + plan:import） */}
        {canEdit && (
          <label
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition ${
              importEnabled
                ? 'cursor-pointer bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                : 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200'
            }`}
            title={
              !canImport
                ? '无权限：导入薪酬佣金设置'
                : importing
                ? '导入中…'
                : '导入 Excel (.xlsx/.xls) 或 JSON 方案文件'
            }
          >
            <input
              type="file"
              accept=".xlsx,.xls,.json,application/json"
              className="hidden"
              disabled={!importEnabled}
              onChange={onImport}
            />
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导入中…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                导入
              </>
            )}
          </label>
        )}

        {/* ⭐ 导出（需要 plan:export） */}
        <button
          type="button"
          onClick={onExport}
          disabled={!exportEnabled}
          title={
            !canExport
              ? '无权限：导出薪酬佣金设置'
              : hasPlan
              ? '导出当前月份方案为 JSON'
              : '暂无可导出的方案'
          }
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition ${
            exportEnabled
              ? 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
              : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          导出
        </button>

        {/* ⭐ 删除月份（需要 plan:edit + month:delete） */}
        {canEdit && (
          <button
            type="button"
            onClick={onRemoveMonth}
            disabled={!deleteMonthEnabled}
            title={
              !canDeleteMonth
                ? '无权限：删除月份'
                : hasPlan
                ? '删除当前月份配置'
                : '暂无月份可删除'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition ${
              deleteMonthEnabled
                ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            删除月份
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;