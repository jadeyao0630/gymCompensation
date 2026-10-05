import React from 'react';
import {
  Calculator,
  TrendingUp,
  BadgePercent,
  BookOpen,
  Coins,
  Percent,
  Hash,
} from 'lucide-react';
import type {
  PositionConfig,
  SimulationResult,
} from '../../types/compensation';

interface SimulationPanelProps {
  positions: PositionConfig[];
  result: SimulationResult;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ result }) => {
  const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

  const classCommissionRate =
    result.totalCommission > 0
      ? result.totalClassCommission / result.totalCommission
      : 0;

  const salesCommission = result.totalCommission - result.totalClassCommission;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-gray-900 text-white flex items-center justify-center">
          <Calculator className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">所需业绩</h3>
          <p className="text-[11px] text-gray-400">
            固定成本 + 底薪 + 佣金 反推
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">
              测算结果
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Metric label="固定成本" value={formatMoney(result.fixedCost)} />
            <Metric
              label="总底薪"
              value={formatMoney(result.totalBaseSalary)}
            />
            <Metric
              label="销提"
              value={formatMoney(salesCommission)}
              highlight
            />
            <Metric
              label="所需业绩"
              value={formatMoney(result.requiredRevenue)}
              highlight
              big
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11px] text-amber-700 mb-0.5">
                <BadgePercent className="w-3 h-3" />
                <span className="font-medium">销提</span>
              </div>
              <p className="font-bold text-sm text-amber-700 tabular-nums">
                {formatMoney(salesCommission)}
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11px] text-purple-700 mb-0.5">
                <BookOpen className="w-3 h-3" />
                <span className="font-medium">课提</span>
              </div>
              <p className="font-bold text-sm text-purple-700 tabular-nums">
                {formatMoney(result.totalClassCommission)}
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11px] text-indigo-700 mb-0.5">
                <Coins className="w-3 h-3" />
                <span className="font-medium">课提占总佣金</span>
              </div>
              <p className="font-bold text-sm text-indigo-700 tabular-nums">
                {(classCommissionRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-white/70 px-3 py-2 mb-4 flex items-center justify-between text-xs">
            <span className="text-gray-500">总佣金（销提 + 课提）</span>
            <span className="font-bold text-indigo-700 tabular-nums">
              {formatMoney(result.totalCommission)}
            </span>
          </div>

          {/* 课提明细 */}
          {result.courseBreakdown.length > 0 && (
            <div className="rounded-xl border border-purple-100 bg-white/70 overflow-hidden mb-4">
              <div className="px-3 py-2 text-[11px] font-semibold text-purple-700 bg-purple-50/60 border-b border-purple-100 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" />
                课提明细
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="text-left px-3 py-2 font-medium">课程</th>
                    <th className="text-right px-3 py-2 font-medium">均价</th>
                    <th className="text-right px-3 py-2 font-medium">节数</th>
                    <th className="text-right px-3 py-2 font-medium">人数</th>
                    <th className="text-right px-3 py-2 font-medium">课提</th>
                    <th className="text-right px-3 py-2 font-medium">金额</th>
                  </tr>
                </thead>
                <tbody>
                  {result.courseBreakdown.map((c) => (
                    <tr
                      key={c.courseName}
                      className="border-b border-gray-100 last:border-0 hover:bg-purple-50/30"
                    >
                      <td className="px-3 py-2 text-purple-700 font-medium">
                        {c.courseName}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                        {formatMoney(c.averagePrice)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                        {c.classCount}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                        {c.headcount}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-600 tabular-nums">
                        {c.mode === 'percent' ? (
                          <span className="inline-flex items-center gap-1 justify-end">
                            <Percent className="w-3 h-3" />
                            {(c.value * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 justify-end">
                            <Hash className="w-3 h-3" />
                            {c.value} 元/节
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-700 font-semibold tabular-nums">
                        {formatMoney(c.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-purple-50/60 font-semibold text-purple-700">
                    <td className="px-3 py-2" colSpan={5}>
                      课提合计
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(result.totalClassCommission)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 职位明细 */}
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
                    <th className="text-right px-3 py-2 font-medium">
                      销提比例
                    </th>
                    <th className="text-right px-3 py-2 font-medium">销提</th>
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
                        {b.commissionRate > 0
                          ? `${(b.commissionRate * 100).toFixed(1)}%`
                          : '—'}
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
            注：固定成本 = 物业 + 电费 + 租金 + 水费 + 网络 + 其他杂项；
            二分法迭代 {result.iterations} 次。
          </p>
        </div>
      </div>
    </div>
  );
};

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