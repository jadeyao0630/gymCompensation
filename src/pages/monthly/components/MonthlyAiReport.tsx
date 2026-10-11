import React from 'react';
import { Sparkles, Loader2, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  report: string;
  loading: boolean;
  error?: string;
  onRegenerate: () => void;
}

export const MonthlyAiReport: React.FC<Props> = ({
  report,
  loading,
  error,
  onRegenerate,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 via-white to-indigo-50/60 rounded-2xl border border-violet-100 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-violet-600" />
        <h3 className="text-sm font-semibold text-gray-800">AI 月报分析</h3>
        <div className="flex-1" />
        {report && !loading && (
          <>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <RefreshCw className="w-3 h-3" /> 重新生成
            </button>
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-violet-600 py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在生成 AI 分析报告…
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 py-2">{error}</div>
      )}

      {!loading && !error && report && (
        <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
          {report}
        </pre>
      )}

      {!loading && !error && !report && (
        <p className="text-xs text-gray-400 py-3">
          点击「生成 AI 报告」后，将基于本月收入、成本、薪酬、钉钉支出数据自动生成分析。
        </p>
      )}
    </div>
  );
};

export default MonthlyAiReport;