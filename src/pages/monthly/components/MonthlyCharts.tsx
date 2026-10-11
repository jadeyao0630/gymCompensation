import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';

interface Props {
  payload: any;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
];

const fmtMoney = (v: number) =>
  '¥' + Math.round(v).toLocaleString('zh-CN');

/* ============================================================
 * ⭐ 合并小分类成「其他」，只保留 Top N
 * ============================================================ */
function compactPieData(
  map: Record<string, { count: number; total: number }>,
  topN = 6
) {
  const all = Object.entries(map || {})
    .map(([name, v]) => ({ name, value: v.total, count: v.count }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (all.length <= topN) return all;

  const top = all.slice(0, topN);
  const rest = all.slice(topN);
  const restTotal = rest.reduce((s, d) => s + d.value, 0);
  const restCount = rest.reduce((s, d) => s + d.count, 0);

  return [
    ...top,
    { name: '其他', value: restTotal, count: restCount },
  ];
}

/* ============================================================
 * 分类饼图组件
 * ============================================================ */
const CategoryPie: React.FC<{
  title: string;
  data: ReturnType<typeof compactPieData>;
}> = ({ title, data }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
        <div className="text-center text-gray-300 py-10 text-sm">无数据</div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="shrink-0" style={{ width: 240, height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any, _n: any, p: any) => [
                  fmtMoney(Number(v)) +
                    `（${((Number(v) / total) * 100).toFixed(1)}%）`,
                  p?.payload?.name || '',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 min-w-0">
          <div className="space-y-1.5">
            {data.map((d, i) => {
              const pct = total > 0 ? (d.value / total) * 100 : 0;
              return (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span
                    className="flex-1 min-w-0 truncate text-gray-700"
                    title={d.name}
                  >
                    {d.name}
                  </span>
                  <span className="tabular-nums text-gray-500 whitespace-nowrap">
                    {d.count} 笔
                  </span>
                  <span className="tabular-nums text-gray-700 font-medium whitespace-nowrap">
                    {fmtMoney(d.value)}
                  </span>
                  <span className="tabular-nums text-gray-400 w-12 text-right whitespace-nowrap">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * 主组件
 * ============================================================ */
export const MonthlyCharts: React.FC<Props> = ({ payload }) => {
  if (!payload) return null;

  const cardPie = compactPieData(
    payload.revenue?.cardSales?.byCategory || {},
    6
  );
  const coursePie = compactPieData(
    payload.revenue?.courseSales?.byCategory || {},
    6
  );

  const deptData = Object.entries(payload.payroll?.byDepartment || {}).map(
    ([dept, s]: any) => ({
      dept,
      baseSalary: s.baseSalary,
      salesCommission: s.salesCommission,
      classCommission: s.classCommission,
      rewardsTotal: s.rewardsTotal,
    })
  );

  /* ⭐ 销售 Top 10 */
  const salesTop = (payload.payroll?.individual?.salesTop || [])
    .slice(0, 10)
    .map((s: any) => ({
      name: s.staffName,
      sales: s.salesAmount,
      dept: s.department,
    }));

  /* ⭐ 消课 Top 10：同时带金额和课数 */
  const classTop = (payload.payroll?.individual?.classTop || [])
    .slice(0, 10)
    .map((s: any) => ({
      name: s.staffName,
      classAmount: s.classAmount,
      classCount: s.classCount,
      dept: s.department,
    }));

  return (
    <div className="space-y-6 mb-6">
      {/* 售卡 / 售课分类饼图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CategoryPie title="售卡分类占比" data={cardPie} />
        <CategoryPie title="售课分类占比" data={coursePie} />
      </div>

      {/* 部门薪酬柱状图 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          部门薪酬结构（底薪 / 销提 / 课提 / 奖金）
        </h3>
        {deptData.length === 0 ? (
          <div className="text-center text-gray-300 py-10 text-sm">无数据</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dept" />
              <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
              <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
              <Bar dataKey="baseSalary" name="底薪" stackId="a" fill="#3b82f6" />
              <Bar dataKey="salesCommission" name="销提" stackId="a" fill="#10b981" />
              <Bar dataKey="classCommission" name="课提" stackId="a" fill="#f59e0b" />
              <Bar dataKey="rewardsTotal" name="奖金" stackId="a" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 个人销售 Top 10 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          个人销售 Top 10（不含管理岗）
        </h3>
        {salesTop.length === 0 ? (
          <div className="text-center text-gray-300 py-10 text-sm">无数据</div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(320, salesTop.length * 40)}
          >
            <BarChart
              data={salesTop}
              layout="vertical"
              margin={{ top: 5, right: 90, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
              <Bar dataKey="sales" name="销售金额" fill="#10b981">
                <LabelList
                  dataKey="sales"
                  position="right"
                  formatter={(v: any) =>
                    '¥' + Math.round(Number(v)).toLocaleString()
                  }
                  style={{ fontSize: 11, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ⭐ 个人消课 Top 10：金额 + 课数 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          个人消课 Top 10（不含管理岗）
        </h3>
        {classTop.length === 0 ? (
          <div className="text-center text-gray-300 py-10 text-sm">无数据</div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(320, classTop.length * 40)}
          >
            <BarChart
              data={classTop}
              layout="vertical"
              margin={{ top: 5, right: 150, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(v: any, _n: any, p: any) => {
                  const d = p?.payload || {};
                  return [
                    `${fmtMoney(Number(v))}（${d.classCount || 0} 节）`,
                    '消课金额',
                  ];
                }}
              />
              <Bar dataKey="classAmount" name="消课金额" fill="#f59e0b">
                <LabelList
                  dataKey="classAmount"
                  position="right"
                  content={(props: any) => {
                    const { x, y, width, height, index } = props;
                    const d = classTop[index] || {};
                    const text = `${fmtMoney(
                      Number(d.classAmount)
                    )}（${d.classCount || 0}节）`;
                    return (
                      <text
                        x={Number(x) + Number(width) + 6}
                        y={Number(y) + Number(height) / 2 + 4}
                        fill="#374151"
                        fontSize={11}
                      >
                        {text}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default MonthlyCharts;