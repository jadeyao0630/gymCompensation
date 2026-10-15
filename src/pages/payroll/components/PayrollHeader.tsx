
import React from 'react';
import {
  Sparkles,
  UserX,
  Calculator,
  Download,
  Loader2,
  RefreshCw,
  Save,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

import NavButtons from '../../../components/layout/NavButtons';
import UserMenu from '../../../components/auth/UserMenu';

interface Props {
  storeName?: string;
  month?: string;
  excludedCount: number;
  loading?: boolean;
  fetchingSettlement?: boolean;
  hasPlan?: boolean;
  canExport?: boolean;
  canExportPayroll?: boolean;

  // 结算相关
  hasSettlement?: boolean;
  isLoaded?: boolean;
  hasLocalResult?: boolean;
  canSettle?: boolean;
  planOutdated?: boolean;

  dbOnline?: boolean;
  saveStatus?: any;
  lastSavedAt?: Date | null;

  onRun: () => void;
  onFetch?: () => void;
  onRefetch?: () => void;
  onSettle?: () => void;
  onExport: () => void;
}

export const PayrollHeader: React.FC<Props> = ({
  month,
  excludedCount,
  loading = false,
  fetchingSettlement = false,
  hasPlan = false,
  canExport = false,
  canExportPayroll = true,
  hasSettlement = false,
  isLoaded = false,
  hasLocalResult = false,
  canSettle = false,
  planOutdated = false,
  onRun,
  onFetch,
  onRefetch,
  onSettle,
  onExport,
}) => {
  const isLoading = loading || fetchingSettlement;

  // 主按钮配置
  let mainBtn: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled: boolean;
    title: string;
  };

  if (!hasPlan) {
    mainBtn = {
      label: '开始计算',
      icon: <Calculator className="w-4 h-4" />,
      onClick: onRun,
      disabled: true,
      title: '该月份暂无薪酬配置',
    };
  } else if (hasLocalResult && !isLoaded) {
    // 本地计算完成，尚未提交结算
    mainBtn = {
      label: '结算提交',
      icon: <Save className="w-4 h-4" />,
      onClick: onSettle || (() => {}),
      disabled: isLoading || !canSettle || !onSettle,
      title: !canSettle
        ? '无权限：薪酬结算'
        : '将当前计算结果提交并保存到后台',
    };
  } else if (hasSettlement && !isLoaded) {
    // 后台已有结算，尚未获取
    mainBtn = {
      label: '获取结算结果',
      icon: <Download className="w-4 h-4" />,
      onClick: onFetch || (() => {}),
      disabled: isLoading || !onFetch,
      title: '从后台获取本月已保存的薪酬结算结果',
    };
  } else if (isLoaded) {
    // 已加载结算，允许重新计算
    mainBtn = {
      label: '重新计算',
      icon: <RotateCcw className="w-4 h-4" />,
      onClick: onRun,
      disabled: isLoading,
      title: '重新拉取数据计算薪酬，需重新提交结算',
    };
  } else {
    // 后台没有结算，本地也没有结果
    mainBtn = {
      label: '开始计算',
      icon: <Calculator className="w-4 h-4" />,
      onClick: onRun,
      disabled: isLoading,
      title: '根据本月薪酬方案开始计算',
    };
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl shadow-emerald-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between flex-wrap gap-6">
          {/* 左侧标题 */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold tracking-widest uppercase">
                Payroll Calculation
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              薪酬计算
            </h1>

            <p className="text-sm text-emerald-100/90 mt-3 max-w-md leading-relaxed">
              根据本月方案配置，拉取销售、消课数据并计算员工薪酬
            </p>

            {/* 排除人员提示 */}
            {excludedCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 bg-amber-400/20 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-amber-300/30">
                  <UserX className="w-3.5 h-3.5 text-amber-200" />
                  <span className="text-sm font-medium text-amber-100">
                    已排除 {excludedCount} 人
                  </span>
                </div>
              </div>
            )}

            {/* 后台结算状态提示 */}
            {hasSettlement && !isLoaded && !hasLocalResult && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/25">
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">
                    后台已有结算结果
                  </span>
                </div>
              </div>
            )}

            {/* 已加载结算状态 */}
            {isLoaded && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/25">
                  <Save className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">
                    已加载结算数据
                  </span>
                </div>

                {planOutdated && (
                  <div className="inline-flex items-center gap-2 bg-amber-400/20 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-amber-300/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
                    <span className="text-sm font-medium text-amber-100">
                      方案已变更
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 本地计算未结算 */}
            {hasLocalResult && !isLoaded && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 bg-amber-400/20 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-amber-300/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
                  <span className="text-sm font-medium text-amber-100">
                    当前计算结果尚未提交结算
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 右侧用户和操作按钮 */}
          <div className="flex flex-col items-end gap-2">
            <UserMenu variant="dark" />

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* 主按钮 */}
              <button
                type="button"
                onClick={mainBtn.onClick}
                disabled={mainBtn.disabled}
                title={mainBtn.title}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-white/90 rounded-2xl px-5 py-2.5 shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {fetchingSettlement
                      ? '获取中…'
                      : '计算中…'}
                  </>
                ) : (
                  <>
                    {mainBtn.icon}
                    {mainBtn.label}
                  </>
                )}
              </button>

              {/* 已加载结算时：刷新后台结算结果 */}
              {isLoaded && onRefetch && (
                <button
                  type="button"
                  onClick={onRefetch}
                  disabled={isLoading}
                  title="丢弃本地修改，重新从后台加载已保存的结算结果"
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {fetchingSettlement ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {fetchingSettlement
                      ? '刷新中…'
                      : '刷新结算结果'}
                  </span>
                </button>
              )}

              {/* 导出整表 */}
              {canExportPayroll && (
                <button
                  type="button"
                  onClick={onExport}
                  disabled={isLoading || !canExport}
                  title={
                    !canExport
                      ? '暂无可导出的数据'
                      : '导出整表为 Excel'
                  }
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    导出整表
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 底部导航 */}
        <div className="mt-6">
          <NavButtons active="payroll" month={month} />
        </div>
      </div>
    </div>
  );
};

export default PayrollHeader;
