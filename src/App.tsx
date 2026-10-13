import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RouteGuard from './components/common/RouteGuard';
import LoginPage from './pages/login/LoginPage';
import CompensationPage from './pages/compensation/CompensationPlanPage';
import PayrollPage from './pages/payroll/PayrollPage';
import SimulationPage from './pages/simulation/SimulationPage';
import MarketingReportPage from './pages/marketing/MarketingReportPage';
import MonthlyReportPage from './pages/monthly/MonthlyReportPage';
import DingTalkReportPage from './pages/dingtalk/DingTalkReportPage';
import StoreConfigPage from './pages/settings/StoreConfigPage';
import NoPermissionPage from './pages/no-permission/NoPermissionPage';
import { AppDataProvider } from './contexts/AppDataContext';

const App: React.FC = () => (
  <AppDataProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/no-permission" element={<NoPermissionPage />} />

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
      <Route
        path="/dingtalk-report"
        element={
          <RouteGuard permission="report:dingtalk:view">
            <DingTalkReportPage />
          </RouteGuard>
        }
      />

      {/* ⭐ 门店配置 */}
      <Route
        path="/settings/stores"
        element={
          <RouteGuard>
            <StoreConfigPage />
          </RouteGuard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AppDataProvider>
);

export default App;