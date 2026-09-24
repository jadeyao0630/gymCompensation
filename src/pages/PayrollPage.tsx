import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  Loader2,
  Users,
  Wallet,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import type {
  CompensationStore,
  MonthlyCompensationPlan,
} from '../types/compensation';
import { usePayroll } from '../hooks/usePayroll';

const STORAGE_KEY = 'gym_compensation_store_v1';

const PayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [store, setStore] = useState<CompensationStore>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(
    searchParams.get('month') || ''
  );

  /* ---------- 读 localStorage 配置 ---------- */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('[PayrollPage] localStorage 原始:', saved ? '有' : '空');
    if (saved) {
      try {
        const parsed: CompensationStore = JSON.parse(saved);
        console.log('[PayrollPage] 解析后月份:', Object.keys(parsed));
        setStore(parsed);
        if (!selectedMonth) {
          const months = Object.keys(parsed).sort();
          if (months.length > 0) setSelectedMonth(months[months.length - 1]);
        }
      } catch (e) {
        console.error('[PayrollPage] 解析失败', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- URL 参数同步 ---------- */
  useEffect(() => {
    const m = searchParams.get('month');
    if (m) setSelectedMonth(m);
  }, [searchParams]);

  const currentPlan: MonthlyCompensationPlan | undefined = selectedMonth
    ? store[selectedMonth]
    : undefined;

  console.log('[PayrollPage] selectedMonth:', selectedMonth);
  console.log('[PayrollPage] currentPlan:', currentPlan);

  /* ---------- 账号（从环境变量读） ---------- */
  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';

  /* ---------- 薪酬计算 Hook ---------- */
  const { run, loading, error, results } = usePayroll({ username, password });

  /* ---------- 汇总 ---------- */
  const summary = useMemo(() => {
    if (results.length === 0) return null;
    return results.reduce(
      (acc, r) => ({
        headcount: acc.headcount + 1,
        baseSalary: acc.baseSalary + r.baseSalary,
        salesCommission: acc.salesCommission + r.salesCommission,
        classCommission: acc.classCommission + r.classCommission,
        total: acc.total + r.total,
      }),
      {
        headcount: 0,
        baseSalary: 0,
        salesCommission: 0,
        classCommission: 0,
        total: 0,
      }
    );
  }, [results]);

  /* ---------- 开始计算 ---------- */
  const handleRun = async () => {
    console.log('[handleRun] 点击了');
    console.log('[handleRun] currentPlan:', currentPlan);
    console.log('[handleRun] selectedMonth:', selectedMonth);
    console.log('[handleRun] username:', username);
    console.log('[handleRun] password:', password ? '有' : '空');

    if (!currentPlan || !selectedMonth) {
      alert('请先选择月份，并确保该月已有配置');
      return;
    }
    try {
      await run(selectedMonth, currentPlan);
    } catch (e) {
      console.error('[handleRun] 失败:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ============ 头部 ============ */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl shadow-emerald-500/20 p-8 sm:p-10 mb-8 text-white">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between flex-wrap gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
                <Calculator className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold tracking-widest uppercase">
                  Payroll Calculation
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                薪酬佣金计算
              </h1>
              <p className="text-sm text-emerald-100/90 mt-3 max-w-md">
                基于所选月份的薪酬配置，拉取售卡售课与消课数据，自动计算每位员工的底薪、销提、课提
              </p>
            </div>

            <button
              onClick={() => navigate('/compensation')}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">返回配置</span>
            </button>
          </div>
        </div>

        {/* ============ 操作栏 ============ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">月份</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  navigate(`/payroll?month=${e.target.value}`, {
                    replace: true,
                  });
                }}
                className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Object.keys(store).sort().map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {!selectedMonth && <option value="">请选择月份</option>}
              </select>
            </div>

            <div className="flex-1" />

            <button
              onClick={handleRun}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  计算中…
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  开始计算
                </>
              )}
            </button>
          </div>

          {!currentPlan && (
            <p className="text-xs text-amber-600 mt-3">
              该月份暂无薪酬配置，请先到「薪酬配置」页面导入 Excel
            </p>
          )}
        </div>

        {/* ============ 错误提示 ============ */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ============ 汇总卡片 ============ */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <SummaryCard
              icon={<Users className="w-4 h-4" />}
              label="计算人数"
              value={summary.headcount}
              isMoney={false}
              color="from-slate-500 to-gray-500"
            />
            <SummaryCard
              icon={<Wallet className="w-4 h-4" />}
              label="底薪合计"
              value={summary.baseSalary}
              color="from-blue-500 to-indigo-500"
            />
            <SummaryCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="销提合计"
              value={summary.salesCommission}
              color="from-sky-500 to-cyan-500"
            />
            <SummaryCard
              icon={<BookOpen className="w-4 h-4" />}
              label="课提合计"
              value={summary.classCommission}
              color="from-violet-500 to-purple-500"
            />
            <SummaryCard
              icon={<Wallet className="w-4 h-4" />}
              label="总计"
              value={summary.total}
              color="from-emerald-500 to-teal-500"
            />
          </div>
        )}

        {/* ============ 结果表 ============ */}
        {results.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">员工</th>
                    <th className="px-4 py-3 text-left font-medium">职位</th>
                    <th className="px-4 py-3 text-right font-medium">销售金额</th>
                    <th className="px-4 py-3 text-right font-medium">消课节数</th>
                    <th className="px-4 py-3 text-right font-medium">消课金额</th>
                    <th className="px-4 py-3 text-right font-medium">底薪</th>
                    <th className="px-4 py-3 text-right font-medium">销提</th>
                    <th className="px-4 py-3 text-right font-medium">课提</th>
                    <th className="px-4 py-3 text-right font-medium">合计</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r) => (
                    <tr
                      key={r.staffId || r.staffName}
                      className="hover:bg-gray-50/50"
                    >
                      {/* 员工：姓名 + 电话 */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {r.staffName || '—'}
                        </div>
                        {r.staffPhone && (
                          <div className="text-xs text-gray-400">
                            {r.staffPhone}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {r.positionTitle}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        ¥{r.salesAmount.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.classCount}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        ¥{r.classAmount.toLocaleString()}
                      </td>

                      {/* 底薪 + 命中档位比例 */}
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div>¥{r.baseSalary.toLocaleString()}</div>
                        {r.hitCommissionRate > 0 && (
                          <div className="text-xs text-gray-400">
                            档位 {(r.hitCommissionRate * 100).toFixed(1)}%
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums text-sky-600">
                        ¥{r.salesCommission.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums text-violet-600">
                        ¥{r.classCommission.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700">
                        ¥{r.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-gray-800">
                  <tr>
                    <td className="px-4 py-3" colSpan={5}>
                      合计（{summary?.headcount || 0} 人）
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ¥{(summary?.baseSalary || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sky-700">
                      ¥{(summary?.salesCommission || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-violet-700">
                      ¥{(summary?.classCommission || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                      ¥{(summary?.total || 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 p-20 text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-5">
                <Calculator className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-gray-700 font-semibold mb-1">
                还没有计算结果
              </h3>
              <p className="text-sm text-gray-400">
                选择月份后点击「开始计算」
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

/* ============================================================
 * 汇总卡片
 * ============================================================ */
interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  isMoney?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  label,
  value,
  color,
  isMoney = true,
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
    <div
      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} text-white flex items-center justify-center mb-2`}
    >
      {icon}
    </div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-lg font-bold text-gray-800 tabular-nums">
      {isMoney ? `¥${value.toLocaleString()}` : value}
    </p>
  </div>
);

export default PayrollPage;