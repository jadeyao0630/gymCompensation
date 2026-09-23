import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Calendar, Users, Wallet, Briefcase } from 'lucide-react';
import type {
  CompensationStore,
  MonthlyCompensationPlan,
  PositionConfig,
  PositionCategory,
  SimulationInput,
  RevenueShareConfig,
  CourseCommissionInputs,
} from '../types/compensation';
import { getCategoryLabel } from '../constants/categories';
import { uid } from '../utils/id';
import { formatMonthLabel } from '../utils/format';
import { parseCompensationExcel } from '../utils/excelParser';
import { calcTotalBaseSalary } from '../utils/salary';
import { simulate } from '../utils/simulation';
import PageHeader from '../components/PageHeader';
import Toolbar from '../components/Toolbar';
import StatCard from '../components/StatCard';
import CategoryTabs from '../components/CategoryTabs';
import PositionCard from '../components/PositionCard';
import SimulationPanel from '../components/SimulationPanel';
import RevenueSliderPanel from '../components/RevenueSliderPanel';
import RevenueSharePanel, {
  buildDefaultShare,
} from '../components/RevenueSharePanel';
import CourseSimulationPanel, {
  buildDefaultCourses,
} from '../components/CourseSimulationPanel';
import MonthPickerModal from '../components/MonthPickerModal';
import MainTabs, { type MainView } from '../components/MainTabs';

const STORAGE_KEY = 'gym_compensation_store_v1';
const SIM_KEY = 'gym_simulation_input_v1';
const SHARE_KEY = 'gym_share_config_v1';
const COURSE_KEY = 'gym_course_config_v1';

const DEFAULT_SIM: SimulationInput = {
  propertyFee: 18000,
  electricityFee: 40000,
  rent: 30000,
};

const isStoreManager = (p: PositionConfig) => p.title.includes('店长');
const isManager = (p: PositionConfig) => p.title.includes('经理');
const hasCommission = (p: PositionConfig) =>
  p.hasCommission !== undefined
    ? p.hasCommission
    : p.commissionTiers.length > 0;
const isShareable = (p: PositionConfig) =>
  hasCommission(p) && !isStoreManager(p) && !isManager(p);

const CompensationPlanPage: React.FC = () => {
  const [store, setStore] = useState<CompensationStore>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [activeTab, setActiveTab] = useState<PositionCategory>('membership');
  const [importing, setImporting] = useState(false);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [simInput, setSimInput] = useState<SimulationInput>(DEFAULT_SIM);
  const [shareConfig, setShareConfig] = useState<RevenueShareConfig>({});
  const [courseConfig, setCourseConfig] = useState<CourseCommissionInputs>({});
  const [mainView, setMainView] = useState<MainView>('config');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: CompensationStore = JSON.parse(saved);
        setStore(parsed);
        const months = Object.keys(parsed).sort();
        if (months.length > 0) setSelectedMonth(months[months.length - 1]);
      } catch {
        /* ignore */
      }
    } else {
      const now = new Date();
      const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(m);
    }

    const savedSim = localStorage.getItem(SIM_KEY);
    if (savedSim) {
      try {
        setSimInput(JSON.parse(savedSim));
      } catch {
        /* ignore */
      }
    }

    const savedShare = localStorage.getItem(SHARE_KEY);
    if (savedShare) {
      try {
        setShareConfig(JSON.parse(savedShare));
      } catch {
        /* ignore */
      }
    }

    const savedCourse = localStorage.getItem(COURSE_KEY);
    if (savedCourse) {
      try {
        setCourseConfig(JSON.parse(savedCourse));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(store).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  }, [store]);

  useEffect(() => {
    localStorage.setItem(SIM_KEY, JSON.stringify(simInput));
  }, [simInput]);

  useEffect(() => {
    localStorage.setItem(SHARE_KEY, JSON.stringify(shareConfig));
  }, [shareConfig]);

  useEffect(() => {
    localStorage.setItem(COURSE_KEY, JSON.stringify(courseConfig));
  }, [courseConfig]);

  const currentPlan = selectedMonth ? store[selectedMonth] : undefined;

  const currentPositions = useMemo(
    () => currentPlan?.positions.filter((p) => p.category === activeTab) || [],
    [currentPlan, activeTab]
  );

  const totalHeadcount =
    currentPlan?.positions.reduce((s, p) => s + p.headcount, 0) || 0;
  const totalBase =
    currentPlan?.positions.reduce(
      (s, p) => s + calcTotalBaseSalary(p, currentPlan.positions),
      0
    ) || 0;

  const simResult = useMemo(
    () =>
      simulate(
        currentPlan?.positions || [],
        simInput,
        shareConfig,
        courseConfig
      ),
    [currentPlan, simInput, shareConfig, courseConfig]
  );

  const shareablePositions = useMemo(
    () => currentPlan?.positions.filter(isShareable) || [],
    [currentPlan]
  );

  // 首次初始化
  useEffect(() => {
    if (!currentPlan || shareablePositions.length === 0) return;
    if (
      Object.keys(shareConfig).length > 0 &&
      Object.keys(courseConfig).length > 0
    )
      return;

    if (Object.keys(shareConfig).length === 0) {
      setShareConfig(buildDefaultShare(shareablePositions));
    }
    if (Object.keys(courseConfig).length === 0) {
      setCourseConfig(buildDefaultCourses());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan, shareablePositions]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMonth) return;
    setImporting(true);
    try {
      const plan = await parseCompensationExcel(
        file,
        selectedMonth,
        formatMonthLabel(selectedMonth)
      );
      setStore((prev) => ({ ...prev, [selectedMonth]: plan }));

      const importedShareable = plan.positions.filter(isShareable);
      setShareConfig(buildDefaultShare(importedShareable));
      setCourseConfig(buildDefaultCourses());

      alert(`已导入 ${file.name} → ${formatMonthLabel(selectedMonth)}`);
    } catch (err) {
      console.error(err);
      alert('解析 Excel 失败，请检查文件格式');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleExport = () => {
    if (!currentPlan) return;
    const blob = new Blob([JSON.stringify(currentPlan, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `薪酬配置_${selectedMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addMonth = () => setMonthModalOpen(true);

  const handleMonthConfirm = (month: string) => {
    setStore((prev) => ({
      ...prev,
      [month]: {
        month,
        periodLabel: formatMonthLabel(month),
        positions: [],
      },
    }));
    setSelectedMonth(month);
    setMonthModalOpen(false);
  };

  const removeMonth = () => {
    if (!selectedMonth || !currentPlan) return;
    if (!confirm(`确定删除 ${formatMonthLabel(selectedMonth)} 的全部配置？`))
      return;
    setStore((prev) => {
      const next = { ...prev };
      delete next[selectedMonth];
      return next;
    });
    const rest = Object.keys(store)
      .filter((m) => m !== selectedMonth)
      .sort();
    setSelectedMonth(rest.length > 0 ? rest[rest.length - 1] : '');
  };

  const updatePlan = (updates: Partial<MonthlyCompensationPlan>) => {
    if (!selectedMonth) return;
    setStore((prev) => ({
      ...prev,
      [selectedMonth]: { ...prev[selectedMonth], ...updates },
    }));
  };

  const updatePosition = (posId: string, updates: Partial<PositionConfig>) => {
    if (!currentPlan) return;
    updatePlan({
      positions: currentPlan.positions.map((p) =>
        p.id === posId ? { ...p, ...updates } : p
      ),
    });
  };

  const addPosition = () => {
    if (!currentPlan) return;
    updatePlan({
      positions: [
        ...currentPlan.positions,
        {
          id: uid(),
          title: `新${getCategoryLabel(activeTab)}职位`,
          category: activeTab,
          headcount: 0,
          performanceTarget: 0,
          performanceSource: 'self',
          totalBaseSalary: 0,
          commissionTiers: [],
          baseSalaryTiers: [],
          hasCommission: activeTab !== 'operations',
        },
      ],
    });
  };

  const removePosition = (posId: string) => {
    if (!currentPlan) return;
    updatePlan({
      positions: currentPlan.positions.filter((p) => p.id !== posId),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader selectedMonth={selectedMonth} />

        <Toolbar
          months={Object.keys(store).sort()}
          selectedMonth={selectedMonth}
          hasPlan={!!currentPlan}
          importing={importing}
          importedFrom={currentPlan?.importedFrom}
          onSelectMonth={setSelectedMonth}
          onAddMonth={addMonth}
          onRemoveMonth={removeMonth}
          onImport={handleImport}
          onExport={handleExport}
        />

        <MainTabs active={mainView} onChange={setMainView} />

        {mainView === 'config' && (
          <>
            {!currentPlan && (
              <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 p-20 text-center">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-5">
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-gray-700 font-semibold mb-1">还没有配置</h3>
                <p className="text-sm text-gray-400">
                  请选择或新增一个月份，然后导入 Excel 生成薪酬配置
                </p>
                <button
                  onClick={addMonth}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  新增月份
                </button>
              </div>
            )}

            {currentPlan && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <StatCard
                    icon={<Briefcase className="w-5 h-5" />}
                    label="职位数"
                    value={currentPlan.positions.length}
                    gradient="from-blue-500 to-indigo-500"
                    glow="bg-blue-300"
                  />
                  <StatCard
                    icon={<Users className="w-5 h-5" />}
                    label="总人数"
                    value={totalHeadcount}
                    gradient="from-emerald-500 to-teal-500"
                    glow="bg-emerald-300"
                  />
                  <StatCard
                    icon={<Wallet className="w-5 h-5" />}
                    label="总底薪"
                    value={`¥${totalBase.toLocaleString()}`}
                    gradient="from-amber-500 to-orange-500"
                    glow="bg-amber-300"
                  />
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <CategoryTabs
                    positions={currentPlan.positions}
                    active={activeTab}
                    onChange={setActiveTab}
                  />

                  <div className="p-4 sm:p-6 bg-gradient-to-b from-gray-50/40 to-white">
                    {currentPositions.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
                          <Briefcase className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 mb-1">
                          该分类下暂无职位
                        </p>
                        <p className="text-xs text-gray-300">
                          点击下方按钮新增
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {currentPositions.map((pos) => (
                          <PositionCard
                            key={pos.id}
                            position={pos}
                            allPositions={currentPlan.positions}
                            onUpdate={(u) => updatePosition(pos.id, u)}
                            onRemove={() => removePosition(pos.id)}
                          />
                        ))}
                      </div>
                    )}

                    <div className="mt-6">
                      <button
                        onClick={addPosition}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl text-sm font-medium text-gray-500 hover:text-blue-600 transition-all active:scale-[0.99]"
                      >
                        <Plus className="w-4 h-4" />
                        新增{getCategoryLabel(activeTab)}职位
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {mainView === 'simulation' && (
          <>
            {!currentPlan ? (
              <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 p-20 text-center">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-5">
                  <Calendar className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-gray-700 font-semibold mb-1">
                  还没有薪酬配置
                </h3>
                <p className="text-sm text-gray-400">
                  请先在「薪酬配置」中导入 Excel，再进行模拟测算
                </p>
                <button
                  onClick={() => setMainView('config')}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  去配置
                </button>
              </div>
            ) : (
              <>
                <SimulationPanel
                  positions={currentPlan.positions}
                  input={simInput}
                  result={simResult}
                  onInputChange={setSimInput}
                />

                <CourseSimulationPanel
                  value={courseConfig}
                  onChange={setCourseConfig}
                  positions={currentPlan.positions}
                />

                <RevenueSharePanel
                  shareablePositions={shareablePositions}
                  value={shareConfig}
                  onChange={setShareConfig}
                />

                <RevenueSliderPanel
                  positions={currentPlan.positions}
                  input={simInput}
                  requiredRevenue={simResult.requiredRevenue}
                  shareConfig={shareConfig}
                  courseCommissions={courseConfig}
                />
              </>
            )}
          </>
        )}
      </div>

      <MonthPickerModal
        open={monthModalOpen}
        existingMonths={Object.keys(store)}
        onClose={() => setMonthModalOpen(false)}
        onConfirm={handleMonthConfirm}
      />
    </div>
  );
};

export default CompensationPlanPage;