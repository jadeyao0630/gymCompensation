import React, { useEffect, useState } from 'react';
import { Store, Loader2, Check, X } from 'lucide-react';
import { setManualStore, removeManualStore } from '../../../api/dingtalk';
import { normalizeStoreName } from '../utils/constants';

interface Props {
  /** ⭐ 必填 string，调用方用 || '' 兜底 */
  processInstanceId: string;
  /** ⭐ 统一用 string | null */
  storeName: string | null;
  /** 是否来自手动归属 */
  isManual?: boolean;
  /** 分配原因（用于 title） */
  assignReason?: string;
  /** 可选门店列表 */
  storeOptions: string[];
  /** 变更回调 */
  onChanged?: (next: string | null, isManual: boolean) => void;
}

const StoreAssignCell: React.FC<Props> = ({
  processInstanceId,
  storeName,
  isManual,
  assignReason,
  storeOptions,
  onChanged,
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(storeName ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>('');

  /* ⭐ 外部 storeName 变化时同步（查询刷新后） */
  useEffect(() => {
    setValue(storeName ?? '');
  }, [storeName]);

  const handleSave = async () => {
    const next = value.trim();
    if (!next) {
      setErr('请选择门店');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const clean = normalizeStoreName(next) || next;
      await setManualStore(processInstanceId, clean);
      setEditing(false);
      onChanged?.(clean, true);
    } catch (e: any) {
      setErr(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setErr('');
    try {
      await removeManualStore(processInstanceId);
      setEditing(false);
      /* ⭐ 用 null，不用 undefined */
      onChanged?.(null, false);
    } catch (e: any) {
      setErr(e?.message || '重置失败');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    const display = storeName ?? '未指定';
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
            isManual
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}
          title={assignReason ?? ''}
        >
          <Store className="w-3 h-3" />
          {display}
        </span>
        {isManual && (
          <span className="text-[10px] text-amber-600 font-medium">手动</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-[10px] text-blue-500 hover:underline"
        >
          调整
        </button>
        {isManual && (
          <button
            onClick={handleReset}
            className="text-[10px] text-gray-400 hover:underline"
            title="恢复自动归属"
          >
            重置
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border border-gray-200 rounded px-1.5 py-0.5 text-xs"
      >
        <option value="">-- 选择门店 --</option>
        {storeOptions.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={saving}
        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3" />
        )}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setErr('');
        }}
        className="p-1 text-gray-400 hover:bg-gray-50 rounded"
      >
        <X className="w-3 h-3" />
      </button>
      {err && <span className="text-[10px] text-rose-500">{err}</span>}
    </div>
  );
};

export default StoreAssignCell;