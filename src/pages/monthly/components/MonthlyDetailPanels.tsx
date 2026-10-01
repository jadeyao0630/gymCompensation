import React from 'react';
import { BadgeDollarSign, Users, Building2, UserX } from 'lucide-react';
import { Row } from './MonthlyCommon';
import type { FixedCostDetail } from '../hooks/useMonthlyReport';
import type { OverallSummary } from '../../marketing/utils/aggregate';

interface Props {
  marketing: OverallSummary & {
    cardAmount: number;
    incomeAmount: number;
    prePayment: number;
  };
  orderCount: number;
  payrollSummary: {
    headcount: number;
    baseSalary: number;
    salesCommission: number;
    classCommission: number;
    absentDeduction: number;
    total: number;
  };
  fixedCost: number;
  fixedCostDetail: FixedCostDetail;
}

export const MonthlyDetailPanels: React.FC<Props> = ({
  marketing,
  orderCount,
  payrollSummary,
  fixedCost,
  fixedCostDetail,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 收入 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-emerald-50/50">
          <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
            <BadgeDollarSign className="w-4 h-4" />
            收入明细
          </h3>
        </div>
        <div className="p-5 space-y-3">
          <Row
            label="营销实收"
            value={marketing.incomeAmount}
            color="text-emerald-700"
            bold
          />
          <Row label="卡金额合计" value={marketing.cardAmount} />
          <Row
            label="押金支付"
            value={marketing.prePayment}
            color="text-rose-600"
          />
          <Row label="订单数" value={`${orderCount} 笔`} isMoney={false} />
          <div className="pt-3 border-t border-gray-100">
            <Row
              label="收入合计"
              value={marketing.incomeAmount}
              color="text-emerald-700"
              bold
              big
            />
          </div>
        </div>
      </div>

      {/* 薪酬 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-blue-50/50">
          <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <Users className="w-4 h-4" />
            薪酬佣金明细
            <span className="ml-auto text-[10px] font-normal text-gray-400 flex items-center gap-1">
              <UserX className="w-3 h-3" />
              已排除未计入
            </span>
          </h3>
        </div>
        <div className="p-5 space-y-3">
          <Row
            label="计入人数"
            value={`${payrollSummary.headcount} 人`}
            isMoney={false}
          />
          <Row label="底薪合计" value={payrollSummary.baseSalary} />
          <Row label="销提合计" value={payrollSummary.salesCommission} />
          <Row label="课提合计" value={payrollSummary.classCommission} />
          <Row
            label="缺勤扣款"
            value={-payrollSummary.absentDeduction}
            color="text-red-600"
          />
          <div className="pt-3 border-t border-gray-100">
            <Row
              label="薪酬合计"
              value={payrollSummary.total}
              color="text-blue-700"
              bold
              big
            />
          </div>
        </div>
      </div>

      {/* 固定成本 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-amber-50/50">
          <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            固定成本明细
          </h3>
        </div>
        <div className="p-5 space-y-3">
          <Row label="物业费" value={fixedCostDetail.propertyFee} />
          <Row label="电费" value={fixedCostDetail.electricityFee} />
          <Row label="租金" value={fixedCostDetail.rent} />
          <Row label="水费" value={fixedCostDetail.waterFee} />
          <Row label="网络费" value={fixedCostDetail.networkFee} />
          <Row label="其他杂项" value={fixedCostDetail.otherFee} />
          <div className="pt-3 border-t border-gray-100">
            <Row
              label="固定成本合计"
              value={fixedCost}
              color="text-amber-700"
              bold
              big
            />
          </div>
        </div>
      </div>
    </div>
  );
};