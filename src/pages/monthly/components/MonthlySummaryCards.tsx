import React from 'react';
import { TrendingUp, Users, Building2, GitBranch, Calculator, Receipt } from 'lucide-react';
import { BigCard } from './MonthlyCommon';
import { fmtMoney } from '../utils/date';
import type { OverallSummary } from '../../marketing/utils/aggregate';
import type { DingtalkBreakdown } from '../hooks/useMonthlyReport';

interface Props {
  marketing: OverallSummary & { cardAmount: number; incomeAmount: number; prePayment: number };
  payrollTotal: number;
  payrollHeadcount: number;
  payrollRewardsTotal?: number;
  fixedCost: number;
  estimatedProfit: number;
  actualProfit: number;
  isEstimatedProfit: boolean;
  profit?: number;
  isProfit?: boolean;
  dingtalkSummary?: { count: number; total: number };
  dingtalkBreakdown?: DingtalkBreakdown;
  hasDingtalkData?: boolean;
  estimatedExpense?: number;
  actualExpense?: number;
  actualExpenseCount?: number;
  actualTotalExpense?: number;
  storeName?: string;
}

export const MonthlySummaryCards: React.FC<Props> = ({
  marketing, payrollTotal, payrollHeadcount, payrollRewardsTotal = 0,
  fixedCost, estimatedProfit, actualProfit, isEstimatedProfit,
  dingtalkSummary, dingtalkBreakdown, hasDingtalkData,
}) => {
  const b = dingtalkBreakdown;
  const actualSalary = b?.salary.total ?? 0;
  const actualFixed = (b?.property.total ?? 0) + (b?.electric.total ?? 0) + (b?.water.total ?? 0);
  const other = b?.extraExpense ?? 0;
  const total = b?.total ?? 0;
  const hasData = Boolean(hasDingtalkData || (dingtalkSummary?.count ?? 0) > 0);
  const payrollSub = `计入 ${payrollHeadcount} 人` +
    (payrollRewardsTotal !== 0 ? ` · 奖罚 ${fmtMoney(payrollRewardsTotal)}` : '') +
    ` · 钉钉实发 ${fmtMoney(actualSalary)}`;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <BigCard icon={<TrendingUp className="w-6 h-6" />} label="营销收入（实收）"
        value={fmtMoney(marketing.incomeAmount)} sub={`卡金额 ${fmtMoney(marketing.cardAmount)}`}
        gradient="from-emerald-500 to-teal-500" />
      <BigCard icon={<Users className="w-6 h-6" />} label="薪酬支出（预估）"
        value={fmtMoney(payrollTotal)} sub={payrollSub} gradient="from-blue-500 to-indigo-500" />
      <BigCard icon={<Building2 className="w-6 h-6" />} label="固定成本（预估）"
        value={fmtMoney(fixedCost)} sub={`物业/租金/水电等 · 钉钉实付 ${fmtMoney(actualFixed)}`}
        gradient="from-amber-500 to-orange-500" />
      <BigCard icon={<GitBranch className="w-6 h-6" />} label="钉钉实际支出"
        value={fmtMoney(total)}
        sub={`其它 ${fmtMoney(other)} + 实发薪酬 ${fmtMoney(actualSalary)} + 实际固定成本 ${fmtMoney(actualFixed)}`}
        gradient="from-rose-500 to-red-500" />
      <BigCard icon={<Calculator className="w-6 h-6" />} label="预估利润"
        value={fmtMoney(estimatedProfit)}
        sub={marketing.incomeAmount > 0 ? `利润率 ${((estimatedProfit / marketing.incomeAmount) * 100).toFixed(1)}% · 预估口径` : '收入 - 预估薪酬 - 预估固定成本'}
        gradient={isEstimatedProfit ? 'from-cyan-500 to-blue-500' : 'from-gray-500 to-gray-600'} />
      <BigCard icon={<Receipt className="w-6 h-6" />} label="实际利润（钉钉口径）"
        value={fmtMoney(actualProfit)}
        sub={hasData && marketing.incomeAmount > 0
          ? `利润率 ${((actualProfit / marketing.incomeAmount) * 100).toFixed(1)}% · 收入减钉钉全部支出`
          : hasData ? '收入 - 钉钉全部支出' : '无钉钉流程记录，实际支出可能不完整'}
        gradient={actualProfit >= 0 ? 'from-rose-500 to-pink-500' : 'from-gray-500 to-gray-600'} />
    </div>
  );
};
