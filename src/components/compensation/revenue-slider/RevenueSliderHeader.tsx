import React from 'react';
import { Sliders } from 'lucide-react';

export const RevenueSliderHeader: React.FC = () => (
  <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100 flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center">
      <Sliders className="w-4 h-4" />
    </div>
    <div>
      <h3 className="text-sm font-bold text-gray-800">业绩调控测算</h3>
      <p className="text-[11px] text-gray-400">
        拖动滑块调整总业绩，实时查看利润与佣金比例
      </p>
    </div>
  </div>
);

export default RevenueSliderHeader;