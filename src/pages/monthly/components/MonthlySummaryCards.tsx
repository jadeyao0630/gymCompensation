import React from 'react';
import {
  TrendingUp, TrendingDown, Users, Building2, GitBranch,
} from 'lucide-react';
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
  payrollRewardsTotal?: number;
  fixedCost: number;
  profit: number;
  isProfit: boolean;
  dingtalkSummary?: { count: number; total: number };
  /** ⭐ 展示当前门店名，避免误解为全店 */
  storeName?: string;
}

export const MonthlySummaryCards: React.FC<Props> = ({
  marketing, payrollTotal, payrollHeadcount, payrollRewardsTotal = 0,
  fixedCost, profit, isProfit, dingtalkSummary, storeName,
}) => {
  const hasRewards = Math.abs(payrollRewardsTotal) > 0;
  const rewardsText = hasRewards
    ? ` · 奖罚 ${payrollRewardsTotal >= 0 ? '+' : ''}${fmtMoney(payrollRewardsTotal)}`
    : '';

  const showDingtalk = !!dingtalkSummary;

  const gridCls = showDingtalk
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8';

  return (
    <div className={gridCls}>
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
        sub={`计入 ${payrollHeadcount} 人${rewardsText}`}
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
        icon={isProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
        label="净利润"
        value={fmtMoney(profit)}
        sub={
          marketing.incomeAmount > 0
            ? `利润率 ${((profit / marketing.incomeAmount) * 100).toFixed(1)}%`
            : '—'
        }
        gradient={isProfit ? 'from-rose-500 to-pink-500' : 'from-gray-500 to-gray-600'}
      />

      {showDingtalk && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-indigo-50 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow">
                <GitBranch className="w-4 h-4" />
              </span>
              <span className="text-xs font-medium text-gray-500">
                钉钉流程（参考）{storeName ? ` · ${storeName}` : ''}
              </span>
            </div>
            <div className="text-2xl font-bold text-indigo-700 tabular-nums">
              ¥{(dingtalkSummary!.total || 0).toLocaleString('zh-CN')}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              共 {dingtalkSummary!.count || 0} 笔 · 仅读缓存
            </div>
          </div>
        </div>
      )}
    </div>
  );
};