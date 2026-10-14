import React, { createContext, useContext } from 'react';

export interface PayrollActions {
  /** ⭐ 更新某会员某条消课记录的课提方式 */
  updateMemberCommission: (
    staffId: string,
    memberIndex: number,
    patch: { mode?: 'percent' | 'fixed'; value?: number }
  ) => void;

  /** ⭐ 更新某笔销售订单的提点方式 */
  updateSalesCommission: (
    staffId: string,
    orderIndex: number,
    patch: { mode?: 'percent' | 'fixed'; value?: number }
  ) => void;

  /** ⭐ 回写销售明细（懒加载后存进 result） */
  setSalesDetail: (
    staffId: string,
    details: import('../../../types/payroll').SalesMemberDetail[]
  ) => void;
}

const PayrollActionsContext = createContext<PayrollActions | null>(null);

export const PayrollActionsProvider: React.FC<{
  value: PayrollActions;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <PayrollActionsContext.Provider value={value}>
    {children}
  </PayrollActionsContext.Provider>
);

export function usePayrollActions(): PayrollActions {
  const ctx = useContext(PayrollActionsContext);
  if (!ctx) {
    // 兜底：防止忘记包 Provider 导致整个页面崩
    return {
      updateMemberCommission: () => {
        console.warn('[usePayrollActions] 未找到 Provider，操作被忽略');
      },
      updateSalesCommission: () => {
        console.warn('[usePayrollActions] 未找到 Provider，操作被忽略');
      },
      setSalesDetail: () => {
        console.warn('[usePayrollActions] 未找到 Provider，操作被忽略');
      },
    };
  }
  return ctx;
}