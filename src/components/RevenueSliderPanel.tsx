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
} from 'lucide-react';
import type {
  PositionConfig,
  SimulationInput,
  RevenueShareConfig,
  CourseCommissionInputs,
} from '../types/compensation';
import { calcTotalBaseSalary, getCommissionRate } from '../utils/salary';
import { calcCourseBreakdown } from '../utils/simulation';

interface RevenueSliderPanelProps {
  positions: PositionConfig[];
  input: SimulationInput;
  requiredRevenue: number;
  shareConfig: RevenueShareConfig;
  courseCommissions?: CourseCommissionInputs;
}

const isStoreManager = (p: PositionConfig) => p.title.includes('店长');
const isManager = (p: PositionConfig) => p.title.includes('经理');

const hasCommission = (p: PositionConfig) =>
  p.hasCommission !== undefined
    ? p.hasCommission
    : p.commissionTiers.length > 0;

const isShareable = (p: PositionConfig) =>
  hasCommission(p) && !isStoreManager(p) && !isManager(p);

function findManagerSource(
  manager: PositionConfig,
  positions: PositionConfig[]
): PositionConfig | undefined {
  const keyword = manager.title.replace('经理', '');
  return positions.find(
    (p) =>
      p.id !== manager.id &&
      !isManager(p) &&
      !isStoreManager(p) &&
      p.title.includes(keyword)
  );
}

const RevenueSliderPanel: React.FC<RevenueSliderPanelProps> = ({
  positions,
  input,
  requiredRevenue,
  shareConfig,
  courseCommissions,
}) => {
  const fixedCost = input.propertyFee + input.electricityFee + input.rent;

  const maxRevenue = useMemo(
    () => Math.max(requiredRevenue * 2, 200000, 1),
    [requiredRevenue]
  );

  const step = useMemo(
    () => Math.max(Math.round(maxRevenue / 200), 1000),
    [maxRevenue]
  );

  const [revenue, setRevenue] = useState(requiredRevenue || maxRevenue / 2);

  const lastRequiredRef = useRef(requiredRevenue);
  useEffect(() => {
    if (lastRequiredRef.current !== requiredRevenue) {
      lastRequiredRef.current = requiredRevenue;
      setRevenue(requiredRevenue || maxRevenue / 2);
    }
  }, [requiredRevenue, maxRevenue]);

  const allBaseSalaries = useMemo(
    () =>
      positions.map((p) => ({
        position: p,
        base: calcTotalBaseSalary(p, positions),
      })),
    [positions]
  );

  const shareablePositions = useMemo(
    () => positions.filter(isShareable),
    [positions]
  );
  const managers = useMemo(
    () => positions.filter((p) => isManager(p) && hasCommission(p)),
    [positions]
  );
  const storeManagers = useMemo(
    () => positions.filter((p) => isStoreManager(p) && hasCommission(p)),
    [positions]
  );
  const fixedPositions = useMemo(
    () => positions.filter((p) => !hasCommission(p)),
    [positions]
  );

  const totalShare = useMemo(
    () =>
      shareablePositions.reduce((s, p) => s + (shareConfig[p.title] || 0), 0),
    [shareablePositions, shareConfig]
  );

  const totalHead = useMemo(
    () => shareablePositions.reduce((s, p) => s + p.headcount, 0),
    [shareablePositions]
  );

  const weightOf = (p: PositionConfig): number => {
    const raw = shareConfig[p.title];
    if (raw !== undefined && totalShare > 0) {
      return raw / totalShare;
    }
    return totalHead > 0 ? p.headcount / totalHead : 0;
  };

  /** 课提明细行 */
  const courseRows = useMemo(
    () =>
      calcCourseBreakdown(courseCommissions, positions).map((c) => ({
        positionId: `course-${c.courseName}`,
        title: c.courseName,
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
    [courseCommissions, positions]
  );

  const totalClassCommission = useMemo(
    () => courseRows.reduce((s, c) => s + (c.classCommission || 0), 0),
    [courseRows]
  );

  /** 职位行（销提） */
  const positionRows = useMemo(() => {
    const allocated = shareablePositions.map((position) => {
      const weight = weightOf(position);
      const allocatedRevenue = revenue * weight;

      const baseSalary = calcTotalBaseSalary(
        position,
        positions,
        allocatedRevenue
      );
      const rate = getCommissionRate(position, positions, allocatedRevenue);
      const commission = allocatedRevenue * rate;

      return {
        positionId: position.id,
        title: position.title,
        headcount: position.headcount,
        baseSalary,
        allocatedRevenue,
        commissionRate: rate,
        commission,
        classCommission: 0,
        classMode: undefined as undefined | 'percent' | 'fixed',
        classValue: 0,
        type: 'shareable' as const,
      };
    });

    const revenueByTitle = new Map<string, number>();
    allocated.forEach((a) => revenueByTitle.set(a.title, a.allocatedRevenue));

    const managerRows = managers.map((m) => {
      const source = findManagerSource(m, positions);
      const managerRevenue = source
        ? revenueByTitle.get(source.title) ?? 0
        : 0;

      const baseSalary = calcTotalBaseSalary(m, positions, managerRevenue);
      const rate = getCommissionRate(m, positions, managerRevenue);
      const commission = managerRevenue * rate;

      return {
        positionId: m.id,
        title: m.title,
        headcount: m.headcount,
        baseSalary,
        allocatedRevenue: managerRevenue,
        commissionRate: rate,
        commission,
        classCommission: 0,
        classMode: undefined as undefined | 'percent' | 'fixed',
        classValue: 0,
        type: 'manager' as const,
      };
    });

    const memberRevenue = allocated.reduce(
      (s, r) => s + r.allocatedRevenue,
      0
    );
    const storeManagerRows = storeManagers.map((sm) => {
      const baseSalary = calcTotalBaseSalary(sm, positions, memberRevenue);
      const rate = getCommissionRate(sm, positions, memberRevenue);
      const commission = memberRevenue * rate;

      return {
        positionId: sm.id,
        title: sm.title,
        headcount: sm.headcount,
        baseSalary,
        allocatedRevenue: memberRevenue,
        commissionRate: rate,
        commission,
        classCommission: 0,
        classMode: undefined as undefined | 'percent' | 'fixed',
        classValue: 0,
        type: 'store' as const,
      };
    });

    const fixedRows = fixedPositions.map((p) => ({
      positionId: p.id,
      title: p.title,
      headcount: p.headcount,
      baseSalary: calcTotalBaseSalary(p, positions),
      allocatedRevenue: 0,
      commissionRate: 0,
      commission: 0,
      classCommission: 0,
      classMode: undefined as undefined | 'percent' | 'fixed',
      classValue: 0,
      type: 'fixed' as const,
    }));

    return [...allocated, ...managerRows, ...storeManagerRows, ...fixedRows];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shareablePositions,
    revenue,
    positions,
    managers,
    storeManagers,
    fixedPositions,
    shareConfig,
    totalShare,
    totalHead,
  ]);

  const totalBase = useMemo(
    () => allBaseSalaries.reduce((s, x) => s + x.base, 0),
    [allBaseSalaries]
  );

  const totalPositionCommission = useMemo(
    () => positionRows.reduce((s, x) => s + x.commission, 0),
    [positionRows]
  );

  const totalCommission = totalPositionCommission + totalClassCommission;

  const profit = revenue - totalBase - totalCommission - fixedCost;

  const isProfit = profit >= 0;
  const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

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
            拖动滑块调整业绩，实时查看利润、底薪、佣金
          </p>
        </div>
      </div>

      <div className="p-5">
        {/* 业绩滑块 */}
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
                [&::-moz-range-thumb]:border-indigo-500
                [&::-moz-range-thumb]:shadow-md
                [&::-moz-range-thumb]:cursor-pointer"
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

        {/* 结果卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
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

        {/* 利润占比 */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5 text-[11px]">
            <span className="text-gray-500">
              利润占比 · 总佣金 {formatMoney(totalCommission)}
            </span>
            <span
              className={`font-semibold tabular-nums ${
                isProfit ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isProfit
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-red-400 to-red-500'
              }`}
              style={{
                width: `${Math.min(
                  Math.max((profit / Math.max(revenue, 1)) * 100, 0),
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* 明细表：销提、课提分列 */}
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
              </tr>
            </thead>
            <tbody>
              {/* 职位行 */}
              {positionRows.map((b) => (
                <tr
                  key={b.positionId}
                  className={`border-b border-gray-100 last:border-0 hover:bg-white/80 ${
                    b.type === 'fixed' ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-gray-700 font-medium">
                    {b.title}
                    {b.type === 'manager' && (
                      <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        经理
                      </span>
                    )}
                    {b.type === 'store' && (
                      <span className="ml-1 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                        汇总
                      </span>
                    )}
                    {b.type === 'fixed' && (
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
                </tr>
              ))}

              {/* 课提行 */}
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
              </tr>
              <tr className="bg-gray-50 font-semibold text-gray-700">
                <td className="px-3 py-2" colSpan={7}>
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
          利润 = 总业绩 − 总底薪（含全部职位） − 总佣金（销提 + 课提） − 固定成本（
          {formatMoney(fixedCost)}）· 按分配比例分摊 · 经理取对应成员业绩 · 店长 =
          三者合计
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