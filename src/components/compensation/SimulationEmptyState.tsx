import React from 'react';
import { Sliders } from 'lucide-react';

export const SimulationEmptyState: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 p-20 text-center">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-5">
        <Sliders className="w-8 h-8 text-indigo-500" />
      </div>
      <h3 className="text-gray-700 font-semibold mb-1">还没有可测算的配置</h3>
      <p className="text-sm text-gray-400">请先在配置页导入该月的薪酬方案</p>
    </div>
  );
};