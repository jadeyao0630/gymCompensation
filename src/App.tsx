import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RouteGuard from './components/RouteGuard';
import LoginPage from './pages/LoginPage';
import CompensationPage from './pages/CompensationPlanPage';
import PayrollPage from './pages/payroll/PayrollPage';
import SimulationPage from './pages/SimulationPage';
import MarketingReportPage from './pages/marketing/MarketingReportPage';
import NoPermissionPage from './pages/NoPermissionPage';

const App: React.FC = () => (
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

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;