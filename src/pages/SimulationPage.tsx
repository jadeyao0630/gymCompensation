import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Undo2 } from 'lucide-react';
import type { CompensationStore, MonthlyCompensationPlan, SimulationResult } from '../types/compensation';
import { calcSimulation } from '../utils/simulation';
import SimulationSettingsPanel from '../components/SimulationSettingsPanel';
import RevenueSliderPanel from '../components/RevenueSliderPanel';
import StoreSwitcher from '../components/StoreSwitcher';
import { SimulationHeader } from '../components/SimulationHeader';
import { SimulationEmptyState } from '../components/SimulationEmptyState';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { getStoreById } from '../constants/stores';
import { useSimulation } from '../hooks/useSimulation';

const SimulationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const opsViewEnabled = hasPermission('ops:view', storeId);
  const [selectedMonth, setSelectedMonth] = useState<string>(searchParams.get('month') || '');

  // 核心业务 Hook
  const {
    fullStore,
    simInput, shareConfig, genderCounts, courseInputs,
    handleInputChange, handleShareConfigChange, handleGenderCountsChange, handleCourseInputsChange,
    dbOnline, savingSetting, lastSavedAt,
    undoDepth, handleUndo,
  } = useSimulation(storeId, selectedMonth);

  const store: CompensationStore = fullStore[storeId] || {};
  const currentPlan: MonthlyCompensationPlan | undefined = selectedMonth ? store[selectedMonth] : undefined;

  // 默认选中最新月份
  useEffect(() => {
    const months = Object.keys(fullStore[storeId] || {}).sort();
    if (months.length > 0) {
      setSelectedMonth(months[months.length - 1]);
    } else {
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [storeId]); // eslint-disable-line

  useEffect(() => {
    const m = searchParams.get('month');
    if (m) setSelectedMonth(m);
  }, [searchParams]);

  // 测算结果（纯计算，依赖入参变化自动更新）
  const simResult: SimulationResult = useMemo(() => {
    if (!currentPlan) {
      return {
        fixedCost: 0, totalBaseSalary: 0, totalCommission: 0, totalClassCommission: 0,
        requiredRevenue: 0, iterations: 0, breakdown: [], courseBreakdown: [],
      };
    }
    return calcSimulation(
      currentPlan.positions, simInput, courseInputs, shareConfig, genderCounts, opsViewEnabled
    );
  }, [currentPlan, simInput, courseInputs, shareConfig, genderCounts, opsViewEnabled]);

  // 无权限直接跳转
  if (!hasPermission('simulation:access', storeId)) {
    return <Navigate to="/no-permission" replace />;
  }

  const storeName = getStoreById(storeId)?.name || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <SimulationHeader
          storeName={storeName}
          dbOnline={dbOnline}
          savingSetting={savingSetting}
          lastSavedAt={lastSavedAt}
          selectedMonth={selectedMonth}
          onGoPayroll={() => navigate(`/payroll?month=${selectedMonth}`)}
          onGoCompensation={() => navigate('/compensation')}
        />

        <div className="mb-4">
          <StoreSwitcher />
        </div>

        {/* 月份选择 + 撤销 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-600">月份</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                navigate(`/simulation?month=${e.target.value}`, { replace: true });
              }}
              className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.keys(store).sort().map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              {!selectedMonth && <option value="">请选择月份</option>}
            </select>

            {!currentPlan && (
              <p className="text-xs text-amber-600">
                该月份暂无薪酬配置，请先到「薪酬配置」页面导入 Excel
              </p>
            )}

            <div className="flex-1" />

            <button
              onClick={handleUndo}
              disabled={undoDepth === 0}
              title={undoDepth > 0 ? `撤销（Ctrl/Cmd+Z，剩余 ${undoDepth} 步）` : '无可撤销'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${
                undoDepth > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3 h-3" />
              撤销
              {undoDepth > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
                  {undoDepth}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 主体内容 */}
        {currentPlan ? (
          <>
            <SimulationSettingsPanel
              positions={currentPlan.positions}
              input={simInput}
              onInputChange={handleInputChange}
              shareConfig={shareConfig}
              onShareConfigChange={handleShareConfigChange}
              genderCounts={genderCounts}
              onGenderCountsChange={handleGenderCountsChange}
              courseInputs={courseInputs}
              onCourseInputsChange={handleCourseInputsChange}
            />

            <RevenueSliderPanel
              positions={currentPlan.positions}
              input={simInput}
              requiredRevenue={simResult.requiredRevenue}
              shareConfig={shareConfig}
              courseCommissions={courseInputs}
              genderCounts={genderCounts}
              opsViewEnabled={opsViewEnabled}
            />
          </>
        ) : (
          <SimulationEmptyState />
        )}
      </div>
    </div>
  );
};

export default SimulationPage;