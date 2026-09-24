import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CompensationPlanPage from './pages/CompensationPlanPage';
import PayrollPage from './pages/PayrollPage';

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/compensation" replace />} />
    <Route path="/compensation" element={<CompensationPlanPage />} />
    <Route path="/payroll" element={<PayrollPage />} />
    <Route path="*" element={<Navigate to="/compensation" replace />} />
  </Routes>
);

export default App;