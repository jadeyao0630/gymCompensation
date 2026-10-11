import React, { createContext, useContext, useState, useEffect } from 'react';
import type { PayrollResult } from '../utils/payroll';
import type { FinancialFlowItem, FrontMoneyItem } from '../api/stats';
import type { FixedCostDetail } from '../pages/monthly/hooks/useMonthlyReport';

export interface AppData {
  payrollResultsByStore: Record<string, PayrollResult[]>;
  performancesByStore: Record<string, any[]>;

  monthlyPayrollByKey: Record<string, PayrollResult[]>;
  monthlyOrdersByKey: Record<string, FinancialFlowItem[]>;
  monthlyFixedCostByKey: Record<string, FixedCostDetail>;
  /** ⭐ AI 报告文本 */
  monthlyAiReportByKey: Record<string, string>;
  /** ⭐ 图表 payload（任意结构，按 storeId_month 隔离） */
  monthlyAiPayloadByKey: Record<string, any>;

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
  monthlyAiPayloadByKey: {},
  marketingListByStore: {},
  marketingFrontMoneyByStore: {},
};

const AI_REPORT_STORAGE_KEY = 'gym_appdata_ai_reports_v1';
const AI_PAYLOAD_STORAGE_KEY = 'gym_appdata_ai_payloads_v1';

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
  /* ⭐ 初始化从 localStorage 恢复 AI 报告 + 图表 payload */
  const [data, setData] = useState<AppData>(() => {
    let reports: Record<string, string> = {};
    let payloads: Record<string, any> = {};

    try {
      const r = localStorage.getItem(AI_REPORT_STORAGE_KEY);
      if (r) {
        const parsed = JSON.parse(r);
        if (parsed && typeof parsed === 'object') reports = parsed;
      }
    } catch (e) {
      console.warn('[AppData] 恢复 AI 报告失败', e);
    }

    try {
      const p = localStorage.getItem(AI_PAYLOAD_STORAGE_KEY);
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed && typeof parsed === 'object') payloads = parsed;
      }
    } catch (e) {
      console.warn('[AppData] 恢复图表 payload 失败', e);
    }

    return {
      ...EMPTY_DATA,
      monthlyAiReportByKey: reports,
      monthlyAiPayloadByKey: payloads,
    };
  });

  /* ⭐ AI 报告变化时写 localStorage */
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

  /* ⭐ 图表 payload 变化时写 localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(
        AI_PAYLOAD_STORAGE_KEY,
        JSON.stringify(data.monthlyAiPayloadByKey)
      );
    } catch (e) {
      console.warn('[AppData] 保存图表 payload 失败', e);
    }
  }, [data.monthlyAiPayloadByKey]);

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