import React, { useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import type { DingTalkReportItem } from '../../../api/dingtalk';

/* ============================================================
 * ⭐ 与后端一致的分类规则
 * ============================================================ */
const MEMBER_REFUND_TEMPLATE = '会员退费';

const PAYEE_CATEGORY_OVERRIDES: Array<{ payee: string; category: string }> = [
  { payee: '山东云优人力资源服务有限公司', category: '工资底薪佣金' },
];

const SUBJECT_RULES: Array<{ key: string; keywords: string[] }> = [
  { key: '物业费', keywords: ['物业费', '物业'] },
  { key: '水电费', keywords: ['电费', '水费', '水电'] },
  {
    key: '工资底薪佣金',
    keywords: ['工资', '底薪', '佣金', '提成', '薪酬', '薪金', '劳务', '派遣', '人力资源'],
  },
  { key: '修理', keywords: ['修理', '维修', '修缮', '保养', '配件更换', '更换', '安装', '装修'] },
  {
    key: '日常支出',
    keywords: [
      '办公', '办公用品', '日用', '清洁', '保洁', '耗材', '快递', '邮寄',
      '差旅', '交通', '通讯', '话费', '劳保', '低值易耗', '消耗',
      '采购', '购买', '宣传', '广告', '推广', '营销', '物料', '印刷',
    ],
  },
];

const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

function collectItemText(item: DingTalkReportItem): string {
  const parts: string[] = [];
  if (Array.isArray(item.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }
  const fv = item.formValues || {};
  const rawDetail = fv['明细列表'];
  if (typeof rawDetail === 'string' && rawDetail && rawDetail !== 'null') {
    try {
      const parsed = JSON.parse(rawDetail);
      if (Array.isArray(parsed)) {
        parsed.forEach((row: any) => {
          (row?.rowValue || []).forEach((f: any) => {
            const label = String(f?.label || '');
            if (label.includes('事项') || label.includes('内容') || label.includes('名称')) {
              if (f?.value != null && f.value !== 'null') {
                parts.push(String(f.value));
              }
            }
          });
        });
      }
    } catch { /* ignore */ }
  }
  if (item.title) parts.push(String(item.title));
  [
    '事项', '事项/明细', '报销事由', '费用类型', '明细',
    '备注', '事由', '用途', '摘要', '说明',
    '付款内容提要', '付款事由', '付款用途',
    '借款提要', '退卡原因',
  ].forEach((k) => {
    const v = fv[k];
    if (v == null || v === 'null' || v === '') return;
    if (typeof v === 'object') {
      try { parts.push(JSON.stringify(v)); } catch {}
    } else {
      parts.push(String(v));
    }
  });
  return parts.join(' ');
}

/** ⭐ 金额兜底：与后端 pickAmountSafe 保持一致 */
function pickAmount(item: DingTalkReportItem): number {
  const candidates = [
    '补退金额（元）', '补退金额', '退款金额（元）', '退款金额',
    '报销金额', '借款金额（元）', '借款金额',
    '本次申请支付金额（元）', '本次申请支付金额',
    '总价款（元）', '金额（元）', '金额',
  ];
  const fv = item.formValues || {};
  for (const k of candidates) {
    const v = fv[k];
    if (v != null && v !== 'null' && v !== '') {
      const n = Number(String(v).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(n) && n !== 0) return n;
    }
  }
  const n0 = Number(item.amount);
  if (Number.isFinite(n0) && n0 !== 0) return n0;
  return 0;
}

/** ⭐ 分类（退费优先） */
function classify(item: DingTalkReportItem): string {
  if (item.templateName === MEMBER_REFUND_TEMPLATE) return '退费';

  const payee = String(item.payeeAccount || '').trim();
  for (const rule of PAYEE_CATEGORY_OVERRIDES) {
    if (payee === rule.payee) return rule.category;
  }

  const text = collectItemText(item);
  if (text) {
    for (const rule of SUBJECT_RULES) {
      if (rule.keywords.some((k) => k && text.includes(k))) return rule.key;
    }
  }
  return item.templateName || '其它';
}

interface Slice {
  label: string;
  value: number;
  count: number;
  color: string;
}

interface Props {
  items: DingTalkReportItem[];
  storeLabel?: string;
  title?: string;
}

export const MonthlyDingTalkPie: React.FC<Props> = ({
  items,
  storeLabel,
  title = '钉钉流程分类占比',
}) => {
  const slices = useMemo<Slice[]>(() => {
    const map = new Map<string, { label: string; total: number; count: number }>();
    for (const r of items) {
      if (r.error) continue;
      const amount = pickAmount(r);
      const label = classify(r);

      if (!map.has(label)) {
        map.set(label, { label, total: 0, count: 0 });
      }
      const s = map.get(label)!;
      s.total += amount;
      s.count += 1;
    }

    /* ⭐ 不跳过金额为 0 的类别（保证笔数也能展示） */
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((s, i) => ({
        label: s.label,
        value: s.total,
        count: s.count,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
  }, [items]);

  const totalAmount = useMemo(
    () => slices.reduce((s, x) => s + x.value, 0),
    [slices]
  );
  const totalCount = useMemo(
    () => slices.reduce((s, x) => s + x.count, 0),
    [slices]
  );

  const size = 200;
  const radius = size / 2;
  const innerRadius = radius * 0.6;

  const arcPath = (
    startAngle: number,
    endAngle: number,
    rOuter: number,
    rInner: number
  ) => {
    const startOuter = {
      x: radius + rOuter * Math.cos(startAngle),
      y: radius + rOuter * Math.sin(startAngle),
    };
    const endOuter = {
      x: radius + rOuter * Math.cos(endAngle),
      y: radius + rOuter * Math.sin(endAngle),
    };
    const startInner = {
      x: radius + rInner * Math.cos(endAngle),
      y: radius + rInner * Math.sin(endAngle),
    };
    const endInner = {
      x: radius + rInner * Math.cos(startAngle),
      y: radius + rInner * Math.sin(startAngle),
    };
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
      'Z',
    ].join(' ');
  };

  let acc = -Math.PI / 2;
  const arcs = slices.map((s) => {
    const angle = totalAmount > 0 ? (s.value / totalAmount) * Math.PI * 2 : 0;
    const start = acc;
    const end = acc + angle;
    acc = end;
    return { slice: s, start, end };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-indigo-600" />
          {title}
          {storeLabel && (
            <span className="text-[11px] font-normal text-gray-400">
              · {storeLabel}
            </span>
          )}
        </h3>
        <span className="text-[11px] text-gray-400">
          共 {totalCount} 笔 ·{' '}
          <span className="font-semibold text-indigo-700 tabular-nums">
            ¥{Math.round(totalAmount).toLocaleString('zh-CN')}
          </span>
        </span>
      </div>

      {slices.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-10">
          当月无钉钉流程数据
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <svg width={size} height={size} className="shrink-0">
            {arcs.map(({ slice, start, end }, i) => (
              <path
                key={i}
                d={arcPath(start, end, radius - 2, innerRadius)}
                fill={slice.color}
                stroke="#fff"
                strokeWidth={2}
              >
                <title>
                  {slice.label} ¥{Math.round(slice.value).toLocaleString('zh-CN')}{' '}
                  ({((slice.value / (totalAmount || 1)) * 100).toFixed(1)}%)
                </title>
              </path>
            ))}
          </svg>

          <div className="flex-1 w-full space-y-1.5">
            {slices.map((s) => {
              const pct = totalAmount > 0 ? (s.value / totalAmount) * 100 : 0;
              return (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-gray-700 flex-1 truncate" title={s.label}>
                    {s.label}
                  </span>
                  <span className="text-gray-500 tabular-nums">
                    {s.count} 笔
                  </span>
                  <span className="text-gray-800 font-semibold tabular-nums w-24 text-right">
                    ¥{Math.round(s.value).toLocaleString('zh-CN')}
                  </span>
                  <span className="text-gray-400 tabular-nums w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyDingTalkPie;