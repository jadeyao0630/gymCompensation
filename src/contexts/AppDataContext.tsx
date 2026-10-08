import React, { createContext, useContext, useState } from 'react';
import type { PayrollResult } from '../utils/payroll';
import type { FinancialFlowItem, FrontMoneyItem } from '../api/stats';
import type { FixedCostDetail } from '../pages/monthly/hooks/useMonthlyReport';

export interface AppData {
  /** 薪酬计算：门店 → 结果列表 */
  payrollResultsByStore: Record<string, PayrollResult[]>;
  /** 薪酬计算：门店 → 合并后的 performances */
  performancesByStore: Record<string, any[]>;

  /** 月报：门店 → 月 → 结果 */
  monthlyPayrollByKey: Record<string, PayrollResult[]>;         // key = `${storeId}_${month}`
  monthlyOrdersByKey: Record<string, FinancialFlowItem[]>;     // key = `${storeId}_${month}`
  /** ⭐ 月报：门店 → 月 → 固定成本明细 */
  monthlyFixedCostByKey: Record<string, FixedCostDetail>;      // key = `${storeId}_${month}`

  /** 营销：门店 → 数据 */
  marketingListByStore: Record<string, FinancialFlowItem[]>;
  marketingFrontMoneyByStore: Record<string, FrontMoneyItem[]>;
}

const EMPTY_DATA: AppData = {
  payrollResultsByStore: {},
  performancesByStore: {},
  monthlyPayrollByKey: {},
  monthlyOrdersByKey: {},
  monthlyFixedCostByKey: {},
  marketingListByStore: {},
  marketingFrontMoneyByStore: {},
};

interface CtxValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  /** 便捷更新：只更新其中一个字段 */
  update: <K extends keyof AppData>(
    key: K,
    updater: (prev: AppData[K]) => AppData[K]
  ) => void;
}

const AppDataCtx = createContext<CtxValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<AppData>(EMPTY_DATA);

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