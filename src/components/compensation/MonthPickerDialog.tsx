import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, X, Check, ChevronLeft, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { formatMonthLabel } from '../../utils/format';

interface MonthPickerDialogProps {
  defaultValue?: string;
  existingMonths: string[];
  onConfirm: (
    month: string,
    copyFrom?: string,
    copySimulation?: boolean
  ) => void;
  onCancel: () => void;
  /** ⭐ 由父组件控制的提交中状态：禁止重复点击 & 关闭 */
  submitting?: boolean;
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
  submitting = false,
}) => {
  const now = new Date();

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

  const [copyFrom, setCopyFrom] = useState<string>('');
  const [copySimulation, setCopySimulation] = useState<boolean>(true);
  const [error, setError] = useState('');

  const changeYear = (delta: number) => {
    if (submitting) return;
    setYear((y) => y + delta);
    setError('');
  };

  const pickMonth = (m: number) => {
    if (submitting) return;
    setMonth(m);
    setError('');
  };

  const value = useMemo(
    () => `${year}-${String(month).padStart(2, '0')}`,
    [year, month]
  );

  const currentValue = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [] // eslint-disable-line
  );

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

  const copyOptions = useMemo(
    () => existingMonths.filter((m) => m !== value).sort().reverse(),
    [existingMonths, value]
  );

  const isOverwrite = existingSet.has(value);

  const handleConfirm = () => {
    if (submitting) return;
    if (!value) {
      setError('请选择月份');
      return;
    }
    onConfirm(value, copyFrom || undefined, copySimulation);
  };

  const handleCancel = () => {
    if (submitting) return;
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
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
            onClick={handleCancel}
            disabled={submitting}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 滚动区 */}
        <div className="flex-1 overflow-y-auto">
          {/* 年份切换 */}
          <div className="px-6 pt-5 flex items-center justify-between">
            <button
              onClick={() => changeYear(-1)}
              disabled={submitting}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition disabled:opacity-40"
              title="上一年"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-lg font-bold text-gray-800 tabular-nums">
              {year} 年
            </div>
            <button
              onClick={() => changeYear(1)}
              disabled={submitting}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition disabled:opacity-40"
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
                    disabled={submitting}
                    className={`
                      relative py-3 rounded-xl text-sm font-medium transition-all
                      disabled:cursor-not-allowed
                      ${
                        isSelected
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
                          : isExisting
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-[0.98]'
                          : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]'
                      }
                    `}
                  >
                    {label}

                    {isCurrent && !isSelected && !isExisting && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}

                    {isExisting && (
                      <span className="absolute bottom-1 right-1 text-[9px]">
                        已存在
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-gray-400">
                已选择：
                <span className="font-semibold text-gray-700 ml-1 tabular-nums">
                  {year} 年 {month} 月
                </span>
              </span>
              {isOverwrite && (
                <span className="text-amber-600">⚠ 该月份已存在，创建会覆盖</span>
              )}
              {!isOverwrite && error && (
                <span className="text-red-500">⚠ {error}</span>
              )}
            </div>
          </div>

          {/* 复制设置区 */}
          <div className="px-6 pb-5 space-y-4 border-t border-gray-50 pt-5">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                <Copy className="w-3 h-3" />
                复制自（可选）
              </label>
              <select
                value={copyFrom}
                onChange={(e) => setCopyFrom(e.target.value)}
                disabled={submitting}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">不复制（空白方案）</option>
                {copyOptions.map((m) => (
                  <option key={m} value={m}>
                    复制 {formatMonthLabel(m)} 的配置
                  </option>
                ))}
              </select>
            </div>

            {copyFrom && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copySimulation}
                  onChange={(e) => setCopySimulation(e.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  同时复制 {formatMonthLabel(copyFrom)} 的测算设置（物业费、租金等）
                </span>
              </label>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                处理中…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isOverwrite ? '覆盖并创建' : '确认新增'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthPickerDialog;