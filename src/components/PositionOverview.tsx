import React from 'react';
import type { PositionConfig, PositionCategory } from '../types/compensation';
import { POSITION_DEFINITIONS } from '../constants/positions';

interface PositionOverviewProps {
  positions: PositionConfig[];
  onGoTo?: (category: PositionCategory) => void;
}

const PositionOverview: React.FC<PositionOverviewProps> = ({
  positions,
  onGoTo,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-700">职位总览</h3>
      <span className="text-xs text-gray-400">
        点击卡片跳转到对应分类
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

        return (
          <button
            key={def.title}
            onClick={() => onGoTo?.(def.category)}
            className={`text-left rounded-xl border p-3 transition hover:shadow-md ${
              ok
                ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-800">
                {def.title}
              </span>
              {def.isManager && (
                <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  经理
                </span>
              )}
            </div>

            <div className="text-[11px] text-gray-500">
              {config ? (
                <>
                  佣金 {commissionCount} 档 · 底薪 {baseCount} 档
                </>
              ) : (
                <span className="text-amber-600">未配置</span>
              )}
            </div>

            <div className="text-[11px] mt-1">
              {ok ? (
                <span className="text-emerald-600">✓ 已配置</span>
              ) : (
                <span className="text-amber-600">⚠ 缺阶梯</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default PositionOverview;