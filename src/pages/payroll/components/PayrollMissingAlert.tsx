import React from 'react';
import { AlertTriangle, Sliders } from 'lucide-react';

export const PayrollMissingAlert: React.FC<{ missing: string[]; onOpenDialog: () => void }> = ({ missing, onOpenDialog }) => {
  if (missing.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-amber-800 text-sm">发现 {missing.length} 个岗位未配置薪酬方案</h3>
          <p className="text-xs text-amber-600 mt-1">以下岗位缺少薪酬配置，可能导致计算不准确。</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {missing.map((mp, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs font-medium text-amber-700">
                <Sliders className="w-3 h-3" />{mp}
              </span>
            ))}
          </div>
          <button onClick={onOpenDialog}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition">
            <Sliders className="w-3.5 h-3.5" />立即配置
          </button>
        </div>
      </div>
    </div>
  );
};