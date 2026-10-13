import React, { useEffect, useState } from 'react';
import {
  Store,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import type { StoreInfo } from '../../constants/stores';
import { fetchStores, saveStores } from '../../utils/storeConfig';

function genId(): string {
  return `store_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export const StoreConfigPage: React.FC = () => {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchStores();
      setStores(list);
      setExpanded(new Set(list.map((s) => s.id)));
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStore = (id: string, patch: Partial<StoreInfo>) => {
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setSaved(false);
  };

  const handleAdd = () => {
    const newStore: StoreInfo = {
      id: genId(),
      name: '新门店',
      shortName: '新门店',
      paymentUnits: [],
      keywords: [],
    };
    setStores((prev) => [...prev, newStore]);
    setExpanded((prev) => new Set([...prev, newStore.id]));
    setSaved(false);
  };

  const handleRemove = (id: string) => {
    if (!confirm('确定删除该门店配置？此操作不可撤销。')) return;
    setStores((prev) => prev.filter((s) => s.id !== id));
    setSaved(false);
  };

  const handleSave = async () => {
    setError('');
    for (const s of stores) {
      if (!s.id.trim()) {
        setError('门店 ID 不能为空');
        return;
      }
      if (!s.name.trim()) {
        setError(`门店「${s.id}」的名称不能为空`);
        return;
      }
    }
    setSaving(true);
    try {
      const list = await saveStores(stores);
      setStores(list);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('重置为默认门店配置？当前修改将丢失。')) return;
    const defaults: StoreInfo[] = [
      {
        id: '12279',
        name: '富贵园',
        shortName: '富贵园',
        paymentUnits: [
          '北京林朗韵动体育管理有限公司',
          '北京林朗体育管理有限公司东花市大街分公司',
        ],
        keywords: ['富贵园', '富贵', '东花市'],
        isDefault: true,
      },
      {
        id: '11536',
        name: '哈德门',
        shortName: '哈德门',
        paymentUnits: [
          '北京林朗悦动体育管理有限公司',
          '北京林朗体育管理有限公司',
        ],
        keywords: ['哈德门', '哈德'],
      },
    ];
    try {
      const list = await saveStores(defaults);
      setStores(list);
      setExpanded(new Set(list.map((s) => s.id)));
    } catch (e: any) {
      setError(e?.message || '重置失败');
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePaymentUnitsChange = (id: string, text: string) => {
    const arr = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    updateStore(id, { paymentUnits: arr });
  };

  const handleKeywordsChange = (id: string, text: string) => {
    const arr = text
      .split(/[\n,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    updateStore(id, { keywords: arr });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/50">
      {/* ⭐ 整页与顶部卡片一致：max-w-7xl */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          badgeText="Store Config"
          badgeIcon={<Store className="w-3.5 h-3.5" />}
          title="门店配置"
          description="维护「门店 → 付款单位 / 关键字」映射，用于钉钉流程按门店归属（数据存储在 MySQL）"
          navActive="stores"
          actions={
            <>
              <button
                onClick={handleReset}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                恢复默认
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                新增门店
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-white/90 rounded-2xl px-5 py-2.5 shadow-lg transition disabled:opacity-50 font-semibold text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> 保存中…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> 保存配置
                  </>
                )}
              </button>
            </>
          }
        />

        {/* ⭐ 状态提示 */}
        {error && (
          <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已保存到数据库
          </div>
        )}

        {/* ⭐ 内容区：与顶部同宽 */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            正在读取门店配置…
          </div>
        ) : (
          <div className="space-y-4">
            {stores.map((s) => {
              const isExpanded = expanded.has(s.id);
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-3 flex items-center gap-3 bg-gray-50/60">
                    <button
                      type="button"
                      onClick={() => toggleExpand(s.id)}
                      className="p-1 text-gray-400 hover:text-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      value={s.name}
                      onChange={(e) =>
                        updateStore(s.id, {
                          name: e.target.value,
                          shortName: e.target.value,
                        })
                      }
                      className="text-sm font-semibold text-gray-800 bg-transparent focus:outline-none border-b border-transparent focus:border-indigo-400 min-w-[120px]"
                      placeholder="门店名"
                    />
                    <span className="text-[11px] text-gray-400">
                      ID：{s.id}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      · 付款单位 {s.paymentUnits.length} 个 · 关键字{' '}
                      {s.keywords.length} 个
                    </span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => handleRemove(s.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      删除
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          门店 ID（数据库主键）
                        </label>
                        <input
                          value={s.id}
                          onChange={(e) =>
                            updateStore(s.id, { id: e.target.value })
                          }
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                          placeholder="如 12279"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          付款单位（每行一个）
                          <span className="text-gray-400 ml-1 font-normal">
                            用于「付款单位 → 门店」映射
                          </span>
                        </label>
                        <textarea
                          value={s.paymentUnits.join('\n')}
                          onChange={(e) =>
                            handlePaymentUnitsChange(s.id, e.target.value)
                          }
                          rows={Math.max(2, s.paymentUnits.length + 1)}
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 font-mono"
                          placeholder={
                            '北京林朗韵动体育管理有限公司\n北京林朗体育管理有限公司东花市大街分公司'
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          门店关键字（每行一个 / 逗号分隔）
                          <span className="text-gray-400 ml-1 font-normal">
                            用于「事项文本 → 门店」推断，靠前优先
                          </span>
                        </label>
                        <textarea
                          value={s.keywords.join('\n')}
                          onChange={(e) =>
                            handleKeywordsChange(s.id, e.target.value)
                          }
                          rows={Math.max(2, s.keywords.length + 1)}
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 font-mono"
                          placeholder={'富贵园\n富贵\n东花市'}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 说明 */}
        <div className="mt-8 text-xs text-gray-500 bg-blue-50/50 border border-blue-100 rounded-lg p-4 leading-relaxed">
          <p className="font-semibold text-blue-800 mb-1.5">匹配优先级：</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>付款单位精确匹配 → 命中直接归该门店</li>
            <li>付款单位包含匹配（双向）→ 命中直接归该门店</li>
            <li>付款单位为空时，按事项文本里的门店关键字匹配</li>
            <li>都未命中 → 显示为「未指定门店」</li>
          </ol>
          <p className="mt-2 text-gray-500">
            提示：多个门店共用同一个付款单位时，<b>列表中靠前的门店优先</b>。
          </p>
        </div>
      </div>
    </div>
  );
};

export default StoreConfigPage;