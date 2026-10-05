import { useMemo, useState } from 'react';
import {
  fetchDingTalkReport,
  type DingTalkReportItem,
} from '../../../api/dingtalk';
import { getStoreFromPaymentUnit } from '../utils/constants';
import { extractAmount } from '../utils/extract';

interface SearchParams {
  start: string;
  end: string;
  templateTypes: string[];
  paymentUnits: string[];
}

export interface ReportMeta {
  totalCount: number;
  totalTemplates: number;
  costMs: number;
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
 * ⭐ 会员退费 → 付款单位推断
 *   - 任何字段含"富贵园" 或 "装修" → 富贵园
 *   - 其他 → 哈德门
 * ============================================================ */
const MEMBER_REFUND_TPL = '会员退费';
const FU_GUI_YUAN_UNIT = '北京林朗韵动体育管理有限公司';   // 富贵园
const HA_DE_MEN_UNIT = '北京林朗悦动体育管理有限公司';       // 哈德门
const REFUND_KEYWORDS = ['富贵园', '装修'];

/* ⭐ 收集一条数据里所有可能的文本 */
function collectAllText(item: DingTalkReportItem): string {
  const parts: string[] = [];

  /* 1) formValues 里所有字段的值（不管字段名是什么） */
  const fv = item.formValues || {};
  Object.values(fv).forEach((v) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'object') {
      try {
        parts.push(JSON.stringify(v));
      } catch {
        /* ignore */
      }
    } else {
      const s = String(v);
      if (s && s !== 'null') parts.push(s);
    }
  });

  /* 2) items 数组的 content */
  if (Array.isArray(item.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }

  /* 3) 顶层 title */
  if (item.title) parts.push(String(item.title));

  return parts.join(' ');
}

function inferRefundPaymentUnit(item: DingTalkReportItem): string | null {
  /* 只处理"会员退费"且付款单位为空的情况 */
  if (item.templateName !== MEMBER_REFUND_TPL) return null;
  if (item.paymentUnit && String(item.paymentUnit).trim()) return null;

  const combined = collectAllText(item);
  if (!combined) return HA_DE_MEN_UNIT; // 没文本时默认哈德门

  /* 判断是否命中富贵园关键词 */
  const hit = REFUND_KEYWORDS.some((k) => combined.includes(k));
  return hit ? FU_GUI_YUAN_UNIT : HA_DE_MEN_UNIT;
}

export function useDingTalkReport() {
  const [results, setResults] = useState<DingTalkReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<ReportMeta | null>(null);

  const handleSearch = async (params: SearchParams) => {
    const { start, end, templateTypes, paymentUnits } = params;

    if (!start || !end) {
      alert('请选择时间范围');
      return;
    }
    if (start > end) {
      alert('开始日期不能晚于结束日期');
      return;
    }
    if (templateTypes.length === 0 && paymentUnits.length === 0) {
      if (!confirm('未选择流程类型和付款单位，将查询所有数据，可能较慢。继续？'))
        return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setMeta(null);

    try {
      const typeParam =
        templateTypes.length > 0 ? templateTypes.join(',') : undefined;

      let allResults: DingTalkReportItem[] = [];
      let totalTemplates = 0;
      let totalCost = 0;

      if (paymentUnits.length === 0) {
        const data = await fetchDingTalkReport({
          start,
          end,
          type: typeParam,
          onlyApproved: true,
        });
        allResults = data.results || [];
        totalTemplates = data.totalTemplates;
        totalCost = data.costMs;
      } else {
        const promises = paymentUnits.map((unit) =>
          fetchDingTalkReport({
            start,
            end,
            type: typeParam,
            company: unit,
            onlyApproved: true,
          }).catch((e) => {
            console.warn(`[DingTalk] 单位"${unit}"查询失败`, e);
            return null;
          })
        );
        const responses = await Promise.all(promises);

        responses.forEach((res) => {
          if (!res) return;
          allResults.push(...(res.results || []));
          totalTemplates = Math.max(totalTemplates, res.totalTemplates);
          totalCost += res.costMs;
        });

        const seen = new Set<string>();
        allResults = allResults.filter((r) => {
          if (seen.has(r.processInstanceId)) return false;
          seen.add(r.processInstanceId);
          return true;
        });
      }

      /* ⭐ 会员退费：推断付款单位 */
      allResults = allResults.map((r) => {
        const inferred = inferRefundPaymentUnit(r);
        if (inferred && (!r.paymentUnit || !String(r.paymentUnit).trim())) {
          return { ...r, paymentUnit: inferred };
        }
        return r;
      });

      setResults(allResults);
      setMeta({
        totalCount: allResults.length,
        totalTemplates,
        costMs: totalCost,
      });
    } catch (e: any) {
      console.error('[DingTalk] 查询失败', e);
      setError(e?.response?.data?.errormsg || e?.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  /* ⭐ 按 类型 → 付款单位 分组 */
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

  /* ⭐ 按 门店 → 类型 分组（用于扇形图） */
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
      const storeName = getStoreFromPaymentUnit(r.paymentUnit) || '未归属门店';
      const typeName = r.templateName || '未知类型';
      const amount = extractAmount(r.templateName, r.formValues) || 0;

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
    loading,
    error,
    meta,
    handleSearch,
    grouped,
    groupedByStore,
  };
}