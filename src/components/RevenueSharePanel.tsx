import React, { useMemo } from 'react';
import { Sliders, RotateCcw, Percent, Users } from 'lucide-react';
import type { PositionConfig, RevenueShareConfig } from '../types/compensation';

interface RevenueSharePanelProps {
  shareablePositions: PositionConfig[];
  value: RevenueShareConfig;
  onChange: (v: RevenueShareConfig) => void;
}

/** 默认按人数占比 */
export function buildDefaultShare(
  positions: PositionConfig[]
): RevenueShareConfig {
  const totalHead = positions.reduce((s, p) => s + (p.headcount || 0), 0);
  const cfg: RevenueShareConfig = {};
  positions.forEach((p) => {
    cfg[p.title] = totalHead > 0 ? p.headcount / totalHead : 0;
  });
  return cfg;
}

const RevenueSharePanel: React.FC<RevenueSharePanelProps> = ({
  shareablePositions,
  value,
  onChange,
}) => {
  const titles = useMemo(
    () => shareablePositions.map((p) => p.title),
    [shareablePositions]
  );

  const total = useMemo(
    () => titles.reduce((s, t) => s + (value[t] || 0), 0),
    [titles, value]
  );

  const totalHead = useMemo(
    () => shareablePositions.reduce((s, p) => s + p.headcount, 0),
    [shareablePositions]
  );

  const setShare = (title: string, next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    const others = titles.filter((t) => t !== title);
    const othersTotal = others.reduce((s, t) => s + (value[t] || 0), 0);
    const remaining = 1 - clamped;

    const nextCfg: RevenueShareConfig = { ...value, [title]: clamped };

    if (others.length === 0) {
      nextCfg[title] = 1;
    } else if (othersTotal === 0) {
      const avg = remaining / others.length;
      others.forEach((t) => {
        nextCfg[t] = avg;
      });
    } else {
      others.forEach((t) => {
        nextCfg[t] = ((value[t] || 0) / othersTotal) * remaining;
      });
    }

    onChange(nextCfg);
  };

  /** 按人数重置 */
  const resetByHeadcount = () => {
    onChange(buildDefaultShare(shareablePositions));
  };

  /** 等分 */
  const resetEqual = () => {
    const avg = titles.length > 0 ? 1 / titles.length : 0;
    const nextCfg: RevenueShareConfig = {};
    titles.forEach((t) => {
      nextCfg[t] = avg;
    });
    onChange(nextCfg);
  };

  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">业绩分配比例</h3>
            <p className="text-[11px] text-gray-400">
              会籍 / 泳教 / 私教 按比例分摊总业绩
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetByHeadcount}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg transition"
            title="按人数占比"
          >
            <Users className="w-3.5 h-3.5" /> 按人数
          </button>
          <button
            onClick={resetEqual}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg transition"
            title="等分"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 等分
          </button>
        </div>
      </div>

      <div className="p-5">
        {titles.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">
            暂无可分摊的职位（需有佣金、非店长、非经理）
          </div>
        ) : (
          <div className="space-y-3">
            {shareablePositions.map((p) => {
              const v = value[p.title] ?? 0;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">
                        {p.title}
                      </span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {p.headcount} 人
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Percent className="w-3 h-3 text-emerald-500" />
                      <span className="font-semibold text-emerald-700 tabular-nums w-14 text-right">
                        {formatPercent(v)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.5}
                      value={Math.round(v * 1000) / 10}
                      onChange={(e) =>
                        setShare(p.title, (parseFloat(e.target.value) || 0) / 100)
                      }
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer
                        bg-gradient-to-r from-emerald-400 to-teal-500
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:border-2
                        [&::-webkit-slider-thumb]:border-emerald-500
                        [&::-webkit-slider-thumb]:shadow
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:w-4
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-white
                        [&::-moz-range-thumb]:border-2
                        [&::-moz-range-thumb]:border-emerald-500
                        [&::-moz-range-thumb]:shadow
                        [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={Math.round(v * 1000) / 10}
                      onChange={(e) =>
                        setShare(
                          p.title,
                          (parseFloat(e.target.value) || 0) / 100
                        )
                      }
                      className="w-16 text-xs text-emerald-700 text-right bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 tabular-nums"
                    />
                    <span className="text-[11px] text-gray-400">%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            合计 · 共 {totalHead} 人
          </span>
          <span
            className={`font-semibold tabular-nums ${
              Math.abs(total - 1) < 0.001 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {formatPercent(total)}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
          默认按人数分摊，可手动调整；拖动任一滑块，其他项自动按比例缩放
        </p>
      </div>
    </div>
  );
};

export default RevenueSharePanel;