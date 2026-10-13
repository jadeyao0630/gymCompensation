import React, { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Users,
  Building2,
  UserX,
  GitBranch,
  Store,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Receipt,
  Calculator,
} from 'lucide-react';
import { Row } from './MonthlyCommon';
import type { FixedCostDetail } from '../hooks/useMonthlyReport';
import type { OverallSummary } from '../../marketing/utils/aggregate';
import type { DingTalkReportItem } from '../../../api/dingtalk';
import { getStoreFromPaymentUnit } from '../../dingtalk/utils/constants';
import { extractAmount, extractItems } from '../../dingtalk/utils/extract';
import { classifyDingtalkItems } from '../../dingtalk/utils/classify';
import { MonthlyDingTalkPie } from './MonthlyDingTalkPie';
import { fmtMoney } from '../utils/date';

/* 分类：复用公共函数 */
function resolveCategory(item: DingTalkReportItem): string {
  const pieces = classifyDingtalkItems(item, (r) => {
    const n = Number(
      extractAmount((r as any).templateName || '', (r as any).formValues || {}) || 0
    );
    return n;
  });
  return pieces[0]?.category || '其它';
}

const STATUS_LABEL: Record<string, string> = {
  RUNNING: '审批中',
  COMPLETED: '已完成',
  CANCELED: '已撤销',
  CANCELLED: '已撤销',
  TERMINATED: '已终止',
};

function statusText(item: DingTalkReportItem): string {
  const s = String(item.status || '').toUpperCase();
  if (s === 'COMPLETED') {
    const r = String(item.result || '').toLowerCase();
    if (r === 'refuse' || r === 'reject') return '已拒绝';
    if (r === 'agree' || r === 'approved') return '已通过';
    return '已完成';
  }
  return STATUS_LABEL[s] || s || '—';
}

function statusClass(item: DingTalkReportItem): string {
  const s = String(item.status || '').toUpperCase();
  if (s === 'COMPLETED') {
    const r = String(item.result || '').toLowerCase();
    if (r === 'refuse' || r === 'reject') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (s === 'RUNNING') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

/* FixedCostRow */
const FixedCostRow: React.FC<{
  label: string;
  estimated: number;
  dingtalk?: number;
  dingtalkCount?: number;
}> = ({ label, estimated, dingtalk = 0, dingtalkCount = 0 }) => {
  const hasDingtalk = dingtalk > 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-gray-800 font-medium">
          {fmtMoney(estimated)}
        </span>
        {hasDingtalk && (
          <span className="text-[11px] text-amber-700 tabular-nums">
            → 钉钉 {fmtMoney(dingtalk)}
            <span className="text-gray-400 ml-0.5">（{dingtalkCount} 项）</span>
          </span>
        )}
      </div>
    </div>
  );
};

interface DingtalkBreakdown {
  salary: { count: number; total: number };
  property: { count: number; total: number };
  electric: { count: number; total: number };
  water: { count: number; total: number };
  repair: { count: number; total: number };
  daily: { count: number; total: number };
  refund: { count: number; total: number };
  other: { count: number; total: number };
  total: number;
  extraExpense: number;
  categories: Array<{ category: string; count: number; total: number }>;
}

interface Props {
  marketing: OverallSummary & {
    cardAmount: number;
    incomeAmount: number;
    prePayment: number;
  };
  orderCount: number;
  payrollSummary: {
    headcount: number;
    baseSalary: number;
    salesCommission: number;
    classCommission: number;
    absentDeduction: number;
    rewardsTotal?: number;
    total: number;
  };
  fixedCost: number;
  fixedCostDetail: FixedCostDetail;
  dingtalkItems?: DingTalkReportItem[];
  dingtalkSummary?: { count: number; total: number };
  dingtalkBreakdown?: DingtalkBreakdown;
  adjustedPayroll?: number;
  adjustedFixedCost?: number;
  actualExpense?: number;
  estimatedExpense?: number;
  storeLabel?: string;
}

export const MonthlyDetailPanels: React.FC<Props> = ({
  marketing,
  orderCount,
  payrollSummary,
  fixedCost,
  fixedCostDetail,
  dingtalkItems = [],
  dingtalkBreakdown,
  actualExpense,
  estimatedExpense,
  storeLabel,
}) => {
  const rewardsTotal = payrollSummary.rewardsTotal ?? 0;
  const hasRewards = Math.abs(rewardsTotal) > 0;

  const storeFilteredItems = useMemo(() => dingtalkItems, [dingtalkItems]);
  const dtCount = storeFilteredItems.length;
  const dtTotal = useMemo(
    () =>
      storeFilteredItems.reduce(
        (s, r) =>
          s + (extractAmount(r.templateName || '', r.formValues || {}) || 0),
        0
      ),
    [storeFilteredItems]
  );

  const [detailOpen, setDetailOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapsed = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const hasDingtalk = storeFilteredItems.length > 0;

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { category: string; count: number; total: number; items: DingTalkReportItem[] }
    >();
    for (const r of storeFilteredItems) {
      if (r.error) continue;
      const category = resolveCategory(r);
      const amount = Number(
        extractAmount(r.templateName || '', r.formValues || {}) || 0
      );
      if (!map.has(category)) {
        map.set(category, { category, count: 0, total: 0, items: [] });
      }
      const g = map.get(category)!;
      g.count += 1;
      g.total += amount;
      g.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [storeFilteredItems]);

  const dtSalary = dingtalkBreakdown?.salary.total || 0;
  const dtProperty = dingtalkBreakdown?.property.total || 0;
  const dtElectric = dingtalkBreakdown?.electric.total || 0;
  const dtWater = dingtalkBreakdown?.water.total || 0;
  const dtRepair = dingtalkBreakdown?.repair.total || 0;
  const dtDaily = dingtalkBreakdown?.daily.total || 0;
  const dtRefund = dingtalkBreakdown?.refund.total || 0;
  const dtOther = dingtalkBreakdown?.other.total || 0;
  const dtTotalExpense = dingtalkBreakdown?.total || 0;
  const dtExtra = dingtalkBreakdown?.extraExpense || 0;

  const finalEstimatedExpense =
    estimatedExpense ?? payrollSummary.total + fixedCost;
  const finalActualExpense = actualExpense ?? dtExtra;
  const finalActualTotal = finalEstimatedExpense + finalActualExpense;

  return (
    <>
      {/* 三栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 收入 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-emerald-50/50">
            <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <BadgeDollarSign className="w-4 h-4" />
              收入明细
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <Row label="营销实收" value={marketing.incomeAmount} color="text-emerald-700" bold />
            <Row label="卡金额合计" value={marketing.cardAmount} />
            <Row label="押金支付" value={marketing.prePayment} color="text-rose-600" />
            <Row label="订单数" value={`${orderCount} 笔`} isMoney={false} />
            <div className="pt-3 border-t border-gray-100">
              <Row label="收入合计" value={marketing.incomeAmount} color="text-emerald-700" bold big />
            </div>
          </div>
        </div>

        {/* 薪酬 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-blue-50/50">
            <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Users className="w-4 h-4" />
              薪酬佣金明细
              <span className="ml-auto text-[10px] font-normal text-gray-400 flex items-center gap-1">
                <UserX className="w-3 h-3" />
                已排除未计入
              </span>
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <Row label="计入人数" value={`${payrollSummary.headcount} 人`} isMoney={false} />
            <Row label="底薪合计" value={payrollSummary.baseSalary} />
            <Row label="销提合计" value={payrollSummary.salesCommission} />
            <Row label="课提合计" value={payrollSummary.classCommission} />
            {hasRewards && (
              <Row
                label="奖金 / 扣款"
                value={rewardsTotal}
                color={rewardsTotal < 0 ? 'text-rose-600' : 'text-amber-600'}
              />
            )}
            <Row label="缺勤扣款" value={-payrollSummary.absentDeduction} color="text-red-600" />
            <div className="pt-3 border-t border-gray-100">
              <Row label="薪酬合计（预估）" value={payrollSummary.total} color="text-blue-700" bold big />
            </div>
            {dtSalary > 0 && (
              <div className="pt-3 border-t border-dashed border-gray-100">
                <Row
                  label={`钉钉实发工资（${dingtalkBreakdown!.salary.count} 项）`}
                  value={dtSalary}
                  color="text-amber-700"
                  bold
                />
              </div>
            )}
          </div>
        </div>

        {/* 固定成本 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-amber-50/50">
            <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              固定成本明细
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <FixedCostRow
              label="物业费"
              estimated={fixedCostDetail.propertyFee}
              dingtalk={dtProperty}
              dingtalkCount={dingtalkBreakdown?.property.count || 0}
            />
            <FixedCostRow
              label="电费"
              estimated={fixedCostDetail.electricityFee}
              dingtalk={dtElectric}
              dingtalkCount={dingtalkBreakdown?.electric.count || 0}
            />
            <FixedCostRow
              label="水费"
              estimated={fixedCostDetail.waterFee}
              dingtalk={dtWater}
              dingtalkCount={dingtalkBreakdown?.water.count || 0}
            />
            <FixedCostRow label="租金" estimated={fixedCostDetail.rent} />
            <FixedCostRow label="网络费" estimated={fixedCostDetail.networkFee} />
            <FixedCostRow label="其他杂项" estimated={fixedCostDetail.otherFee} />

            <div className="pt-3 border-t border-gray-100">
              <Row
                label="固定成本合计（预估）"
                value={fixedCost}
                color="text-amber-700"
                bold
                big
              />
            </div>

            {(dtProperty > 0 || dtElectric > 0 || dtWater > 0) && (
              <div className="pt-3 border-t border-dashed border-gray-100 space-y-2">
                <div className="text-[11px] text-gray-400">钉钉实际支出对比</div>
                {dtProperty > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      物业费（钉钉实付，{dingtalkBreakdown!.property.count} 项）
                    </span>
                    <span className="tabular-nums text-amber-700 font-semibold">
                      {fmtMoney(dtProperty)}
                    </span>
                  </div>
                )}
                {dtElectric > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      电费（钉钉实付，{dingtalkBreakdown!.electric.count} 项）
                    </span>
                    <span className="tabular-nums text-amber-700 font-semibold">
                      {fmtMoney(dtElectric)}
                    </span>
                  </div>
                )}
                {dtWater > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      水费（钉钉实付，{dingtalkBreakdown!.water.count} 项）
                    </span>
                    <span className="tabular-nums text-amber-700 font-semibold">
                      {fmtMoney(dtWater)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-dashed border-gray-100">
                  <span className="text-gray-600">物业 + 水电预估合计</span>
                  <span className="tabular-nums text-gray-600">
                    {fmtMoney(
                      fixedCostDetail.propertyFee +
                        fixedCostDetail.electricityFee +
                        fixedCostDetail.waterFee
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">物业 + 水电钉钉合计</span>
                  <span className="tabular-nums text-amber-700 font-semibold">
                    {fmtMoney(dtProperty + dtElectric + dtWater)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">差额（钉钉 - 预估）</span>
                  <span
                    className={`tabular-nums font-semibold ${
                      dtProperty + dtElectric + dtWater -
                        (fixedCostDetail.propertyFee +
                          fixedCostDetail.electricityFee +
                          fixedCostDetail.waterFee) >=
                      0
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {(() => {
                      const diff =
                        dtProperty +
                        dtElectric +
                        dtWater -
                        (fixedCostDetail.propertyFee +
                          fixedCostDetail.electricityFee +
                          fixedCostDetail.waterFee);
                      return `${diff >= 0 ? '+' : ''}${fmtMoney(diff)}`;
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 支出构成一览 */}
      {dingtalkBreakdown && dtTotalExpense > 0 && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-purple-50/60">
            <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              支出构成一览
              <span className="text-[10px] font-normal text-gray-500">
                （钉钉实际支出只算排除薪酬/物业/水电后的新增）
              </span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">支出项</th>
                  <th className="px-4 py-2 text-right font-medium">预估（payroll/fixedCost）</th>
                  <th className="px-4 py-2 text-right font-medium">钉钉实际</th>
                  <th className="px-4 py-2 text-left font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 text-gray-700">工资底薪佣金</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {fmtMoney(payrollSummary.total)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {dtSalary > 0 ? fmtMoney(dtSalary) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {dtSalary > 0 ? '与预估并列，不重复计入' : '无钉钉记录'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-700">物业费</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {fmtMoney(fixedCostDetail.propertyFee)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {dtProperty > 0 ? fmtMoney(dtProperty) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {dtProperty > 0 ? '与预估并列，不重复计入' : '无钉钉记录'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-700">电费</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {fmtMoney(fixedCostDetail.electricityFee)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {dtElectric > 0 ? fmtMoney(dtElectric) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {dtElectric > 0 ? '与预估并列，不重复计入' : '无钉钉记录'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-700">水费</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {fmtMoney(fixedCostDetail.waterFee)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {dtWater > 0 ? fmtMoney(dtWater) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {dtWater > 0 ? '与预估并列，不重复计入' : '无钉钉记录'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-700">租金 / 网络 / 其它</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {fmtMoney(
                      fixedCostDetail.rent +
                        fixedCostDetail.networkFee +
                        fixedCostDetail.otherFee
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400">—</td>
                  <td className="px-4 py-2 text-gray-500">fixedCost 预估</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-gray-700">钉钉新增支出</td>
                  <td className="px-4 py-2 text-right text-gray-400">—</td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {fmtMoney(dtExtra)}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    退费 / 修理 / 日常支出 / 其它（计入实际支出）
                  </td>
                </tr>
                <tr className="bg-gray-50/70 font-semibold">
                  <td className="px-4 py-2 text-gray-800">合计</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                    {fmtMoney(finalEstimatedExpense)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {fmtMoney(dtExtra)}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    实际总支出 ={' '}
                    <span className="font-semibold text-purple-700">
                      {fmtMoney(finalActualTotal)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 钉钉实际支出明细（新增） */}
      {dingtalkBreakdown && dtExtra > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-gray-100 bg-rose-50/60">
            <h3 className="text-sm font-semibold text-rose-800 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              钉钉实际支出明细
              <span className="text-[10px] font-normal text-gray-500">
                （不含薪酬 / 物业 / 电费 / 水费，避免与预估重复）
              </span>
              <span className="ml-auto text-[11px] font-normal text-gray-500">
                合计{' '}
                <span className="font-semibold text-rose-700 tabular-nums">
                  ¥{Math.round(dtExtra).toLocaleString('zh-CN')}
                </span>
              </span>
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {dtRepair > 0 && (
              <Row
                label={`修理（${dingtalkBreakdown.repair.count} 项）`}
                value={dtRepair}
                color="text-rose-700"
              />
            )}
            {dtDaily > 0 && (
              <Row
                label={`日常支出（${dingtalkBreakdown.daily.count} 项）`}
                value={dtDaily}
                color="text-rose-700"
              />
            )}
            {dtRefund > 0 && (
              <Row
                label={`退费（${dingtalkBreakdown.refund.count} 项）`}
                value={dtRefund}
                color="text-rose-700"
              />
            )}
            {dtOther > 0 && (
              <Row
                label={`其它（${dingtalkBreakdown.other.count} 项）`}
                value={dtOther}
                color="text-rose-700"
              />
            )}
            <div className="pt-3 border-t border-gray-100">
              <Row
                label="钉钉实际支出合计"
                value={dtExtra}
                color="text-rose-700"
                bold
                big
              />
            </div>
          </div>
        </div>
      )}

      {/* 钉钉流程分类占比 + 明细 */}
      {hasDingtalk && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-gray-100 bg-indigo-50/50 flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              钉钉流程分类占比
            </h3>
            {storeLabel && (
              <span className="text-[11px] text-gray-400">· {storeLabel}</span>
            )}
            <span className="text-[11px] text-gray-500">
              共 <span className="font-semibold text-indigo-700">{dtCount}</span> 笔
              ·{' '}
              <span className="font-semibold text-emerald-700 tabular-nums">
                ¥{dtTotal.toLocaleString('zh-CN')}
              </span>
            </span>
            <span className="ml-auto text-[11px] text-gray-400">
              数据来源：钉钉流程缓存（不实时同步）
            </span>

            <button
              type="button"
              onClick={() => setDetailOpen((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 transition"
            >
              {detailOpen ? (
                <>
                  <ChevronUp className="w-3 h-3" /> 收起明细
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> 展开明细
                </>
              )}
            </button>
          </div>

          <div className="p-4">
            <MonthlyDingTalkPie
              items={storeFilteredItems}
              storeLabel={storeLabel}
              title="钉钉流程分类占比"
            />
          </div>

          {detailOpen && (
            <div className="border-t border-gray-100">
              {groups.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">无明细</div>
              ) : (
                groups.map((g) => {
                  const isCollapsed = collapsed.has(g.category);
                  return (
                    <div
                      key={g.category}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(g.category)}
                        className="w-full px-5 py-2.5 flex items-center gap-2 bg-gray-50/70 hover:bg-indigo-50/50 transition text-left"
                      >
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                            isCollapsed ? '' : 'rotate-90'
                          }`}
                        />
                        <span className="text-xs font-semibold text-indigo-800">
                          {g.category}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {g.count} 笔
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                          ¥{Math.round(g.total).toLocaleString('zh-CN')}
                        </span>
                        <span className="flex-1" />
                        <span className="text-[11px] text-gray-400">
                          {isCollapsed ? '点击展开' : '点击收起'}
                        </span>
                      </button>

                      {!isCollapsed && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-white text-gray-400">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">流程类型</th>
                                <th className="px-3 py-2 text-left font-medium">门店</th>
                                <th className="px-3 py-2 text-left font-medium">标题</th>
                                <th className="px-3 py-2 text-left font-medium">事项 / 明细</th>
                                <th className="px-3 py-2 text-right font-medium">金额</th>
                                <th className="px-3 py-2 text-left font-medium">收款账户</th>
                                <th className="px-3 py-2 text-left font-medium">状态</th>
                                <th className="px-3 py-2 text-left font-medium">创建时间</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {g.items.map((r, idx) => {
                                if (r.error) {
                                  return (
                                    <tr key={r.processInstanceId || `err-${idx}`}>
                                      <td
                                        colSpan={8}
                                        className="px-3 py-2 text-rose-600 text-[11px]"
                                      >
                                        ⚠️ 实例拉取失败：{r.error}
                                      </td>
                                    </tr>
                                  );
                                }
                                const amount = extractAmount(
                                  r.templateName || '',
                                  r.formValues || {}
                                );
                                const items = extractItems(
                                  r.templateName || '',
                                  r.formValues || {}
                                );
                                const storeName = getStoreFromPaymentUnit(r.paymentUnit);
                                return (
                                  <tr
                                    key={r.processInstanceId || `row-${idx}`}
                                    className="hover:bg-indigo-50/30"
                                  >
                                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                      {r.templateName || '—'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      {storeName ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                                          <Store className="w-3 h-3" />
                                          {storeName}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td
                                      className="px-3 py-2 text-gray-700 max-w-xs truncate"
                                      title={r.title || ''}
                                    >
                                      {r.title || '—'}
                                    </td>
                                    <td
                                      className="px-3 py-2 text-gray-600 max-w-md"
                                      title={items}
                                    >
                                      <span className="line-clamp-2">{items || '—'}</span>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                                      {amount != null
                                        ? `¥${Number(amount).toLocaleString('zh-CN')}`
                                        : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">
                                      {r.payeeAccount || '—'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusClass(
                                          r
                                        )}`}
                                      >
                                        {statusText(r)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                                      {r.createTime || '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default MonthlyDetailPanels;