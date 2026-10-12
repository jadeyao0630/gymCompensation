import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  GitBranch,
} from 'lucide-react';
import { BigCard } from './MonthlyCommon';
import { fmtMoney } from '../utils/date';
import type { OverallSummary } from '../../marketing/utils/aggregate';

interface DingtalkBreakdown {
  salary: { count: number; total: number };
  property: { count: number; total: number };
  utility: { count: number; total: number };
  repair: { count: number; total: number };
  daily: { count: number; total: number };
  refund: { count: number; total: number };
  other: { count: number; total: number };
  total: number;
  extraExpense: number;
  categories: Array<{ category: string; count: number; total: number }>;
}

interface Props {
  marketing: OverallSummary & {
    cardAmount: number;
    incomeAmount: number;
    prePayment: number;
  };
  payrollTotal: number;
  payrollHeadcount: number;
  payrollRewardsTotal?: number;
  fixedCost: number;
  profit: number;
  isProfit: boolean;

  dingtalkSummary?: { count: number; total: number };
  dingtalkBreakdown?: DingtalkBreakdown;

  adjustedPayroll?: number;
  adjustedFixedCost?: number;
  actualExpense?: number;
  estimatedExpense?: number;

  storeName?: string;
}

export const MonthlySummaryCards: React.FC<Props> = ({
  marketing,
  payrollTotal,
  payrollHeadcount,
  payrollRewardsTotal = 0,
  fixedCost,
  profit,
  isProfit,
  dingtalkSummary,
  dingtalkBreakdown,
  actualExpense,
  estimatedExpense,
  storeName,
}) => {
  const dtSalary = dingtalkBreakdown?.salary.total || 0;
  const dtProperty = dingtalkBreakdown?.property.total || 0;
  const dtUtility = dingtalkBreakdown?.utility.total || 0;
  const dtTotal = dingtalkBreakdown?.total || 0;

  /* 薪酬卡片副标题 */
  let payrollSub = `计入 ${payrollHeadcount} 人`;
  if (Math.abs(payrollRewardsTotal) > 0) {
    payrollSub += ` · 奖罚 ${payrollRewardsTotal >= 0 ? '+' : ''}${fmtMoney(payrollRewardsTotal)}`;
  }
  if (dtSalary > 0) {
    payrollSub += ` · 钉钉实发 ${fmtMoney(dtSalary)}`;
  }

  /* 固定成本卡片副标题 */
  let fixedSub = '物业/租金/水电等';
  if (dtProperty + dtUtility > 0) {
    fixedSub = `物业/租金/水电等 · 钉钉实付 ${fmtMoney(dtProperty + dtUtility)}`;
  }

  /* 钉钉卡片副标题 */
  const dingtalkSub = dingtalkSummary
    ? `含工资/物业/水电 · ${dingtalkSummary.count} 笔`
    : '无钉钉数据';

  /* 净利润副标题 */
  let netSub = '已含钉钉全部支出';
  if (marketing.incomeAmount > 0) {
    netSub = `利润率 ${((profit / marketing.incomeAmount) * 100).toFixed(1)}% · 已含钉钉全部支出`;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
      <BigCard
        icon={<TrendingUp className="w-6 h-6" />}
        label="营销收入（实收）"
        value={fmtMoney(marketing.incomeAmount)}
        sub={`卡金额 ${fmtMoney(marketing.cardAmount)}`}
        gradient="from-emerald-500 to-teal-500"
      />

      <BigCard
        icon={<Users className="w-6 h-6" />}
        label="薪酬支出（预估）"
        value={fmtMoney(payrollTotal)}
        sub={payrollSub}
        gradient="from-blue-500 to-indigo-500"
      />

      <BigCard
        icon={<Building2 className="w-6 h-6" />}
        label="固定成本（预估）"
        value={fmtMoney(fixedCost)}
        sub={fixedSub}
        gradient="from-amber-500 to-orange-500"
      />

      <BigCard
        icon={<GitBranch className="w-6 h-6" />}
        label="钉钉实际支出"
        value={fmtMoney(dtTotal)}
        sub={dingtalkSub}
        gradient="from-rose-500 to-red-500"
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
        sub={netSub}
        gradient={
          isProfit ? 'from-rose-500 to-pink-500' : 'from-gray-500 to-gray-600'
        }
      />
    </div>
  );
};