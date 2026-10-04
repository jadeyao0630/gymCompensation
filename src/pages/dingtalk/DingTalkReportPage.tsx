import React, { useMemo, useState } from 'react';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

import { getDefaultMonth } from './utils/date';
import { getStoreFromPaymentUnit } from './utils/constants';
import { extractAmount, extractItems, extractPayeeAccount } from './utils/extract';

import { useDingTalkTemplates } from './hooks/useDingTalkTemplates';
import { useReportColumns } from './hooks/useReportColumns';
import { useDingTalkReport } from './hooks/useDingTalkReport';

import DingTalkHeader from './components/DingTalkHeader';
import DingTalkFilterBar from './components/DingTalkFilterBar';
import GroupedResults from './components/GroupedResults';

const DingTalkReportPage: React.FC = () => {
  const defaults = useMemo(() => getDefaultMonth(), []);

  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [paymentUnits, setPaymentUnits] = useState<string[]>([]);
  const [templateTypes, setTemplateTypes] = useState<string[]>([]);

  const {
    templates,
    loading: loadingTemplates,
    refreshing: refreshingTemplates,
    refresh: refreshTemplates,
  } = useDingTalkTemplates();

  const { visibleColumns, toggleColumn, resetColumns, isColVisible } =
    useReportColumns();
  const { results, loading, error, meta, handleSearch, grouped } =
    useDingTalkReport();

  const onSearch = () =>
    handleSearch({ start, end, templateTypes, paymentUnits });

  const togglePaymentUnit = (unit: string) => {
    setPaymentUnits((prev) =>
      prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]
    );
  };

  const toggleTemplateType = (name: string) => {
    setTemplateTypes((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  /* ⭐ 分类全选/取消时直接 set */
  const setTemplateTypesDirect = (names: string[]) => {
    setTemplateTypes(names);
  };

  const handleExport = () => {
    if (results.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    const wb = XLSX.utils.book_new();

    const rows: any[][] = [
      ['流程类型', '门店', '付款单位', '标题', '事项', '金额', '收款账户', '状态', '创建时间', '完成时间'],
    ];
    results.forEach((r) => {
      rows.push([
        r.templateName,
        getStoreFromPaymentUnit(r.paymentUnit),
        r.paymentUnit || '',
        r.title,
        extractItems(r.templateName, r.formValues),
        extractAmount(r.templateName, r.formValues) || 0,
        extractPayeeAccount(r.formValues) || '',
        r.status,
        r.createTime,
        r.finishTime || '',
      ]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    ws1['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 40 }, { wch: 40 },
      { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, '明细');

    const summaryRows: any[][] = [['流程类型', '门店', '付款单位', '笔数', '金额合计']];
    grouped.forEach((g) => {
      g.units.forEach((u) => {
        summaryRows.push([g.typeName, u.storeName, u.unitName, u.count, u.total]);
      });
    });
    const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws2['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, '汇总');

    XLSX.writeFile(wb, `钉钉报销数据_${start}_${end}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <DingTalkHeader
          loading={loading}
          hasResults={results.length > 0}
          onSearch={onSearch}
          onExport={handleExport}
        />

        {/* 筛选栏 */}
        <DingTalkFilterBar
          start={start}
          end={end}
          paymentUnits={paymentUnits}
          templateTypes={templateTypes}
          templates={templates}
          loadingTemplates={loadingTemplates}
          refreshingTemplates={refreshingTemplates}
          loading={loading}
          meta={meta}
          visibleColumns={visibleColumns}
          onStartChange={setStart}
          onEndChange={setEnd}
          onTogglePaymentUnit={togglePaymentUnit}
          onSetPaymentUnits={setPaymentUnits}
          onToggleTemplateType={toggleTemplateType}
          onSetTemplateTypes={setTemplateTypesDirect}
          onRefreshTemplates={refreshTemplates}
          onSearch={onSearch}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
        />

        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            正在从钉钉拉取数据…
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5">
              <Search className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-2">选择条件后点击「查询」</h3>
            <p className="text-sm text-gray-400">
              系统将拉取钉钉审批流程，按"流程类型 → 付款单位（门店）"分组展示
            </p>
          </div>
        )}

        {!loading && !error && grouped.length > 0 && (
          <GroupedResults grouped={grouped} isColVisible={isColVisible} />
        )}
      </div>
    </div>
  );
};

export default DingTalkReportPage;