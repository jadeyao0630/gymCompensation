import { useCallback, useState } from 'react';
import type { DingTalkReportItem } from '../../api/dingtalk';
import { loadManualCategories, saveManualCategories } from './manualCategory';
export function useManualCategories() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const hydrate = useCallback(async (items: DingTalkReportItem[]) => {
    const ids = [...new Set(items.map(x => x.processInstanceId).filter((x): x is string => !!x))];
    if (!ids.length) return items;
    const map = await loadManualCategories(ids);
    return items.map(x => ({...x, _manualCategory: map[x.processInstanceId || ''] || null}));
  }, []);
  const update = useCallback(async (ids: string[], category: string | null) => {
    const clean = [...new Set(ids.filter(x => x && !x.startsWith('__row_')))];
    if (!clean.length) return;
    setSaving(true); setError('');
    try { await saveManualCategories(clean, category); }
    catch(e) { setError(e instanceof Error ? e.message : '保存失败'); throw e; }
    finally { setSaving(false); }
  }, []);
  return {hydrate, update, saving, error};
}
