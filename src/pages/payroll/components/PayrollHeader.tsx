import React from 'react';
import {
  Sparkles, UserX, Calculator, Download, Loader2,
  RefreshCw, Save, RotateCcw, AlertTriangle,
} from 'lucide-react';
import NavButtons from '../../../components/layout/NavButtons';
import UserMenu from '../../../components/auth/UserMenu';

interface Props {
  storeName?: string;
  month?: string;
  excludedCount: number;
  loading?: boolean;
  hasPlan?: boolean;
  canExport?: boolean;
  canExportPayroll?: boolean;
  /* ⭐ 结算相关 */
  hasSettlement?: boolean;      // 后台有结算数据
  isLoaded?: boolean;           // 已加载结算数据
  hasLocalResult?: boolean;     // 本地已计算（未结算）
  canSettle?: boolean;          // 有结算权限
  planOutdated?: boolean;       // 方案已变更（结算过期）
  dbOnline?: boolean;
  saveStatus?: any;
  lastSavedAt?: Date | null;
  onRun: () => void;
  onFetch?: () => void;         // 获取结算数据
  onRefetch?: () => void;       // 重新获取
  onSettle?: () => void;        // 结算提交
  onExport: () => void;
}

export const PayrollHeader: React.FC<Props> = ({
  month,
  excludedCount,
  loading,
  hasPlan,
  canExport,
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
  /* ⭐ 归一化，避免 boolean | undefined 类型报错 */
  const isLoading = !!loading;
  const isHasPlan = !!hasPlan;
  const isCanExport = !!canExport;
  const isCanSettle = !!canSettle;

  /* ⭐ 决定主按钮
   *   优先级：
   *   1) 无方案 → 开始计算（禁用）
   *   2) 本地有结果但未结算 → 结算提交（刚算完/重算完）
   *   3) 有结算但未加载 → 获取
   *   4) 已加载结算 → 重新计算
   *   5) 其他 → 开始计算
   */
  let mainBtn: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled: boolean;
    title: string;
  };

  if (!isHasPlan) {
    mainBtn = {
      label: '开始计算',
      icon: <Calculator className="w-4 h-4" />,
      onClick: onRun,
      disabled: true,
      title: '该月份暂无薪酬配置',
    };
  } else if (hasLocalResult && !isLoaded) {
    /* ⭐ 本地有结果（刚算完 / 重新算完）→ 结算提交，优先于「获取」 */
    mainBtn = {
      label: '结算提交',
      icon: <Save className="w-4 h-4" />,
      onClick: onSettle || onRun,
      disabled: isLoading || !isCanSettle,
      title: !isCanSettle ? '无权限：薪酬结算' : '提交并保存到后台',
    };
  } else if (hasSettlement && !isLoaded) {
    mainBtn = {
      label: '获取',
      icon: <Download className="w-4 h-4" />,
      onClick: onFetch || onRun,
      disabled: isLoading,
      title: '获取已结算数据',
    };
  } else if (isLoaded) {
    mainBtn = {
      label: '重新计算',
      icon: <RotateCcw className="w-4 h-4" />,
      onClick: onRun,
      disabled: isLoading,
      title: '重新计算（会覆盖已结算数据，需重新提交）',
    };
  } else {
    mainBtn = {
      label: '开始计算',
      icon: <Calculator className="w-4 h-4" />,
      onClick: onRun,
      disabled: isLoading,
      title: '开始计算',
    };
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl shadow-emerald-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between flex-wrap gap-6">
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

            {/* ⭐ 结算状态提示 */}
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
          </div>

          <div className="flex flex-col items-end gap-2">
            <UserMenu variant="dark" />

            <div className="flex items-center gap-2">
              <button
                onClick={mainBtn.onClick}
                disabled={mainBtn.disabled}
                title={mainBtn.title}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-white/90 rounded-2xl px-5 py-2.5 shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 处理中…</>
                ) : (
                  <>{mainBtn.icon} {mainBtn.label}</>
                )}
              </button>

              {/* ⭐ 已加载结算时：重新获取按钮 */}
              {isLoaded && onRefetch && (
                <button
                  onClick={onRefetch}
                  disabled={isLoading}
                  title="丢弃本地修改，重新从后台获取"
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm font-medium">重新获取</span>
                </button>
              )}

              {canExportPayroll && (
                <button
                  onClick={onExport}
                  disabled={isLoading || !isCanExport}
                  title={!isCanExport ? '暂无可导出的数据' : '导出整表为 Excel'}
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">导出整表</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <NavButtons active="payroll" month={month} />
        </div>
      </div>
    </div>
  );
};

export default PayrollHeader;