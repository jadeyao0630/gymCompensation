import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import type {
  PositionConfig,
  SimulationInput,
  RevenueShareConfig,
  CourseCommissionInputs,
  GenderCountConfig,
} from '../../types/compensation';
import { resolveCalcFlags } from '../../types/compensation';
import {
  calcSimulation,
  buildShareWeights,
  calcSimulationBreakdown,
} from '../../utils/simulation';
import {
  RevenueSliderHeader,
  RevenueSliderInput,
  ResultCardsGrid,
  CommissionRatioCards,
  BreakdownTable,
} from './revenue-slider';
import type { PositionRow } from './revenue-slider/BreakdownTable';
import type { CourseRow } from './revenue-slider/CourseBreakdownRows';

interface RevenueSliderPanelProps {
  positions: PositionConfig[];
  input: SimulationInput;
  requiredRevenue: number;
  shareConfig: RevenueShareConfig;
  courseCommissions?: CourseCommissionInputs;
  genderCounts?: GenderCountConfig;
  opsViewEnabled?: boolean;
}

const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

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

  const positionRows: PositionRow[] = useMemo(() => {
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
        if (!pos) return b as PositionRow;

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

  const courseRows: CourseRow[] = useMemo(
    () =>
      (result?.courseBreakdown || []).map((c) => ({
        positionId: `course-${c.courseName}`,
        title: c.courseName || '未命名',
        headcount: c.headcount,
        classMode: c.mode,
        classValue: c.value,
        classCommission: c.commission,
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

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <RevenueSliderHeader />

      <div className="p-5">
        <RevenueSliderInput
          revenue={revenue}
          maxRevenue={maxRevenue}
          step={step}
          requiredRevenue={requiredRevenue}
          onChange={setRevenue}
        />

        <ResultCardsGrid
          revenue={revenue}
          totalBase={totalBase}
          totalPositionCommission={totalPositionCommission}
          totalClassCommission={totalClassCommission}
          profit={profit}
          isProfit={isProfit}
        />

        <CommissionRatioCards
          totalCommission={totalCommission}
          totalPositionCommission={totalPositionCommission}
          totalClassCommission={totalClassCommission}
        />

        <BreakdownTable
          positionRows={positionRows}
          courseRows={courseRows}
          positions={positions}
          revenue={revenue}
          totalBase={totalBase}
          totalPositionCommission={totalPositionCommission}
          totalClassCommission={totalClassCommission}
          totalCommission={totalCommission}
          expandedKeys={expandedKeys}
          onToggleExpand={toggleExpand}
        />

        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed flex items-center gap-1">
          <PiggyBank className="w-3 h-3" />
          利润 = 总业绩 − 总底薪 − 总佣金 − 固定成本（
          {formatMoney(fixedCost)}）
        </p>
      </div>
    </div>
  );
};

export default RevenueSliderPanel;