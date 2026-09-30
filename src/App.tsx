import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RouteGuard from './components/RouteGuard';
import AppLayout from './components/AppLayout';                    // ⭐ 新增
import LoginPage from './pages/LoginPage';
import CompensationPage from './pages/CompensationPlanPage';
import PayrollPage from './pages/payroll/PayrollPage';
import SimulationPage from './pages/SimulationPage';
import MarketingReportPage from './pages/marketing/MarketingReportPage';   // ⭐ 新增
import NoPermissionPage from './pages/NoPermissionPage';

const App: React.FC = () => (
  <Routes>
    {/* 公开 */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/no-permission" element={<NoPermissionPage />} />

    {/* 受保护（统一包裹 AppLayout） */}
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
          <AppLayout>
            <CompensationPage />
          </AppLayout>
        </RouteGuard>
      }
    />
    <Route
      path="/payroll"
      element={
        <RouteGuard permission="payroll:calc">
          <AppLayout>
            <PayrollPage />
          </AppLayout>
        </RouteGuard>
      }
    />
    <Route
      path="/simulation"
      element={
        <RouteGuard permission="simulation:access">
          <AppLayout>
            <SimulationPage />
          </AppLayout>
        </RouteGuard>
      }
    />
    <Route
      path="/marketing-report"
      element={
        <RouteGuard permission="report:marketing:view">
          <AppLayout>
            <MarketingReportPage />
          </AppLayout>
        </RouteGuard>
      }
    />

    {/* 兜底 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;