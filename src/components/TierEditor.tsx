import React from 'react';
import { Plus, Trash2, Percent, Hash, Layers, Minus } from 'lucide-react';
import type {
  CommissionTier,
  BaseSalaryTier,
  ClassCommissionMode,
} from '../types/compensation';

type Mode = 'commission' | 'base';

interface TierEditorProps {
  mode: Mode;
  /** ⭐ 只读模式 */
  readOnly?: boolean;
  commissionTiers?: CommissionTier[];
  baseSalaryTiers?: BaseSalaryTier[];
  tiered?: boolean;
  onTieredChange?: (tiered: boolean) => void;
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
  const tiered = props.tiered !== false;

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

  const allList = isCommission
    ? props.commissionTiers || []
    : props.baseSalaryTiers || [];

  const list = tiered ? allList : allList.slice(0, 1);

  React.useEffect(() => {
    if (readOnly) return;
    if (!tiered && allList.length === 0) {
      if (isCommission) props.onAddCommission?.();
      else props.onAddBase?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiered, allList.length, readOnly]);

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

          {/* ⭐ 按阶梯/统一值切换：只读时隐藏 */}
          {!readOnly && (
            <button
              onClick={() => props.onTieredChange?.(!tiered)}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border transition ${
                tiered
                  ? 'bg-white/80 border-gray-200 text-gray-500 hover:border-gray-300'
                  : 'bg-amber-50 border-amber-200 text-amber-600 hover:border-amber-300'
              }`}
              title={
                tiered ? '当前按阶梯，点击切换为统一值' : '当前统一值，点击切换为阶梯'
              }
            >
              {tiered ? (
                <>
                  <Layers className="w-3 h-3" /> 按阶梯
                </>
              ) : (
                <>
                  <Minus className="w-3 h-3" /> 统一值
                </>
              )}
            </button>
          )}
        </div>

        {/* ⭐ 添加按钮：只读时隐藏 */}
        {tiered && !readOnly && (
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
          {!tiered && (
            <p className="text-[11px] text-amber-600 bg-amber-50/70 border border-amber-100 rounded-lg px-2.5 py-1">
              统一值模式：忽略业绩门槛，所有业绩都按这条计算
            </p>
          )}

          {isCommission
            ? (list as CommissionTier[]).map((t) => (
                <CommissionRow
                  key={t.id}
                  ring={theme.ring}
                  tier={t}
                  readOnly={readOnly}
                  showClass={!!showClass}
                  defaultClassMode={props.defaultClassMode || 'percent'}
                  showDelete={tiered}
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
                  showDelete={tiered}
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
  showDelete: boolean;
  onUpdate: (u: Partial<CommissionTier>) => void;
  onRemove: () => void;
}

const CommissionRow: React.FC<CommissionRowProps> = ({
  ring,
  tier,
  readOnly,
  showClass,
  defaultClassMode,
  showDelete,
  onUpdate,
  onRemove,
}) => {
  const mode: ClassCommissionMode = tier.classMode || defaultClassMode;

  const setMode = (m: ClassCommissionMode) => {
    if (readOnly) return;
    let nextValue = tier.classRate ?? 0;
    if (m === 'fixed' && mode === 'percent') nextValue = nextValue * 100;
    else if (m === 'percent' && mode === 'fixed') nextValue = nextValue / 100;
    onUpdate({ classMode: m, classRate: nextValue });
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
        step="0.1"
        value={(tier.rate * 100).toFixed(1)}
        disabled={readOnly}
        onChange={(e) =>
          onUpdate({ rate: (parseFloat(e.target.value) || 0) / 100 })
        }
        className={`w-14 text-xs bg-gray-50/80 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${ring} transition disabled:cursor-not-allowed`}
      />
      <span className="text-[11px] text-gray-400">%</span>

      {showClass && (
        <>
          <span className="text-[11px] text-sky-500 font-medium ml-1">课提</span>
          <input
            type="number"
            step={mode === 'percent' ? '0.1' : '1'}
            value={
              mode === 'percent'
                ? ((tier.classRate ?? 0) * 100).toFixed(1)
                : tier.classRate ?? 0
            }
            disabled={readOnly}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 0;
              onUpdate({
                classRate: mode === 'percent' ? v / 100 : v,
                classMode: mode,
              });
            }}
            className="w-16 text-xs bg-sky-50/60 border border-sky-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition disabled:cursor-not-allowed"
          />
          <div className="inline-flex p-0.5 bg-sky-50/70 rounded-lg border border-sky-100">
            <button
              onClick={() => setMode('percent')}
              disabled={readOnly}
              className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition disabled:cursor-not-allowed ${
                mode === 'percent'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-sky-600 hover:bg-sky-100'
              }`}
              title="按比例"
            >
              <Percent className="w-3 h-3" />
            </button>
            <button
              onClick={() => setMode('fixed')}
              disabled={readOnly}
              className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition disabled:cursor-not-allowed ${
                mode === 'fixed'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-sky-600 hover:bg-sky-100'
              }`}
              title="按固定值（元/节）"
            >
              <Hash className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[11px] text-sky-500">
            {mode === 'percent' ? '%' : '元/节'}
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
      {showDelete && !readOnly && (
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
  showDelete: boolean;
  onUpdate: (u: Partial<BaseSalaryTier>) => void;
  onRemove: () => void;
}

const BaseRow: React.FC<BaseRowProps> = ({
  ring,
  tier,
  readOnly,
  showDelete,
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
    {showDelete && !readOnly && (
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