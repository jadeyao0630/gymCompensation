import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { adminChangePassword } from '../api/adminAuth';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 修改成功后回调（可选，用于强制登出等） */
  onSuccess?: () => void;
}

const ChangePasswordDialog: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  if (!open) return null;

  const reset = () => {
    setOldPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setError('');
    setOk(false);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPwd || !newPwd || !confirmPwd) {
      setError('请填写完整');
      return;
    }
    if (newPwd.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (newPwd === oldPwd) {
      setError('新密码不能与原密码相同');
      return;
    }

    setLoading(true);
    try {
      await adminChangePassword(oldPwd, newPwd);
      setOk(true);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.errormsg ||
        err?.response?.data?.message ||
        err?.message ||
        '修改失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">修改密码</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              建议使用至少 8 位含字母数字的密码
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* 原密码 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              原密码
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                autoComplete="current-password"
                className="w-full pr-10 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              新密码
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
                className="w-full pr-10 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 确认新密码 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              确认新密码
            </label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {ok && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              密码修改成功
            </div>
          )}
        </form>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || ok}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97] disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中…
              </>
            ) : ok ? (
              <>
                <Check className="w-4 h-4" />
                已修改
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                确认修改
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordDialog;