import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getStatusDisplay } from '../utils/statusLabel';
import {
  getOperationLabel,
  fmtOperationTime,
} from '../utils/operationLabel';
import type {
  DingTalkOperationRecord,
  DingTalkApprover,
} from '../../../api/dingtalk';

interface Props {
  status: string | undefined | null;
  result: string | undefined | null;
  operationRecords?: DingTalkOperationRecord[];
  originatorName?: string;
  pendingApprovers?: DingTalkApprover[];
}

export const StatusBadge: React.FC<Props> = ({
  status,
  result,
  operationRecords,
  originatorName,
  pendingApprovers,
}) => {
  const s = getStatusDisplay(status, result);
  const isCompleted = String(status || '').toUpperCase() === 'COMPLETED';

  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const wrapRef = useRef<HTMLSpanElement>(null);

  if (isCompleted) {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${s.className}`}
      >
        {s.label}
      </span>
    );
  }

  const hasRecords =
    Array.isArray(operationRecords) && operationRecords.length > 0;
  const hasPending =
    Array.isArray(pendingApprovers) && pendingApprovers.length > 0;

  const handleEnter = () => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 300;
    const viewportWidth = window.innerWidth;
    const half = tooltipWidth / 2;

    let left = rect.left + rect.width / 2;
    if (left - half < 8) left = half + 8;
    if (left + half > viewportWidth - 8) left = viewportWidth - half - 8;

    setPos({ top: rect.bottom + 6, left });
    setHovered(true);
  };

  const handleLeave = () => {
    setHovered(false);
  };

  const tooltip = hovered
    ? createPortal(
        <div
          className="dt-status-tooltip-fixed"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 300,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* ⭐ 当前待办人 */}
          {hasPending && (
            <div className="dt-status-pending">
              <span className="dt-status-pending-label">当前待审</span>
              {pendingApprovers!
                .map((p) => p.userName || p.userId || '—')
                .join('、')}
            </div>
          )}

          <div className="dt-status-tooltip-title">审批流程节点</div>

          {!hasRecords ? (
            <div className="dt-status-tooltip-empty">暂无节点信息</div>
          ) : (
            <div className="dt-status-tooltip-list">
              {operationRecords!.map((rec, i) => (
                <div key={i} className="dt-status-tooltip-item">
                  <span
                    className={`dt-status-tooltip-dot ${
                      rec.result === 'agree'
                        ? 'dt-dot-agree'
                        : rec.result === 'refuse'
                        ? 'dt-dot-refuse'
                        : 'dt-dot-default'
                    }`}
                  />
                  <div className="dt-status-tooltip-body">
                    <div className="dt-status-tooltip-row">
                      <span className="dt-status-tooltip-user">
                        {rec.userName || rec.userId || originatorName || '—'}
                      </span>
                      <span className="dt-status-tooltip-time">
                        {fmtOperationTime(rec.date)}
                      </span>
                    </div>
                    <div className="dt-status-tooltip-action">
                      {getOperationLabel(rec.type, rec.result)}
                      {rec.remark ? `：${rec.remark}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span
        ref={wrapRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap cursor-help ${s.className}`}
      >
        {s.label}
      </span>
      {tooltip}
    </>
  );
};

export default StatusBadge;