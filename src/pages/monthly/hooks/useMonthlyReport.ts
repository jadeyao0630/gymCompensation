import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPlanByMonth, fetchSimulationSetting } from '../../../api/compensation';
import { fetchStaffStatus } from '../../../api/payrollStatus';
import { getCardOrderList, type FinancialFlowItem } from '../../../api/stats';
import { usePayroll } from '../../../hooks/usePayroll';
import type { PayrollResult } from '../../../utils/payroll';
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
  /* ---------- 数据状态 ---------- */
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payrollResults, setPayrollResults] = useState<PayrollResult[]>([]);
  const [orderList, setOrderList] = useState<FinancialFlowItem[]>([]);
  const [fixedCost, setFixedCost] = useState(0);
  const [fixedCostDetail, setFixedCostDetail] =
    useState<FixedCostDetail>(EMPTY_COST);

  /* ---------- 薪酬计算 Hook ---------- */
  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';
  const { run, loading: payrollLoading } = usePayroll({
    username,
    password,
    busId: storeId,
  });

  /* ---------- 重置 ---------- */
  const reset = useCallback(() => {
    setHasLoaded(false);
    setPayrollResults([]);
    setOrderList([]);
    setFixedCost(0);
    setFixedCostDetail(EMPTY_COST);
    setError('');
  }, []);

  /* ---------- 拉取全部数据 ---------- */
  const fetchAll = useCallback(
    async (month: string) => {
      if (!storeId || !month) return;
      setLoading(true);
      setError('');
      try {
        const { begin, end } = getMonthRange(month);

        /* 1) 员工状态（新人 / 排除） */
        let newbieSet = new Set<string>();
        let excludedSet = new Set<string>();
        try {
          const statuses = await fetchStaffStatus(storeId, month);
          statuses.forEach((s) => {
            if (s.isNewbie) newbieSet.add(s.staffId);
            if (s.isExcluded) excludedSet.add(s.staffId);
          });
        } catch (e) {
          console.warn('[MonthlyReport] 拉员工状态失败', e);
        }

        /* 2) 方案配置 */
        const plan = await fetchPlanByMonth(storeId, month);

        /* 3) 营销订单 */
        try {
          const orderRes = await getCardOrderList({
            bus_id: storeId,
            sale_id: '',
            begin_date: begin,
            end_date: end,
            page_no: 1,
            page_size: 2000,
          });
          setOrderList(orderRes.list || []);
        } catch (e) {
          console.warn('[MonthlyReport] 拉订单失败', e);
          setOrderList([]);
        }

        /* 4) 固定成本 */
        try {
          const sim = await fetchSimulationSetting(storeId, month);
          const detail: FixedCostDetail = {
            propertyFee: Number(sim?.propertyFee || 0),
            electricityFee: Number(sim?.electricityFee || 0),
            rent: Number(sim?.rent || 0),
            waterFee: Number(sim?.waterFee || 0),
            networkFee: Number(sim?.networkFee || 0),
            otherFee: Number(sim?.otherFee || 0),
          };
          setFixedCostDetail(detail);
          setFixedCost(
            detail.propertyFee +
              detail.electricityFee +
              detail.rent +
              detail.waterFee +
              detail.networkFee +
              detail.otherFee
          );
        } catch (e) {
          console.warn('[MonthlyReport] 拉测算设置失败', e);
          setFixedCost(0);
          setFixedCostDetail(EMPTY_COST);
        }

        /* 5) 薪酬计算（含新人 + 排除过滤） */
        if (plan) {
          try {
            const res = await run(month, plan, {}, true, newbieSet);
            const filtered = (res.results || []).filter(
              (r) => !excludedSet.has(r.staffId)
            );
            setPayrollResults(filtered);
          } catch (e) {
            console.warn('[MonthlyReport] 薪酬计算失败', e);
            setPayrollResults([]);
          }
        } else {
          setPayrollResults([]);
        }

        setHasLoaded(true);
      } catch (e: any) {
        console.error('[MonthlyReport] 加载失败', e);
        setError(
          e?.response?.data?.errormsg || e?.message || '加载数据失败'
        );
      } finally {
        setLoading(false);
      }
    },
    [storeId, run]
  );

  /* ---------- 门店切换重置 ---------- */
  useEffect(() => {
    reset();
  }, [storeId, reset]);

  /* ---------- 月份切换重置 ---------- */
  useEffect(() => {
    if (!hasLoaded) return;
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  /* ---------- 汇总计算 ---------- */
  const payrollSummary = useMemo(() => {
    return payrollResults.reduce(
      (acc, r) => ({
        headcount: acc.headcount + 1,
        baseSalary: acc.baseSalary + r.baseSalary,
        salesCommission: acc.salesCommission + r.salesCommission,
        classCommission: acc.classCommission + r.classCommission,
        absentDeduction: acc.absentDeduction + r.absentDeduction,
        total: acc.total + r.total,
      }),
      {
        headcount: 0,
        baseSalary: 0,
        salesCommission: 0,
        classCommission: 0,
        absentDeduction: 0,
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
    /* 状态 */
    hasLoaded,
    loading: loading || payrollLoading,
    error,
    /* 数据 */
    payrollResults,
    orderList,
    fixedCost,
    fixedCostDetail,
    /* 汇总 */
    payrollSummary,
    marketingSummary,
    profit,
    isProfit,
    /* 方法 */
    fetchAll,
    reset,
  };
}