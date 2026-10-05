import React from 'react';
import { Calendar } from 'lucide-react';

export const CompensationEmptyState: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 p-20 text-center">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-5">
        <Calendar className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-gray-700 font-semibold mb-1">还没有配置</h3>
      <p className="text-sm text-gray-400">
        请选择或新增一个月份，然后导入 Excel / JSON 生成薪酬配置
      </p>
    </div>
  );
};