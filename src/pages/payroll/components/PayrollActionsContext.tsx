import React, { createContext, useContext } from 'react';

export interface PayrollActions {
  /** ⭐ 更新某会员某条消课记录的课提方式 */
  updateMemberCommission: (
    staffId: string,
    memberIndex: number,
    patch: { mode?: 'percent' | 'fixed'; value?: number }
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
    };
  }
  return ctx;
}