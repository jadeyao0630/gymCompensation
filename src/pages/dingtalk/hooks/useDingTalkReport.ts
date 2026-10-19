import { useCallback, useMemo, useState } from 'react';
import {
  fetchDingTalkReport,
  fetchManualStoreMap,
  saveManualStore,
  type DingTalkReportItem,
  type DingTalkSyncResult,
} from '../../../api/dingtalk';
import {
  matchStoreByItem,
  normalizeStoreName,
  resolveStoreByPaymentUnit,
  resolveCompanyInStore,
} from '../../../utils/storeConfig';
import {
  inferRefundPaymentUnit,
  extractPaymentUnitFromForm,
} from '../utils/constants';
import { extractAmount } from '../utils/extract';
import { useManualCategories } from '../../../features/dingtalk/useManualCategories';

/* ⭐ 未指定门店 → 默认归到「富贵园」 */
const DEFAULT_STORE = '富贵园';

interface SearchParams {
  start: string;
  end: string;
  templateTypes: string[];
  paymentUnits: string[];
  onlyApproved: boolean;
  sync?: 0 | 1;
}

export interface ReportMeta {
  totalCount: number;
  totalTemplates: number;
  costMs: number;
  source?: string;
  syncResult?: DingTalkSyncResult;
}

export interface TypeSummary {
  typeName: string;
  count: number;
  total: number;
}

export interface StoreSummary {
  storeName: string;
  count: number;
  total: number;
  types: TypeSummary[];
}

function filterByStatus(
  list: DingTalkReportItem[],
  onlyApproved: boolean
): DingTalkReportItem[] {
  const isCompleted = (s?: string) =>
    String(s || '').toUpperCase() === 'COMPLETED';
  const isCanceled = (s?: string) => {
    const v = String(s || '').toUpperCase();
    return v === 'CANCELED' || v === 'CANCELLED';
  };
  const isAgreed = (r?: string) => {
    const v = String(r || '').toLowerCase();
    return v === 'agree' || v === 'approved' || v === 'pass';
  };
  const isRefused = (r?: string) => {
    const v = String(r || '').toLowerCase();
    return v === 'refuse' || v === 'reject' || v === 'refused';
  };

  if (onlyApproved) {
    return list.filter((d) => isCompleted(d.status) && isAgreed(d.result));
  }
  return list.filter((d) => !isRefused(d.result) && !isCanceled(d.status));
}

function filterByPaymentUnits(
  list: DingTalkReportItem[],
  paymentUnits: string[]
): DingTalkReportItem[] {
  if (paymentUnits.length === 0) return list;
  return list.filter((d) => {
    const pu = String(d.paymentUnit || '');
    return paymentUnits.some((u) => pu.includes(u) || u.includes(pu));
  });
}

function filterByTemplateTypes(
  list: DingTalkReportItem[],
  templateTypes: string[]
): DingTalkReportItem[] {
  if (templateTypes.length === 0) return list;
  return list.filter((d) => templateTypes.includes(d.templateName || ''));
}

/* ⭐ 文本关键字 */
const STORE_KEYWORDS: Record<string, string[]> = {
  '哈德门': ['哈德门', '哈德', '崇文门', '国瑞'],
  '富贵园': ['富贵园', '富贵', '东花市'],
};

function collectItemText(r: DingTalkReportItem): string {
  const parts: string[] = [];

  if (Array.isArray(r.items)) {
    r.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }

  const fv = r.formValues || {};

  const rawDetail = fv['明细列表'];
  if (typeof rawDetail === 'string' && rawDetail && rawDetail !== 'null') {
    try {
      const parsed = JSON.parse(rawDetail);
      if (Array.isArray(parsed)) {
        parsed.forEach((row: any) => {
          (row?.rowValue || []).forEach((f: any) => {
            if (f?.value != null && f.value !== 'null') {
              parts.push(String(f.value));
            }
          });
        });
      }
    } catch {
      parts.push(String(rawDetail));
    }
  }

  [
    '事项', '事项/明细', '报销事由', '费用类型', '明细', '备注',
    '事由', '用途', '摘要', '说明', '付款内容提要', '付款事由',
    '付款用途', '借款提要',
  ].forEach((k) => {
    const v = fv[k];
    if (v == null || v === 'null' || v === '') return;
    if (typeof v === 'object') {
      try { parts.push(JSON.stringify(v)); } catch {}
    } else {
      parts.push(String(v));
    }
  });

  if (r.title) parts.push(String(r.title));

  return parts.join(' ');
}

function inferStoreFromText(r: DingTalkReportItem): string {
  const text = collectItemText(r);
  if (!text) return '';
  for (const [storeName, kws] of Object.entries(STORE_KEYWORDS)) {
    if (kws.some((k) => k && text.includes(k))) return storeName;
  }
  return '';
}

/* ⭐ 统一：拿到一条记录的最终门店名 + 公司
 *   优先级：手动归属 > 付款单位匹配 > 后端非兜底 _storeName > 文本推断 > 富贵园兜底
 */
function resolveStoreAndCompany(r: DingTalkReportItem): {
  storeName: string;
  company: string | null;
} {
  const atDate = r.createTime || undefined;

  /* 1) 手动归属 */
  if ((r as any)._manualStore === true) {
    const manualStoreRaw = (r as any)._storeName as string | null | undefined;
    const storeName = manualStoreRaw
      ? normalizeStoreName(manualStoreRaw) || manualStoreRaw
      : DEFAULT_STORE;
    return { storeName, company: (r as any)._company || null };
  }

  /* 2) 有付款公司名称 → 直接按付款公司找门店 */
  if (r.paymentUnit && String(r.paymentUnit).trim()) {
    const byUnit = resolveStoreByPaymentUnit(r.paymentUnit);
    if (byUnit) {
      return { storeName: byUnit, company: String(r.paymentUnit).trim() };
    }
  }

  /* 3) 后端非兜底结果 */
  const assignReason = (r as any)._assignReason as string | undefined;
  const autoRaw = (r as any)._storeName as string | null | undefined;
  if (autoRaw && assignReason && assignReason !== '未指定兜底') {
    return {
      storeName: normalizeStoreName(autoRaw) || autoRaw,
      company: (r as any)._company || null,
    };
  }

  /* 4) 事项/明细推门店 → 门店下按有效时间段选公司 */
  const inferredStore = inferStoreFromText(r);
  if (inferredStore) {
    const info = resolveCompanyInStore(inferredStore, atDate);
    return {
      storeName: normalizeStoreName(inferredStore) || inferredStore,
      company: info?.company || null,
    };
  }

  /* 5) matchStoreByItem */
  const byItem = matchStoreByItem(r);
  if (byItem) {
    const storeName = normalizeStoreName(byItem) || byItem;
    const info = resolveCompanyInStore(storeName, atDate);
    return { storeName, company: info?.company || null };
  }

  /* 6) 兜底 */
  return { storeName: DEFAULT_STORE, company: null };
}

function resolveStoreName(r: DingTalkReportItem): string {
  return resolveStoreAndCompany(r).storeName;
}

export function useDingTalkReport() {
  const [rawResults, setRawResults] = useState<DingTalkReportItem[]>([]);
  const manualCategories = useManualCategories();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<ReportMeta | null>(null);

  const [onlyApproved, setOnlyApproved] = useState(false);
  const [paymentUnits, setPaymentUnits] = useState<string[]>([]);
  const [templateTypes, setTemplateTypes] = useState<string[]>([]);

  const handleSearch = useCallback(async (params: SearchParams) => {
    const { start, end, sync } = params;
    const needSync = sync === 1;

    if (!start || !end) {
      alert('请选择时间范围');
      return;
    }
    if (start > end) {
      alert('开始日期不能晚于结束日期');
      return;
    }

    if (needSync) {
      if (
        !confirm(
          '将从钉钉同步未完成的流程（含审批中），可能耗时较长。继续？'
        )
      ) {
        return;
      }
    }

    setOnlyApproved(!!params.onlyApproved);
    setPaymentUnits(params.paymentUnits || []);
    setTemplateTypes(params.templateTypes || []);

    setLoading(true);
    setError('');
    setRawResults([]);
    setMeta(null);

    try {
      const data = await fetchDingTalkReport({
        start,
        end,
        sync: needSync ? 1 : 0,
      });

      let allResults: DingTalkReportItem[] = data.results || [];

      /* ⭐ 逐条补全 paymentUnit + 归一化门店 */
      allResults = allResults.map((r) => {
        let next: DingTalkReportItem = r;

        /* ⭐ paymentUnit 为空时，从 formValues 兜底提取（兼容 \t 字段名） */
        if (!next.paymentUnit || !String(next.paymentUnit).trim()) {
          const fromForm = extractPaymentUnitFromForm(next.formValues || {});
          if (fromForm) {
            next = { ...next, paymentUnit: fromForm };
          } else if (next.templateName === '会员退费') {
            const inferred = inferRefundPaymentUnit(next);
            if (inferred) next = { ...next, paymentUnit: inferred };
          }
          /* ⭐ 不再把 matchStoreByItem 的结果写进 paymentUnit */
        }

        /* ⭐ 门店名归一化 */
        const autoRaw = (next as any)._storeName as string | null | undefined;
        const manualRaw =
          (next as any)._manualStore === true
            ? ((next as any)._storeName as string | null | undefined)
            : undefined;

        if (manualRaw) {
          next = {
            ...next,
            _storeName: normalizeStoreName(manualRaw) || manualRaw,
          };
        } else if (autoRaw) {
          next = {
            ...next,
            _storeName: normalizeStoreName(autoRaw) || autoRaw,
          };
        }

        return next;
      });

      /* ⭐ 拉取手动归属覆盖 */
      const ids = allResults
        .map((r) => r.processInstanceId)
        .filter((x): x is string => !!x);

      if (ids.length > 0) {
        try {
          const manualMap = await fetchManualStoreMap(ids);
          allResults = allResults.map((r) => {
            const pid = r.processInstanceId || '';
            const manualRaw = pid ? manualMap[pid] : undefined;
            if (manualRaw) {
              const manual = normalizeStoreName(manualRaw) || manualRaw;
              return {
                ...r,
                _manualStore: true,
                _storeName: manual,
                _assignReason: '手动归属',
                paymentUnit: r.paymentUnit,
              };
            }
            return r;
          });
        } catch (e) {
          console.warn('[DingTalk] 读取手动归属失败', e);
        }
      }

      try { allResults = await manualCategories.hydrate(allResults); } catch(e) { console.warn("[DingTalk] 人工分类读取失败", e); }
      setRawResults(allResults);
      setMeta({
        totalCount: data.totalCount || allResults.length,
        totalTemplates: data.totalTemplates || 0,
        costMs: data.costMs || 0,
        source: data.source,
        syncResult: data.syncResult,
      });
    } catch (e: any) {
      console.error('[DingTalk] 查询失败', e);
      setError(e?.response?.data?.errormsg || e?.message || '查询失败');
    } finally {
      setLoading(false);
    }
  }, [manualCategories.hydrate]);

  const updateManualCategories = useCallback(async (ids: string[], category: string | null) => {
    await manualCategories.update(ids, category);
    const selected = new Set(ids);
    setRawResults(prev => prev.map(r => selected.has(r.processInstanceId || '') ? {...r, _manualCategory: category} : r));
  }, [manualCategories.update]);

  const updateManualStore = useCallback(
    async (processInstanceId: string, storeName: string | null) => {
      await saveManualStore(
        processInstanceId,
        storeName ? normalizeStoreName(storeName) || storeName : null
      );
      setRawResults((prev) =>
        prev.map((r) => {
          if (r.processInstanceId !== processInstanceId) return r;
          if (storeName) {
            const clean = normalizeStoreName(storeName) || storeName;
            return {
              ...r,
              _manualStore: true,
              _storeName: clean,
              _assignReason: '手动归属',
              paymentUnit: r.paymentUnit,
            };
          }
          return {
            ...r,
            _manualStore: false,
            _storeName: null,
            _assignReason: '',
            paymentUnit: r.paymentUnit,
          };
        })
      );
    },
    []
  );

  const results = useMemo(() => {
    let list = filterByStatus(rawResults, onlyApproved);
    list = filterByPaymentUnits(list, paymentUnits);
    list = filterByTemplateTypes(list, templateTypes);
    return list;
  }, [rawResults, onlyApproved, paymentUnits, templateTypes]);

  const grouped = useMemo(() => {
    const typeMap = new Map<string, Map<string, DingTalkReportItem[]>>();
    results.forEach((r) => {
      const t = r.templateName || '未知类型';
      const u = r.paymentUnit || '未填写付款单位';
      if (!typeMap.has(t)) typeMap.set(t, new Map());
      const unitMap = typeMap.get(t)!;
      if (!unitMap.has(u)) unitMap.set(u, []);
      unitMap.get(u)!.push(r);
    });

    return Array.from(typeMap.entries()).map(([typeName, unitMap]) => ({
      typeName,
      totalCount: Array.from(unitMap.values()).reduce(
        (s, arr) => s + arr.length,
        0
      ),
      units: Array.from(unitMap.entries()).map(([unitName, list]) => ({
        unitName,
        storeName: resolveStoreName(list[0]),
        count: list.length,
        total: list.reduce(
          (s, r) =>
            s + (extractAmount(r.templateName || '', r.formValues || {}) || 0),
          0
        ),
        items: list,
      })),
    }));
  }, [results]);

  const groupedByStore = useMemo(() => {
    const storeMap = new Map<
      string,
      {
        storeName: string;
        count: number;
        total: number;
        typeMap: Map<string, TypeSummary>;
      }
    >();

    results.forEach((r) => {
      const { storeName } = resolveStoreAndCompany(r);
      const typeName = r.templateName || '未知类型';
      const amount =
        extractAmount(r.templateName || '', r.formValues || {}) || 0;

      if (!storeMap.has(storeName)) {
        storeMap.set(storeName, {
          storeName,
          count: 0,
          total: 0,
          typeMap: new Map(),
        });
      }
      const s = storeMap.get(storeName)!;
      s.count += 1;
      s.total += amount;

      if (!s.typeMap.has(typeName)) {
        s.typeMap.set(typeName, { typeName, count: 0, total: 0 });
      }
      const t = s.typeMap.get(typeName)!;
      t.count += 1;
      t.total += amount;
    });

    const order = ['富贵园', '哈德门'];
    const list: StoreSummary[] = [];
    order.forEach((sName) => {
      const s = storeMap.get(sName);
      if (!s) return;
      list.push({
        storeName: s.storeName,
        count: s.count,
        total: s.total,
        types: Array.from(s.typeMap.values()).sort(
          (a, b) => b.total - a.total
        ),
      });
      storeMap.delete(sName);
    });
    storeMap.forEach((s) => {
      list.push({
        storeName: s.storeName,
        count: s.count,
        total: s.total,
        types: Array.from(s.typeMap.values()).sort(
          (a, b) => b.total - a.total
        ),
      });
    });

    return list;
  }, [results]);

  return {
    results,
    rawResults,
    setRawResults,
    loading,
    error,
    meta,
    onlyApproved,
    setOnlyApproved,
    paymentUnits,
    setPaymentUnits,
    templateTypes,
    setTemplateTypes,
    handleSearch,
    grouped,
    groupedByStore,
    updateManualStore,
    updateManualCategories,
    categorySaving: manualCategories.saving,
    categoryError: manualCategories.error,
  };
}