import React, { useEffect, useState } from 'react';
import {
  RefreshCw, Loader2, CheckCircle2, AlertCircle, Settings, ChevronDown,
} from 'lucide-react';

interface SyncConfig {
  enabled: boolean;
  schedule_mode: 'daily' | 'interval';
  daily_hour: number;
  interval_hours: number;
  lookback_days: number;
  last_run_at: string | null;
  last_run_status: 'success' | 'failed' | 'running' | null;
  last_run_message: string | null;
}

const DEFAULT_CONFIG: SyncConfig = {
  enabled: true,
  schedule_mode: 'daily',
  daily_hour: 3,
  interval_hours: 6,
  lookback_days: 30,
  last_run_at: null,
  last_run_status: null,
  last_run_message: null,
};

/* ⭐ 前端兜底：把 ISO 时间格式化成 "YYYY-MM-DD HH:mm:ss" */
function formatDateTime(input?: string | null): string {
  if (!input) return '';
  if (!input.includes('T')) return input;

  const d = new Date(input);
  if (isNaN(d.getTime())) return input;

  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const DingTalkSyncPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<SyncConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  /* 拉配置 */
  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dingtalk/sync-config');
      const json = await res.json();
      if (json.errorcode !== 0) throw new Error(json.errormsg);
      setConfig({ ...DEFAULT_CONFIG, ...json.data });
    } catch (e: any) {
      setError(e?.message || '读取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  /* 保存配置 */
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/dingtalk/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.enabled,
          schedule_mode: config.schedule_mode,
          daily_hour: config.daily_hour,
          interval_hours: config.interval_hours,
          lookback_days: config.lookback_days,
        }),
      });
      const json = await res.json();
      if (json.errorcode !== 0) throw new Error(json.errormsg);
      setConfig({ ...DEFAULT_CONFIG, ...json.data });
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  /* 立即同步 */
  const handleSyncNow = async () => {
    if (!confirm('立即从钉钉同步一次？可能耗时较长。')) return;
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/dingtalk/sync-now', { method: 'POST' });
      const json = await res.json();
      if (json.errorcode !== 0) throw new Error(json.errormsg);
      await fetchConfig();
    } catch (e: any) {
      setError(e?.message || '同步失败');
    } finally {
      setRunning(false);
    }
  };

  /* 状态徽章 */
  const renderLastRun = () => {
    if (!config.last_run_at)
      return <span className="text-gray-400">从未执行</span>;

    const status = config.last_run_status;
    const icon =
      status === 'success' ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
      ) : status === 'failed' ? (
        <AlertCircle className="w-3 h-3 text-rose-600" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      );

    const cls =
      status === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : status === 'failed'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-blue-50 text-blue-700 border-blue-200';

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${cls}`}
        title={config.last_run_message || ''}
      >
        {icon}
        {/* ⭐ 统一格式化 */}
        {formatDateTime(config.last_run_at)}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
      {/* 折叠头 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3 flex items-center gap-2 hover:bg-gray-50/50 transition text-left rounded-2xl"
      >
        <Settings className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">钉钉定时同步</span>
        <span className="text-[11px] text-gray-400 ml-1">
          {config.enabled
            ? config.schedule_mode === 'daily'
              ? `每天 ${String(config.daily_hour).padStart(2, '0')}:00`
              : `每 ${config.interval_hours} 小时`
            : '已禁用'}
        </span>
        <div className="flex-1" />
        <span className="text-[11px] text-gray-400 mr-2">上次：</span>
        {renderLastRun()}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {error && (
            <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {/* 启用 */}
            <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="accent-blue-600"
              />
              启用定时同步
            </label>

            {/* 模式 */}
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs">
              <span className="text-gray-500 shrink-0">模式</span>
              <select
                value={config.schedule_mode}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    schedule_mode: e.target.value as 'daily' | 'interval',
                  }))
                }
                className="flex-1 bg-transparent focus:outline-none"
              >
                <option value="daily">每天定时</option>
                <option value="interval">按间隔</option>
              </select>
            </div>

            {/* 时间 / 间隔 */}
            {config.schedule_mode === 'daily' ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs">
                <span className="text-gray-500 shrink-0">每天</span>
                <select
                  value={config.daily_hour}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      daily_hour: Number(e.target.value),
                    }))
                  }
                  className="flex-1 bg-transparent focus:outline-none"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs">
                <span className="text-gray-500 shrink-0">每</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={config.interval_hours}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      interval_hours: Number(e.target.value) || 1,
                    }))
                  }
                  className="w-14 bg-transparent focus:outline-none"
                />
                <span className="text-gray-500">小时</span>
              </div>
            )}

            {/* 回看天数 */}
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs">
              <span className="text-gray-500 shrink-0">回看</span>
              <input
                type="number"
                min={1}
                max={365}
                value={config.lookback_days}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    lookback_days: Number(e.target.value) || 30,
                  }))
                }
                className="w-16 bg-transparent focus:outline-none"
              />
              <span className="text-gray-500">天</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              保存配置
            </button>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={running}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
            >
              {running ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> 同步中…
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> 立即同步
                </>
              )}
            </button>

            {config.last_run_message && (
              <span
                className="text-[11px] text-gray-500 truncate max-w-full"
                title={config.last_run_message}
              >
                {config.last_run_message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DingTalkSyncPanel;