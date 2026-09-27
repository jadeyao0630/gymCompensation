import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerDialogProps {
  defaultValue?: string;
  existingMonths: string[];
  onConfirm: (month: string) => void;
  onCancel: () => void;
}

const MONTH_LABELS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const MonthPickerDialog: React.FC<MonthPickerDialogProps> = ({
  defaultValue,
  existingMonths,
  onConfirm,
  onCancel,
}) => {
  const now = new Date();

  // 初始年 / 月
  const [year, setYear] = useState<number>(() => {
    if (defaultValue && /^\d{4}-\d{2}$/.test(defaultValue)) {
      return parseInt(defaultValue.slice(0, 4), 10);
    }
    return now.getFullYear();
  });

  const [month, setMonth] = useState<number>(() => {
    if (defaultValue && /^\d{4}-\d{2}$/.test(defaultValue)) {
      return parseInt(defaultValue.slice(5, 7), 10);
    }
    return now.getMonth() + 1;
  });

  const [error, setError] = useState('');

  // 切换年份
  const changeYear = (delta: number) => {
    setYear((y) => y + delta);
    setError('');
  };

  // 选月份
  const pickMonth = (m: number) => {
    setMonth(m);
    setError('');
  };

  // 计算最终 value
  const value = useMemo(
    () => `${year}-${String(month).padStart(2, '0')}`,
    [year, month]
  );

  // 当前系统月份（用于高亮）
  const currentValue = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [] // eslint-disable-line
  );

  // 已有月份集合
  const existingSet = useMemo(
    () => new Set(existingMonths),
    [existingMonths]
  );

  useEffect(() => {
    if (existingSet.has(value)) {
      setError('该月份已存在');
    } else {
      setError('');
    }
  }, [value, existingSet]);

  const handleConfirm = () => {
    if (!value) {
      setError('请选择月份');
      return;
    }
    if (existingSet.has(value)) {
      setError('该月份已存在');
      return;
    }
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">选择月份</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              点击月份即可选择
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 年份切换 */}
        <div className="px-6 pt-5 flex items-center justify-between">
          <button
            onClick={() => changeYear(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
            title="上一年"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-lg font-bold text-gray-800 tabular-nums">
            {year} 年
          </div>
          <button
            onClick={() => changeYear(1)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
            title="下一年"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 月份网格 */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-2">
            {MONTH_LABELS.map((label, idx) => {
              const m = idx + 1;
              const cellValue = `${year}-${String(m).padStart(2, '0')}`;
              const isSelected = m === month;
              const isExisting = existingSet.has(cellValue);
              const isCurrent = cellValue === currentValue;

              return (
                <button
                  key={label}
                  onClick={() => pickMonth(m)}
                  disabled={isExisting}
                  className={`
                    relative py-3 rounded-xl text-sm font-medium transition-all
                    ${
                      isExisting
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : isSelected
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
                        : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]'
                    }
                  `}
                >
                  {label}

                  {/* 当前系统月份标记 */}
                  {isCurrent && !isSelected && !isExisting && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}

                  {/* 已有月份标记 */}
                  {isExisting && (
                    <span className="absolute bottom-1 right-1 text-[9px]">
                      已存在
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 提示 */}
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-gray-400">
              已选择：
              <span className="font-semibold text-gray-700 ml-1 tabular-nums">
                {year} 年 {month} 月
              </span>
            </span>
            {error && <span className="text-red-500">⚠ {error}</span>}
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!!error}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97] ${
              error
                ? 'bg-gray-300 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
            }`}
          >
            <Check className="w-4 h-4" />
            确认新增
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthPickerDialog;