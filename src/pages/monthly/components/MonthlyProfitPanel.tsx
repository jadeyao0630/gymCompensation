import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fmtMoney } from '../utils/date';

interface Props {
  incomeAmount: number;
  payrollTotal: number;
  fixedCost: number;
  profit: number;
  isProfit: boolean;
}

export const MonthlyProfitPanel: React.FC<Props> = ({
  incomeAmount,
  payrollTotal,
  fixedCost,
  profit,
  isProfit,
}) => {
  return (
    <div
      className={`rounded-2xl border-2 p-6 mb-8 ${
        isProfit
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
          : 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        {isProfit ? (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
        )}
        <div>
          <h2
            className={`text-lg font-bold ${
              isProfit ? 'text-emerald-800' : 'text-red-800'
            }`}
          >
            {isProfit ? '本月盈利' : '本月亏损'}
          </h2>
          <p className="text-xs text-gray-500">
            营销收入 − 薪酬佣金 − 固定成本
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">营销收入</div>
          <div className="text-xl font-bold text-emerald-700 tabular-nums">
            {fmtMoney(incomeAmount)}
          </div>
        </div>
        <div className="flex items-center justify-center text-2xl text-gray-400 font-bold">
          −
        </div>
        <div className="bg-white/70 backdrop-blur rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">
            薪酬佣金 + 固定成本
          </div>
          <div className="text-xl font-bold text-blue-700 tabular-nums">
            {fmtMoney(payrollTotal + fixedCost)}
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">= 净利润</div>
          <div
            className={`text-xl font-bold tabular-nums ${
              isProfit ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {fmtMoney(profit)}
          </div>
        </div>
      </div>
    </div>
  );
};