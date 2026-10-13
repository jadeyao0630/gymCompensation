import { useCallback, useMemo, useState } from 'react';
import {
  fetchDingTalkReport,
  fetchManualStoreMap,
  saveManualStore,
  type DingTalkReportItem,
  type DingTalkSyncResult,
} from '../../../api/dingtalk';
import { matchStoreByItem } from '../../../utils/storeConfig';
import { inferRefundPaymentUnit } from '../utils/constants';
import { extractAmount } from '../utils/extract';

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

export function useDingTalkReport() {
  const [rawResults, setRawResults] = useState<DingTalkReportItem[]>([]);
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

      /* ⭐ 逐条补全 paymentUnit */
      allResults = allResults.map((r) => {
        if (r.paymentUnit && String(r.paymentUnit).trim()) return r;
        if (r.templateName === '会员退费') {
          const inferred = inferRefundPaymentUnit(r);
          if (inferred) return { ...r, paymentUnit: inferred };
        }
        const storeName = matchStoreByItem(r);
        if (storeName) return { ...r, paymentUnit: storeName };
        return r;
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
            const manual = pid ? manualMap[pid] : undefined;
            if (manual) {
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
  }, []);

  /* ⭐ 手动归属：保存到后端 + 更新本地 state */
  const updateManualStore = useCallback(
    async (processInstanceId: string, storeName: string | null) => {
      await saveManualStore(processInstanceId, storeName);
      setRawResults((prev) =>
        prev.map((r) =>
          r.processInstanceId === processInstanceId
            ? {
                ...r,
                _manualStore: !!storeName,
                _storeName: storeName || null,
                _assignReason: storeName ? '手动归属' : '',
                paymentUnit: r.paymentUnit,
              }
            : r
        )
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
        storeName: matchStoreByItem(list[0]) || '',
        count: list.length,
        total: list.reduce(
          (s, r) => s + (extractAmount(r.templateName || '', r.formValues || {}) || 0),
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
      const manual = (r as any)._storeName as string | null | undefined;
      const storeName = manual || matchStoreByItem(r) || '未归属门店';
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

    const order = ['富贵园', '哈德门', '未归属门店'];
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
  };
}