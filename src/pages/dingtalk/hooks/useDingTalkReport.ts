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

        /* 按 processInstanceId 去重 */
        const seen = new Set<string>();
        allResults = allResults.filter((r) => {
          if (seen.has(r.processInstanceId)) return false;
          seen.add(r.processInstanceId);
          return true;
        });
      }

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

  /* 分组 */
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

  return { results, loading, error, meta, handleSearch, grouped };
}