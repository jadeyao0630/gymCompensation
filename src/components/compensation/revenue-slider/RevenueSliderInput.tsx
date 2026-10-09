import React from 'react';

interface Props {
  revenue: number;
  maxRevenue: number;
  step: number;
  requiredRevenue: number;
  onChange: (v: number) => void;
}

const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

export const RevenueSliderInput: React.FC<Props> = ({
  revenue,
  maxRevenue,
  step,
  requiredRevenue,
  onChange,
}) => {
  const requiredPercent = Math.min((requiredRevenue / maxRevenue) * 100, 100);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">总业绩</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={Math.round(revenue)}
            onChange={(e) =>
              onChange(
                Math.max(
                  0,
                  Math.min(maxRevenue, parseInt(e.target.value) || 0)
                )
              )
            }
            className="w-32 text-sm font-bold text-indigo-700 text-right bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 tabular-nums"
          />
          <span className="text-xs text-gray-400">元</span>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={0}
          max={maxRevenue}
          step={step}
          value={revenue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            bg-gradient-to-r from-indigo-500 to-purple-500
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-indigo-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-indigo-500"
        />
        <div
          className="absolute top-0 h-2 w-0.5 bg-emerald-500 pointer-events-none"
          style={{ left: `${requiredPercent}%` }}
          title={`所需业绩 ${formatMoney(requiredRevenue)}`}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
        <span>0</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-0.5 h-2.5 bg-emerald-500" />
          所需业绩 {formatMoney(requiredRevenue)}
        </span>
        <span>{formatMoney(maxRevenue)}</span>
      </div>
    </div>
  );
};

export default RevenueSliderInput;