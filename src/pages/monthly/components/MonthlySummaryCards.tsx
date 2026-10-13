import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  GitBranch,
  Calculator,
  Receipt,
} from 'lucide-react';
import { BigCard } from './MonthlyCommon';
import { fmtMoney } from '../utils/date';
import type { OverallSummary } from '../../marketing/utils/aggregate';

interface DingtalkBreakdown {
  salary: { count: number; total: number };
  property: { count: number; total: number };
  electric: { count: number; total: number };
  water: { count: number; total: number };
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
  marketing,
  payrollTotal,
  payrollHeadcount,
  payrollRewardsTotal = 0,
  fixedCost,
  estimatedProfit,
  actualProfit,
  isEstimatedProfit,
  dingtalkSummary,
  dingtalkBreakdown,
  hasDingtalkData,
  actualExpense,
  actualExpenseCount,
}) => {
  const dtSalary = dingtalkBreakdown?.salary.total || 0;
  const dtProperty = dingtalkBreakdown?.property.total || 0;
  const dtElectric = dingtalkBreakdown?.electric.total || 0;
  const dtWater = dingtalkBreakdown?.water.total || 0;
  const dtExtra = dingtalkBreakdown?.extraExpense || 0;

  const isActualProfit = actualProfit >= 0;

  let payrollSub = `计入 ${payrollHeadcount} 人`;
  if (Math.abs(payrollRewardsTotal) > 0) {
    payrollSub += ` · 奖罚 ${payrollRewardsTotal >= 0 ? '+' : ''}${fmtMoney(payrollRewardsTotal)}`;
  }
  if (dtSalary > 0) {
    payrollSub += ` · 钉钉实发 ${fmtMoney(dtSalary)}`;
  }

  let fixedSub = '物业/租金/水电等';
  if (dtProperty + dtElectric + dtWater > 0) {
    fixedSub = `物业/租金/水电等 · 钉钉实付 ${fmtMoney(dtProperty + dtElectric + dtWater)}`;
  }

  /* ⭐ 钉钉实际支出卡片：只显示排除重复后的新增金额 */
  const finalActualExpense = actualExpense ?? dtExtra;
  const dingtalkSub =
    actualExpenseCount != null
      ? `退费/修理/日常支出等 · ${actualExpenseCount} 项（已排除薪酬/物业/水电）`
      : '退费/修理/日常支出等（已排除薪酬/物业/水电）';

  let estSub = '收入 - 预估支出（薪酬+固定成本）';
  if (marketing.incomeAmount > 0) {
    estSub = `利润率 ${((estimatedProfit / marketing.incomeAmount) * 100).toFixed(1)}% · 预估口径`;
  }

  let actualSub = hasDingtalkData
    ? '收入 - 实际支出（薪酬+固定成本+钉钉新增）'
    : '无钉钉数据，回落用预估';
  if (marketing.incomeAmount > 0 && hasDingtalkData) {
    actualSub = `利润率 ${((actualProfit / marketing.incomeAmount) * 100).toFixed(1)}% · 实际口径`;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

      {/* ⭐ 钉钉实际支出：排除薪酬/物业/电费/水费后的新增 */}
      <BigCard
        icon={<GitBranch className="w-6 h-6" />}
        label="钉钉实际支出"
        value={fmtMoney(finalActualExpense)}
        sub={dingtalkSub}
        gradient="from-rose-500 to-red-500"
      />

      <BigCard
        icon={<Calculator className="w-6 h-6" />}
        label="预估利润"
        value={fmtMoney(estimatedProfit)}
        sub={estSub}
        gradient={
          isEstimatedProfit
            ? 'from-cyan-500 to-blue-500'
            : 'from-gray-500 to-gray-600'
        }
      />

      <BigCard
        icon={<Receipt className="w-6 h-6" />}
        label="实际利润"
        value={fmtMoney(actualProfit)}
        sub={actualSub}
        gradient={
          isActualProfit
            ? 'from-rose-500 to-pink-500'
            : 'from-gray-500 to-gray-600'
        }
      />
    </div>
  );
};