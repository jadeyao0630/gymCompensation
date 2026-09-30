import React from 'react';
import { Plus, Upload } from 'lucide-react';

interface CompensationGuideDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualAdd: () => void;
}

export const CompensationGuideDialog: React.FC<CompensationGuideDialogProps> = ({
  open,
  onClose,
  onImport,
  onManualAdd,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">开始配置薪酬方案</h2>
          <p className="text-sm text-gray-500 mt-1">
            该门店还没有任何方案，选择一种方式开始
          </p>
        </div>

        <div className="p-6 space-y-3">
          <label className="flex items-start gap-4 p-4 rounded-xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer transition-all">
            <input
              type="file"
              accept=".xlsx,.xls,.json,application/json"
              className="hidden"
              onChange={(e) => {
                onClose();
                onImport(e);
              }}
            />
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">导入 Excel 或 JSON</h3>
              <p className="text-xs text-gray-500 mt-1">
                .xlsx / .xls 走 Excel 解析；.json 直接还原
              </p>
            </div>
          </label>

          <button
            onClick={() => {
              onClose();
              onManualAdd();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">手动新建月份</h3>
              <p className="text-xs text-gray-500 mt-1">
                选择月份后，逐个添加职位和阶梯配置
              </p>
            </div>
          </button>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  );
};