import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
  month: string;
  onGoConfig: () => void;
}

export const PayrollNoPlanState: React.FC<Props> = ({ month, onGoConfig }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
    <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
      <AlertTriangle className="w-6 h-6 text-amber-500" />
    </div>
    <h3 className="font-semibold text-gray-700 mb-1">该月份暂无薪酬配置</h3>
    <p className="text-sm text-gray-400 mb-4">
      请先到「薪酬配置」页面上传或导入 {month || '当月'} 的薪酬方案
    </p>
    <button
      onClick={onGoConfig}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition-all"
    >
      <ArrowLeft className="w-4 h-4" /> 去配置
    </button>
  </div>
);

export default PayrollNoPlanState;