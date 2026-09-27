import React from 'react';
import { Users, Wallet, TrendingUp, BookOpen } from 'lucide-react';
import { fmtMoney, fmtNumber } from './PayrollBadges';

interface SummaryData {
  headcount: number; baseSalary: number; salesCommission: number; classCommission: number; total: number;
}

const Card: React.FC<{ icon: React.ReactNode; label: string; value: number; isMoney?: boolean; color: string }> = ({ icon, label, value, isMoney = true, color }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
    <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-sm shrink-0`}>{icon}</span>
    <div className="min-w-0">
      <div className="text-[11px] text-gray-400 truncate">{label}</div>
      <div className="text-lg font-bold text-gray-800 tabular-nums truncate">{isMoney ? fmtMoney(value) : fmtNumber(value)}</div>
    </div>
  </div>
);

export const PayrollSummary: React.FC<{ summary: SummaryData | null }> = ({ summary }) => {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
      <Card icon={<Users className="w-4 h-4" />} label="计算人数" value={summary.headcount} isMoney={false} color="from-slate-500 to-gray-500" />
      <Card icon={<Wallet className="w-4 h-4" />} label="底薪合计" value={summary.baseSalary} color="from-blue-500 to-indigo-500" />
      <Card icon={<TrendingUp className="w-4 h-4" />} label="销提合计" value={summary.salesCommission} color="from-sky-500 to-cyan-500" />
      <Card icon={<BookOpen className="w-4 h-4" />} label="课提合计" value={summary.classCommission} color="from-violet-500 to-purple-500" />
      <Card icon={<Wallet className="w-4 h-4" />} label="总计" value={summary.total} color="from-emerald-500 to-teal-500" />
    </div>
  );
};