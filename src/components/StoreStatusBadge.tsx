import React from 'react';
import { Cloud, CloudOff, Loader2, CheckCircle2 } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface Props {
  dbOnline?: boolean;
  saveStatus?: SaveStatus;
  lastSavedAt?: Date | null;
  /** 样式：'solid' 浅色工具行用（默认）；'light' 深色头部用 */
  variant?: 'solid' | 'light';
  /** 是否显示"数据库"文字前缀 */
  showLabel?: boolean;
}

export const StoreStatusBadge: React.FC<Props> = ({
  dbOnline = true,
  saveStatus = 'idle',
  lastSavedAt = null,
  variant = 'solid',
  showLabel = true,
}) => {
  const renderContent = () => {
    if (!dbOnline) {
      return (
        <>
          <CloudOff className="w-3 h-3" />
          <span>{showLabel ? '离线模式' : '离线'}</span>
        </>
      );
    }
    if (saveStatus === 'saving') {
      return (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{showLabel ? '保存中…' : '保存中'}</span>
        </>
      );
    }
    if (saveStatus === 'error') {
      return (
        <>
          <CloudOff className="w-3 h-3" />
          <span>保存失败</span>
        </>
      );
    }
    if (saveStatus === 'saved' && lastSavedAt) {
      return (
        <>
          <CheckCircle2 className="w-3 h-3" />
          <span>
            已保存 {lastSavedAt.toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
        </>
      );
    }
    return (
      <>
        <Cloud className="w-3 h-3" />
        <span>{showLabel ? '已连接数据库' : '已连接'}</span>
      </>
    );
  };

  const cls =
    variant === 'light'
      ? 'bg-white/20 text-white border border-white/25'
      : !dbOnline
      ? 'bg-gray-100 text-gray-500 border border-gray-200'
      : saveStatus === 'saving'
      ? 'bg-blue-50 text-blue-700 border border-blue-200'
      : saveStatus === 'error'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : saveStatus === 'saved'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium ${cls}`}
    >
      {renderContent()}
    </span>
  );
};

export default StoreStatusBadge;