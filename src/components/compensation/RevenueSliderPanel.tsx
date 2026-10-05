import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  Wallet,
  BadgePercent,
  PiggyBank,
  BookOpen,
  Percent,
  Hash,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type {
  PositionConfig,
  SimulationInput,
  RevenueShareConfig,
  CourseCommissionInputs,
  GenderCountConfig,
  SimulationEmployeeBreakdown,
} from '../../types/compensation';
import { resolveCalcFlags } from '../../types/compensation';
import {
  calcSimulation,
  buildShareWeights,
  calcSimulationBreakdown,
} from '../../utils/simulation';
import PayDetailCell from './PayDetailCell';

interface RevenueSliderPanelProps {
  positions: PositionConfig[];
  input: SimulationInput;
  requiredRevenue: number;
  shareConfig: RevenueShareConfig;
  courseCommissions?: CourseCommissionInputs;
  genderCounts?: GenderCountConfig;
  opsViewEnabled?: boolean;
}

const isStoreManager = (p: PositionConfig) =>
  p.title.includes('店长') || p.title.includes('门店经理');

const isManager = (p: PositionConfig) =>
  p.title.includes('经理') && !isStoreManager(p);

const hasCommission = (p: PositionConfig) =>
  p.hasCommission !== undefined
    ? p.hasCommission
    : p.commissionTiers.length > 0;

const RevenueSliderPanel: React.FC<RevenueSliderPanelProps> = ({
  positions,
  input,
  requiredRevenue,
  shareConfig,
  courseCommissions,
  genderCounts,
  opsViewEnabled = true,
}) => {
  const fixedCost =
    (input.propertyFee || 0) +
    (input.electricityFee || 0) +
    (input.rent || 0) +
    (input.waterFee || 0) +
    (input.networkFee || 0) +
    (input.otherFee || 0);

  const maxRevenue = useMemo(
    () => Math.max(requiredRevenue * 2, 200000, 1),
    [requiredRevenue]
  );

  const step = useMemo(
    () => Math.max(Math.round(maxRevenue / 200), 1000),
    [maxRevenue]
  );

  const [revenue, setRevenue] = useState(requiredRevenue || maxRevenue / 2);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const lastRequiredRef = useRef(requiredRevenue);
  useEffect(() => {
    if (lastRequiredRef.current !== requiredRevenue) {
      lastRequiredRef.current = requiredRevenue;
      setRevenue(requiredRevenue || maxRevenue / 2);
    }
  }, [requiredRevenue, maxRevenue]);

  const weights = useMemo(
    () => buildShareWeights(positions, shareConfig),
    [positions, shareConfig]
  );

  const result = useMemo(() => {
    if (!positions.length) return null;
    return calcSimulation(
      positions,
      input,
      courseCommissions,
      shareConfig,
      genderCounts,
      opsViewEnabled
    );
  }, [
    positions,
    input,
    courseCommissions,
    shareConfig,
    genderCounts,
    opsViewEnabled,
  ]);

  const positionRows = useMemo(() => {
    if (!positions.length) return [];

    const breakdown = calcSimulationBreakdown(
      revenue,
      positions,
      shareConfig,
      genderCounts,
      opsViewEnabled
    );

    return breakdown
      .map((b) => {
        const pos = positions.find((p) => p.id === b.positionId);
        if (!pos) return b;

        const flags = resolveCalcFlags(pos);

        if (!opsViewEnabled && b.title === '运营主管') {
          return { ...b, baseSalary: 0, commission: 0 };
        }

        return {
          ...b,
          baseSalary: flags.includeBaseSalary ? b.baseSalary : 0,
          commission: flags.includeSalesCommission ? b.commission : 0,
        };
      })
      .filter((r) => opsViewEnabled || r.title !== '运营主管');
  }, [positions, revenue, shareConfig, genderCounts, opsViewEnabled]);

  const courseRows = useMemo(
    () =>
      (result?.courseBreakdown || []).map((c) => ({
        positionId: `course-${c.courseName}`,
        title: c.courseName || '未命名',
        headcount: c.headcount,
        baseSalary: 0,
        allocatedRevenue: 0,
        commissionRate: 0,
        commission: 0,
        classCommission: c.commission,
        classMode: c.mode,
        classValue: c.value,
        type: 'course' as const,
      })),
    [result]
  );

  const totalBase = useMemo(
    () => positionRows.reduce((s, x) => s + x.baseSalary, 0),
    [positionRows]
  );

  const totalPositionCommission = useMemo(
    () => positionRows.reduce((s, x) => s + x.commission, 0),
    [positionRows]
  );

  const totalClassCommission = useMemo(
    () => courseRows.reduce((s, c) => s + (c.classCommission || 0), 0),
    [courseRows]
  );

  const totalCommission = totalPositionCommission + totalClassCommission;
  const profit = revenue - totalBase - totalCommission - fixedCost;

  const isProfit = profit >= 0;
  const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

  const salesCommissionRatio =
    totalCommission > 0 ? totalPositionCommission / totalCommission : 0;
  const classCommissionRatio =
    totalCommission > 0 ? totalClassCommission / totalCommission : 0;

  const requiredPercent = Math.min((requiredRevenue / maxRevenue) * 100, 100);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">业绩调控测算</h3>
          <p className="text-[11px] text-gray-400">
            拖动滑块调整总业绩，实时查看利润与佣金比例
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">总业绩</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={Math.round(revenue)}
                onChange={(e) =>
                  setRevenue(
                    Math.max(
                      0,
                      Math.min(maxRevenue, parseInt(e.target.value) || 0)
                    )
                  )
                }
                className="w-32 text-sm font-bold text-indigo-700 text-right bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 tabular-nums"
              />
              <span className="text-xs text-gray-400">元</span>
            </div>
          </div>

          <div className="relative">
            <input
              type="range"
              min={0}
              max={maxRevenue}
              step={step}
              value={revenue}
              onChange={(e) => setRevenue(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer
                bg-gradient-to-r from-indigo-500 to-purple-500
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-indigo-500
                [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-indigo-500"
            />
            <div
              className="absolute top-0 h-2 w-0.5 bg-emerald-500 pointer-events-none"
              style={{ left: `${requiredPercent}%` }}
              title={`所需业绩 ${formatMoney(requiredRevenue)}`}
            />
          </div>

          <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
            <span>0</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-0.5 h-2.5 bg-emerald-500" />
              所需业绩 {formatMoney(requiredRevenue)}
            </span>
            <span>{formatMoney(maxRevenue)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <ResultCard
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="总业绩"
            value={formatMoney(revenue)}
            color="text-indigo-700"
            bg="bg-indigo-50 border-indigo-100"
          />
          <ResultCard
            icon={<Wallet className="w-3.5 h-3.5" />}
            label="总底薪"
            value={formatMoney(totalBase)}
            color="text-blue-700"
            bg="bg-blue-50 border-blue-100"
          />
          <ResultCard
            icon={<BadgePercent className="w-3.5 h-3.5" />}
            label="销提合计"
            value={formatMoney(totalPositionCommission)}
            color="text-amber-700"
            bg="bg-amber-50 border-amber-100"
          />
          <ResultCard
            icon={<BookOpen className="w-3.5 h-3.5" />}
            label="课提合计"
            value={formatMoney(totalClassCommission)}
            color="text-purple-700"
            bg="bg-purple-50 border-purple-100"
          />
          <ResultCard
            icon={
              isProfit ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )
            }
            label="利润"
            value={formatMoney(profit)}
            color={isProfit ? 'text-emerald-700' : 'text-red-700'}
            bg={
              isProfit
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-red-50 border-red-100'
            }
            big
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[11px] text-amber-700 mb-0.5">
              <BadgePercent className="w-3 h-3" />
              <span className="font-medium">销提比例</span>
            </div>
            <p className="font-bold text-sm text-amber-700 tabular-nums">
              {(salesCommissionRatio * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-amber-500 mt-0.5 tabular-nums">
              {formatMoney(totalPositionCommission)} / {formatMoney(totalCommission)}
            </p>
          </div>

          <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[11px] text-purple-700 mb-0.5">
              <BookOpen className="w-3 h-3" />
              <span className="font-medium">课提比例</span>
            </div>
            <p className="font-bold text-sm text-purple-700 tabular-nums">
              {(classCommissionRatio * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-purple-500 mt-0.5 tabular-nums">
              {formatMoney(totalClassCommission)} / {formatMoney(totalCommission)}
            </p>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[11px] text-indigo-700 mb-0.5">
              <PiggyBank className="w-3 h-3" />
              <span className="font-medium">总佣金</span>
            </div>
            <p className="font-bold text-sm text-indigo-700 tabular-nums">
              {formatMoney(totalCommission)}
            </p>
            <p className="text-[10px] text-indigo-500 mt-0.5">销提 + 课提</p>
          </div>
        </div>

        <div className="bg-gray-50/60 backdrop-blur rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 bg-white/70">
                <th className="text-left px-3 py-2 font-medium">职位 / 课程</th>
                <th className="text-right px-3 py-2 font-medium">人数</th>
                <th className="text-right px-3 py-2 font-medium">底薪</th>
                <th className="text-right px-3 py-2 font-medium">分摊业绩</th>
                <th className="text-right px-3 py-2 font-medium">销提比例</th>
                <th className="text-right px-3 py-2 font-medium">销提</th>
                <th className="text-right px-3 py-2 font-medium">课提比例</th>
                <th className="text-right px-3 py-2 font-medium">课提</th>
                <th className="text-center px-3 py-2 font-medium w-10">明细</th>
              </tr>
            </thead>
            <tbody>
              {positionRows.map((b) => {
                const pos = positions.find((p) => p.id === b.positionId);
                const isStore = pos ? isStoreManager(pos) : false;
                const isMgr = pos ? isManager(pos) : false;
                const isOps = pos ? pos.title === '运营主管' : false;
                const noCommission = pos ? !hasCommission(pos) : false;

                const perEmployee = (b as any).perEmployee as
                  | SimulationEmployeeBreakdown[]
                  | undefined;
                const hasPerEmployee = perEmployee && perEmployee.length > 0;
                const rowKey = b.positionId;
                const isExpanded = expandedKeys.has(rowKey);

                return (
                  <React.Fragment key={b.positionId}>
                    <tr
                      className={`border-b border-gray-100 last:border-0 hover:bg-white/80 ${
                        noCommission ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-700 font-medium">
                        {b.title}
                        {isMgr && (
                          <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            经理
                          </span>
                        )}
                        {isStore && (
                          <span className="ml-1 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            汇总
                          </span>
                        )}
                        {isOps && (
                          <span className="ml-1 text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                            运营
                          </span>
                        )}
                        {noCommission && (
                          <span className="ml-1 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            无佣金
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                        {b.headcount || '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                        {b.baseSalary > 0 ? formatMoney(b.baseSalary) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                        {b.allocatedRevenue > 0
                          ? formatMoney(b.allocatedRevenue)
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-sky-600 tabular-nums">
                        {b.commissionRate > 0
                          ? `${(b.commissionRate * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-600 tabular-nums">
                        {b.commission > 0 ? formatMoney(b.commission) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">—</td>
                      <td className="px-3 py-2 text-right text-gray-300">—</td>
                      <td className="px-3 py-2 text-center">
                        {hasPerEmployee ? (
                          <button
                            onClick={() => toggleExpand(rowKey)}
                            title={
                              isExpanded
                                ? '收起分摊明细'
                                : `展开 ${perEmployee!.length} 人分摊明细`
                            }
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-md transition ${
                              isExpanded
                                ? 'text-purple-700 bg-purple-50'
                                : 'text-purple-500 hover:bg-purple-50'
                            }`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>

                    {/* ⭐ 分摊明细展开 */}
                    {isExpanded && hasPerEmployee && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={9} className="px-3 py-2">
                          <div className="ml-6 border-l-2 border-purple-200 pl-4">
                            <div className="text-xs font-semibold text-purple-700 mb-2">
                              {b.title} · 单人分摊明细（{perEmployee!.length} 人）
                            </div>
                            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 border-b border-gray-100 bg-gray-50/60">
                                    <th className="px-3 py-1.5 text-left font-medium">
                                      序号
                                    </th>
                                    <th className="px-3 py-1.5 text-right font-medium">
                                      销售金额
                                    </th>
                                    {/* ⭐ 收款方式列 */}
                                    <th className="px-3 py-1.5 text-left font-medium">
                                      收款方式
                                    </th>
                                    <th className="px-3 py-1.5 text-right font-medium">
                                      底薪档位
                                    </th>
                                    <th className="px-3 py-1.5 text-right font-medium">
                                      底薪
                                    </th>
                                    <th className="px-3 py-1.5 text-right font-medium">
                                      销提档位
                                    </th>
                                    <th className="px-3 py-1.5 text-right font-medium">
                                      销提提点
                                    </th>
                                    <th className="px-3 py-1.5 text-right font-medium">
                                      销提金额
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {perEmployee!.map((emp) => (
                                    <tr
                                      key={emp.index}
                                      className="hover:bg-gray-50/50"
                                    >
                                      <td className="px-3 py-1.5 text-gray-600">
                                        {emp.index}
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                                        ¥
                                        {Math.round(
                                          emp.allocatedRevenue
                                        ).toLocaleString()}
                                      </td>
                                      {/* ⭐ 收款方式 */}
                                      <td className="px-3 py-1.5 text-left align-top">
                                        <PayDetailCell
                                          payDetail={emp.payDetail}
                                        />
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">
                                        {emp.hitBaseThreshold !== undefined
                                          ? `≥${emp.hitBaseThreshold}`
                                          : '—'}
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                                        ¥
                                        {Math.round(
                                          emp.baseSalary
                                        ).toLocaleString()}
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">
                                        {emp.hitCommissionThreshold !== undefined
                                          ? `≥${emp.hitCommissionThreshold}`
                                          : '—'}
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums text-sky-600">
                                        {(emp.commissionRate * 100).toFixed(1)}%
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-amber-600">
                                        ¥
                                        {Math.round(
                                          emp.commission
                                        ).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-gray-50/60 font-medium text-gray-700">
                                  <tr className="border-t border-gray-100">
                                    <td className="px-3 py-1.5" colSpan={4}>
                                      小计
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">
                                      ¥
                                      {Math.round(
                                        perEmployee!.reduce(
                                          (s, x) => s + x.baseSalary,
                                          0
                                        )
                                      ).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-1.5" />
                                    <td className="px-3 py-1.5" />
                                    <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">
                                      ¥
                                      {Math.round(
                                        perEmployee!.reduce(
                                          (s, x) => s + x.commission,
                                          0
                                        )
                                      ).toLocaleString()}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {courseRows.map((c) => (
                <tr
                  key={c.positionId}
                  className="border-b border-gray-100 last:border-0 bg-purple-50/40 hover:bg-purple-50/60"
                >
                  <td className="px-3 py-2 text-purple-700 font-medium">
                    {c.title}
                    <span className="ml-1 text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                      课提
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                    {c.headcount || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-300">—</td>
                  <td className="px-3 py-2 text-right text-gray-300">—</td>
                  <td className="px-3 py-2 text-right text-gray-300">—</td>
                  <td className="px-3 py-2 text-right text-gray-300">—</td>
                  <td className="px-3 py-2 text-right text-purple-600 tabular-nums">
                    {c.classMode === 'fixed' ? (
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Hash className="w-3 h-3" />
                        {c.classValue} 元/节
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Percent className="w-3 h-3" />
                        {((c.classValue || 0) * 100).toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-purple-700 font-semibold tabular-nums">
                    {formatMoney(c.classCommission || 0)}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-300">—</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-white/80 font-semibold text-gray-700 border-t-2 border-gray-200">
                <td className="px-3 py-2" colSpan={2}>
                  合计
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatMoney(totalBase)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatMoney(revenue)}
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right text-amber-600 tabular-nums">
                  {formatMoney(totalPositionCommission)}
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right text-purple-700 tabular-nums">
                  {formatMoney(totalClassCommission)}
                </td>
                <td className="px-3 py-2" />
              </tr>
              <tr className="bg-gray-50 font-semibold text-gray-700">
                <td className="px-3 py-2" colSpan={8}>
                  总佣金（销提 + 课提）
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-indigo-700">
                  {formatMoney(totalCommission)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed flex items-center gap-1">
          <PiggyBank className="w-3 h-3" />
          利润 = 总业绩 − 总底薪 − 总佣金 − 固定成本（
          {formatMoney(fixedCost)}）
        </p>
      </div>
    </div>
  );
};

interface ResultCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
  big?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({
  icon,
  label,
  value,
  color,
  bg,
  big,
}) => (
  <div className={`rounded-xl border ${bg} px-3 py-2.5`}>
    <div className={`flex items-center gap-1 text-[11px] ${color} mb-0.5`}>
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    <p
      className={`font-bold tabular-nums ${big ? 'text-lg' : 'text-sm'} ${color}`}
    >
      {value}
    </p>
  </div>
);

export default RevenueSliderPanel;