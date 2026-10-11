import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPlanByMonth, fetchSimulationSetting } from '../../../api/compensation';
import { fetchStaffStatus } from '../../../api/payrollStatus';
import { getCardOrderList, type FinancialFlowItem } from '../../../api/stats';
import { usePayroll } from '../../../hooks/usePayroll';
import type { PayrollResult } from '../../../utils/payroll';
import { loadRewardsCatalog } from '../../../utils/payrollStorage';
import { useAppData } from '../../../contexts/AppDataContext';
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

export function useMonthlyReport(storeId: string, selectedMonth: string) {
  const { data: appData, update: updateAppData } = useAppData();

  const cacheKey = `${storeId}_${selectedMonth}`;

  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ---------- payrollResults：全局 store ---------- */
  const payrollResults = appData.monthlyPayrollByKey[cacheKey] || [];
  const setPayrollResults = useCallback(
    (updater: React.SetStateAction<PayrollResult[]>) => {
      updateAppData('monthlyPayrollByKey', (prev) => {
        const cur = prev[cacheKey] || [];
        const next =
          typeof updater === 'function' ? (updater as any)(cur) : updater;
        return { ...prev, [cacheKey]: next };
      });
    },
    [updateAppData, cacheKey]
  );

  /* ---------- orderList：全局 store ---------- */
  const orderList = appData.monthlyOrdersByKey[cacheKey] || [];
  const setOrderList = useCallback(
    (updater: React.SetStateAction<FinancialFlowItem[]>) => {
      updateAppData('monthlyOrdersByKey', (prev) => {
        const cur = prev[cacheKey] || [];
        const next =
          typeof updater === 'function' ? (updater as any)(cur) : updater;
        return { ...prev, [cacheKey]: next };
      });
    },
    [updateAppData, cacheKey]
  );

  /* ---------- fixedCostDetail：全局 store ---------- */
  const fixedCostDetail: FixedCostDetail =
    appData.monthlyFixedCostByKey[cacheKey] || EMPTY_COST;

  const fixedCost =
    fixedCostDetail.propertyFee +
    fixedCostDetail.electricityFee +
    fixedCostDetail.rent +
    fixedCostDetail.waterFee +
    fixedCostDetail.networkFee +
    fixedCostDetail.otherFee;

  const setFixedCostDetail = useCallback(
    (next: FixedCostDetail) => {
      updateAppData('monthlyFixedCostByKey', (prev) => ({
        ...prev,
        [cacheKey]: next,
      }));
    },
    [updateAppData, cacheKey]
  );

  /* ---------- 薪酬计算 Hook ---------- */
  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';
  const { run, loading: payrollLoading } = usePayroll({
    username,
    password,
    busId: storeId,
  });

  const reset = useCallback(() => {
    setHasLoaded(false);
    setError('');
  }, []);

  /* ---------- 拉取全部数据（⭐ 带诊断日志） ---------- */
  const fetchAll = useCallback(
    async (month: string) => {
      if (!storeId || !month) return null;
      setLoading(true);
      setError('');
      try {
        const { begin, end } = getMonthRange(month);
        console.log('[MonthlyReport] fetchAll 开始：', {
          storeId,
          month,
          begin,
          end,
        });

        /* 1) 员工状态 */
        let newbieSet = new Set<string>();
        let excludedSet = new Set<string>();
        try {
          const statuses = await fetchStaffStatus(storeId, month);
          statuses.forEach((s) => {
            if (s.isNewbie) newbieSet.add(s.staffId);
            if (s.isExcluded) excludedSet.add(s.staffId);
          });
          console.log('[MonthlyReport] 员工状态拉取成功', statuses.length);
        } catch (e) {
          console.warn('[MonthlyReport] 拉员工状态失败', e);
        }

        /* 2) 方案配置 */
        const plan = await fetchPlanByMonth(storeId, month);
        console.log(
          '[MonthlyReport] 方案配置：',
          plan ? `岗位 ${plan.positions?.length || 0} 个` : 'null'
        );

        /* 3) ⭐ 营销订单 */
        let orders: FinancialFlowItem[] = [];
        const orderParams = {
          bus_id: storeId,
          sale_id: '',
          begin_date: begin,
          end_date: end,
          page_no: 1,
          page_size: 2000,
        };
        console.log('[MonthlyReport] 拉订单参数 =', orderParams);
        try {
          const orderRes: any = await getCardOrderList(orderParams);
          console.log('[MonthlyReport] 拉订单原始返回 =', orderRes);

          /* ⭐ 兼容多种返回结构：list / data.list / data */
          let rawList: any[] = [];
          if (Array.isArray(orderRes)) rawList = orderRes;
          else if (Array.isArray(orderRes?.list)) rawList = orderRes.list;
          else if (Array.isArray(orderRes?.data?.list)) rawList = orderRes.data.list;
          else if (Array.isArray(orderRes?.data)) rawList = orderRes.data;
          else if (Array.isArray(orderRes?.result?.list)) rawList = orderRes.result.list;

          console.log('[MonthlyReport] 订单条数 =', rawList.length);
          if (rawList.length > 0) {
            console.log('[MonthlyReport] 订单第一条 =', rawList[0]);
            console.log(
              '[MonthlyReport] 订单第一条的字段 =',
              Object.keys(rawList[0])
            );
          }

          orders = rawList;
          setOrderList(orders);
        } catch (e: any) {
          console.warn('[MonthlyReport] 拉订单失败', e);
          console.warn('[MonthlyReport] 错误详情 =', e?.response?.data || e?.message);
          setOrderList([]);
        }

        /* 4) 固定成本 */
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
          console.log('[MonthlyReport] 固定成本 =', costDetail);
        } catch (e) {
          console.warn('[MonthlyReport] 拉测算设置失败', e);
          setFixedCostDetail(EMPTY_COST);
        }

        /* 5) 薪酬计算 */
        let payroll: PayrollResult[] = [];
        if (plan) {
          try {
            const catalog = loadRewardsCatalog();
            const res = await run(
              month,
              plan,
              {},
              true,
              newbieSet,
              {
                rewardsCatalog: catalog,
                departmentRewards: plan.departmentRewards,
                tempRewardsByStaff: plan.tempRewards,
              }
            );
            payroll = (res.results || []).filter(
              (r) => !excludedSet.has(r.staffId)
            );
            setPayrollResults(payroll);
            console.log('[MonthlyReport] 薪酬计算完成，人数 =', payroll.length);
          } catch (e) {
            console.warn('[MonthlyReport] 薪酬计算失败', e);
            setPayrollResults([]);
          }
        } else {
          setPayrollResults([]);
        }

        setHasLoaded(true);

        return {
          orders,
          payrollResults: payroll,
          fixedCostDetail: costDetail,
        };
      } catch (e: any) {
        console.error('[MonthlyReport] 加载失败', e);
        setError(
          e?.response?.data?.errormsg || e?.message || '加载数据失败'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [storeId, run, setOrderList, setPayrollResults, setFixedCostDetail]
  );

  useEffect(() => {
    reset();
  }, [storeId, reset]);

  useEffect(() => {
    setHasLoaded(false);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    const key = `${storeId}_${selectedMonth}`;
    const hasPayroll = (appData.monthlyPayrollByKey[key]?.length || 0) > 0;
    const hasOrders = (appData.monthlyOrdersByKey[key]?.length || 0) > 0;
    const hasFixed = !!appData.monthlyFixedCostByKey[key];
    if (hasPayroll || hasOrders || hasFixed) {
      setHasLoaded(true);
    }
  }, [
    storeId,
    selectedMonth,
    appData.monthlyPayrollByKey,
    appData.monthlyOrdersByKey,
    appData.monthlyFixedCostByKey,
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
        headcount: 0,
        baseSalary: 0,
        salesCommission: 0,
        classCommission: 0,
        absentDeduction: 0,
        rewardsTotal: 0,
        total: 0,
      }
    );
  }, [payrollResults]);

  const marketingSummary = useMemo(() => {
    const agg = aggregateOrders(orderList);
    let cardAmount = 0;
    let incomeAmount = 0;
    let prePayment = 0;
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
  };
}