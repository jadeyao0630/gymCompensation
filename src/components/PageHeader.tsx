import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Sparkles,
  Store,
  LogOut,
  KeyRound,
  Users,
  User as UserIcon,
  Shield,
} from 'lucide-react';
import { formatMonthLabel } from '../utils/format';
import { getStoreById } from '../constants/stores';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordDialog from './ChangePasswordDialog';
import UserManageDialog from './UserManageDialog';

interface PageHeaderProps {
  selectedMonth: string;
  storeId?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ selectedMonth, storeId }) => {
  const storeName = getStoreById(storeId || '')?.name || '—';
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showUserManage, setShowUserManage] = useState(false);

  const handleLogout = async () => {
    if (!confirm('确定要退出登录吗？')) return;
    await logout();
    navigate('/login', { replace: true });
  };

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

        <div className="flex flex-wrap items-center gap-3">
          {/* 门店 */}
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/25 shadow-lg">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-blue-100/80 font-medium">
                当前门店
              </p>
              <p className="text-sm font-semibold">{storeName}</p>
            </div>
          </div>

          {/* 月份 */}
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

          {/* 用户信息 + 用户管理（仅超管） + 改密 + 登出 */}
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/25 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1">
                <p className="text-[10px] uppercase tracking-wider text-blue-100/80 font-medium">
                  当前用户
                </p>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-amber-300/30 text-amber-100 border border-amber-200/40">
                    <Shield className="w-2.5 h-2.5" /> 超管
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold">
                {user?.displayName || user?.username || '未登录'}
              </p>
            </div>

            {/* ⭐ 用户管理：仅超管可见 */}
            {isSuperAdmin && (
              <button
                onClick={() => setShowUserManage(true)}
                title="用户管理"
                className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-blue-500/40 border border-white/20 hover:border-blue-300/40 text-xs font-medium transition active:scale-[0.97]"
              >
                <Users className="w-3.5 h-3.5" />
                用户
              </button>
            )}

            {/* 改密：所有人可见 */}
            <button
              onClick={() => setShowChangePwd(true)}
              title="修改密码"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-amber-500/40 border border-white/20 hover:border-amber-300/40 text-xs font-medium transition active:scale-[0.97]"
            >
              <KeyRound className="w-3.5 h-3.5" />
              改密
            </button>

            {/* 登出 */}
            <button
              onClick={handleLogout}
              title="退出登录"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-red-500/40 border border-white/20 hover:border-red-300/40 text-xs font-medium transition active:scale-[0.97]"
            >
              <LogOut className="w-3.5 h-3.5" />
              登出
            </button>
          </div>
        </div>
      </div>

      {/* 对话框 */}
      <ChangePasswordDialog
        open={showChangePwd}
        onClose={() => setShowChangePwd(false)}
      />
      {isSuperAdmin && (
        <UserManageDialog
          open={showUserManage}
          onClose={() => setShowUserManage(false)}
        />
      )}
    </div>
  );
};

export default PageHeader;