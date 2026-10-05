import React from 'react';
import { Sliders } from 'lucide-react';
import NavButtons from './NavButtons';
import UserMenu from './../auth/UserMenu';

interface SimulationHeaderProps {
  storeName?: string;
  dbOnline?: boolean;
  savingSetting?: boolean;
  lastSavedAt?: Date | null;
  selectedMonth?: string;
  onGoPayroll?: () => void;
  onGoCompensation?: () => void;
}

export const SimulationHeader: React.FC<SimulationHeaderProps> = ({
  selectedMonth,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 shadow-2xl shadow-indigo-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold tracking-widest uppercase">
                Payroll Simulation
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              薪酬测算
            </h1>
            <p className="text-sm text-indigo-100/90 mt-3 max-w-md leading-relaxed">
              设置成本、业绩比例、性别人数，拖动滑块查看利润
            </p>
          </div>

          <UserMenu variant="dark" />
        </div>

        <div className="mt-6">
          <NavButtons active="simulation" month={selectedMonth} />
        </div>
      </div>
    </div>
  );
};

export default SimulationHeader;