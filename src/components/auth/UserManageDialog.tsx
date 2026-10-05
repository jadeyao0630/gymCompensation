import React, { useEffect, useState } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  adminListUsers,
  adminCreateUser,
  adminDeleteUser,
  adminResetUserPassword,
  type AdminUserListItem,
} from '../../api/adminAuth';
import { useAuth } from '../../contexts/AuthContext';
import UserPermissionDialog from './UserPermissionDialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

const UserManageDialog: React.FC<Props> = ({ open, onClose }) => {
  const { user: currentUser } = useAuth();

  const [list, setList] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  /* 新增用户表单 */
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* 重置密码弹窗 */
  const [resetTarget, setResetTarget] = useState<AdminUserListItem | null>(
    null
  );
  const [resetPwd, setResetPwd] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetting, setResetting] = useState(false);

  /* ⭐ 权限编辑弹窗 */
  const [permTarget, setPermTarget] = useState<AdminUserListItem | null>(null);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await adminListUsers();
      setList(rows);
    } catch (e: any) {
      setError(
        e?.response?.data?.errormsg || e?.message || '加载失败（可能无权限）'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      reload();
      setSuccessMsg('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 2500);
    return () => clearTimeout(t);
  }, [successMsg]);

  if (!open) return null;

  const resetForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewDisplayName('');
    setShowPwd(false);
    setShowAdd(false);
  };

  const handleClose = () => {
    resetForm();
    setResetTarget(null);
    setResetPwd('');
    setPermTarget(null);
    setError('');
    setSuccessMsg('');
    onClose();
  };

  const handleAdd = async () => {
    setError('');
    if (!newUsername.trim() || !newPassword) {
      setError('请输入账号和密码');
      return;
    }
    if (newUsername.trim().length < 3) {
      setError('账号至少 3 位');
      return;
    }
    if (newPassword.length < 6) {
      setError('密码至少 6 位');
      return;
    }

    setSubmitting(true);
    try {
      const nameForTip = newUsername.trim();
      await adminCreateUser(
        nameForTip,
        newPassword,
        newDisplayName.trim() || undefined
      );
      resetForm();
      await reload();
      setSuccessMsg(`已新增用户「${nameForTip}」`);
    } catch (e: any) {
      setError(e?.response?.data?.errormsg || e?.message || '新增失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: AdminUserListItem) => {
    if (item.id === currentUser?.id) {
      alert('不能删除自己');
      return;
    }
    if (item.role === 'admin') {
      alert('不能删除超级管理员');
      return;
    }
    if (!confirm(`确定删除用户「${item.username}」吗？`)) return;
    setError('');
    try {
      await adminDeleteUser(item.id);
      await reload();
      setSuccessMsg(`已删除用户「${item.username}」`);
    } catch (e: any) {
      setError(e?.response?.data?.errormsg || e?.message || '删除失败');
    }
  };

  const openReset = (item: AdminUserListItem) => {
    setError('');
    setResetTarget(item);
    setResetPwd('');
    setShowResetPwd(false);
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    if (!resetPwd) {
      setError('请输入新密码');
      return;
    }
    if (resetPwd.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    setResetting(true);
    setError('');
    try {
      await adminResetUserPassword(resetTarget.id, resetPwd);
      setSuccessMsg(`已重置「${resetTarget.username}」的密码`);
      setResetTarget(null);
      setResetPwd('');
    } catch (e: any) {
      setError(e?.response?.data?.errormsg || e?.message || '重置失败');
    } finally {
      setResetting(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString('zh-CN', { hour12: false });
    } catch {
      return s;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">用户管理</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              仅超级管理员可新增 / 删除 / 重置密码 / 配置权限
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 工具条 */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">共 {list.length} 个账号</span>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-medium transition active:scale-[0.97]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showAdd ? '收起新增' : '新增用户'}
          </button>
        </div>

        {/* 新增用户表单 */}
        {showAdd && (
          <div className="px-5 py-4 bg-emerald-50/40 border-b border-emerald-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  账号
                  <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal">
                    （≥3位，唯一）
                  </span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="如 wangxiaoming"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  密码
                  <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal">（≥6位）</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="如 Gym@2026"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  昵称
                  <span className="text-gray-400 font-normal">（可选）</span>
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="如 王小明"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    提交中…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    确认新增
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 成功提示 */}
        {successMsg && (
          <div className="mx-5 mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            {successMsg}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mx-5 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              暂无用户
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs">
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2 text-left font-medium">账号</th>
                  <th className="px-3 py-2 text-left font-medium">昵称</th>
                  <th className="px-3 py-2 text-left font-medium">角色</th>
                  <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">
                    创建时间
                  </th>
                  <th className="px-3 py-2 text-center font-medium w-72">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isAdmin = u.role === 'admin';
                  const cannotDelete = isSelf || isAdmin;
                  const cannotReset = isAdmin && !isSelf;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {u.username}
                          </span>
                          {isSelf && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              当前
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {u.displayName || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                            <Shield className="w-3 h-3" /> 超级管理员
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 border border-gray-200">
                            普通用户
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs hidden sm:table-cell tabular-nums">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* ⭐ 权限按钮（仅普通用户显示） */}
                          {!isAdmin && (
                            <button
                              onClick={() => setPermTarget(u)}
                              title="配置权限"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              权限
                            </button>
                          )}

                          {/* 重置密码 */}
                          <button
                            onClick={() => openReset(u)}
                            disabled={cannotReset}
                            title={
                              cannotReset
                                ? '不能重置其他超级管理员的密码'
                                : '重置密码'
                            }
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
                              cannotReset
                                ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                            }`}
                          >
                            <KeyRound className="w-3 h-3" />
                            重置密码
                          </button>

                          {/* 删除 */}
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={cannotDelete}
                            title={
                              isSelf
                                ? '不能删除自己'
                                : isAdmin
                                ? '不能删除超级管理员'
                                : '删除用户'
                            }
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
                              cannotDelete
                                ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            关闭
          </button>
        </div>
      </div>

      {/* 重置密码弹窗（嵌套） */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setResetTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900">
                  重置密码
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  为「{resetTarget.username}」设置新密码
                </p>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              <label className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                新密码
                <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal">（≥6位）</span>
              </label>
              <div className="relative">
                <input
                  type={showResetPwd ? 'text' : 'password'}
                  value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)}
                  autoFocus
                  placeholder="输入新密码"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showResetPwd ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                重置后该用户需用新密码登录，旧密码立即失效
              </p>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97] disabled:cursor-not-allowed"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    提交中…
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    确认重置
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ 权限编辑弹窗（嵌套） */}
      {permTarget && (
        <UserPermissionDialog
          user={permTarget}
          onClose={() => setPermTarget(null)}
          onSaved={() => {
            setSuccessMsg(`已更新「${permTarget.username}」的权限`);
          }}
        />
      )}
    </div>
  );
};

export default UserManageDialog;