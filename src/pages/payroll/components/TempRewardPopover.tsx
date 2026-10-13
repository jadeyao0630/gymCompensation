import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Gift,
  MinusCircle,
  X,
  Check,
  Trash2,
  Library,
  PenLine,
} from 'lucide-react';
import type {
  TempReward,
  RewardsCatalog,
  RewardDefinition,
} from '../../../types/compensation';

interface Props {
  staffId: string;
  staffName: string;
  current: TempReward[];
  catalog: RewardsCatalog;
  /** ⭐ 触发按钮 DOM（用于定位） */
  anchorEl?: HTMLElement | null;
  onSave: (next: TempReward[]) => void;
  onClose: () => void;
}

const makeId = () =>
  `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const PANEL_WIDTH = 520;
const GAP = 8;
const MARGIN = 12;

export const TempRewardPopover: React.FC<Props> = ({
  staffId,
  staffName,
  current,
  catalog,
  anchorEl,
  onSave,
  onClose,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<TempReward[]>(() =>
    current.map((r) => ({ ...r }))
  );
  const [showPicker, setShowPicker] = useState(false);

  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    maxHeight: number;
  }>({
    top: 0,
    left: 0,
    placement: 'bottom',
    maxHeight: 480,
  });

  const computePosition = () => {
    if (!anchorEl || !wrapRef.current) return;

    const rect = anchorEl.getBoundingClientRect();
    const panelRect = wrapRef.current.getBoundingClientRect();
    const panelH = panelRect.height || 400;

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - rect.bottom - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;
    const placement: 'top' | 'bottom' =
      spaceBelow >= Math.min(panelH, 300) || spaceBelow >= spaceAbove
        ? 'bottom'
        : 'top';

    const maxHeight =
      placement === 'bottom'
        ? Math.max(200, spaceBelow)
        : Math.max(200, spaceAbove);

    let left = rect.right - PANEL_WIDTH;
    if (left < MARGIN) left = MARGIN;
    if (left + PANEL_WIDTH > vw - MARGIN) {
      left = vw - PANEL_WIDTH - MARGIN;
    }

    const top =
      placement === 'bottom'
        ? rect.bottom + GAP
        : Math.max(MARGIN, rect.top - GAP - Math.min(panelH, maxHeight));

    setPos({ top, left, placement, maxHeight });
  };

  useLayoutEffect(() => {
    computePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, list.length, showPicker]);

  useEffect(() => {
    const onScrollOrResize = () => computePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  useEffect(() => {
    setList(current.map((r) => ({ ...r })));
  }, [current, staffId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current && wrapRef.current.contains(target)) return;
      if (anchorEl && anchorEl.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, anchorEl]);

  const addFromCatalog = (def: RewardDefinition) => {
    const isDeduction = def.type === 'deduction';
    const signedAmount = isDeduction
      ? -Math.abs(def.amount || 0)
      : Math.abs(def.amount || 0);
    setList((prev) => [
      ...prev,
      {
        id: makeId(),
        rewardId: def.id,
        name: def.name,
        amount: signedAmount,
        note: def.note,
      },
    ]);
    setShowPicker(false);
  };

  const addCustom = (type: 'reward' | 'deduction') => {
    setList((prev) => [
      ...prev,
      {
        id: makeId(),
        name: type === 'deduction' ? '临时扣款' : '临时奖励',
        amount: 0,
        type,
      },
    ]);
  };

  const update = (idx: number, patch: Partial<TempReward>) => {
    setList((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const remove = (idx: number) => {
    setList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave(
      list.filter((r) => {
        if (r.rewardId) return true;
        return !!r.name.trim();
      })
    );
    onClose();
  };

  const rows = useMemo(() => {
    return list.map((r) => {
      const catalogDef = r.rewardId
        ? catalog.find((c) => c.id === r.rewardId)
        : undefined;
      const isCatalog = !!r.rewardId;
      const isDeduction = r.amount < 0;
      return { r, catalogDef, isCatalog, isDeduction };
    });
  }, [list, catalog]);

  const content = (
    <div
      ref={wrapRef}
      className="fixed z-[120] bg-white rounded-2xl border border-gray-200 shadow-2xl p-3 overflow-y-auto"
      style={{
        top: pos.top,
        left: pos.left,
        width: PANEL_WIDTH,
        maxHeight: pos.maxHeight,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-gray-800 truncate">
          {staffName} · 临时奖金 / 扣款
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">暂无条目，点击下方按钮添加</p>
      ) : (
        <div className="space-y-1.5 mb-2">
          {rows.map(({ r, isCatalog, isDeduction }, idx) => (
            <div
              key={r.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${
                isDeduction
                  ? 'bg-rose-50/40 border-rose-100'
                  : 'bg-amber-50/30 border-amber-100'
              }`}
            >
              {isCatalog ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-1 text-[10px] rounded border bg-white text-indigo-700 border-indigo-200 shrink-0">
                  <Library className="w-3 h-3" /> 库
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-1 text-[10px] rounded border bg-white text-gray-600 border-gray-200 shrink-0">
                  <PenLine className="w-3 h-3" /> 自定义
                </span>
              )}

              {!isCatalog && (
                <select
                  value={isDeduction ? 'deduction' : 'reward'}
                  onChange={(e) => {
                    const v = e.target.value as 'reward' | 'deduction';
                    const abs = Math.abs(r.amount);
                    update(idx, {
                      type: v,
                      amount: v === 'deduction' ? -abs : abs,
                    });
                  }}
                  className={`border rounded px-1.5 py-1 text-xs focus:outline-none ${
                    isDeduction
                      ? 'border-rose-200 text-rose-700'
                      : 'border-amber-200 text-amber-700'
                  }`}
                >
                  <option value="reward">奖励</option>
                  <option value="deduction">扣款</option>
                </select>
              )}

              {isCatalog ? (
                <span className="text-xs text-gray-700 w-24 truncate" title={r.name}>
                  {r.name}
                </span>
              ) : (
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  placeholder="名称"
                  className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none w-24"
                />
              )}

              <div
                className={`flex items-center gap-1 border rounded px-1.5 py-1 bg-white ${
                  isDeduction ? 'border-rose-200' : 'border-gray-200'
                }`}
              >
                <span
                  className={`text-[10px] ${
                    isDeduction ? 'text-rose-500' : 'text-gray-500'
                  }`}
                >
                  {isDeduction ? '-¥' : '¥'}
                </span>
                <input
                  type="number"
                  value={Math.abs(r.amount)}
                  onChange={(e) => {
                    const abs = Math.abs(parseInt(e.target.value) || 0);
                    update(idx, {
                      amount: isDeduction ? -abs : abs,
                    });
                  }}
                  className="w-16 text-xs font-semibold bg-transparent focus:outline-none tabular-nums"
                />
              </div>

              <input
                type="text"
                value={r.note ?? ''}
                onChange={(e) => update(idx, { note: e.target.value })}
                placeholder="备注"
                className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none flex-1 min-w-0"
              />

              <button
                onClick={() => remove(idx)}
                className="p-0.5 text-gray-400 hover:text-red-500 shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <div className="mb-2 border border-indigo-100 rounded-xl bg-indigo-50/40 p-2 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between px-1 pb-1 mb-1 border-b border-indigo-100">
            <span className="text-[11px] font-medium text-indigo-700">
              从奖罚库选一条
            </span>
            <button
              onClick={() => setShowPicker(false)}
              className="text-[11px] text-gray-400 hover:text-gray-600"
            >
              取消
            </button>
          </div>

          {catalog.length === 0 ? (
            <div className="text-xs text-gray-400 py-3 text-center">
              奖罚库暂无条目，请到「薪酬配置 → 奖罚库」添加
            </div>
          ) : (
            <div className="space-y-0.5">
              {catalog.map((def) => {
                const isDeduction = def.type === 'deduction';
                const alreadyUsed = list.some((r) => r.rewardId === def.id);
                return (
                  <button
                    key={def.id}
                    type="button"
                    disabled={alreadyUsed}
                    onClick={() => addFromCatalog(def)}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition ${
                      alreadyUsed
                        ? 'opacity-40 cursor-not-allowed'
                        : isDeduction
                        ? 'hover:bg-rose-50'
                        : 'hover:bg-amber-50'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold ${
                        isDeduction
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isDeduction ? '−' : '+'}
                    </span>
                    <span className="flex-1 truncate text-gray-700">
                      {def.name}
                    </span>
                    <span
                      className={`tabular-nums font-medium ${
                        isDeduction ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    >
                      {isDeduction ? '-' : '+'}¥{Math.abs(def.amount)}
                    </span>
                    {alreadyUsed && (
                      <span className="text-[9px] text-gray-400">已选</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium ${
              showPicker
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
            }`}
          >
            <Library className="w-3 h-3" /> 从奖罚库
          </button>
          <button
            onClick={() => addCustom('reward')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 font-medium"
          >
            <Gift className="w-3 h-3" /> + 奖励
          </button>
          <button
            onClick={() => addCustom('deduction')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 font-medium"
          >
            <MinusCircle className="w-3 h-3" /> + 扣款
          </button>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
        >
          <Check className="w-3 h-3" /> 保存并重算
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default TempRewardPopover;