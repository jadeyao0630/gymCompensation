import React, { useMemo, useState } from 'react';

export interface PieDatum {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: PieDatum[];
  unit?: string;
  height?: number;
}

const fmt = (v: number) => `¥${Math.round(v).toLocaleString('zh-CN')}`;

/* 极坐标 → 直角坐标 */
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

/* 生成一段扇形路径 */
const arcPath = (
  cx: number, cy: number,
  rOuter: number, rInner: number,
  start: number, end: number
) => {
  const s1 = polar(cx, cy, rOuter, end);
  const e1 = polar(cx, cy, rOuter, start);
  const s2 = polar(cx, cy, rInner, end);
  const e2 = polar(cx, cy, rInner, start);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${e1.x} ${e1.y}`,
    `L ${e2.x} ${e2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${s2.x} ${s2.y}`,
    'Z',
  ].join(' ');
};

export const PieChartCard: React.FC<Props> = ({ data, height = 300 }) => {
  const [active, setActive] = useState(-1);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const cx = 160;
  const cy = height / 2;
  const rOuter = Math.min(cy - 10, 130);
  const rInner = rOuter * 0.58;

  let acc = 0;
  const slices = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.value;
    const end = (acc / total) * 360;
    return { ...d, start, end, index: i };
  });

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg
          width={320}
          height={height}
          viewBox={`0 0 320 ${height}`}
          className="shrink-0"
        >
          {slices.map((s) => {
            const isActive = active === s.index;
            const grow = isActive ? 6 : 0;
            return (
              <path
                key={s.index}
                d={arcPath(cx, cy, rOuter + grow, rInner, s.start, s.end)}
                fill={s.color}
                stroke="#fff"
                strokeWidth={2}
                onMouseEnter={() => setActive(s.index)}
                onMouseLeave={() => setActive(-1)}
                style={{ transition: 'all .15s', cursor: 'pointer' }}
              />
            );
          })}
          {/* 中心总计 */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize={11}
          >
            合计
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-gray-800"
            fontSize={14}
            fontWeight={700}
          >
            {fmt(total)}
          </text>
        </svg>

        {/* 图例 */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
          {data.map((d, i) => {
            const percent = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(-1)}
                className={`flex items-center justify-between gap-2 text-xs text-left rounded-lg px-2 py-1 transition ${
                  active === i ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="truncate text-gray-700">{d.name}</span>
                </span>
                <span className="tabular-nums text-gray-500 shrink-0">
                  {fmt(d.value)}
                  <span className="ml-1 text-gray-400">
                    {percent.toFixed(1)}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PieChartCard;