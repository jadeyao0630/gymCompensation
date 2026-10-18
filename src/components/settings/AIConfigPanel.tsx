import { getDefaultAIStoreProfile } from '../../utils/defaultAIProfiles';
import { DEFAULT_AI_PROMPT } from '../../utils/defaultAIPrompt';
import React, { useEffect, useState } from 'react';
import type { StoreInfo } from '../../constants/stores';
import { fetchAIConfig, saveAIPrompt, saveAIProfile } from '../../utils/aiConfig';
import type { AIStoreProfile } from '../../utils/aiConfig';

interface Props { stores: StoreInfo[]; canEdit: boolean; }
const emptyProfile = (name: string): AIStoreProfile => ({
  name, area: '', facilities: [], positioning: '', focus: [],
});
const AIConfigPanel: React.FC<Props> = ({ stores, canEdit }) => {
  const [prompt, setPrompt] = useState(DEFAULT_AI_PROMPT);
  const [defaultPrompt, setDefaultPrompt] = useState(DEFAULT_AI_PROMPT);
  const [defaultProfiles, setDefaultProfiles] = useState<Record<string, AIStoreProfile>>({});
  const [profiles, setProfiles] = useState<Record<string, AIStoreProfile>>({});
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  useEffect(() => {
    let active = true;
    fetchAIConfig().then(data => {
      if (!active) return;
      setPrompt(data.prompt?.trim() || data.defaultPrompt?.trim() || DEFAULT_AI_PROMPT);
      setConfigLoaded(true);
      setDefaultPrompt(data.defaultPrompt?.trim() || DEFAULT_AI_PROMPT);
      setDefaultProfiles(data.defaultProfiles || {});
      setProfiles(data.profiles || {});
    }).catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!stores.some(s => String(s.id) === selected)) setSelected(stores[0] ? String(stores[0].id) : '');
  }, [stores, selected]);
  const currentStore = stores.find(s => String(s.id) === selected);
  const fallbackProfile = getDefaultAIStoreProfile(selected, currentStore?.name || '');
  const candidateProfile = profiles[selected];
  const profile = candidateProfile && (
    candidateProfile.area?.trim() || candidateProfile.positioning?.trim() ||
    candidateProfile.facilities?.length || candidateProfile.focus?.length
  ) ? candidateProfile : fallbackProfile;
  const patch = (value: Partial<AIStoreProfile>) => {
    if (!canEdit || !selected) return;
    setProfiles(prev => ({ ...prev, [selected]: { ...(prev[selected] || getDefaultAIStoreProfile(selected, currentStore?.name || '')), ...value } }));
    setProfileDirty(true); setMessage('');
  };
  const savePrompt = async () => {
    setSaving(true); setError(''); setMessage('');
    try { await saveAIPrompt(prompt); setPromptDirty(false); setMessage('AI 提示词已保存'); }
    catch (e: any) { setError(e.message || '保存失败'); }
    finally { setSaving(false); }
  };
  const saveProfile = async () => {
    if (!selected) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await saveAIProfile(selected, profile);
      setProfiles(prev => ({ ...prev, [selected]: result.profile }));
      setProfileDirty(false); setMessage('门店 AI 画像已保存');
    } catch (e: any) { setError(e.message || '保存失败'); }
    finally { setSaving(false); }
  };
  
  return (
    <section className="mt-8 space-y-5 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-gray-800">豆包 AI 分析设置</h2>
        <p className="mt-1 text-xs text-gray-500">提示词为全局配置；门店画像按门店 ID 独立保存。修改后下次生成月报立即生效。</p>
      </div>
      {loading && <p className="text-xs text-gray-500">正在连接 AI 配置服务，已显示原始默认提示词…</p>}
      {error && <p className="text-sm text-red-600">AI 配置读取失败：{error}。下方展示原始默认提示词；请检查 /api/ai/config 接口、登录状态和后端路由挂载。连接恢复后再保存。</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <div className="space-y-2">
        <label className="block text-sm font-semibold">全局分析提示词（System Prompt）</label>
        <textarea value={prompt} disabled={!canEdit || saving} onChange={e => { setPrompt(e.target.value); setPromptDirty(true); }}
          rows={15} spellCheck={false} className="w-full rounded-lg border border-gray-200 p-3 font-mono text-xs leading-relaxed disabled:bg-gray-50" />
        {canEdit && <button type="button" disabled={saving} onClick={() => { if (!window.confirm('将编辑框恢复为原始默认提示词？需要点击保存才会生效。')) return; setPrompt(defaultPrompt); setPromptDirty(true); setMessage('已载入原始默认提示词，请点击保存'); }} className="mr-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm text-indigo-700 disabled:opacity-40">恢复原始提示词</button>}
        {canEdit && <button type="button" onClick={savePrompt} disabled={saving || !configLoaded || !promptDirty || !prompt.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40">保存 AI 提示词</button>}
      </div>
      <div className="border-t border-gray-100 pt-5 space-y-3">
        <h3 className="text-sm font-semibold">门店经营画像</h3>
        <select value={selected} onChange={e => { if (profileDirty && !window.confirm('当前门店画像尚未保存，确定切换吗？')) return; setSelected(e.target.value); setProfileDirty(false); setMessage(''); }}
          className="rounded-lg border border-gray-200 p-2 text-sm">
          {stores.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
        {currentStore && <div className="space-y-3">
          <label className="block text-xs">画像名称<input disabled={!canEdit} value={profile.name} onChange={e => patch({ name: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="block text-xs">面积<input disabled={!canEdit} value={profile.area} onChange={e => patch({ area: e.target.value })} placeholder="如：3000 平方米" className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="block text-xs">设施 / 业态（每行一个）<textarea disabled={!canEdit} rows={4} value={profile.facilities.join('\n')} onChange={e => patch({ facilities: e.target.value.split(/\n|,|，/).map(x => x.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="block text-xs">经营定位<textarea disabled={!canEdit} rows={4} value={profile.positioning} onChange={e => patch({ positioning: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="block text-xs">重点分析方向（每行一个）<textarea disabled={!canEdit} rows={5} value={profile.focus.join('\n')} onChange={e => patch({ focus: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border p-2" /></label>
          {canEdit && <button type="button" disabled={saving} onClick={() => { if (!window.confirm('将当前门店画像恢复为原始默认值？需要点击保存才会生效。')) return; setProfiles(prev => ({...prev, [selected]: defaultProfiles[selected] || getDefaultAIStoreProfile(selected, currentStore.name)})); setProfileDirty(true); setMessage('已载入默认门店画像，请点击保存'); }} className="mr-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm text-indigo-700 disabled:opacity-40">恢复默认画像</button>}
          {canEdit && <button type="button" onClick={saveProfile} disabled={saving || !configLoaded || !profileDirty}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40">保存当前门店画像</button>}
        </div>}
      </div>
    </section>
  );
};
export default AIConfigPanel;
