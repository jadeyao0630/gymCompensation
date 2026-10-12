import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPlanByMonth, fetchSimulationSetting } from '../../../api/compensation';
import { fetchStaffStatus } from '../../../api/payrollStatus';
import { getCardOrderList, type FinancialFlowItem } from '../../../api/stats';
import {
  fetchDingTalkMonthlySummary,
  type DingTalkReportItem,
} from '../../../api/dingtalk';
import { usePayroll } from '../../../hooks/usePayroll';
import type { PayrollResult } from '../../../utils/payroll';
import { loadRewardsCatalog } from '../../../utils/payrollStorage';
import { useAppData } from '../../../contexts/AppDataContext';
import { getStoreById } from '../../../constants/stores'; // ⭐ 门店名转换
import {
  getStoreFromPaymentUnit,
  inferRefundPaymentUnit, // ⭐ 复用推断逻辑
} from '../../dingtalk/utils/constants';
import {
  aggregateOrders,
  getIncomeAmount,
  getCardAmount,
  getPrePayment,
} from '../../marketing/utils/aggregate';
import { getMonthRange } from '../utils/date';

export interface FixedCostDetail {
  propertyFee: number;
  electricityFee: number;
  rent: number;
  waterFee: number;
  networkFee: number;
  otherFee: number;
}

const EMPTY_COST: FixedCostDetail = {
  propertyFee: 0,
  electricityFee: 0,
  rent: 0,
  waterFee: 0,
  networkFee: 0,
  otherFee: 0,
};

export interface MonthlyReportSnapshot {
  orders: FinancialFlowItem[];
  payrollResults: PayrollResult[];
  fixedCostDetail: FixedCostDetail;
  dingtalkItems: DingTalkReportItem[];
}

/**
 * ⭐ 先推断退费门店，再按当前门店过滤
 *   - 退费：inferRefundPaymentUnit 补 paymentUnit
 *   - 过滤：getStoreFromPaymentUnit(paymentUnit) === storeName
 */
function normalizeAndFilter(
  items: DingTalkReportItem[],
  storeName: string
): DingTalkReportItem[] {
  /* 1) 会员退费 → 按「事项/明细」文本推断 paymentUnit */
  const withUnit = items.map((r) => {
    if (r.templateName !== '会员退费') return r;
    if (r.paymentUnit && String(r.paymentUnit).trim()) return r;
    const inferred = inferRefundPaymentUnit(r);
    return inferred ? { ...r, paymentUnit: inferred } : r;
  });

  /* 2) 按门店名过滤（富贵园/哈德门） */
  if (!storeName) return withUnit;
  return withUnit.filter((r) => {
    const s = getStoreFromPaymentUnit(r.paymentUnit);
    return s === storeName;
  });
}

export function useMonthlyReport(storeId: string, selectedMonth: string) {
  const { data: appData, update: updateAppData } = useAppData();
  const cacheKey = `${storeId}_${selectedMonth}`;

  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dingtalkSummary, setDingtalkSummary] = useState<{
    count: number;
    total: number;
  }>({ count: 0, total: 0 });

  const payrollResults = appData.monthlyPayrollByKey[cacheKey] || [];
  const setPayrollResults = useCallback(
    (updater: React.SetStateAction<PayrollResult[]>) => {
      updateAppData('monthlyPayrollByKey', (prev) => {
        const cur = prev[cacheKey] || [];
        const next = typeof updater === 'function' ? (updater as any)(cur) : updater;
        return { ...prev, [cacheKey]: next };
      });
    },
    [updateAppData, cacheKey]
  );

  const orderList = appData.monthlyOrdersByKey[cacheKey] || [];
  const setOrderList = useCallback(
    (updater: React.SetStateAction<FinancialFlowItem[]>) => {
      updateAppData('monthlyOrdersByKey', (prev) => {
        const cur = prev[cacheKey] || [];
        const next = typeof updater === 'function' ? (updater as any)(cur) : updater;
        return { ...prev, [cacheKey]: next };
      });
    },
    [updateAppData, cacheKey]
  );

  const fixedCostDetail: FixedCostDetail =
    appData.monthlyFixedCostByKey[cacheKey] || EMPTY_COST;

  const fixedCost =
    fixedCostDetail.propertyFee + fixedCostDetail.electricityFee +
    fixedCostDetail.rent + fixedCostDetail.waterFee +
    fixedCostDetail.networkFee + fixedCostDetail.otherFee;

  const setFixedCostDetail = useCallback(
    (next: FixedCostDetail) => {
      updateAppData('monthlyFixedCostByKey', (prev) => ({
        ...prev, [cacheKey]: next,
      }));
    },
    [updateAppData, cacheKey]
  );

  const dingtalkItems: DingTalkReportItem[] =
    (appData as any).monthlyDingtalkByKey?.[cacheKey] || [];
  const setDingtalkItems = useCallback(
    (updater: React.SetStateAction<DingTalkReportItem[]>) => {
      updateAppData('monthlyDingtalkByKey' as any, (prev: any) => {
        const cur = prev?.[cacheKey] || [];
        const next = typeof updater === 'function' ? (updater as any)(cur) : updater;
        return { ...prev, [cacheKey]: next };
      });
    },
    [updateAppData, cacheKey]
  );

  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';
  const { run, loading: payrollLoading } = usePayroll({
    username, password, busId: storeId,
  });

  const reset = useCallback(() => {
    setHasLoaded(false);
    setError('');
  }, []);

  const fetchAll = useCallback(
    async (month: string): Promise<MonthlyReportSnapshot | null> => {
      if (!storeId || !month) return null;
      setLoading(true);
      setError('');
      try {
        const { begin, end } = getMonthRange(month);

        let newbieSet = new Set<string>();
        let excludedSet = new Set<string>();
        try {
          const statuses = await fetchStaffStatus(storeId, month);
          statuses.forEach((s) => {
            if (s.isNewbie) newbieSet.add(s.staffId);
            if (s.isExcluded) excludedSet.add(s.staffId);
          });
        } catch (e) { console.warn('[MonthlyReport] 拉员工状态失败', e); }

        const plan = await fetchPlanByMonth(storeId, month);

        let orders: FinancialFlowItem[] = [];
        try {
          const orderRes = await getCardOrderList({
            bus_id: storeId, sale_id: '',
            begin_date: begin, end_date: end,
            page_no: 1, page_size: 2000,
          });
          orders = orderRes.list || [];
          setOrderList(orders);
        } catch (e) { console.warn('[MonthlyReport] 拉订单失败', e); setOrderList([]); }

        let costDetail: FixedCostDetail = EMPTY_COST;
        try {
          const sim = await fetchSimulationSetting(storeId, month);
          costDetail = {
            propertyFee: Number(sim?.propertyFee || 0),
            electricityFee: Number(sim?.electricityFee || 0),
            rent: Number(sim?.rent || 0),
            waterFee: Number(sim?.waterFee || 0),
            networkFee: Number(sim?.networkFee || 0),
            otherFee: Number(sim?.otherFee || 0),
          };
          setFixedCostDetail(costDetail);
        } catch (e) { console.warn('[MonthlyReport] 拉测算设置失败', e); setFixedCostDetail(EMPTY_COST); }

        /* ⭐ 钉钉流程：只拉缓存（不按门店过滤），前端推断+过滤 */
        let dtItems: DingTalkReportItem[] = [];
        const storeName = getStoreById(storeId)?.name || storeId;
        try {
          const dtData = await fetchDingTalkMonthlySummary({
            month,
            /* 仍传 store，后端能做初步过滤就做；不做也没关系 */
            store: storeName,
          });
          const raw = dtData.results || [];

          /* ⭐ 先推断退费门店，再按门店过滤 */
          dtItems = normalizeAndFilter(raw, storeName);

          setDingtalkSummary({
            count: dtItems.length,
            total: dtItems.reduce((s, r) => s + Number(r.amount || 0), 0),
          });
          setDingtalkItems(dtItems);
          console.log(
            `[MonthlyReport] 钉钉流程 ${storeName}: ${raw.length} → ${dtItems.length}`
          );
        } catch (e) {
          console.warn('[MonthlyReport] 拉钉钉流程失败', e);
          setDingtalkItems([]);
          setDingtalkSummary({ count: 0, total: 0 });
        }

        let payroll: PayrollResult[] = [];
        if (plan) {
          try {
            const catalog = loadRewardsCatalog();
            const res = await run(month, plan, {}, true, newbieSet, {
              rewardsCatalog: catalog,
              departmentRewards: plan.departmentRewards,
              tempRewardsByStaff: plan.tempRewards,
            });
            payroll = (res.results || []).filter((r) => !excludedSet.has(r.staffId));
            setPayrollResults(payroll);
          } catch (e) { console.warn('[MonthlyReport] 薪酬计算失败', e); setPayrollResults([]); }
        } else { setPayrollResults([]); }

        setHasLoaded(true);

        return {
          orders,
          payrollResults: payroll,
          fixedCostDetail: costDetail,
          dingtalkItems: dtItems,
        };
      } catch (e: any) {
        console.error('[MonthlyReport] 加载失败', e);
        setError(e?.response?.data?.errormsg || e?.message || '加载数据失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [storeId, run, setOrderList, setPayrollResults, setFixedCostDetail, setDingtalkItems]
  );

  useEffect(() => { reset(); }, [storeId, reset]);
  useEffect(() => {
    setHasLoaded(false); setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    const key = `${storeId}_${selectedMonth}`;
    const hasPayroll = (appData.monthlyPayrollByKey[key]?.length || 0) > 0;
    const hasOrders = (appData.monthlyOrdersByKey[key]?.length || 0) > 0;
    const hasFixed = !!appData.monthlyFixedCostByKey[key];
    const hasDingtalk = (((appData as any).monthlyDingtalkByKey?.[key]) || []).length > 0;
    if (hasPayroll || hasOrders || hasFixed || hasDingtalk) setHasLoaded(true);
  }, [
    storeId, selectedMonth,
    appData.monthlyPayrollByKey, appData.monthlyOrdersByKey,
    appData.monthlyFixedCostByKey, (appData as any).monthlyDingtalkByKey,
  ]);

  const payrollSummary = useMemo(() => {
    return payrollResults.reduce(
      (acc, r) => ({
        headcount: acc.headcount + 1,
        baseSalary: acc.baseSalary + r.baseSalary,
        salesCommission: acc.salesCommission + r.salesCommission,
        classCommission: acc.classCommission + r.classCommission,
        absentDeduction: acc.absentDeduction + r.absentDeduction,
        rewardsTotal: acc.rewardsTotal + (r.rewardsTotal ?? 0),
        total: acc.total + r.total,
      }),
      {
        headcount: 0, baseSalary: 0, salesCommission: 0,
        classCommission: 0, absentDeduction: 0, rewardsTotal: 0, total: 0,
      }
    );
  }, [payrollResults]);

  const marketingSummary = useMemo(() => {
    const agg = aggregateOrders(orderList);
    let cardAmount = 0, incomeAmount = 0, prePayment = 0;
    orderList.forEach((it) => {
      cardAmount += getCardAmount(it);
      incomeAmount += getIncomeAmount(it);
      prePayment += getPrePayment(it);
    });
    return { ...agg, cardAmount, incomeAmount, prePayment };
  }, [orderList]);

  const profit = useMemo(
    () => marketingSummary.incomeAmount - payrollSummary.total - fixedCost,
    [marketingSummary, payrollSummary, fixedCost]
  );

  const isProfit = profit >= 0;

  return {
    hasLoaded,
    loading: loading || payrollLoading,
    error,
    payrollResults,
    orderList,
    fixedCost,
    fixedCostDetail,
    payrollSummary,
    marketingSummary,
    profit,
    isProfit,
    fetchAll,
    reset,
    dingtalkItems,
    dingtalkSummary,
  };
}