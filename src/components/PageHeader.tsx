import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { formatMonthLabel } from '../utils/format';

interface PageHeaderProps {
  selectedMonth: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ selectedMonth }) => (
  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 shadow-2xl shadow-indigo-500/20 p-8 sm:p-10 mb-8 text-white">
    <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-glow pointer-events-none" />
    <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl animate-glow pointer-events-none" />
    <div
      className="absolute inset-0 opacity-[0.07] pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    />
    <div className="relative flex items-start justify-between flex-wrap gap-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold tracking-widest uppercase">
            Gym Compensation
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          健身房薪酬方案配置
        </h1>
        <p className="text-sm text-blue-100/90 mt-3 max-w-md leading-relaxed">
          按月管理 · Excel 一键导入 · 分职位配置佣金与底薪阶梯
        </p>
      </div>
      <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/25 shadow-lg">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-blue-100/80 font-medium">
            当前周期
          </p>
          <p className="text-sm font-semibold">
            {selectedMonth ? formatMonthLabel(selectedMonth) : '未选择'}
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default PageHeader;
