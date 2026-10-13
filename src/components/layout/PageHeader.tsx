import React from 'react';
import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import NavButtons from './NavButtons';
import UserMenu from './../auth/UserMenu';

/* ⭐ NavButtons 的 active key 类型 */
type NavActiveKey =
  | 'config'
  | 'simulation'
  | 'payroll'
  | 'marketing'
  | 'monthly'
  | 'dingtalk'
  | 'stores';

interface PageHeaderProps {
  /* ⭐ 可选 props：不传则用默认值（兼容原有页面） */
  title?: string;
  description?: string;
  badgeText?: string;
  badgeIcon?: ReactNode;
  navActive?: NavActiveKey;
  actions?: ReactNode;
  showUserMenu?: boolean;

  /* 兼容旧 props */
  selectedMonth?: string;
  storeId?: string;
  dbOnline?: boolean;
  saveStatus?: any;
  lastSavedAt?: Date | null;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title = '健身房薪酬方案配置',
  description = '按月管理 · Excel 一键导入 · 分职位配置佣金与底薪阶梯',
  badgeText = 'Gym Compensation',
  badgeIcon,
  navActive = 'config',
  actions,
  showUserMenu = true,
}) => {
  return (
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

      <div className="relative">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
              {badgeIcon || <Sparkles className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-semibold tracking-widest uppercase">
                {badgeText}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-sm text-blue-100/90 mt-3 max-w-md leading-relaxed">
              {description}
            </p>
          </div>

          {/* 右侧：自定义 actions 或 UserMenu */}
          {actions ? (
            <div className="flex flex-col items-end gap-2">
              {showUserMenu && <UserMenu variant="dark" />}
              <div className="flex items-center gap-2 flex-wrap">{actions}</div>
            </div>
          ) : showUserMenu ? (
            <UserMenu variant="dark" />
          ) : null}
        </div>

        {/* 底部：页面切换按钮 */}
        <div className="mt-6">
          <NavButtons active={navActive} />
        </div>
      </div>
    </div>
  );
};

export default PageHeader;