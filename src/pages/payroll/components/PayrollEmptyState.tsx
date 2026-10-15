
import React from 'react';
import { Calculator, Download, Loader2 } from 'lucide-react';

interface Props {
  loading: boolean;
  hasSettlement: boolean;
  onRun: () => void;
}

export const PayrollEmptyState: React.FC<Props> = ({
  loading,
  hasSettlement,
  onRun,
}) => {
  const title = loading
    ? hasSettlement
      ? '正在获取结算结果…'
      : '正在计算…'
    : hasSettlement
      ? '暂无本地结算结果'
      : '暂无计算结果';

  const description = loading
    ? hasSettlement
      ? '正在从后台获取本月已保存的薪酬结算数据…'
      : '正在拉取订单、员工状态、计算薪酬与成本…'
    : hasSettlement
      ? '后台已有本月结算数据，点击「获取结算结果」查看'
      : '点击「开始计算」按钮，根据本月配置拉取数据并计算薪酬';

  const buttonText = loading
    ? hasSettlement
      ? '获取中…'
      : '计算中…'
    : hasSettlement
      ? '获取结算结果'
      : '开始计算';

  const Icon = hasSettlement ? Download : Calculator;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
        {loading ? (
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        ) : (
          <Icon className="w-6 h-6 text-emerald-500" />
        )}
      </div>

      <h3 className="font-semibold text-gray-700 mb-1">
        {title}
      </h3>

      <p className="text-sm text-gray-400 mb-4">
        {description}
      </p>

      <button
        type="button"
        onClick={onRun}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
        {buttonText}
      </button>
    </div>
  );
};

export default PayrollEmptyState;
