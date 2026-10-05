import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface PositionEditDialogProps {
  open: boolean;
  onClose: () => void;
  currentTitle: string;
  options: string[];
  staffName: string;
  onSave: (title: string) => void;
}

export const PositionEditDialog: React.FC<PositionEditDialogProps> = ({
  open,
  onClose,
  currentTitle,
  options,
  staffName,
  onSave,
}) => {
  const [value, setValue] = useState(currentTitle);

  useEffect(() => {
    if (open) setValue(currentTitle);
  }, [open, currentTitle]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">设置职位</h2>
            <p className="text-xs text-gray-500 mt-0.5">{staffName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-gray-600 mb-2 block">
            选择职位
          </label>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-2">
            保存后会立即重新计算该员工薪资
          </p>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={() => {
              onSave(value);
              onClose();
            }}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97]"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};