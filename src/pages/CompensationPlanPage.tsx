import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Users,
  Wallet,
  Briefcase,
  Calculator,
} from 'lucide-react';
import type {
  CompensationStore,
  MonthlyCompensationPlan,
  PositionConfig,
  PositionCategory,
} from '../types/compensation';
import { getCategoryLabel } from '../constants/categories';
import { uid } from '../utils/id';
import { formatMonthLabel } from '../utils/format';
import { parseCompensationExcel } from '../utils/excelParser';
import { calcTotalBaseSalary } from '../utils/salary';
import PageHeader from '../components/PageHeader';
import Toolbar from '../components/Toolbar';
import StatCard from '../components/StatCard';
import CategoryTabs from '../components/CategoryTabs';
import PositionCard from '../components/PositionCard';

const STORAGE_KEY = 'gym_compensation_store_v1';

const CompensationPlanPage: React.FC = () => {
  const navigate = useNavigate();

  const [store, setStore] = useState<CompensationStore>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [activeTab, setActiveTab] = useState<PositionCategory>('membership');
  const [importing, setImporting] = useState(false);

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
  }, []);

  useEffect(() => {
    if (Object.keys(store).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  }, [store]);

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

  /* ---- 导入 / 导出 ---- */
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

  /* ---- 月份 ---- */
  const addMonth = () => {
    const input = prompt('请输入月份（YYYY-MM，如 2025-07）：');
    if (!input) return;
    if (!/^\d{4}-\d{2}$/.test(input)) {
      alert('格式不正确，请使用 YYYY-MM');
      return;
    }
    if (store[input]) {
      alert('该月份已存在');
      return;
    }
    setStore((prev) => ({
      ...prev,
      [input]: {
        month: input,
        periodLabel: formatMonthLabel(input),
        positions: [],
      },
    }));
    setSelectedMonth(input);
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

  /* ---- 职位 ---- */
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

  /* ---- 跳转到薪酬计算 ---- */
  const goToPayroll = () => {
    if (!selectedMonth) {
      alert('请先选择月份');
      return;
    }
    // 用 URL 参数传月份，刷新也不丢
    navigate(`/payroll?month=${selectedMonth}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader selectedMonth={selectedMonth} />

        {/* 跳转按钮：有配置时显示 */}
        {currentPlan && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={goToPayroll}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-[0.97]"
            >
              <Calculator className="w-4 h-4" />
              去计算薪酬
            </button>
          </div>
        )}

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

        {!currentPlan && (
          <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 p-20 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-5">
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">还没有配置</h3>
            <p className="text-sm text-gray-400">
              请选择或新增一个月份，然后导入 Excel 生成薪酬配置
            </p>
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
                    <p className="text-sm text-gray-400 mb-1">该分类下暂无职位</p>
                    <p className="text-xs text-gray-300">点击下方按钮新增</p>
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
      </div>
    </div>
  );
};

export default CompensationPlanPage;