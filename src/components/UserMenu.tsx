import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  KeyRound,
  Users,
  User as UserIcon,
  Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordDialog from './ChangePasswordDialog';
import UserManageDialog from './UserManageDialog';

interface Props {
  /** ⭐ 亮色头部（白底）用 light；深色头部（渐变）用 dark */
  variant?: 'light' | 'dark';
  /** 紧凑模式（只显示头像 + 用户名，不显示按钮文字） */
  compact?: boolean;
}

export const UserMenu: React.FC<Props> = ({
  variant = 'dark',
  compact = false,
}) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showUserManage, setShowUserManage] = useState(false);

  const handleLogout = async () => {
    if (!confirm('确定要退出登录吗？')) return;
    await logout();
    navigate('/login', { replace: true });
  };

  /* 颜色主题 */
  const containerCls =
    variant === 'dark'
      ? 'bg-white/15 backdrop-blur-md border border-white/25 shadow-lg'
      : 'bg-gray-50 border border-gray-200';

  const iconCls =
    variant === 'dark'
      ? 'bg-white/25 text-white'
      : 'bg-gray-200 text-gray-700';

  const labelCls = variant === 'dark' ? 'text-blue-100/80' : 'text-gray-500';
  const nameCls = variant === 'dark' ? 'text-white' : 'text-gray-800';

  const btnBaseCls =
    variant === 'dark'
      ? 'bg-white/15 hover:bg-white/25 border border-white/20 text-white'
      : 'bg-white hover:bg-gray-100 border border-gray-200 text-gray-700';

  return (
    <>
      <div
        className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${containerCls}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${iconCls}`}
        >
          <UserIcon className="w-4 h-4" />
        </div>

        {!compact && (
          <div className="hidden sm:block">
            <div className="flex items-center gap-1">
              <p
                className={`text-[10px] uppercase tracking-wider font-medium ${labelCls}`}
              >
                当前用户
              </p>
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-amber-300/30 text-amber-100 border border-amber-200/40">
                  <Shield className="w-2.5 h-2.5" /> 超管
                </span>
              )}
            </div>
            <p className={`text-xs font-semibold ${nameCls}`}>
              {user?.displayName || user?.username || '未登录'}
            </p>
          </div>
        )}

        {/* 用户管理（仅超管） */}
        {isSuperAdmin && (
          <button
            onClick={() => setShowUserManage(true)}
            title="用户管理"
            className={`ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition active:scale-[0.97] ${btnBaseCls}`}
          >
            <Users className="w-3.5 h-3.5" />
            {!compact && <span>用户</span>}
          </button>
        )}

        {/* 改密 */}
        <button
          onClick={() => setShowChangePwd(true)}
          title="修改密码"
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition active:scale-[0.97] ${btnBaseCls}`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {!compact && <span>改密</span>}
        </button>

        {/* 登出 */}
        <button
          onClick={handleLogout}
          title="退出登录"
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition active:scale-[0.97] ${
            variant === 'dark'
              ? 'bg-white/15 hover:bg-red-500/40 border border-white/20 text-white'
              : 'bg-white hover:bg-red-50 border border-gray-200 text-red-600'
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!compact && <span>登出</span>}
        </button>
      </div>

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
    </>
  );
};

export default UserMenu;