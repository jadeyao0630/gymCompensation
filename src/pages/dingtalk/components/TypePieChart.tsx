import React, { useMemo, useState } from 'react';

export interface PieSlice {
  label: string;
  /** 数值（可以是金额，也可以是数量，由外部决定） */
  value: number;
  /** 该类型的笔数（用于副标题展示） */
  count?: number;
  color: string;
}

interface Props {
  data: PieSlice[];
  selectedLabel?: string | null;
  onSelect?: (label: string | null) => void;
  size?: number;
  /** 中心显示的单位（默认 ¥） */
  valuePrefix?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', // 蓝
  '#10b981', // 翠绿
  '#f59e0b', // 琥珀
  '#8b5cf6', // 紫
  '#ef4444', // 红
  '#06b6d4', // 青
  '#ec4899', // 粉
  '#84cc16', // 黄绿
  '#f97316', // 橙
  '#14b8a6', // 青绿
];

export function getPieColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    'Z',
  ].join(' ');
}

const fmtMoney = (v: number) => `¥${Math.round(v).toLocaleString('zh-CN')}`;

const TypePieChart: React.FC<Props> = ({
  data,
  selectedLabel,
  onSelect,
  size = 220,
  valuePrefix = '¥',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = useMemo(
    () => data.reduce((s, d) => s + (Number(d.value) || 0), 0),
    [data]
  );

  const slices = useMemo(() => {
    let acc = 0;
    return data.map((d) => {
      const value = Number(d.value) || 0;
      const ratio = total > 0 ? value / total : 0;
      const startAngle = acc * 360;
      const endAngle = (acc + ratio) * 360;
      acc += ratio;
      return { ...d, ratio, startAngle, endAngle };
    });
  }, [data, total]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm py-10">
        暂无数据
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-center gap-5">
      {/* 饼图 */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          {slices.map((s, i) => {
            const isSelected = selectedLabel === s.label;
            const isHovered = hoveredIdx === i;
            const isDimmed =
              (selectedLabel && !isSelected) ||
              (hoveredIdx !== null && !isHovered && !isSelected);

            const scale = isHovered || isSelected ? 1.05 : 1;
            const midAngle = (s.startAngle + s.endAngle) / 2;
            const midRad = ((midAngle - 90) * Math.PI) / 180;
            const offsetX =
              (isHovered || isSelected) && s.ratio < 1
                ? Math.cos(midRad) * 6
                : 0;
            const offsetY =
              (isHovered || isSelected) && s.ratio < 1
                ? Math.sin(midRad) * 6
                : 0;

            return (
              <path
                key={s.label}
                d={describeArc(cx, cy, r, s.startAngle, s.endAngle)}
                fill={s.color}
                opacity={isDimmed ? 0.35 : 1}
                stroke="#fff"
                strokeWidth={2}
                style={{
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: 'all 0.2s ease',
                  cursor: onSelect ? 'pointer' : 'default',
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  if (!onSelect) return;
                  if (selectedLabel === s.label) onSelect(null);
                  else onSelect(s.label);
                }}
              />
            );
          })}

          {/* 中心显示总金额 */}
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            className="fill-gray-800"
            style={{ fontSize: 16, fontWeight: 700 }}
          >
            {valuePrefix}
            {Math.round(total).toLocaleString('zh-CN')}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-gray-400"
            style={{ fontSize: 10 }}
          >
            合计
          </text>
        </svg>

        {hoveredIdx !== null && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-10">
            {slices[hoveredIdx].label}：
            {fmtMoney(slices[hoveredIdx].value)}（
            {(slices[hoveredIdx].ratio * 100).toFixed(1)}%）
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="flex-1 min-w-0 w-full">
        <div className="space-y-1.5">
          {slices.map((s, i) => {
            const isSelected = selectedLabel === s.label;
            const isHovered = hoveredIdx === i;
            return (
              <button
                key={s.label}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  if (!onSelect) return;
                  if (selectedLabel === s.label) onSelect(null);
                  else onSelect(s.label);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition text-left ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200'
                    : isHovered
                    ? 'bg-gray-50'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 min-w-0 truncate font-medium text-gray-700">
                  {s.label}
                </span>
                <span className="tabular-nums text-gray-800 font-semibold whitespace-nowrap">
                  {fmtMoney(s.value)}
                </span>
                <span className="tabular-nums text-gray-400 w-12 text-right whitespace-nowrap">
                  {(s.ratio * 100).toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>

        {selectedLabel && (
          <div className="mt-3 text-xs text-blue-600 flex items-center gap-2">
            已筛选：<span className="font-semibold">{selectedLabel}</span>
            <button
              onClick={() => onSelect?.(null)}
              className="text-gray-400 hover:text-gray-600 underline"
            >
              清除
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypePieChart;