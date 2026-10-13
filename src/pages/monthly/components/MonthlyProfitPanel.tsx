import React from 'react';
import { TrendingUp, TrendingDown, Calculator, Receipt } from 'lucide-react';
import { fmtMoney } from '../utils/date';

interface Props {
  incomeAmount: number;
  payrollTotal: number;
  fixedCost: number;

  /* 兼容旧字段（指向实际利润） */
  profit: number;
  isProfit: boolean;

  /* ⭐ 两套利润 */
  estimatedProfit?: number;
  actualProfit?: number;
  isEstimatedProfit?: boolean;
}

export const MonthlyProfitPanel: React.FC<Props> = ({
  incomeAmount,
  payrollTotal,
  fixedCost,
  profit,
  isProfit,
  estimatedProfit,
  actualProfit,
  isEstimatedProfit,
}) => {
  const hasTwoProfits =
    typeof estimatedProfit === 'number' && typeof actualProfit === 'number';

  const finalEstimatedProfit = estimatedProfit ?? profit;
  const finalActualProfit = actualProfit ?? profit;
  const estPositive = isEstimatedProfit ?? finalEstimatedProfit >= 0;
  const actPositive = finalActualProfit >= 0;

  const estimatedExpense = payrollTotal + fixedCost;
  /* 钉钉实际支出（用于反推实际利润） */
  const actualExpense = incomeAmount - finalActualProfit;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* ⭐ 预估利润 */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-blue-50/60 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-700" />
          <h3 className="text-sm font-semibold text-blue-800">
            预估利润
          </h3>
          <span className="ml-auto text-[11px] text-gray-500">
            收入 − 预估支出（薪酬 + 固定成本）
          </span>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">收入</span>
            <span className="tabular-nums text-emerald-700 font-semibold">
              {fmtMoney(incomeAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">薪酬支出（预估）</span>
            <span className="tabular-nums text-blue-700">
              {fmtMoney(payrollTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">固定成本（预估）</span>
            <span className="tabular-nums text-amber-700">
              {fmtMoney(fixedCost)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-dashed border-gray-100">
            <span className="text-gray-500">预估支出合计</span>
            <span className="tabular-nums text-gray-700">
              {fmtMoney(estimatedExpense)}
            </span>
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              预估利润
            </span>
            <span
              className={`text-xl font-bold tabular-nums ${
                estPositive ? 'text-blue-700' : 'text-rose-600'
              }`}
            >
              {fmtMoney(finalEstimatedProfit)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            {estPositive ? (
              <TrendingUp className="w-3 h-3 text-blue-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-600" />
            )}
            利润率{' '}
            {incomeAmount > 0
              ? `${((finalEstimatedProfit / incomeAmount) * 100).toFixed(1)}%`
              : '—'}
          </div>
        </div>
      </div>

      {/* ⭐ 实际利润 */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-rose-50/60 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-rose-700" />
          <h3 className="text-sm font-semibold text-rose-800">
            实际利润
          </h3>
          <span className="ml-auto text-[11px] text-gray-500">
            收入 − 钉钉全部实际支出
          </span>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">收入</span>
            <span className="tabular-nums text-emerald-700 font-semibold">
              {fmtMoney(incomeAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">钉钉实际支出</span>
            <span className="tabular-nums text-rose-700">
              {fmtMoney(actualExpense)}
            </span>
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              实际利润
            </span>
            <span
              className={`text-xl font-bold tabular-nums ${
                actPositive ? 'text-rose-700' : 'text-gray-700'
              }`}
            >
              {fmtMoney(finalActualProfit)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            {actPositive ? (
              <TrendingUp className="w-3 h-3 text-rose-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-gray-600" />
            )}
            利润率{' '}
            {incomeAmount > 0
              ? `${((finalActualProfit / incomeAmount) * 100).toFixed(1)}%`
              : '—'}
          </div>

          {/* ⭐ 与预估利润的差额 */}
          {hasTwoProfits && (
            <div className="pt-3 border-t border-dashed border-gray-100 text-[11px] text-gray-500">
              与预估利润差额：
              <span
                className={`ml-1 font-semibold tabular-nums ${
                  finalActualProfit - finalEstimatedProfit >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {finalActualProfit - finalEstimatedProfit >= 0 ? '+' : ''}
                {fmtMoney(finalActualProfit - finalEstimatedProfit)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyProfitPanel;