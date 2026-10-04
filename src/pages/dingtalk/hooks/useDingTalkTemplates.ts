import { useCallback, useEffect, useState } from 'react';
import {
  fetchDingTalkTemplates,
  refreshDingTalkTemplates,
  type DingTalkTemplate,
} from '../../../api/dingtalk';
import { EXCLUDE_TEMPLATES } from '../utils/constants';

export function useDingTalkTemplates() {
  const [templates, setTemplates] = useState<DingTalkTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchDingTalkTemplates();
      const filtered = list.filter(
        (t) => !EXCLUDE_TEMPLATES.some((k) => t.name.includes(k))
      );
      setTemplates(filtered);
    } catch (e) {
      console.warn('[DingTalk] 拉模板失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!confirm('从钉钉拉取最新模板列表？可能需要几秒钟')) return;
    setRefreshing(true);
    try {
      const list = await refreshDingTalkTemplates();
      const filtered = list.filter(
        (t) => !EXCLUDE_TEMPLATES.some((k) => t.name.includes(k))
      );
      setTemplates(filtered);
      alert(`已更新，共 ${filtered.length} 个模板`);
    } catch (e: any) {
      alert('更新失败：' + (e?.message || '未知错误'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    templates,
    loading,
    refreshing,
    refresh,
    reload: load,
  };
}