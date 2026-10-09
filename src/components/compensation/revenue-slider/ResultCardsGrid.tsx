import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BadgePercent,
  BookOpen,
} from 'lucide-react';
import ResultCard from './ResultCard';

interface Props {
  revenue: number;
  totalBase: number;
  totalPositionCommission: number;
  totalClassCommission: number;
  profit: number;
  isProfit: boolean;
}

const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

export const ResultCardsGrid: React.FC<Props> = ({
  revenue,
  totalBase,
  totalPositionCommission,
  totalClassCommission,
  profit,
  isProfit,
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
    <ResultCard
      icon={<TrendingUp className="w-3.5 h-3.5" />}
      label="总业绩"
      value={formatMoney(revenue)}
      color="text-indigo-700"
      bg="bg-indigo-50 border-indigo-100"
    />
    <ResultCard
      icon={<Wallet className="w-3.5 h-3.5" />}
      label="总底薪"
      value={formatMoney(totalBase)}
      color="text-blue-700"
      bg="bg-blue-50 border-blue-100"
    />
    <ResultCard
      icon={<BadgePercent className="w-3.5 h-3.5" />}
      label="销提合计"
      value={formatMoney(totalPositionCommission)}
      color="text-amber-700"
      bg="bg-amber-50 border-amber-100"
    />
    <ResultCard
      icon={<BookOpen className="w-3.5 h-3.5" />}
      label="课提合计"
      value={formatMoney(totalClassCommission)}
      color="text-purple-700"
      bg="bg-purple-50 border-purple-100"
    />
    <ResultCard
      icon={
        isProfit ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )
      }
      label="利润"
      value={formatMoney(profit)}
      color={isProfit ? 'text-emerald-700' : 'text-red-700'}
      bg={
        isProfit
          ? 'bg-emerald-50 border-emerald-100'
          : 'bg-red-50 border-red-100'
      }
      big
    />
  </div>
);

export default ResultCardsGrid;