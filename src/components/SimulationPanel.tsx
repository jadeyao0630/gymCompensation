import React from 'react';
import { Calculator, Building2, Zap, Home, TrendingUp } from 'lucide-react';
import type {
  PositionConfig,
  SimulationInput,
  SimulationResult,
} from '../types/compensation';

interface SimulationPanelProps {
  positions: PositionConfig[];
  input: SimulationInput;
  result: SimulationResult;
  onInputChange: (input: SimulationInput) => void;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({
  input,
  result,
  onInputChange,
}) => {
  const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-gray-900 text-white flex items-center justify-center">
          <Calculator className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">模拟测算</h3>
          <p className="text-[11px] text-gray-400">
            输入固定成本，反推所需业绩
          </p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CostInput
          icon={<Building2 className="w-3.5 h-3.5" />}
          label="物业费"
          value={input.propertyFee}
          onChange={(v) => onInputChange({ ...input, propertyFee: v })}
          color="text-blue-600"
        />
        <CostInput
          icon={<Zap className="w-3.5 h-3.5" />}
          label="电费"
          value={input.electricityFee}
          onChange={(v) => onInputChange({ ...input, electricityFee: v })}
          color="text-amber-600"
        />
        <CostInput
          icon={<Home className="w-3.5 h-3.5" />}
          label="租金"
          value={input.rent}
          onChange={(v) => onInputChange({ ...input, rent: v })}
          color="text-emerald-600"
        />
      </div>

      <div className="px-5 pb-5">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">
              需要业绩
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Metric label="固定成本" value={formatMoney(result.fixedCost)} />
            <Metric
              label="总底薪"
              value={formatMoney(result.totalBaseSalary)}
            />
            <Metric
              label="佣金"
              value={formatMoney(result.totalCommission)}
              highlight
            />
            <Metric
              label="所需业绩"
              value={formatMoney(result.requiredRevenue)}
              highlight
              big
            />
          </div>

          {result.breakdown.length > 0 && (
            <div className="bg-white/70 backdrop-blur rounded-xl border border-indigo-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-indigo-100">
                    <th className="text-left px-3 py-2 font-medium">职位</th>
                    <th className="text-right px-3 py-2 font-medium">人数</th>
                    <th className="text-right px-3 py-2 font-medium">底薪</th>
                    <th className="text-right px-3 py-2 font-medium">
                      分摊业绩
                    </th>
                    <th className="text-right px-3 py-2 font-medium">销提</th>
                    <th className="text-right px-3 py-2 font-medium">佣金</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map((b) => (
                    <tr
                      key={b.positionId}
                      className="border-b border-indigo-50 last:border-0 hover:bg-indigo-50/40"
                    >
                      <td className="px-3 py-2 text-gray-700 font-medium">
                        {b.title}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                        {b.headcount}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                        {formatMoney(b.baseSalary)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                        {formatMoney(b.allocatedRevenue)}
                      </td>
                      <td className="px-3 py-2 text-right text-sky-600 tabular-nums">
                        {(b.commissionRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-amber-600 tabular-nums">
                        {formatMoney(b.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-indigo-400 mt-3 leading-relaxed">
            注：佣金按各职位分摊业绩命中阶梯自动计算，采用二分法迭代求解，
            迭代 {result.iterations} 次。
          </p>
        </div>
      </div>
    </div>
  );
};

interface CostInputProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}

const CostInput: React.FC<CostInputProps> = ({
  icon,
  label,
  value,
  onChange,
  color,
}) => (
  <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-100 rounded-xl px-3 py-2 hover:border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/30 transition">
    <span className={color}>{icon}</span>
    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
      {label}
    </span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="flex-1 text-sm font-semibold text-gray-800 bg-transparent focus:outline-none tabular-nums text-right"
    />
  </div>
);

interface MetricProps {
  label: string;
  value: string;
  highlight?: boolean;
  big?: boolean;
}

const Metric: React.FC<MetricProps> = ({ label, value, highlight, big }) => (
  <div>
    <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
    <p
      className={`font-bold tabular-nums ${
        big ? 'text-xl' : 'text-base'
      } ${highlight ? 'text-indigo-700' : 'text-gray-800'}`}
    >
      {value}
    </p>
  </div>
);

export default SimulationPanel;