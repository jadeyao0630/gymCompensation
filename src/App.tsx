import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CompensationPlanPage from './pages/CompensationPlanPage';
import PayrollPage from './pages/PayrollPage';
import SimulationPage from './pages/SimulationPage';

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/compensation" replace />} />
    <Route path="/compensation" element={<CompensationPlanPage />} />
    <Route path="/payroll" element={<PayrollPage />} />
    <Route path="/simulation" element={<SimulationPage />} />
    <Route path="*" element={<Navigate to="/compensation" replace />} />
  </Routes>
);

export default App;