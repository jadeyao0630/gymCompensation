import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import RouteGuard from './components/RouteGuard';
import LoginPage from './pages/LoginPage';
import CompensationPage from './pages/CompensationPlanPage';
import PayrollPage from './pages/PayrollPage';
import SimulationPage from './pages/SimulationPage';

const App: React.FC = () => (
  <AuthProvider>
    <Routes>
      {/* 公开 */}
      <Route path="/login" element={<LoginPage />} />

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
          <RouteGuard>
            <CompensationPage />
          </RouteGuard>
        }
      />
      <Route
        path="/payroll"
        element={
          <RouteGuard>
            <PayrollPage />
          </RouteGuard>
        }
      />
      <Route
        path="/simulation"
        element={
          <RouteGuard>
            <SimulationPage />
          </RouteGuard>
        }
      />

      {/* 兜底 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
);

export default App;