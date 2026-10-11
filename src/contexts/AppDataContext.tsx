import React, { createContext, useContext, useState, useEffect } from 'react';
import type { PayrollResult } from '../utils/payroll';
import type { FinancialFlowItem, FrontMoneyItem } from '../api/stats';
import type { FixedCostDetail } from '../pages/monthly/hooks/useMonthlyReport';

export interface AppData {
  /** 薪酬计算：门店 → 结果列表 */
  payrollResultsByStore: Record<string, PayrollResult[]>;
  /** 薪酬计算：门店 → 合并后的 performances */
  performancesByStore: Record<string, any[]>;

  /** 月报：门店_月 → 结果 */
  monthlyPayrollByKey: Record<string, PayrollResult[]>;
  monthlyOrdersByKey: Record<string, FinancialFlowItem[]>;
  monthlyFixedCostByKey: Record<string, FixedCostDetail>;
  /** ⭐ AI 报告：key = `${storeId}_${month}` */
  monthlyAiReportByKey: Record<string, string>;

  /** 营销：门店 → 数据 */
  marketingListByStore: Record<string, FinancialFlowItem[]>;
  marketingFrontMoneyByStore: Record<string, FrontMoneyItem[]>;
}

const EMPTY_COST: FixedCostDetail = {
  propertyFee: 0,
  electricityFee: 0,
  rent: 0,
  waterFee: 0,
  networkFee: 0,
  otherFee: 0,
};

const EMPTY_DATA: AppData = {
  payrollResultsByStore: {},
  performancesByStore: {},
  monthlyPayrollByKey: {},
  monthlyOrdersByKey: {},
  monthlyFixedCostByKey: {},
  monthlyAiReportByKey: {},
  marketingListByStore: {},
  marketingFrontMoneyByStore: {},
};

/* ⭐ AI 报告的 localStorage key */
const AI_REPORT_STORAGE_KEY = 'gym_appdata_ai_reports_v1';

interface CtxValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  update: <K extends keyof AppData>(
    key: K,
    updater: (prev: AppData[K]) => AppData[K]
  ) => void;
}

const AppDataCtx = createContext<CtxValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  /* ⭐ 初始化时从 localStorage 恢复 AI 报告 */
  const [data, setData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem(AI_REPORT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...EMPTY_DATA, monthlyAiReportByKey: parsed };
        }
      }
    } catch (e) {
      console.warn('[AppData] 恢复 AI 报告失败', e);
    }
    return EMPTY_DATA;
  });

  /* ⭐ AI 报告变化时写入 localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(
        AI_REPORT_STORAGE_KEY,
        JSON.stringify(data.monthlyAiReportByKey)
      );
    } catch (e) {
      console.warn('[AppData] 保存 AI 报告失败', e);
    }
  }, [data.monthlyAiReportByKey]);

  const update: CtxValue['update'] = (key, updater) => {
    setData((prev) => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  };

  return (
    <AppDataCtx.Provider value={{ data, setData, update }}>
      {children}
    </AppDataCtx.Provider>
  );
};

export function useAppData(): CtxValue {
  const ctx = useContext(AppDataCtx);
  if (!ctx) {
    throw new Error('[useAppData] 必须在 <AppDataProvider> 内使用');
  }
  return ctx;
}