import React from 'react';
import MainTabs from './MainTabs';
import StoreSwitcher from './StoreSwitcher';

interface AppLayoutProps {
  children: React.ReactNode;
  /** 是否隐藏门店切换（默认 false，显示） */
  hideStoreSwitcher?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  hideStoreSwitcher = false,
}) => {
  return (
    <div>
      {/* 顶部导航 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <MainTabs />
      </div>

      {/* 页面内容 */}
      {children}
    </div>
  );
};

export default AppLayout;