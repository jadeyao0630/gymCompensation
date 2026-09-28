import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  EyeOff,
  Eye,
} from 'lucide-react';
import type { PositionConfig, PositionCategory } from '../types/compensation';
import { POSITION_DEFINITIONS } from '../constants/positions';

interface PositionOverviewProps {
  positions: PositionConfig[];
  /** ⭐ 是否有方案编辑权限（无权限时隐藏禁用开关） */
  canEdit: boolean;
  onGoTo?: (category: PositionCategory) => void;
  onToggleDisabled?: (title: string, disabled: boolean) => void;
}

const STORAGE_KEY = 'position_overview_collapsed';

const PositionOverview: React.FC<PositionOverviewProps> = ({
  positions,
  canEdit,
  onGoTo,
  onToggleDisabled,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);

  const toggle = () => setCollapsed((v) => !v);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
      {/* 标题栏 */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 text-left hover:bg-gray-50/60 rounded-lg -mx-1 px-1 py-0.5 transition"
        title={collapsed ? '展开职位总览' : '收起职位总览'}
      >
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-semibold text-gray-700">职位总览</h3>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-xs hidden sm:inline">
            {collapsed ? '展开' : '收起'}
          </span>
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* 内容 */}
      {!collapsed && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-400">
              点击卡片跳转到对应分类
              {canEdit ? '；点击眼睛图标可禁用' : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {POSITION_DEFINITIONS.map((def) => {
              const config = positions.find((p) => p.title === def.title);
              const commissionCount = config?.commissionTiers.length ?? 0;
              const baseCount =
                (config?.baseSalaryTiers.length ?? 0) +
                (config?.genderSalaryTiers?.length ?? 0);

              const ok = commissionCount > 0 || baseCount > 0;
              const disabled = !!config?.disabled;

              return (
                <div
                  key={def.title}
                  className={`relative rounded-xl border p-3 transition ${
                    disabled
                      ? 'bg-gray-50 border-gray-200 opacity-70'
                      : ok
                      ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 hover:shadow-md'
                      : 'bg-amber-50/50 border-amber-200 hover:border-amber-300 hover:shadow-md'
                  }`}
                >
                  {/* ⭐ 禁用按钮（右上角）：仅 canEdit 时显示 */}
                  {canEdit && config && onToggleDisabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDisabled(def.title, !disabled);
                      }}
                      title={disabled ? '启用该职位' : '禁用该职位'}
                      className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center transition ${
                        disabled
                          ? 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          : 'text-gray-300 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      {disabled ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {/* 主区域（点击跳转分类） */}
                  <button
                    type="button"
                    onClick={() => onGoTo?.(def.category)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-1 pr-6">
                      <span
                        className={`text-sm font-semibold ${
                          disabled
                            ? 'text-gray-400 line-through'
                            : 'text-gray-800'
                        }`}
                      >
                        {def.title}
                      </span>
                      {def.isManager && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                          经理
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500">
                      {config ? (
                        disabled ? (
                          <span className="text-gray-400">已禁用</span>
                        ) : (
                          <>
                            佣金 {commissionCount} 档 · 底薪 {baseCount} 档
                          </>
                        )
                      ) : (
                        <span className="text-amber-600">未配置</span>
                      )}
                    </div>

                    <div className="text-[11px] mt-1">
                      {disabled ? (
                        <span className="text-gray-400">— 不参与计算</span>
                      ) : ok ? (
                        <span className="text-emerald-600">✓ 已配置</span>
                      ) : (
                        <span className="text-amber-600">⚠ 缺阶梯</span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionOverview;