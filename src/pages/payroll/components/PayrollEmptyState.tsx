import React from 'react';
import { Calculator, Loader2 } from 'lucide-react';

interface Props {
  loading: boolean;
  onRun: () => void;
}

export const PayrollEmptyState: React.FC<Props> = ({ loading, onRun }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
      {loading ? (
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      ) : (
        <Calculator className="w-6 h-6 text-emerald-500" />
      )}
    </div>
    <h3 className="font-semibold text-gray-700 mb-1">
      {loading ? '正在计算…' : '暂无计算结果'}
    </h3>
    <p className="text-sm text-gray-400 mb-4">
      {loading
        ? '正在拉取订单、员工状态、计算薪酬与成本…'
        : '点击「开始计算」按钮，根据本月配置拉取数据并计算薪酬'}
    </p>
    <button
      onClick={onRun}
      disabled={loading}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> 计算中…</>
      ) : (
        <><Calculator className="w-4 h-4" /> 开始计算</>
      )}
    </button>
  </div>
);

export default PayrollEmptyState;