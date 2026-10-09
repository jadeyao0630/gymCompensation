import React from 'react';
import {
  Trash2,
  Users,
  Wallet,
  StickyNote,
  Target,
} from 'lucide-react';
import type {
  PositionConfig,
  CommissionTier,
  BaseSalaryTier,
} from '../../../types/compensation';

interface Props {
  position: PositionConfig;
  allPositions: PositionConfig[];
  readOnly: boolean;
  canEditTarget: boolean;
  canEditHeadcount: boolean;
  canDelete: boolean;
  canRename: boolean;
  autoTotalBase: number;
  resolvedTarget: number;
  isLocked: boolean;
  isManager: boolean;
  isStore: boolean;
  isOps: boolean;
  onUpdate: (u: Partial<PositionConfig>) => void;
  onRemove: () => void;
}

export const PositionHeaderBar: React.FC<Props> = ({
  position,
  readOnly,
  canEditTarget,
  canEditHeadcount,
  canDelete,
  canRename,
  autoTotalBase,
  resolvedTarget,
  isLocked,
  isManager,
  isStore,
  isOps,
  onUpdate,
  onRemove,
}) => {
  const headcountDisabled = readOnly || !canEditHeadcount;
  const deleteDisabled = readOnly || !canDelete;
  const renameDisabled = readOnly || !canRename;

  return (
    <div className="relative px-5 py-4 bg-gradient-to-r from-gray-50/80 via-white to-white border-b border-gray-100">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
          <input
            value={position.title}
            disabled={renameDisabled}
            onChange={(e) => onUpdate({ title: e.target.value })}
            title={!canRename ? '无权限：职位名称更改' : undefined}
            className={`border rounded-lg px-2.5 py-1.5 text-sm font-bold w-36 focus:outline-none focus:ring-2 transition ${
              renameDisabled
                ? 'border-transparent bg-gray-50 text-gray-600 cursor-not-allowed'
                : 'border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white text-gray-900 focus:ring-blue-400/30'
            }`}
          />
        </div>

        <div
          className={`flex items-center gap-1.5 text-sm border rounded-lg px-2.5 py-1.5 transition ${
            headcountDisabled
              ? 'bg-gray-100/80 border-gray-200'
              : 'bg-gray-50/80 border-gray-100 hover:border-gray-200'
          }`}
          title={!canEditHeadcount ? '无权限：修改职位人数' : undefined}
        >
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-500 text-xs">人数</span>
          <input
            type="number"
            value={position.headcount}
            disabled={headcountDisabled}
            onChange={(e) =>
              onUpdate({ headcount: parseInt(e.target.value) || 0 })
            }
            className="w-14 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none tabular-nums disabled:cursor-not-allowed"
          />
        </div>

        <div
          className={`flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 transition ${
            isLocked
              ? 'bg-emerald-50/80 border border-emerald-200'
              : 'bg-emerald-50/70 border border-emerald-100 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/30'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-600 text-xs font-medium whitespace-nowrap">
            业绩目标
          </span>
          {isLocked ? (
            <span className="w-28 text-sm font-bold text-emerald-800 tabular-nums">
              ¥{resolvedTarget.toLocaleString()}
            </span>
          ) : (
            <>
              <input
                type="number"
                value={resolvedTarget}
                disabled={!canEditTarget}
                onChange={(e) =>
                  onUpdate({
                    performanceTarget: parseInt(e.target.value) || 0,
                  })
                }
                title={!canEditTarget ? '无权限：业绩目标设置' : undefined}
                className="w-24 text-sm font-semibold text-emerald-800 bg-transparent focus:outline-none tabular-nums disabled:cursor-not-allowed"
              />
              <span className="text-[11px] text-emerald-500">元</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-sm bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1.5">
          <Wallet className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-blue-600 text-xs font-medium">总底薪</span>
          <span className="text-sm font-bold text-blue-700 tabular-nums">
            ¥{autoTotalBase.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-sm bg-amber-50/70 border border-amber-100 rounded-lg px-2.5 py-1.5 hover:border-amber-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/30 transition">
          <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-600 text-xs font-medium whitespace-nowrap">
            备注
          </span>
          <input
            type="text"
            value={position.extraNote || ''}
            disabled={readOnly}
            onChange={(e) => onUpdate({ extraNote: e.target.value })}
            placeholder="如：店长兼任、上一休一…"
            className="w-40 text-xs text-amber-800 bg-transparent focus:outline-none placeholder:text-amber-300 disabled:cursor-not-allowed"
          />
          {!readOnly && position.extraNote && (
            <button
              onClick={() => onUpdate({ extraNote: '' })}
              className="text-amber-400 hover:text-amber-600 transition"
              title="清空备注"
            >
              ×
            </button>
          )}
        </div>

        {isManager && !isStore && !isOps && (
          <>
            <label
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                position.managerAggregateByDept
                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : 'bg-white text-gray-500 border-gray-200'
              } ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
              title={
                readOnly
                  ? '无权限：设置方案'
                  : '打开：该经理业绩及目标 = 本部门其他职位总和；关闭：用自己的值'
              }
            >
              <input
                type="checkbox"
                checked={position.managerAggregateByDept ?? false}
                disabled={readOnly}
                onChange={(e) =>
                  onUpdate({ managerAggregateByDept: e.target.checked })
                }
                className="accent-violet-600 disabled:cursor-not-allowed"
              />
              <span className="whitespace-nowrap">业绩=部门总和</span>
            </label>

            {position.managerAggregateByDept && (
              <label
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                  position.managerIncludeSelf
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-white text-gray-500 border-gray-200'
                } ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                title={
                  readOnly
                    ? '无权限：设置方案'
                    : '打开：业绩 = 本部门其他职位总和 + 自己的业绩'
                }
              >
                <input
                  type="checkbox"
                  checked={position.managerIncludeSelf ?? false}
                  disabled={readOnly}
                  onChange={(e) =>
                    onUpdate({ managerIncludeSelf: e.target.checked })
                  }
                  className="accent-violet-600 disabled:cursor-not-allowed"
                />
                <span className="whitespace-nowrap">含自己业绩</span>
              </label>
            )}
          </>
        )}

        <div className="flex-1" />

        {!readOnly && (
          <button
            onClick={onRemove}
            disabled={deleteDisabled}
            className={`p-2 rounded-xl transition ${
              deleteDisabled
                ? 'text-gray-300 cursor-not-allowed opacity-50'
                : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
            }`}
            title={!canDelete ? '无权限：删除职位' : '删除职位'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PositionHeaderBar;