import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  User,
  Lock,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminCheckInitStatus, adminInitDatabase } from '../../api/adminAuth';

type InitStatus = 'checking' | 'ready' | 'initializing' | 'initialized' | 'error';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ⭐ 数据库初始化状态 */
  const [initStatus, setInitStatus] = useState<InitStatus>('checking');
  const [initMessage, setInitMessage] = useState('');

  /* ============================================================
   * 首次挂载：检查数据库状态，必要时自动初始化
   * ============================================================ */
  useEffect(() => {
    let cancelled = false;

    const checkAndInit = async () => {
      setInitStatus('checking');
      setInitMessage('正在检查数据库…');

      try {
        const status = await adminCheckInitStatus();
        if (cancelled) return;

        if (status.initialized) {
          setInitStatus('ready');
          setInitMessage(`数据库已就绪（${status.adminCount} 个账号）`);
          setTimeout(() => {
            if (!cancelled) setInitMessage('');
          }, 3000);
          return;
        }

        /* 未初始化 → 主动初始化 */
        console.log('[login] 数据库未初始化，开始自动初始化…', status.reason);
        setInitStatus('initializing');
        setInitMessage('正在初始化数据库，请稍候…');

        const result = await adminInitDatabase();
        if (cancelled) return;

        setInitStatus('initialized');
        setInitMessage(
          `数据库初始化完成，已创建 ${result.adminCount} 个账号`
        );
        setTimeout(() => {
          if (!cancelled) setInitMessage('');
        }, 4000);
      } catch (e: any) {
        console.error('[login] 初始化检查失败', e);
        if (cancelled) return;
        setInitStatus('error');
        setInitMessage(
          e?.response?.data?.errormsg ||
            e?.message ||
            '数据库连接失败，请检查后端服务'
        );
      }
    };

    checkAndInit();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password, remember);
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.errormsg ||
        err?.response?.data?.message ||
        err?.message ||
        '登录失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* 初始化状态徽章 */
  const renderInitBadge = () => {
    if (initStatus === 'checking') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {initMessage}
        </div>
      );
    }
    if (initStatus === 'initializing') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <Database className="w-3.5 h-3.5 animate-pulse" />
          {initMessage}
        </div>
      );
    }
    if (initStatus === 'initialized') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {initMessage}
        </div>
      );
    }
    if (initStatus === 'error') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5" />
          {initMessage}
        </div>
      );
    }
    return null;
  };

  const disableSubmit =
    loading || initStatus === 'initializing' || initStatus === 'checking';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">薪酬管理系统</h1>
          <p className="text-sm text-gray-500 mt-1">管理员登录</p>
        </div>

        {/* ⭐ 初始化状态提示 */}
        {initMessage && <div className="mb-4">{renderInitBadge()}</div>}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl shadow-emerald-500/5 border border-gray-100 p-6 sm:p-8 space-y-5"
        >
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">
              账号
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入账号"
                autoComplete="username"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">下次免密码登录</span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={disableSubmit}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                登录中…
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                登录
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          默认账号：admin / admin123（登录后请修改）
        </p>
      </div>
    </div>
  );
};

export default LoginPage;