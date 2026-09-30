import React from 'react';
import {
  ArrowLeft,
  Sliders,
  Calculator,
  Store,
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface SimulationHeaderProps {
  storeName: string;
  dbOnline: boolean;
  savingSetting: boolean;
  lastSavedAt: Date | null;
  selectedMonth: string;
  onGoPayroll: () => void;
  onGoCompensation: () => void;
}

export const SimulationHeader: React.FC<SimulationHeaderProps> = ({
  storeName,
  dbOnline,
  savingSetting,
  lastSavedAt,
  selectedMonth,
  onGoPayroll,
  onGoCompensation,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 shadow-2xl shadow-indigo-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-start justify-between flex-wrap gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold tracking-widest uppercase">
              Payroll Simulation
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">薪酬测算</h1>
          <p className="text-sm text-indigo-100/90 mt-3 max-w-md">
            设置成本、业绩比例、性别人数，拖动滑块查看利润
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/25">
            <Store className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{storeName}</span>
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-white/20 rounded px-1.5 py-0.5">
              {!dbOnline ? (
                <><CloudOff className="w-3 h-3" /> 离线</>
              ) : savingSetting ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> 保存中</>
              ) : lastSavedAt ? (
                <><CheckCircle2 className="w-3 h-3" /> 已保存 {lastSavedAt.toLocaleTimeString('zh-CN', { hour12: false })}</>
              ) : (
                <><Cloud className="w-3 h-3" /> 已连接</>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoPayroll}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition"
          >
            <Calculator className="w-4 h-4" />
            <span className="text-sm font-medium">去计算薪酬</span>
          </button>
          <button
            onClick={onGoCompensation}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">返回配置</span>
          </button>
        </div>
      </div>
    </div>
  );
};