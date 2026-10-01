import React from 'react';
import { TrendingUp, TrendingDown, Users, Building2 } from 'lucide-react';
import { BigCard } from './MonthlyCommon';
import { fmtMoney } from '../utils/date';
import type { OverallSummary } from '../../marketing/utils/aggregate';

interface Props {
  marketing: OverallSummary & {
    cardAmount: number;
    incomeAmount: number;
    prePayment: number;
  };
  payrollTotal: number;
  payrollHeadcount: number;
  fixedCost: number;
  profit: number;
  isProfit: boolean;
}

export const MonthlySummaryCards: React.FC<Props> = ({
  marketing,
  payrollTotal,
  payrollHeadcount,
  fixedCost,
  profit,
  isProfit,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <BigCard
      icon={<TrendingUp className="w-6 h-6" />}
      label="营销收入（实收）"
      value={fmtMoney(marketing.incomeAmount)}
      sub={`卡金额 ${fmtMoney(marketing.cardAmount)}`}
      gradient="from-emerald-500 to-teal-500"
    />
    <BigCard
      icon={<Users className="w-6 h-6" />}
      label="薪酬佣金支出"
      value={fmtMoney(payrollTotal)}
      sub={`计入 ${payrollHeadcount} 人`}
      gradient="from-blue-500 to-indigo-500"
    />
    <BigCard
      icon={<Building2 className="w-6 h-6" />}
      label="固定成本"
      value={fmtMoney(fixedCost)}
      sub={`物业/租金/水电等`}
      gradient="from-amber-500 to-orange-500"
    />
    <BigCard
      icon={
        isProfit ? (
          <TrendingUp className="w-6 h-6" />
        ) : (
          <TrendingDown className="w-6 h-6" />
        )
      }
      label="净利润"
      value={fmtMoney(profit)}
      sub={
        marketing.incomeAmount > 0
          ? `利润率 ${((profit / marketing.incomeAmount) * 100).toFixed(1)}%`
          : '—'
      }
      gradient={
        isProfit ? 'from-rose-500 to-pink-500' : 'from-gray-500 to-gray-600'
      }
    />
  </div>
);