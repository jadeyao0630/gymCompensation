import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  gradient: string;
  glow: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  gradient,
  glow,
}) => (
  <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
    <div
      className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${glow} opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500`}
    />
    <div className="relative flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-lg`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
          {value}
        </p>
      </div>
    </div>
  </div>
);

export default StatCard;
