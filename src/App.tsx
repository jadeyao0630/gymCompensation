import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RouteGuard from './components/RouteGuard';
import LoginPage from './pages/LoginPage';
import CompensationPage from './pages/CompensationPlanPage';
import PayrollPage from './pages/payroll/PayrollPage';
import SimulationPage from './pages/SimulationPage';
import MarketingReportPage from './pages/marketing/MarketingReportPage';
import MonthlyReportPage from './pages/monthly/MonthlyReportPage';
import DingTalkReportPage from './pages/dingtalk/DingTalkReportPage';   // ⭐ 新增
import NoPermissionPage from './pages/NoPermissionPage';

const App: React.FC = () => (
  <Routes>
    {/* 公开 */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/no-permission" element={<NoPermissionPage />} />

    {/* 受保护 */}
    <Route
      path="/"
      element={
        <RouteGuard>
          <Navigate to="/compensation" replace />
        </RouteGuard>
      }
    />
    <Route
      path="/compensation"
      element={
        <RouteGuard permission="plan:view">
          <CompensationPage />
        </RouteGuard>
      }
    />
    <Route
      path="/payroll"
      element={
        <RouteGuard permission="payroll:calc">
          <PayrollPage />
        </RouteGuard>
      }
    />
    <Route
      path="/simulation"
      element={
        <RouteGuard permission="simulation:access">
          <SimulationPage />
        </RouteGuard>
      }
    />
    <Route
      path="/marketing-report"
      element={
        <RouteGuard permission="report:marketing:view">
          <MarketingReportPage />
        </RouteGuard>
      }
    />
    <Route
      path="/monthly-report"
      element={
        <RouteGuard permission="report:monthly:view">
          <MonthlyReportPage />
        </RouteGuard>
      }
    />
    {/* ⭐ 钉钉报销数据 */}
    <Route
      path="/dingtalk-report"
      element={
        <RouteGuard permission="report:monthly:view">
          <DingTalkReportPage />
        </RouteGuard>
      }
    />

    {/* 兜底 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;