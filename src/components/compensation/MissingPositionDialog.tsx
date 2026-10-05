import React, { useState } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import { POSITION_DEFINITIONS } from '../../constants/positions';

interface MissingPositionDialogProps {
  missing: string[];
  onConfirm: (map: Record<string, string>) => void;
  onCancel: () => void;
}

const MissingPositionDialog: React.FC<MissingPositionDialogProps> = ({
  missing,
  onConfirm,
  onCancel,
}) => {
  const [choices, setChoices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    missing.forEach((m) => {
      init[m] = POSITION_DEFINITIONS[0]?.title || '__new__';
    });
    return init;
  });

  const setChoice = (name: string, value: string) =>
    setChoices((prev) => ({ ...prev, [name]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">发现未配置的职位</h2>
            <p className="text-sm text-gray-500 mt-1">
              请为以下职位选择使用哪个标准职位的配置：
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {missing.map((name) => (
            <div
              key={name}
              className="bg-gray-50 rounded-xl border border-gray-200 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold">
                  {name}
                </span>
                <span className="text-xs text-gray-500">→ 使用配置</span>
              </div>
              <select
                value={choices[name]}
                onChange={(e) => setChoice(name, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="__new__">➕ 新建「{name}」职位（空配置）</option>
                {POSITION_DEFINITIONS.map((def) => (
                  <option key={def.title} value={def.title}>
                    使用标准职位：{def.title}
                    {def.isManager ? '（经理）' : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(choices)}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97]"
          >
            <Check className="w-4 h-4" />
            确认并重新计算
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingPositionDialog;