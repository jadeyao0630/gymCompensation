import React from 'react';
import { Plus, Trash2, Percent, Hash } from 'lucide-react';
import type {
  CommissionTier,
  BaseSalaryTier,
  ClassCommissionMode,
} from '../types/compensation';

type Mode = 'commission' | 'base';

interface TierEditorProps {
  mode: Mode;
  readOnly?: boolean;
  commissionTiers?: CommissionTier[];
  baseSalaryTiers?: BaseSalaryTier[];
  onAddCommission?: () => void;
  onUpdateCommission?: (id: string, u: Partial<CommissionTier>) => void;
  onRemoveCommission?: (id: string) => void;
  onAddBase?: () => void;
  onUpdateBase?: (id: string, u: Partial<BaseSalaryTier>) => void;
  onRemoveBase?: (id: string) => void;
  showClassCommission?: boolean;
  defaultClassMode?: ClassCommissionMode;
}

const TierEditor: React.FC<TierEditorProps> = (props) => {
  const { mode, readOnly = false } = props;
  const isCommission = mode === 'commission';
  const showClass = isCommission && props.showClassCommission;

  const theme = isCommission
    ? {
        wrap: 'bg-gradient-to-br from-sky-50/70 to-blue-50/40 border-sky-100',
        title: 'text-sky-900',
        dot: 'bg-gradient-to-br from-sky-400 to-blue-500',
        btn: 'text-sky-600 hover:text-sky-800 hover:bg-sky-100/70',
        ring: 'focus:ring-sky-400/40 focus:border-sky-400',
        label: '佣金阶梯',
      }
    : {
        wrap:
          'bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-emerald-100',
        title: 'text-emerald-900',
        dot: 'bg-gradient-to-br from-emerald-400 to-teal-500',
        btn: 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/70',
        ring: 'focus:ring-emerald-400/40 focus:border-emerald-400',
        label: '底薪阶梯',
      };

  const list = isCommission
    ? props.commissionTiers || []
    : props.baseSalaryTiers || [];

  const onAdd = isCommission ? props.onAddCommission : props.onAddBase;

  return (
    <div className={`rounded-2xl border ${theme.wrap} p-4`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3
            className={`text-sm font-semibold ${theme.title} flex items-center gap-1.5`}
          >
            <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
            {theme.label}
            {showClass && (
              <span className="text-[10px] font-medium text-sky-500 bg-sky-100/70 px-1.5 py-0.5 rounded">
                含课提
              </span>
            )}
          </h3>
        </div>

        {!readOnly && (
          <button
            onClick={onAdd}
            className={`text-xs font-medium ${theme.btn} px-2.5 py-1 rounded-lg transition flex items-center gap-1`}
          >
            <Plus className="w-3.5 h-3.5" /> 添加
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-white/60 rounded-xl">
          <p className="text-xs text-gray-400">
            暂无{theme.label}
            {!readOnly && '，点击右上角添加'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {isCommission
            ? (list as CommissionTier[]).map((t) => (
                <CommissionRow
                  key={t.id}
                  ring={theme.ring}
                  tier={t}
                  readOnly={readOnly}
                  showClass={!!showClass}
                  defaultClassMode={props.defaultClassMode || 'percent'}
                  onUpdate={(u) => props.onUpdateCommission?.(t.id, u)}
                  onRemove={() => props.onRemoveCommission?.(t.id)}
                />
              ))
            : (list as BaseSalaryTier[]).map((t) => (
                <BaseRow
                  key={t.id}
                  ring={theme.ring}
                  tier={t}
                  readOnly={readOnly}
                  onUpdate={(u) => props.onUpdateBase?.(t.id, u)}
                  onRemove={() => props.onRemoveBase?.(t.id)}
                />
              ))}
        </div>
      )}
    </div>
  );
};

interface CommissionRowProps {
  ring: string;
  tier: CommissionTier;
  readOnly: boolean;
  showClass: boolean;
  defaultClassMode: ClassCommissionMode;
  onUpdate: (u: Partial<CommissionTier>) => void;
  onRemove: () => void;
}

const CommissionRow: React.FC<CommissionRowProps> = ({
  ring,
  tier,
  readOnly,
  showClass,
  defaultClassMode,
  onUpdate,
  onRemove,
}) => {
  const classMode: ClassCommissionMode = tier.classMode || defaultClassMode;
  const salesMode: ClassCommissionMode = tier.salesMode || 'percent';

  const setClassMode = (m: ClassCommissionMode) => {
    if (readOnly) return;
    let nextValue = tier.classRate ?? 0;
    if (m === 'fixed' && classMode === 'percent') nextValue = nextValue * 100;
    else if (m === 'percent' && classMode === 'fixed') nextValue = nextValue / 100;
    onUpdate({ classMode: m, classRate: nextValue });
  };

  const setSalesMode = (m: ClassCommissionMode) => {
    if (readOnly) return;
    let nextValue = tier.rate ?? 0;
    if (m === 'fixed' && salesMode === 'percent') nextValue = nextValue * 100;
    else if (m === 'percent' && salesMode === 'fixed') nextValue = nextValue / 100;
    onUpdate({ salesMode: m, rate: nextValue });
  };

  return (
    <div className="group flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur rounded-xl border border-white shadow-sm hover:shadow-md px-3 py-2 text-sm transition-all">
      <span className="text-[11px] text-gray-400 font-medium">业绩≥</span>
      <input
        type="number"
        value={tier.threshold}
        disabled={readOnly}
        onChange={(e) => onUpdate({ threshold: parseInt(e.target.value) || 0 })}
        className={`w-20 text-xs bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${ring} transition disabled:cursor-not-allowed`}
      />
      <span className="text-[11px] text-gray-400 font-medium">销提</span>

      <input
        type="number"
        step={salesMode === 'percent' ? '0.1' : '0.01'}
        value={
          salesMode === 'percent'
            ? (tier.rate * 100).toFixed(1)
            : tier.rate
        }
        disabled={readOnly}
        onChange={(e) => {
          const v = parseFloat(e.target.value) || 0;
          onUpdate({
            rate: salesMode === 'percent' ? v / 100 : v,
            salesMode,
          });
        }}
        className={`w-20 text-xs bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${ring} transition disabled:cursor-not-allowed`}
      />

      {/* 销提方式切换 */}
      <div className="inline-flex p-0.5 bg-gray-50/70 rounded-lg border border-gray-200">
        <button
          onClick={() => setSalesMode('percent')}
          disabled={readOnly}
          className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition disabled:cursor-not-allowed ${
            salesMode === 'percent'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-sky-600 hover:bg-sky-100'
          }`}
          title="按百分比"
        >
          <Percent className="w-3 h-3" />
        </button>
        <button
          onClick={() => setSalesMode('fixed')}
          disabled={readOnly}
          className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition disabled:cursor-not-allowed ${
            salesMode === 'fixed'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-sky-600 hover:bg-sky-100'
          }`}
          title="按固定金额（元/元）"
        >
          <Hash className="w-3 h-3" />
        </button>
      </div>
      <span className="text-[11px] text-sky-500">
        {salesMode === 'percent' ? '%' : '元/元'}
      </span>

      {showClass && (
        <>
          <span className="text-[11px] text-sky-500 font-medium ml-1">课提</span>
          <input
            type="number"
            step={classMode === 'percent' ? '0.1' : '1'}
            value={
              classMode === 'percent'
                ? ((tier.classRate ?? 0) * 100).toFixed(1)
                : tier.classRate ?? 0
            }
            disabled={readOnly}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 0;
              onUpdate({
                classRate: classMode === 'percent' ? v / 100 : v,
                classMode,
              });
            }}
            className="w-16 text-xs bg-sky-50/60 border border-sky-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition disabled:cursor-not-allowed"
          />
          <div className="inline-flex p-0.5 bg-sky-50/70 rounded-lg border border-sky-100">
            <button
              onClick={() => setClassMode('percent')}
              disabled={readOnly}
              className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition disabled:cursor-not-allowed ${
                classMode === 'percent'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-sky-600 hover:bg-sky-100'
              }`}
              title="按比例"
            >
              <Percent className="w-3 h-3" />
            </button>
            <button
              onClick={() => setClassMode('fixed')}
              disabled={readOnly}
              className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition disabled:cursor-not-allowed ${
                classMode === 'fixed'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-sky-600 hover:bg-sky-100'
              }`}
              title="按固定值（元/节）"
            >
              <Hash className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[11px] text-sky-500">
            {classMode === 'percent' ? '%' : '元/节'}
          </span>
        </>
      )}

      <input
        value={tier.note || ''}
        disabled={readOnly}
        onChange={(e) => onUpdate({ note: e.target.value })}
        placeholder="备注"
        className={`flex-1 min-w-[80px] text-xs bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${ring} transition placeholder:text-gray-300 disabled:cursor-not-allowed`}
      />
      {!readOnly && (
        <button
          onClick={onRemove}
          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

interface BaseRowProps {
  ring: string;
  tier: BaseSalaryTier;
  readOnly: boolean;
  onUpdate: (u: Partial<BaseSalaryTier>) => void;
  onRemove: () => void;
}

const BaseRow: React.FC<BaseRowProps> = ({
  ring,
  tier,
  readOnly,
  onUpdate,
  onRemove,
}) => (
  <div className="group flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur rounded-xl border border-white shadow-sm hover:shadow-md px-3 py-2 text-sm transition-all">
    <span className="text-[11px] text-gray-400 font-medium">业绩≥</span>
    <input
      type="number"
      value={tier.threshold}
      disabled={readOnly}
      onChange={(e) => onUpdate({ threshold: parseInt(e.target.value) || 0 })}
      className={`w-20 text-xs bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${ring} transition disabled:cursor-not-allowed`}
    />
    <span className="text-[11px] text-gray-400 font-medium">底薪</span>
    <input
      type="number"
      value={tier.amount}
      disabled={readOnly}
      onChange={(e) => onUpdate({ amount: parseInt(e.target.value) || 0 })}
      className={`w-20 text-xs bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${ring} transition disabled:cursor-not-allowed`}
    />
    <input
      value={tier.note || ''}
      disabled={readOnly}
      onChange={(e) => onUpdate({ note: e.target.value })}
      placeholder="备注"
      className={`flex-1 min-w-[80px] text-xs bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${ring} transition placeholder:text-gray-300 disabled:cursor-not-allowed`}
    />
    {!readOnly && (
      <button
        onClick={onRemove}
        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export default TierEditor;