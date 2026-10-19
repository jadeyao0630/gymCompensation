import React, { useEffect, useState } from 'react';
import { Store, Loader2, Check, X } from 'lucide-react';
import { setManualStore, removeManualStore } from '../../../api/dingtalk';
import { normalizeStoreName } from '../utils/constants';
import StyledDropdown from '../../../features/dingtalk/components/StyledDropdown';

interface Props {
  processInstanceId: string;
  storeName: string | null;
  isManual?: boolean;
  assignReason?: string;
  storeOptions: string[];
  onChanged?: (next: string | null, isManual: boolean) => void;
}

const StoreAssignCell: React.FC<Props> = ({ processInstanceId, storeName, isManual, assignReason, storeOptions, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(storeName ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (!editing) setValue(storeName ?? ''); }, [storeName, editing]);

  const handleSave = async () => {
    const next = value.trim();
    if (!next) { setErr('请选择门店'); return; }
    if (!processInstanceId) { setErr('缺少流程编号'); return; }
    setSaving(true); setErr('');
    try {
      const clean = normalizeStoreName(next) || next;
      await setManualStore(processInstanceId, clean);
      setEditing(false);
      onChanged?.(clean, true);
    } catch (e: any) { setErr(e?.message || '保存失败'); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!processInstanceId) { setErr('缺少流程编号'); return; }
    setSaving(true); setErr('');
    try {
      await removeManualStore(processInstanceId);
      setEditing(false);
      onChanged?.(null, false);
    } catch (e: any) { setErr(e?.message || '重置失败'); }
    finally { setSaving(false); }
  };

  if (!editing) return (
    <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span title={assignReason ?? ''} className={`inline-flex items-center gap-1 rounded-lg border border-solid px-2 py-1 font-medium ${isManual ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
        <Store className="h-3 w-3" />{storeName ?? '未指定'}
      </span>
      {isManual && <span className="text-[10px] font-medium text-amber-600">手动</span>}
      <button type="button" disabled={!processInstanceId} onClick={() => { setValue(storeName ?? ''); setErr(''); setEditing(true); }} className="rounded-md px-1.5 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40">调整</button>
      {isManual && <button type="button" disabled={saving} title="恢复自动归属" onClick={() => void handleReset()} className="rounded-md px-1.5 py-1 text-[11px] text-slate-500 hover:bg-slate-100 disabled:opacity-40">{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : '重置'}</button>}
      {err && <span role="alert" className="text-[11px] text-rose-600">{err}</span>}
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <StyledDropdown ariaLabel="选择门店" className="w-[136px]" value={value} disabled={saving}
        onChange={v => { setValue(v); setErr(''); }}
        options={[{value:'',label:'请选择门店'}, ...((value && !storeOptions.includes(value)) ? [{value,label:value}] : []), ...storeOptions.map(s=>({value:s,label:s}))]}
      />
      <button type="button" aria-label="保存门店" title="保存门店" disabled={saving} onClick={() => void handleSave()} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-solid border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</button>
      <button type="button" aria-label="取消修改门店" title="取消" disabled={saving} onClick={() => { setValue(storeName ?? ''); setEditing(false); setErr(''); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40"><X className="h-3.5 w-3.5" /></button>
      {err && <span role="alert" className="text-[11px] text-rose-600">{err}</span>}
    </div>
  );
};

export default StoreAssignCell;
