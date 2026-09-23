import React, { useEffect, useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface MonthPickerModalProps {
  open: boolean;
  existingMonths: string[];
  onClose: () => void;
  onConfirm: (month: string) => void;
}

const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  open,
  existingMonths,
  onClose,
  onConfirm,
}) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;

  const [value, setValue] = useState(defaultMonth);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue(defaultMonth);
      setError('');
    }
  }, [open, defaultMonth]);

  if (!open) return null;

  const handleConfirm = () => {
    if (!/^\d{4}-\d{2}$/.test(value)) {
      setError('格式不正确，请用 YYYY-MM');
      return;
    }
    const m = parseInt(value.split('-')[1], 10);
    if (m < 1 || m > 12) {
      setError('月份必须在 01-12 之间');
      return;
    }
    if (existingMonths.includes(value)) {
      setError('该月份已存在');
      return;
    }
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            新增月份
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            月份（格式 YYYY-MM）
          </label>
          <input
            type="month"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm transition"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthPickerModal;