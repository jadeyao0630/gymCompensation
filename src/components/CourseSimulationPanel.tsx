import React, { useMemo } from 'react';
import { BookOpen, Coins, Users, Percent, Hash, TrendingUp } from 'lucide-react';
import type {
  CourseCommissionInput,
  CourseCommissionInputs,
  PositionConfig,
} from '../types/compensation';
import { getClassCommission } from '../utils/salary';

interface CourseSimulationPanelProps {
  value: CourseCommissionInputs;
  onChange: (v: CourseCommissionInputs) => void;
  positions: PositionConfig[];
}

/** 默认课程 */
export function buildDefaultCourses(): CourseCommissionInputs {
  return {
    泳教课: {
      courseName: '泳教课',
      averagePrice: 300,
      classCount: 0,
      positionKeyword: '泳教',
    },
    私教课: {
      courseName: '私教课',
      averagePrice: 400,
      classCount: 0,
      positionKeyword: '私教',
    },
  };
}

/**
 * 找到该课程对应的职位（用于自动取 headcount 和课提）
 * - 泳教课 → 泳教（非经理）
 * - 私教课 → 私教
 */
function findCoursePosition(
  keyword: string,
  positions: PositionConfig[]
): PositionConfig | undefined {
  return positions.find(
    (p) =>
      p.title.includes(keyword) &&
      !p.title.includes('经理') &&
      p.title !== '泳教经理'
  );
}

const CourseSimulationPanel: React.FC<CourseSimulationPanelProps> = ({
  value,
  onChange,
  positions,
}) => {
  const courses = Object.values(value);

  const update = (courseName: string, u: Partial<CourseCommissionInput>) => {
    const cur = value[courseName];
    if (!cur) return;
    onChange({ ...value, [courseName]: { ...cur, ...u } });
  };

  /** 每门课程的完整计算 */
  const computed = useMemo(() => {
    return courses.map((c) => {
      const position = findCoursePosition(c.positionKeyword, positions);
      const headcount = position?.headcount ?? 0;

      // 从对应职位的当前业绩目标命中档里取课提
      const classInfo = position
        ? getClassCommission(position, positions)
        : { mode: 'percent' as const, value: 0 };

      const commission =
        classInfo.mode === 'percent'
          ? c.averagePrice * c.classCount * classInfo.value
          : c.classCount * classInfo.value;

      return {
        ...c,
        headcount,
        mode: classInfo.mode,
        rate: classInfo.value,
        commission,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, positions]);

  const totalCommission = computed.reduce((s, c) => s + c.commission, 0);
  const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b border-purple-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">课提测算</h3>
            <p className="text-[11px] text-gray-400">
              人数与课提自动从对应职位阶梯取
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm bg-white/70 border border-purple-100 rounded-lg px-2.5 py-1.5">
          <Coins className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-purple-600 text-xs font-medium">课提合计</span>
          <span className="text-sm font-bold text-purple-700 tabular-nums">
            {formatMoney(totalCommission)}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {computed.map((c) => (
          <div
            key={c.courseName}
            className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500" />
                <span className="text-sm font-semibold text-purple-900">
                  {c.courseName}
                </span>
              </div>
              <div className="text-xs text-purple-600">
                课提：
                <span className="font-bold tabular-nums ml-1">
                  {formatMoney(c.commission)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 均价 */}
              <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-100 px-2 py-1.5">
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  均价
                </span>
                <input
                  type="number"
                  value={c.averagePrice}
                  onChange={(e) =>
                    update(c.courseName, {
                      averagePrice: parseInt(e.target.value) || 0,
                    })
                  }
                  className="flex-1 text-xs font-semibold text-gray-800 text-right bg-transparent focus:outline-none tabular-nums w-16"
                />
                <span className="text-[10px] text-gray-400">元</span>
              </div>

              {/* 节数 */}
              <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-100 px-2 py-1.5">
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  节数
                </span>
                <input
                  type="number"
                  value={c.classCount}
                  onChange={(e) =>
                    update(c.courseName, {
                      classCount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="flex-1 text-xs font-semibold text-gray-800 text-right bg-transparent focus:outline-none tabular-nums w-16"
                />
                <span className="text-[10px] text-gray-400">节</span>
              </div>

              {/* 人数（只读） */}
              <div
                className="flex items-center gap-1.5 bg-gray-50 rounded-lg border border-gray-100 px-2 py-1.5"
                title="自动取对应职位人数"
              >
                <Users className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                  人数
                </span>
                <span className="flex-1 text-xs font-semibold text-gray-700 text-right tabular-nums">
                  {c.headcount}
                </span>
              </div>

              {/* 课提（只读） */}
              <div
                className="flex items-center gap-1.5 bg-purple-50/60 rounded-lg border border-purple-100 px-2 py-1.5"
                title="自动取对应职位佣金阶梯的课提"
              >
                {c.mode === 'percent' ? (
                  <Percent className="w-3 h-3 text-purple-500" />
                ) : (
                  <Hash className="w-3 h-3 text-purple-500" />
                )}
                <span className="text-[10px] text-purple-500 whitespace-nowrap">
                  课提
                </span>
                <span className="flex-1 text-xs font-semibold text-purple-700 text-right tabular-nums">
                  {c.mode === 'percent'
                    ? `${(c.rate * 100).toFixed(1)}%`
                    : `${c.rate} 元/节`}
                </span>
              </div>
            </div>

            {/* 计算明细 */}
            <div className="mt-2 text-[10px] text-purple-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {c.mode === 'percent'
                ? `${c.averagePrice} × ${c.classCount} × ${(c.rate * 100).toFixed(1)}% = ${formatMoney(c.commission)}`
                : `${c.classCount} 节 × ${c.rate} 元/节 = ${formatMoney(c.commission)}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseSimulationPanel;