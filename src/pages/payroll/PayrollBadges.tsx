import React from 'react';
import {
  User, UserRound, Sparkles, Crown, Store, Flower2, Music,
  Music2, Waves, Dumbbell, Users, ConciergeBell, Brush, Sliders,
} from 'lucide-react';
import type { PayrollResult } from '../../utils/payroll';

/* 格式化 */
export const fmtMoney = (v: number | undefined | null): string =>
  !v || Number.isNaN(v) ? '—' : `¥${v.toLocaleString()}`;
export const fmtNumber = (v: number | undefined | null): string =>
  !v || Number.isNaN(v) ? '—' : String(v);

/* ---------------- 徽章 ---------------- */
export const GenderBadge: React.FC<{ gender: PayrollResult['gender'] }> = ({ gender }) => {
  if (gender === 'female')
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-50 text-pink-600 border border-pink-100">
        <UserRound className="w-3 h-3" /> 女
      </span>
    );
  if (gender === 'newbie')
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">
        <Sparkles className="w-3 h-3" /> 新人
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
      <User className="w-3 h-3" /> 男
    </span>
  );
};

export const ManagerBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
    <Crown className="w-3 h-3" /> 经理
  </span>
);

export const StoreBadge: React.FC<{ title?: string }> = ({ title }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
    <Store className="w-3 h-3" /> {title || '店长'}
  </span>
);

export const PositionBadge: React.FC<{ title: string }> = ({ title }) => {
  const t = title || '';
  if (t.includes('店长') || t.includes('门店经理')) return <StoreBadge title={title} />;
  if (t.includes('瑜伽'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200"><Flower2 className="w-3 h-3" /> {title}</span>);
  if (t.includes('舞蹈'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200"><Music className="w-3 h-3" /> {title}</span>);
  if (t.includes('团操') || t.includes('团体操'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"><Music2 className="w-3 h-3" /> {title}</span>);
  if (t.includes('泳教') || t.includes('游泳'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200"><Waves className="w-3 h-3" /> {title}</span>);
  if (t.includes('私教') || t.includes('私人教练'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200"><Dumbbell className="w-3 h-3" /> {title}</span>);
  if (t.includes('前台') || t.includes('收银'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200"><ConciergeBell className="w-3 h-3" /> {title}</span>);
  if (t.includes('保洁') || t.includes('清洁') || t.includes('行政'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-lime-50 text-lime-700 border border-lime-200"><Brush className="w-3 h-3" /> {title}</span>);
  if (t.includes('会籍'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200"><Users className="w-3 h-3" /> {title}</span>);
  if (t.includes('运营'))
    return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"><Sliders className="w-3 h-3" /> {title}</span>);
  return (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">{title}</span>);
};

/* ---------------- 部门样式 ---------------- */
import type { Department } from '../../utils/payroll';
export const DEPT_STYLE: Record<Department, { icon: React.ReactNode; gradient: string; text: string; lightBg: string; border: string }> = {
  会籍: { icon: <Users className="w-4 h-4" />, gradient: 'from-blue-500 to-indigo-500', text: 'text-blue-700', lightBg: 'bg-blue-50', border: 'border-blue-200' },
  私教: { icon: <Dumbbell className="w-4 h-4" />, gradient: 'from-violet-500 to-purple-500', text: 'text-violet-700', lightBg: 'bg-violet-50', border: 'border-violet-200' },
  泳教: { icon: <Waves className="w-4 h-4" />, gradient: 'from-cyan-500 to-teal-500', text: 'text-cyan-700', lightBg: 'bg-cyan-50', border: 'border-cyan-200' },
  运营: { icon: <WalletIcon />, gradient: 'from-slate-500 to-gray-500', text: 'text-slate-700', lightBg: 'bg-slate-50', border: 'border-slate-200' },
};

/* 懒得引 Wallet，用 Sliders 代替 */
function WalletIcon() {
  return <Sliders className="w-4 h-4" />;
}

/* ---------------- 字段可见性 ---------------- */
export const DEPT_FIELDS: Record<Department, { salesAmount: boolean; classAmount: boolean; salesCommission: boolean; classCommission: boolean }> = {
  会籍: { salesAmount: true, classAmount: false, salesCommission: true, classCommission: false },
  私教: { salesAmount: true, classAmount: true, salesCommission: true, classCommission: true },
  泳教: { salesAmount: true, classAmount: true, salesCommission: true, classCommission: true },
  运营: { salesAmount: false, classAmount: false, salesCommission: true, classCommission: false },
};

export const DEPT_DETAIL_FIELDS = {
  会籍: { salesAmount: true, classAmount: false, salesCommission: true, classCommission: false },
  私教: { salesAmount: true, classAmount: true, salesCommission: true, classCommission: true },
  泳教: { salesAmount: true, classAmount: true, salesCommission: true, classCommission: true },
  运营: { salesAmount: true, classAmount: false, salesCommission: true, classCommission: false },
};