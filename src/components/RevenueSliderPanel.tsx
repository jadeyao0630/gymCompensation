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
  GenderCountConfig,
} from '../types/compensation';
import { resolveCalcFlags } from '../types/compensation';
import { calcSimulation, buildShareWeights } from '../utils/simulation';

interface RevenueSliderPanelProps {
  positions: PositionConfig[];
  input: SimulationInput;
  requiredRevenue: number;
  shareConfig: RevenueShareConfig;
  courseCommissions?: CourseCommissionInputs;
  genderCounts?: GenderCountConfig;
  /** ⭐ 是否展示运营主管 */
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
    if (!result) return [];

    const rows = result.breakdown.map((b) => {
      const pos = positions.find((p) => p.id === b.positionId);
      if (!pos) return b;

      let allocatedRevenue = b.allocatedRevenue;

      if (isStoreManager(pos)) {
        const included = pos.includedDepartments ?? ['会籍', '私教', '泳教'];
        const deptSales: Record<string, number> = {
          会籍: 0,
          私教: 0,
          泳教: 0,
          运营: 0,
        };
        positions.forEach((p) => {
          if (isManager(p) || isStoreManager(p)) return;
          const flags = resolveCalcFlags(p);
          if (!flags.includePerformance) return;
          const share = weights[p.title] ?? 0;
          const dept =
            p.title.includes('会籍')
              ? '会籍'
              : p.title.includes('私教') ||
                p.title.includes('瑜伽') ||
                p.title.includes('舞蹈') ||
                p.title.includes('团操')
              ? '私教'
              : p.title.includes('泳教') || p.title.includes('游泳')
              ? '泳教'
              : '运营';
          deptSales[dept] += revenue * share;
        });
        allocatedRevenue = included.reduce(
          (s, d) => s + (deptSales[d] || 0),
          0
        );
      } else if (isManager(pos)) {
        const keyword = pos.title.replace('经理', '');
        const source = positions.find(
          (x) =>
            x.id !== pos.id &&
            !isManager(x) &&
            !isStoreManager(x) &&
            x.title.includes(keyword)
        );
        if (source) {
          const share = weights[source.title] ?? 0;
          allocatedRevenue = revenue * share;
        }
      } else if (pos.title === '运营主管') {
        /* ⭐ 运营主管：分摊业绩 = 店长分摊业绩 */
        const storePos = positions.find((x) => isStoreManager(x));
        if (storePos) {
          const included = storePos.includedDepartments ?? ['会籍', '私教', '泳教'];
          const deptSales: Record<string, number> = {
            会籍: 0, 私教: 0, 泳教: 0, 运营: 0,
          };
          positions.forEach((p) => {
            if (isManager(p) || isStoreManager(p) || p.title === '运营主管') return;
            const flags = resolveCalcFlags(p);
            if (!flags.includePerformance) return;
            const share = weights[p.title] ?? 0;
            const dept =
              p.title.includes('会籍') ? '会籍'
              : p.title.includes('私教') || p.title.includes('瑜伽') || p.title.includes('舞蹈') || p.title.includes('团操') ? '私教'
              : p.title.includes('泳教') || p.title.includes('游泳') ? '泳教'
              : '运营';
            deptSales[dept] += revenue * share;
          });
          allocatedRevenue = included.reduce(
            (s, d) => s + (deptSales[d] || 0),
            0
          );
        }
      } else {
        const share = weights[pos.title] ?? 0;
        allocatedRevenue = revenue * share;
      }

      const flags = resolveCalcFlags(pos);
      const rate = b.commissionRate;
      const commission = flags.includeSalesCommission
        ? allocatedRevenue * rate
        : 0;

      const baseSalary = flags.includeBaseSalary ? b.baseSalary : 0;

      return {
        ...b,
        baseSalary,
        allocatedRevenue,
        commission,
      };
    });

    /* ⭐ 无 ops:view 时过滤运营主管 */
    if (!opsViewEnabled) {
      return rows.filter((r) => r.title !== '运营主管');
    }
    return rows;
  }, [result, positions, revenue, weights, opsViewEnabled]);

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
            <p className="text-[10px] text-indigo-500 mt-0.5">
              销提 + 课提
            </p>
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
              </tr>
            </thead>
            <tbody>
              {positionRows.map((b) => {
                const pos = positions.find((p) => p.id === b.positionId);
                const isStore = pos ? isStoreManager(pos) : false;
                const isMgr = pos ? isManager(pos) : false;
                const isOps = pos ? pos.title === '运营主管' : false;
                const noCommission = pos ? !hasCommission(pos) : false;

                return (
                  <tr
                    key={b.positionId}
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
                  </tr>
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