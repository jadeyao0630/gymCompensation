import React from 'react';
import { LayoutGrid, Calculator } from 'lucide-react';

export type MainView = 'config' | 'simulation';

interface MainTabsProps {
  active: MainView;
  onChange: (v: MainView) => void;
}

const MainTabs: React.FC<MainTabsProps> = ({ active, onChange }) => {
  const tabs: { key: MainView; label: string; icon: React.ReactNode }[] = [
    {
      key: 'config',
      label: '薪酬配置',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      key: 'simulation',
      label: '模拟测算',
      icon: <Calculator className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-2 mb-6">
      <div className="inline-flex p-1 bg-gray-100/80 rounded-xl gap-1">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MainTabs;