import React from 'react';

interface ResultCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
  big?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  icon,
  label,
  value,
  color,
  bg,
  big,
}) => (
  <div className={`rounded-xl border ${bg} px-3 py-2.5`}>
    <div className={`flex items-center gap-1 text-[11px] ${color} mb-0.5`}>
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    <p
      className={`font-bold tabular-nums ${big ? 'text-lg' : 'text-sm'} ${color}`}
    >
      {value}
    </p>
  </div>
);

export default ResultCard;