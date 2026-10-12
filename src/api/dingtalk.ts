import { api } from './client';

export interface DingTalkTemplate {
  name: string;
  processCode: string;
  iconUrl?: string;
  url?: string;
}

export interface DingTalkOperationRecord {
  userId: string;
  userName?: string;
  type: string;
  result: string;
  date: number | null;
  remark: string;
}

export interface DingTalkPendingApprover {
  userId: string;
  userName: string;
}

export interface DingTalkReportItem {
  templateName: string;
  processCode: string;
  processInstanceId: string;
  title: string;
  status: string;
  result: string;
  createTime: string;
  finishTime?: string;
  paymentUnit: string | null;
  payeeAccount: string | null;
  amount: string | null;
  items: Array<{ rowNumber: string; content: string; amount: string }>;
  formValues: Record<string, any>;
  operationRecords?: DingTalkOperationRecord[];
  originatorName?: string;
  pendingApprovers?: DingTalkPendingApprover[];
  error?: string;
  _autoAssigned?: boolean;
  _storeName?: string | null;
  _assignReason?: string;
}

export interface DingTalkSyncResult {
  finishedAt: string;
  status: 'success' | 'failed';
  message: string;
}

export interface DingTalkReportResponse {
  errorcode: number;
  errormsg: string;
  data: {
    startTime: number;
    endTime: number;
    source?: string;
    /** ⭐ 月综合报告专用 */
    month?: string;
    store?: string | null;
    filter?: {
      type: string | null;
      company: string | null;
      excludeTemplates: string[];
      onlyApproved: boolean;
    };
    totalTemplates: number;
    beforeFilterCount?: number;
    totalCount: number;
    autoAssignedCount?: number;
    costMs: number;
    syncResult?: DingTalkSyncResult;
    results: DingTalkReportItem[];
  };
}

export async function fetchDingTalkTemplates(): Promise<DingTalkTemplate[]> {
  const { data } = await api.get('/api/dingtalk/templates');
  return data?.data?.templates || [];
}

export async function refreshDingTalkTemplates(): Promise<DingTalkTemplate[]> {
  const { data } = await api.post('/api/dingtalk/templates/refresh');
  return data?.data?.templates || [];
}

export interface FetchReportParams {
  start: string;
  end: string;
  type?: string;
  company?: string;
  onlyApproved?: boolean;
  sync?: 0 | 1;
}

export async function fetchDingTalkReport(
  params: FetchReportParams
): Promise<DingTalkReportResponse['data']> {
  const { data } = await api.get<DingTalkReportResponse>(
    '/api/dingtalk/report',
    {
      params: {
        start: params.start,
        end: params.end,
        type: params.type || undefined,
        company: params.company || undefined,
        onlyApproved: params.onlyApproved === false ? '0' : undefined,
        sync: params.sync != null ? String(params.sync) : undefined,
      },
    }
  );
  return data.data;
}

/* ⭐ 月综合报告：按月份 + 门店读缓存 */
export interface FetchMonthlySummaryParams {
  month: string; // YYYY-MM
  store?: string; // 门店名（'哈德门' / '富贵园'）
}

export async function fetchDingTalkMonthlySummary(
  params: FetchMonthlySummaryParams
): Promise<DingTalkReportResponse['data']> {
  const { data } = await api.get<DingTalkReportResponse>(
    '/api/dingtalk/monthly-summary',
    {
      params: {
        month: params.month,
        store: params.store || undefined,
      },
    }
  );
  return data.data;
}