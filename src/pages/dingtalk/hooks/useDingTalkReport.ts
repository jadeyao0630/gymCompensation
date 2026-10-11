import { useCallback, useMemo, useState } from 'react';
import {
  fetchDingTalkReport,
  type DingTalkReportItem,
} from '../../../api/dingtalk';
import { getStoreFromPaymentUnit } from '../utils/constants';
import { extractAmount } from '../utils/extract';

interface SearchParams {
  start: string;
  end: string;
  /** ⭐ 以下三项仅用于本地过滤，不传后端 */
  templateTypes: string[];
  paymentUnits: string[];
  onlyApproved: boolean;
  /** ⭐ 0=只读缓存 1=同步并查询 */
  sync?: 0 | 1;
}

export interface ReportMeta {
  totalCount: number;
  totalTemplates: number;
  costMs: number;
  source?: string; // ⭐ 'cache' | 'dingtalk+sync'
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

/* ============================================================
 * 会员退费 → 付款单位推断
 * ============================================================ */
const MEMBER_REFUND_TPL = '会员退费';
const FU_GUI_YUAN_UNIT = '北京林朗韵动体育管理有限公司';
const HA_DE_MEN_UNIT = '北京林朗悦动体育管理有限公司';
const REFUND_KEYWORDS = ['富贵园', '装修'];

function collectAllText(item: DingTalkReportItem): string {
  const parts: string[] = [];
  const fv = item.formValues || {};
  Object.values(fv).forEach((v) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'object') {
      try { parts.push(JSON.stringify(v)); } catch {}
    } else {
      const s = String(v);
      if (s && s !== 'null') parts.push(s);
    }
  });
  if (Array.isArray(item.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }
  if (item.title) parts.push(String(item.title));
  return parts.join(' ');
}

function inferRefundPaymentUnit(item: DingTalkReportItem): string | null {
  if (item.templateName !== MEMBER_REFUND_TPL) return null;
  if (item.paymentUnit && String(item.paymentUnit).trim()) return null;
  const combined = collectAllText(item);
  if (!combined) return HA_DE_MEN_UNIT;
  const hit = REFUND_KEYWORDS.some((k) => combined.includes(k));
  return hit ? FU_GUI_YUAN_UNIT : HA_DE_MEN_UNIT;
}

/* ============================================================
 * ⭐ 前端过滤逻辑
 * ============================================================ */

function filterByStatus(
  list: DingTalkReportItem[],
  onlyApproved: boolean
): DingTalkReportItem[] {
  const isCompleted = (s?: string) => String(s || '').toUpperCase() === 'COMPLETED';
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

    /* ⭐ 只有「同步并查询」才弹确认 */
    if (needSync) {
      if (
        !confirm(
          '将从钉钉同步未完成的流程（含审批中），可能耗时较长。继续？'
        )
      ) {
        return;
      }
    }

    /* ⭐ 同步筛选条件到 hook 内部 state */
    setOnlyApproved(!!params.onlyApproved);
    setPaymentUnits(params.paymentUnits || []);
    setTemplateTypes(params.templateTypes || []);

    setLoading(true);
    setError('');
    setRawResults([]);
    setMeta(null);

    try {
      /* ⭐ 永远只传 start / end / sync —— 后端返回全量 */
      const data = await fetchDingTalkReport({
        start,
        end,
        sync: needSync ? 1 : 0,
      });
      let allResults: DingTalkReportItem[] = data.results || [];

      /* 会员退费 → 推断付款单位 */
      allResults = allResults.map((r) => {
        const inferred = inferRefundPaymentUnit(r);
        if (inferred && (!r.paymentUnit || !String(r.paymentUnit).trim())) {
          return { ...r, paymentUnit: inferred };
        }
        return r;
      });

      setRawResults(allResults);
      setMeta({
        totalCount: allResults.length,
        totalTemplates: data.totalTemplates,
        costMs: data.costMs,
        source: data.source, // ⭐ 透传 source
      });
    } catch (e: any) {
      console.error('[DingTalk] 查询失败', e);
      setError(e?.response?.data?.errormsg || e?.message || '查询失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ⭐ 三层本地过滤 */
  const results = useMemo(() => {
    let list = filterByStatus(rawResults, onlyApproved);
    list = filterByPaymentUnits(list, paymentUnits);
    list = filterByTemplateTypes(list, templateTypes);
    return list;
  }, [rawResults, onlyApproved, paymentUnits, templateTypes]);

  /* 类型 → 付款单位 分组 */
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
      totalCount: Array.from(unitMap.values()).reduce((s, arr) => s + arr.length, 0),
      units: Array.from(unitMap.entries()).map(([unitName, list]) => ({
        unitName,
        storeName: getStoreFromPaymentUnit(unitName),
        count: list.length,
        total: list.reduce(
          (s, r) => s + (extractAmount(r.templateName, r.formValues) || 0),
          0
        ),
        items: list,
      })),
    }));
  }, [results]);

  /* 门店 → 类型 分组 */
  const groupedByStore = useMemo(() => {
    const storeMap = new Map<
      string,
      { storeName: string; count: number; total: number; typeMap: Map<string, TypeSummary> }
    >();

    results.forEach((r) => {
      const storeName = getStoreFromPaymentUnit(r.paymentUnit) || '未归属门店';
      const typeName = r.templateName || '未知类型';
      const amount = extractAmount(r.templateName, r.formValues) || 0;

      if (!storeMap.has(storeName)) {
        storeMap.set(storeName, { storeName, count: 0, total: 0, typeMap: new Map() });
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
        types: Array.from(s.typeMap.values()).sort((a, b) => b.total - a.total),
      });
      storeMap.delete(sName);
    });
    storeMap.forEach((s) => {
      list.push({
        storeName: s.storeName,
        count: s.count,
        total: s.total,
        types: Array.from(s.typeMap.values()).sort((a, b) => b.total - a.total),
      });
    });

    return list;
  }, [results]);

  return {
    results,
    rawResults,
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
  };
}